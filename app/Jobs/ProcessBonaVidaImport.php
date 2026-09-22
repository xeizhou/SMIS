<?php

namespace App\Jobs;

use App\Models\BonaVidaMonitoring;
use App\Models\Import;
use App\Models\Office;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ProcessBonaVidaImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    private const PROGRESS_EVERY = 200;

    private const BATCH_SIZE = 500;

    public function __construct(
        public int $importId,
    ) {
    }

    public function handle(): void
    {
        $import = Import::findOrFail($this->importId);

        if ($import->status === 'cancelled') {
            $this->logAudit($import, 'Bona-Vida import cancelled before it started processing.');
            return;
        }

        $import->update(['status' => 'processing']);

        try {
            $path = Storage::path($import->file_path);

            [$headerLine, $totalRows] = $this->findHeaderAndCount($path);
            $import->update(['total_rows' => $totalRows]);

            $officeCodes = Office::query()->pluck('office_code')->flip();
            $officesCreated = 0;

            $existingKeys = BonaVidaMonitoring::query()
                ->get(['date_received', 'office_code', 'invoice_no'])
                ->reduce(function (array $keys, $row) {
                    $keys["{$row->date_received}|{$row->office_code}|{$row->invoice_no}"] = true;
                    return $keys;
                }, []);
            $existingKeys = collect($existingKeys);

            $created = 0;
            $updated = 0;
            $skipped = 0;
            $processed = 0;

            $batchRows = [];

            $handle = $this->openCsv($path);
            $this->skipToHeader($handle, $headerLine);
            fgetcsv($handle);

            while (($line = fgetcsv($handle)) !== false) {
                $row = $this->mapReportRow($line);
                if ($row === null) {
                    continue;
                }

                // Auto-create any office the CSV references that we don't
                // already have. The CSV only gives us a code/short-name
                // (e.g. "COE-DEANS OFFICE"), so that same value is used
                // for both office_code and office_name — rename it later
                // in the Offices screen if you want a friendlier label.
                if (! $officeCodes->has($row['office_code'])) {
                    Office::firstOrCreate(
                        ['office_code' => $row['office_code']],
                        ['office_name' => $row['office_code']]
                    );

                    $officeCodes->put($row['office_code'], true);
                    $officesCreated++;
                }

                $validator = Validator::make($row, [
                    'date_received' => 'required|date',
                    'office_code' => 'required|string|max:50',
                    'qty' => 'nullable|integer|min:0',
                    'price' => 'nullable|numeric|min:0',
                    'total_amount' => 'nullable|numeric|min:0',
                    'invoice_no' => 'nullable|string|max:50',
                    'invoice_date' => 'nullable|date',
                    'remarks' => 'nullable|string|max:255',
                ]);

                if ($validator->fails()) {
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
                            'Cancelled Bona-Vida import: %d created, %d updated, %d skipped, %d office(s) auto-created before stopping.',
                            $created,
                            $updated,
                            $skipped,
                            $officesCreated
                        ));

                        return;
                    }

                    continue;
                }

                $key = "{$row['date_received']}|{$row['office_code']}|{$row['invoice_no']}";

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
                        'Cancelled Bona-Vida import: %d created, %d updated, %d skipped, %d office(s) auto-created before stopping.',
                        $created,
                        $updated,
                        $skipped,
                        $officesCreated
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
                'Imported Bona-Vida: %d created, %d updated, %d skipped, %d office(s) auto-created.',
                $created,
                $updated,
                $skipped,
                $officesCreated
            ));
        } catch (\Throwable $exception) {
            $import->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);

            $this->logAudit($import, 'Bona-Vida import failed: ' . $exception->getMessage());

            throw $exception;
        }
    }

    private function flushBatch(array $batchRows): void
    {
        BonaVidaMonitoring::upsert(
            array_values($batchRows),
            ['date_received', 'office_code', 'invoice_no'],
            [
                'qty',
                'price',
                'total_amount',
                'invoice_date',
                'remarks',
                'updated_at',
            ]
        );
    }

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

    private function findHeaderAndCount(string $path): array
    {
        $handle = $this->openCsv($path);
        $lineNumber = 0;
        $headerLine = null;
        $totalRows = 0;

        while (($line = fgetcsv($handle)) !== false) {
            $lineNumber++;

            if ($headerLine === null) {
                if (strtolower(trim((string) ($line[0] ?? ''))) === 'date recieve') {
                    $headerLine = $lineNumber;
                }

                continue;
            }

            if (trim((string) ($line[1] ?? '')) !== '') {
                $totalRows++;
            }
        }

        fclose($handle);

        if ($headerLine === null) {
            throw new \RuntimeException('Could not find the DATE RECIEVE header row.');
        }

        return [$headerLine, $totalRows];
    }

    private function mapReportRow(array $line): ?array
    {
        $officeCode = trim((string) ($line[1] ?? ''));
        $dateReceived = $this->dateValue($line[0] ?? null);

        if ($officeCode === '' || $dateReceived === null) {
            return null;
        }

        return [
            'date_received' => $dateReceived,
            'office_code' => $officeCode,
            'qty' => $this->integerValue($line[2] ?? null),
            'price' => $this->numberValue($line[4] ?? null),
            'total_amount' => $this->numberValue($line[5] ?? null),
            'invoice_no' => $this->value($line[6] ?? null),
            'invoice_date' => $this->dateValue($line[7] ?? null),
            'remarks' => $this->value($line[8] ?? null),
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

    private function dateValue($value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        $date = \DateTime::createFromFormat('n/j/Y', $value);
        if ($date === false) {
            return null;
        }

        return $date->format('Y-m-d');
    }

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