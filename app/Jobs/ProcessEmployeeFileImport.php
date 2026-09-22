<?php

namespace App\Jobs;

use App\Models\Import;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

/**
 * Source file layout (the .csv export): two independent side-by-side
 * tables sharing the same physical rows, separated by one blank spacer
 * column —
 *
 *   Row 1: "EMPLOYEE FILE LOCATOR" (title)
 *   Row 2: "ACTIVE FILES" ......... "DEAD FILES" (section labels)
 *   Row 3: blank
 *   Row 4: NO., LAST NAME, FIRST NAME, MIDDLE NAME, AREA, STATUS, <blank>,
 *          NO., LAST NAME, FIRST NAME, MIDDLE NAME, AREA, STATUS
 *   Row 5: blank
 *   Row 6+: data — left block = Active files, right block = Dead files.
 *
 * The right block's "NO." column keeps incrementing on rows that have no
 * dead-file data (dragged formula), so a real right-side row is detected
 * by LAST NAME being non-empty, not by NO. being present. "Dead" (from
 * the source sheet) is normalized to "Inactive" to match the app's
 * status filter.
 *
 * This import always INSERTS — no dedup/merge key, since the source data
 * has no natural unique key. Unlike Bona-Vida, there's no office lookup/
 * auto-create step, so this job is simpler on that front. CSV-only —
 * xlsx uploads are no longer accepted for this import.
 *
 * "processed_rows" / "total_rows" count physical sheet rows (one row can
 * yield up to two created records); "created_rows" / "skipped_rows"
 * count individual left+right records.
 */
class ProcessEmployeeFileImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    private const PROGRESS_EVERY = 100;

    private const BATCH_SIZE = 500;

    public function __construct(
        public int $importId,
    ) {
    }

    public function handle(): void
    {
        $import = Import::findOrFail($this->importId);

        if ($import->status === 'cancelled') {
            $this->logAudit($import, 'Employee File Locator import cancelled before it started processing.');
            return;
        }

        $import->update(['status' => 'processing']);

        try {
            $path = Storage::path($import->file_path);

            $physicalRows = $this->readCsvRows($path);

            $import->update(['total_rows' => count($physicalRows)]);

            $created = 0;
            $skipped = 0;
            $processed = 0;
            $batchRows = [];

            foreach ($physicalRows as $line) {
                foreach ($this->splitEmployeeFileRow($line) as $record) {
                    $validator = Validator::make($record, [
                        'last_name' => 'required|string|max:100',
                        'first_name' => 'required|string|max:100',
                        'middle_name' => 'nullable|string|max:100',
                        'area' => 'required|string|max:100',
                        'status' => 'required|string|max:50',
                    ]);

                    if ($validator->fails()) {
                        $skipped++;
                        continue;
                    }

                    $batchRows[] = [
                        ...$record,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    $created++;

                    if (count($batchRows) >= self::BATCH_SIZE) {
                        $this->flushBatch($batchRows);
                        $batchRows = [];
                    }
                }

                $processed++;

                if ($this->maybeReportProgress($import, $processed, $skipped, $created)) {
                    if ($batchRows !== []) {
                        $this->flushBatch($batchRows);
                    }

                    $import->update([
                        'processed_rows' => $processed,
                        'created_rows' => $created,
                        'skipped_rows' => $skipped,
                    ]);

                    $this->logAudit($import, sprintf(
                        'Cancelled Employee File Locator import: %d created, %d skipped before stopping.',
                        $created,
                        $skipped
                    ));

                    return;
                }
            }

            if ($batchRows !== []) {
                $this->flushBatch($batchRows);
            }

            $import->update([
                'status' => 'completed',
                'processed_rows' => count($physicalRows),
                'created_rows' => $created,
                'skipped_rows' => $skipped,
            ]);

            $this->logAudit($import, sprintf(
                'Imported Employee File Locator: %d created, %d skipped.',
                $created,
                $skipped
            ));
        } catch (\Throwable $exception) {
            $import->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);

            $this->logAudit($import, 'Employee File Locator import failed: ' . $exception->getMessage());

            throw $exception;
        }
    }

    private function flushBatch(array $batchRows): void
    {
        // A raw query-builder insert (not Eloquent::create) — no model
        // events fire either way, so there's nothing to suppress here
        // unlike the withoutActivityLogging() wrapper used elsewhere.
        DB::table('employee_file_locator')->insert($batchRows);
    }

    private function maybeReportProgress(Import $import, int $processed, int $skipped, int $created): bool
    {
        if ($processed % self::PROGRESS_EVERY !== 0) {
            return false;
        }

        $import->update([
            'processed_rows' => $processed,
            'created_rows' => $created,
            'skipped_rows' => $skipped,
        ]);

        return $import->fresh()->status === 'cancelled';
    }

    /**
     * Returns every non-blank physical data row (as raw column arrays)
     * found after the "NO." / "LAST NAME" header row.
     */
    private function readCsvRows(string $path): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new \RuntimeException('Could not open the stored CSV.');
        }

        $foundHeader = false;

        while (($line = fgetcsv($handle)) !== false) {
            $first = strtoupper(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) ($line[0] ?? ''))));
            $second = strtoupper(trim((string) ($line[1] ?? '')));

            if ($first === 'NO.' && $second === 'LAST NAME') {
                $foundHeader = true;
                break;
            }
        }

        if (! $foundHeader) {
            fclose($handle);
            throw new \RuntimeException('Could not find the NO. / LAST NAME header row.');
        }

        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            $isBlank = count(array_filter($line, fn ($v) => trim((string) $v) !== '')) === 0;

            if (! $isBlank) {
                $rows[] = $line;
            }
        }

        fclose($handle);

        return $rows;
    }

    /**
     * One physical row can yield up to two records: left block (Active)
     * and right block (Dead/Inactive). A side only produces a record if
     * it has a LAST NAME — this is what lets us ignore the right block's
     * dragged-down "NO." column on rows with no real dead-file data.
     */
    private function splitEmployeeFileRow(array $line): array
    {
        $rows = [];

        $left = $this->employeeFileSide($line, lastIdx: 1, firstIdx: 2, middleIdx: 3, areaIdx: 4, statusIdx: 5, defaultStatus: 'Active');
        if ($left !== null) {
            $rows[] = $left;
        }

        $right = $this->employeeFileSide($line, lastIdx: 8, firstIdx: 9, middleIdx: 10, areaIdx: 11, statusIdx: 12, defaultStatus: 'Inactive');
        if ($right !== null) {
            $rows[] = $right;
        }

        return $rows;
    }

    private function employeeFileSide(
        array $line,
        int $lastIdx,
        int $firstIdx,
        int $middleIdx,
        int $areaIdx,
        int $statusIdx,
        string $defaultStatus
    ): ?array {
        $lastName = trim((string) ($line[$lastIdx] ?? ''));

        if ($lastName === '') {
            return null;
        }

        $status = trim((string) ($line[$statusIdx] ?? ''));

        // The source sheet literally writes "Dead" in the right block's
        // STATUS column. The app's status filter only knows about
        // Active/Inactive, so "Dead" (however it's cased) is normalized
        // to "Inactive" on the way in — this covers both the literal
        // value and the empty-cell fallback.
        if ($status !== '' && strtolower($status) === 'dead') {
            $status = 'Inactive';
        }

        return [
            'last_name' => $lastName,
            'first_name' => trim((string) ($line[$firstIdx] ?? '')),
            'middle_name' => $this->nullableTrim($line[$middleIdx] ?? null),
            // Note: on the source sheet, the right (Dead) block's AREA
            // column literally reads "DEAD FILES" rather than a real
            // area code — that value is imported as-is here.
            'area' => trim((string) ($line[$areaIdx] ?? '')),
            // A handful of trailing dead-file rows in the source have
            // every column filled except STATUS — those still default
            // to 'Inactive' via $defaultStatus.
            'status' => $status !== '' ? $status : $defaultStatus,
        ];
    }

    private function nullableTrim($value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
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