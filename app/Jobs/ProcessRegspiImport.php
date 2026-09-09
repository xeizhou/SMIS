<?php

namespace App\Jobs;

use App\Models\FundCluster;
use App\Models\Import;
use App\Models\RegspiMonitoring;
use App\Models\RrspMonitoring;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ProcessRegspiImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    /**
     * How often (in rows) we touch the `imports` row with progress and
     * check for cancellation. Doing this every single row was the
     * biggest cost in the old implementation — on SQLite in particular,
     * each ->update() is a full synchronous write. Every 200 rows keeps
     * the progress bar feeling live without the per-row overhead.
     */
    private const PROGRESS_EVERY = 200;

    /**
     * Batch size for both inserts and upserts.
     */
    private const BATCH_SIZE = 500;

    /**
     * $fundClusterId is user-selected in the import dialog (these CSVs
     * don't carry a "Fund Cluster:" line, unlike other report types),
     * so it's passed straight in here rather than persisted on the
     * `imports` row or parsed out of the file. It rides along in the
     * queue payload via SerializesModels/Queueable.
     */
    public function __construct(
        public int $importId,
        public string $fundClusterId,
    ) {
    }

    public function handle(): void
    {
        $import = Import::findOrFail($this->importId);

        // Cancelled before the worker even picked it up.
        if ($import->status === 'cancelled') {
            $this->logAudit($import, 'RegSPI import cancelled before it started processing.');
            return;
        }

        $import->update(['status' => 'processing']);

        try {
            $path = Storage::path($import->file_path);

            // Single pass: find the header line AND count total data
            // rows, all at once. No longer looks for a "Fund Cluster:"
            // line — the fund cluster is user-selected and comes in
            // via the constructor instead.
            [$headerLine, $totalRows] = $this->findHeaderAndCount($path);
            $import->update(['total_rows' => $totalRows]);

            $fundClusterIds = FundCluster::query()->pluck('fund_cluster_id')->flip();

            if (! $fundClusterIds->has($this->fundClusterId)) {
                throw new \RuntimeException('Selected fund cluster does not exist.');
            }

            $rrspNos = RrspMonitoring::query()->pluck('rrsp_no')->flip();

            // Just the two key columns, not full model rows — we only
            // need to know which (month_year, property_no) pairs already
            // exist so we can count created vs. updated. The actual
            // write is a single upsert() per batch below, so we never
            // need the existing rows' other fields or their PKs here.
            $existingKeys = RegspiMonitoring::query()
                ->get(['month_year', 'semi_expendable_property_no'])
                ->reduce(function (array $keys, $row) {
                    $keys["{$row->month_year}|{$row->semi_expendable_property_no}"] = true;
                    return $keys;
                }, []);
            $existingKeys = collect($existingKeys);

            $created = 0;
            $updated = 0;
            $skipped = 0;
            $processed = 0;

            // Rows accumulate here and get flushed via upsert() in
            // batches. upsert() replaces the old two-path logic
            // (per-row ->update() for existing rows, buffered insert()
            // for new ones) with a single SQL statement per batch that
            // handles both inserts and updates at once.
            $batchRows = [];

            $handle = $this->openCsv($path);
            $this->skipToHeader($handle, $headerLine);
            fgetcsv($handle);

            while (($line = fgetcsv($handle)) !== false) {
                $row = $this->mapReportRow($line, $this->fundClusterId, $fundClusterIds);
                if ($row === null) {
                    continue;
                }

                $validator = Validator::make($row, [
                    'month_year' => 'required|string|max:20',
                    'ics_no' => 'nullable|string|max:50',
                    'rrsp_no' => 'nullable|string|max:50',
                    'fund_cluster_id' => 'nullable|string|max:20',
                    'semi_expendable_property_no' => 'required|string|max:100',
                    'item_description' => 'required|string|max:255',
                    'estimated_useful_life' => 'nullable|integer|min:0',
                    'issued_qty' => 'nullable|integer|min:0',
                    'issued_office_officer' => 'nullable|string|max:255',
                    'returned_qty' => 'nullable|integer|min:0',
                    'returned_office_officer' => 'nullable|string|max:255',
                    'reissued_qty' => 'nullable|integer|min:0',
                    'reissued_office_officer' => 'nullable|string|max:255',
                    'disposed_qty' => 'nullable|integer|min:0',
                    'amount' => 'required|numeric|min:0',
                    'remarks' => 'nullable|string|max:255',
                ]);

                if ($validator->fails() || (! empty($row['rrsp_no']) && ! $rrspNos->has($row['rrsp_no']))) {
                    $skipped++;
                    $processed++;

                    if ($this->maybeReportProgress($import, $processed, $skipped, $created, $updated)) {
                        fclose($handle);

                        if ($batchRows !== []) {
                            $this->flushBatch($batchRows);
                        }

                        $import->update([
                            'processed_rows' => $processed,
                            'created_rows' => $created,
                            'updated_rows' => $updated,
                            'skipped_rows' => $skipped,
                        ]);

                        $this->logAudit($import, sprintf(
                            'Cancelled RegSPI import: %d created, %d updated, %d skipped before stopping.',
                            $created,
                            $updated,
                            $skipped
                        ));

                        return;
                    }

                    continue;
                }

                $key = "{$row['month_year']}|{$row['semi_expendable_property_no']}";

                if ($existingKeys->has($key)) {
                    $updated++;
                } else {
                    $created++;
                    $existingKeys->put($key, true);
                }

                $batchRows[$key] = $row;

                if (count($batchRows) >= self::BATCH_SIZE) {
                    $this->flushBatch($batchRows);
                    $batchRows = [];
                }

                $processed++;

                $stopped = $this->maybeReportProgress($import, $processed, $skipped, $created, $updated);

                if ($stopped) {
                    fclose($handle);

                    // Don't drop rows that were already validated and
                    // batched in memory — flush them before stopping.
                    if ($batchRows !== []) {
                        $this->flushBatch($batchRows);
                    }

                    $import->update([
                        'processed_rows' => $processed,
                        'created_rows' => $created,
                        'updated_rows' => $updated,
                        'skipped_rows' => $skipped,
                    ]);

                    $this->logAudit($import, sprintf(
                        'Cancelled RegSPI import: %d created, %d updated, %d skipped before stopping.',
                        $created,
                        $updated,
                        $skipped
                    ));

                    return;
                }
            }

            fclose($handle);

            if ($batchRows !== []) {
                $this->flushBatch($batchRows);
            }

            $import->update([
                'status' => 'completed',
                'processed_rows' => $totalRows,
                'created_rows' => $created,
                'updated_rows' => $updated,
                'skipped_rows' => $skipped,
            ]);

            $this->logAudit($import, sprintf(
                'Imported RegSPI: %d created, %d updated, %d skipped.',
                $created,
                $updated,
                $skipped
            ));
        } catch (\Throwable $exception) {
            $import->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);

            $this->logAudit($import, 'RegSPI import failed: ' . $exception->getMessage());

            throw $exception;
        }
    }

    /**
     * Flush a batch of rows as a single upsert statement. Handles both
     * new rows and updates to existing rows in one query, keyed on
     * (month_year, semi_expendable_property_no).
     */
    private function flushBatch(array $batchRows): void
    {
        RegspiMonitoring::upsert(
            array_values($batchRows),
            ['month_year', 'semi_expendable_property_no'],
            [
                'ics_no',
                'rrsp_no',
                'fund_cluster_id',
                'item_description',
                'estimated_useful_life',
                'issued_qty',
                'issued_office_officer',
                'returned_qty',
                'returned_office_officer',
                'reissued_qty',
                'reissued_office_officer',
                'disposed_qty',
                'balance_qty',
                'amount',
                'remarks',
                'updated_at',
            ]
        );
    }

    /**
     * Report progress and check for cancellation, but only every
     * PROGRESS_EVERY rows instead of on every single row. Returns true
     * if the import has been cancelled and the caller should stop.
     */
    private function maybeReportProgress(Import $import, int $processed, int $skipped, int $created, int $updated): bool
    {
        if ($processed % self::PROGRESS_EVERY !== 0) {
            return false;
        }

        $import->update([
            'processed_rows' => $processed,
            'created_rows' => $created,
            'updated_rows' => $updated,
            'skipped_rows' => $skipped,
        ]);

        return $import->fresh()->status === 'cancelled';
    }

    /**
     * Scans the file once to locate the MONTH/YR header row and count
     * valid data rows for the rest of the same pass, instead of
     * re-opening the file for a second scan. No longer looks for a
     * "Fund Cluster:" line — the fund cluster is supplied by the user
     * via $this->fundClusterId, since these CSVs don't carry one.
     */
    private function findHeaderAndCount(string $path): array
    {
        $handle = $this->openCsv($path);
        $lineNumber = 0;
        $headerLine = null;
        $totalRows = 0;

        while (($line = fgetcsv($handle)) !== false) {
            $lineNumber++;

            if ($headerLine === null) {
                if (strtolower(trim((string) ($line[0] ?? ''))) === 'month/yr') {
                    $headerLine = $lineNumber;
                }

                continue;
            }

            // We're past the header row now — count data rows.
            if (trim((string) ($line[4] ?? '')) !== '') {
                $totalRows++;
            }
        }

        fclose($handle);

        if ($headerLine === null) {
            throw new \RuntimeException('Could not find the MONTH/YR header row.');
        }

        return [$headerLine, $totalRows];
    }

    private function mapReportRow(array $line, ?string $fundClusterId, $fundClusterIds): ?array
    {
        $propertyNo = trim((string) ($line[4] ?? ''));
        $description = trim((string) ($line[5] ?? ''));
        if ($propertyNo === '' || $description === '') {
            return null;
        }

        $issued = $this->integerValue($line[7] ?? null);
        $returned = $this->integerValue($line[9] ?? null);
        $reissued = $this->integerValue($line[11] ?? null);
        $disposed = $this->integerValue($line[13] ?? null);

        return [
            'month_year' => trim((string) ($line[0] ?? '')),
            'ics_no' => $this->value($line[2] ?? null),
            'rrsp_no' => $this->value($line[3] ?? null),
            'fund_cluster_id' => $fundClusterId && $fundClusterIds->has($fundClusterId) ? $fundClusterId : null,
            'semi_expendable_property_no' => $propertyNo,
            'item_description' => $description,
            'estimated_useful_life' => $this->integerValue($line[6] ?? null),
            'issued_qty' => $issued,
            'issued_office_officer' => $this->value($line[8] ?? null),
            'returned_qty' => $returned,
            'returned_office_officer' => $this->value($line[10] ?? null),
            'reissued_qty' => $reissued,
            'reissued_office_officer' => $this->value($line[12] ?? null),
            'disposed_qty' => $disposed,
            'balance_qty' => $issued - $returned + $reissued - $disposed,
            'amount' => $this->numberValue($line[15] ?? null),
            'remarks' => $this->value($line[16] ?? null),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function openCsv(string $path)
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new \RuntimeException('Could not open the stored CSV.');
        }
        return $handle;
    }

    private function skipToHeader($handle, int $headerLine): void
    {
        for ($line = 1; $line < $headerLine; $line++) {
            fgetcsv($handle);
        }
    }

    private function value($value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }

    private function integerValue($value): int
    {
        $value = trim((string) $value);
        return $value === '' || ! is_numeric($value) ? 0 : (int) $value;
    }

    private function numberValue($value): float
    {
        $value = str_replace(',', '', trim((string) $value));
        return $value === '' || ! is_numeric($value) ? 0 : (float) $value;
    }

    /**
     * Writes an audit log entry attributed to the user who started this
     * import. Can't use Auth::id()/Auth::user() here like
     * ImportController::logAudit() does — this runs in a queue worker
     * process with no authenticated request, so the acting user has to
     * come from the import row itself instead.
     */
    private function logAudit(Import $import, string $action): void
    {
        $user = User::find($import->user_id);

        DB::table('audit_logs')->insert([
            'log_timestamp' => now(),
            'userID' => $import->user_id,
            'role' => $user->role ?? 'user',
            'action' => $action,
        ]);
    }
}