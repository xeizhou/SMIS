<?php

namespace App\Jobs;

use App\Models\Import;
use App\Models\RRPPEMonitoring;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProcessRrppeImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    /**
     * Touch the imports row / check cancellation every N records.
     *
     * Was 5 because the per-group ->where('rrppe_no', ...) query plus
     * per-row transaction made progress checks expensive to skip. Now
     * that the lookup is preloaded (see $existingByNo in
     * processGroups()), this can run at the same cadence as the other
     * imports.
     */
    private const PROGRESS_EVERY = 50;

    /** Field -> possible column titles (normalized: lowercase, letters/digits only). */
    private const COLUMNS = [
        'rrppe_no' => ['rrppeno', 'rrppenumber'],
        'date' => ['date', 'datereceived'],
        'description' => ['itemdescription', 'description'],
        'quantity' => ['quantity', 'qty'],
        'property_no' => ['propertynumber', 'propertyno'],
        'end_user' => ['endusersname', 'endusername', 'enduser'],
        'cost' => ['cost', 'amount'],
        'office' => ['office', 'returnby'],
        'status' => ['status'],
        'area' => ['area'],
        'remarks' => ['remarks'],
    ];

    public function __construct(public int $importId)
    {
    }

    public function handle(): void
    {
        $import = Import::findOrFail($this->importId);

        if ($import->status === 'cancelled') {
            $this->logAudit($import, 'RRPPE import cancelled before it started processing.');
            return;
        }

        $import->update(['status' => 'processing']);

        try {
            [$groups, $map] = $this->parseGroups(Storage::path($import->file_path));
            $total = count($groups);

            $import->update(['total_rows' => $total]);

            [$created, $updated, $skipped, $cancelled] = RRPPEMonitoring::withoutActivityLogging(
                fn () => $this->processGroups($import, $groups, $map)
            );

            if ($cancelled) {
                $this->logAudit($import, sprintf(
                    'Cancelled RRPPE import: %d created, %d updated, %d skipped before stopping.',
                    $created, $updated, $skipped
                ));
                return;
            }

            $import->update([
                'status' => 'completed',
                'processed_rows' => $total,
                'created_rows' => $created,
                'updated_rows' => $updated,
                'skipped_rows' => $skipped,
            ]);

            $this->logAudit($import, sprintf(
                'Imported RRPPE: %d created, %d updated, %d skipped.',
                $created, $updated, $skipped
            ));
        } catch (\Throwable $exception) {
            $import->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);

            $this->logAudit($import, 'RRPPE import failed: ' . $exception->getMessage());

            throw $exception;
        }
    }

    private function processGroups(Import $import, array $groups, array $map): array
    {
        $created = $updated = $skipped = $processed = 0;

        /**
         * Single preload query instead of a `->where('rrppe_no', ...)
         * ->first()` per group — same pattern as ProcessRegspiImport's
         * $existingKeys, ProcessWmrImport's $existingByNo, and
         * ProcessRrspImport's $existingByNo. Keyed by rrppe_no; keeps
         * trashed rows so they can be restored without a second query.
         */
        $existingByNo = RRPPEMonitoring::withTrashed()
            ->get()
            ->keyBy('rrppe_no');

        foreach ($groups as $group) {
            $processed++;

            $header = $this->headerData($group['head'], $map);

            if ($header === null || empty($group['items'])) {
                $skipped++;
            } else {
                DB::transaction(function () use ($header, $group, $map, &$created, &$updated, $existingByNo) {
                    $record = $existingByNo->get($header['rrppe_no']);

                    if ($record) {
                        if ($record->trashed()) {
                            $record->restore();
                        }
                        $record->update($header);
                        $updated++;
                    } else {
                        $record = RRPPEMonitoring::create($header);
                        $created++;

                        // Keep the map in sync so a duplicate rrppe_no
                        // later in the same file updates this record
                        // instead of creating a second one.
                        $existingByNo->put($header['rrppe_no'], $record);
                    }

                    // Re-import safe: replace items instead of duplicating them
                    $record->items()->delete();
                    $record->items()->createMany(
                        array_map(fn ($line) => $this->itemData($line, $map), $group['items'])
                    );
                });
            }

            if ($processed % self::PROGRESS_EVERY === 0) {
                $import->update([
                    'processed_rows' => $processed,
                    'created_rows' => $created,
                    'updated_rows' => $updated,
                    'skipped_rows' => $skipped,
                ]);

                if ($import->fresh()->status === 'cancelled') {
                    return [$created, $updated, $skipped, true];
                }
            }
        }

        // Final progress write so records processed since the last
        // PROGRESS_EVERY checkpoint aren't lost from the count
        // (mirrors the "completed" branch in handle(), which always
        // writes processed_rows on success).
        $import->update([
            'processed_rows' => $processed,
            'created_rows' => $created,
            'updated_rows' => $updated,
            'skipped_rows' => $skipped,
        ]);

        return [$created, $updated, $skipped, false];
    }

    /**
     * Returns [groups, columnMap]. A row with an RRPPE no. starts a new
     * group; rows with a blank RRPPE no. are extra items of the previous one.
     */
    private function parseGroups(string $path): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new \RuntimeException('Could not open the stored CSV.');
        }

        $groups = [];
        $current = null;
        $map = null;

        while (($line = fgetcsv($handle)) !== false) {
            if ($map === null) {
                if (in_array($this->normalize($line[0] ?? ''), self::COLUMNS['rrppe_no'], true)) {
                    $map = $this->buildMap($line);
                }

                continue;
            }

            $no = $this->docNo($this->cell($line, $map, 'rrppe_no'));
            $description = $this->value($this->cell($line, $map, 'description'));

            if ($no !== null) {
                $groups[] = ['head' => $line, 'items' => []];
                $current = array_key_last($groups);
            }

            if ($current === null || $description === null) {
                continue;
            }

            $groups[$current]['items'][] = $line;
        }

        fclose($handle);

        if ($map === null) {
            throw new \RuntimeException('Could not find the "RRPPE no." header row.');
        }

        return [$groups, $map];
    }

    private function buildMap(array $headerLine): array
    {
        $normalized = array_map(fn ($h) => $this->normalize($h), $headerLine);
        $map = [];

        foreach (self::COLUMNS as $field => $candidates) {
            $map[$field] = null;

            foreach ($candidates as $candidate) {
                $index = array_search($candidate, $normalized, true);
                if ($index !== false) {
                    $map[$field] = $index;
                    break;
                }
            }

            // Fallback: header that merely starts with the candidate
            if ($map[$field] === null) {
                foreach ($normalized as $index => $name) {
                    foreach ($candidates as $candidate) {
                        if ($name !== '' && str_starts_with($name, $candidate)) {
                            $map[$field] = $index;
                            break 2;
                        }
                    }
                }
            }
        }

        return $map;
    }

    private function headerData(array $line, array $map): ?array
    {
        $no = $this->docNo($this->cell($line, $map, 'rrppe_no'));

        if ($no === null || strlen($no) > 50) {
            return null;
        }

        return [
            'rrppe_no' => $no,
            'date_received' => $this->date($this->cell($line, $map, 'date')),
            'end_user_name' => $this->value($this->cell($line, $map, 'end_user')),
            'return_by' => $this->value($this->cell($line, $map, 'office')),
        ];
    }

    private function itemData(array $line, array $map): array
    {
        $description = $this->value($this->cell($line, $map, 'description'));
        $property = $this->value($this->cell($line, $map, 'property_no'));

        return [
            // No stock card in the CSV: stock_no stays null.
            'stock_no' => null,
            'item_name' => $this->itemName($description),
            'item_description' => $description,
            'quantity' => max(1, $this->integerValue($this->cell($line, $map, 'quantity'))),
            'property_no' => ($property !== null && strtoupper($property) === 'N/A') ? null : $property,
            'cost' => $this->numberValue($this->cell($line, $map, 'cost')),
            'status' => $this->value($this->cell($line, $map, 'status')),
            'area' => $this->value($this->cell($line, $map, 'area')),
            'remarks' => $this->value($this->cell($line, $map, 'remarks')),
        ];
    }

    /**
     * Item name is the text before the first "," in the description
     * (that's how the bold item name was written in the source RRPPE
     * doc, e.g. "REFRIGERATOR, 19 cu.ft" -> "REFRIGERATOR"). Falls back
     * to the full description if there's no comma.
     */
    private function itemName(?string $description): ?string
    {
        if ($description === null) {
            return null;
        }

        if (preg_match('/^(.*?),/', $description, $matches)) {
            return mb_substr(trim($matches[1]), 0, 255);
        }

        return mb_substr($description, 0, 255);
    }

    private function cell(array $line, array $map, string $field)
    {
        $index = $map[$field] ?? null;

        return $index === null ? null : ($line[$index] ?? null);
    }

    private function normalize($value): string
    {
        $value = preg_replace('/^\xEF\xBB\xBF/', '', (string) $value);

        return preg_replace('/[^a-z0-9]/', '', strtolower($value));
    }

    /** "2026-01-0001.pdf" -> "2026-01-0001" */
    private function docNo($value): ?string
    {
        $value = $this->value($value);

        return $value === null ? null : preg_replace('/\.pdf$/i', '', $value);
    }

    private function date($value): ?string
    {
        $value = $this->value($value);

        if ($value === null) {
            return null;
        }

        try {
            return Carbon::createFromFormat('n/j/Y', $value)->toDateString();
        } catch (\Throwable) {
            try {
                return Carbon::parse($value)->toDateString();
            } catch (\Throwable) {
                return null;
            }
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

        return is_numeric($value) ? (int) $value : 0;
    }

    /** Handles "23,660.72", "N/A", "4,600.00 each" -> float|null */
    private function numberValue($value): ?float
    {
        if (! preg_match('/[\d,]+(\.\d+)?/', (string) $value, $m)) {
            return null;
        }

        $number = str_replace(',', '', $m[0]);

        return is_numeric($number) ? (float) $number : null;
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