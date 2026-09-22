<?php

namespace App\Jobs;

use App\Models\Import;
use App\Models\RrspMonitoring;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProcessRrspImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    /**
     * Touch the imports row / check cancellation every N RRSPs.
     *
     * This used to be 5 because the per-group ->where('rrsp_no', ...)
     * query plus per-row transaction made progress checks expensive
     * to skip. Now that lookups are preloaded (see $existingByNo in
     * processGroups()), the transaction is the only remaining cost
     * per record, so this can run at the same cadence as the other
     * imports.
     */
    private const PROGRESS_EVERY = 50;

    /** Header-name -> possible column titles (normalized: lowercase, letters/digits only). */
    private const COLUMNS = [
        'rrsp_no' => ['rrspno', 'rrspnumber'],
        'date' => ['date', 'datereceived'],
        'description' => ['itemdescription', 'description'],
        'quantity' => ['quantity', 'qty'],
        'property_no' => ['propertynumber', 'propertyno'],
        'end_user' => ['endusersname', 'endusername', 'enduser'],
        'cost' => ['cost', 'amount'],
        'office' => ['office'],
        'kind' => ['kindofsemiexpandable', 'kindofsemiexpendable', 'kind'],
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
            $this->logAudit($import, 'RRSP import cancelled before it started processing.');
            return;
        }

        $import->update(['status' => 'processing']);

        try {
            [$groups, $map] = $this->parseGroups(Storage::path($import->file_path));
            $total = count($groups);

            $import->update(['total_rows' => $total]);

            // One audit entry for the whole import instead of one per record.
            [$created, $updated, $skipped, $cancelled] = RrspMonitoring::withoutActivityLogging(
                fn () => $this->processGroups($import, $groups, $map)
            );

            if ($cancelled) {
                $this->logAudit($import, sprintf(
                    'Cancelled RRSP import: %d created, %d updated, %d skipped before stopping.',
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
                'Imported RRSP: %d created, %d updated, %d skipped.',
                $created, $updated, $skipped
            ));
        } catch (\Throwable $exception) {
            $import->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);

            $this->logAudit($import, 'RRSP import failed: ' . $exception->getMessage());

            throw $exception;
        }
    }

    private function processGroups(Import $import, array $groups, array $map): array
    {
        $created = $updated = $skipped = $processed = 0;

        /**
         * Single preload query instead of a `->where('rrsp_no', ...)
         * ->first()` per group — same idea as ProcessRegspiImport's
         * $existingKeys and ProcessWmrImport's $existingByNo. Keyed
         * by rrsp_no; keeps trashed rows so they can be restored
         * without a second query.
         */
        $existingByNo = RrspMonitoring::withTrashed()
            ->get()
            ->keyBy('rrsp_no');

        foreach ($groups as $group) {
            $processed++;

            $header = $this->headerData($group['head'], $map);

            if ($header === null || empty($group['items'])) {
                $skipped++;
            } else {
                DB::transaction(function () use ($header, $group, $map, &$created, &$updated, $existingByNo) {
                    $rrsp = $existingByNo->get($header['rrsp_no']);

                    if ($rrsp) {
                        if ($rrsp->trashed()) {
                            $rrsp->restore();
                        }
                        $rrsp->update($header);
                        $updated++;
                    } else {
                        $rrsp = RrspMonitoring::create($header);
                        $created++;

                        // Keep the map in sync so a duplicate rrsp_no
                        // later in the same file updates this record
                        // instead of creating a second one.
                        $existingByNo->put($header['rrsp_no'], $rrsp);
                    }

                    // Re-import safe: replace items instead of duplicating them
                    $rrsp->items()->delete();
                    $rrsp->items()->createMany(
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

        // Final progress write so any records processed since the
        // last PROGRESS_EVERY checkpoint aren't lost from the count
        // (mirrors ProcessRegspiImport/ProcessWmrImport's completed
        // branch, which always writes processed_rows on success).
        $import->update([
            'processed_rows' => $processed,
            'created_rows' => $created,
            'updated_rows' => $updated,
            'skipped_rows' => $skipped,
        ]);

        return [$created, $updated, $skipped, false];
    }

    /**
     * Returns [groups, columnMap]. A row with an RRSP no. starts a new
     * group; rows with a blank RRSP no. are extra items of the previous one.
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
                $first = $this->normalize($line[0] ?? '');

                if (in_array($first, self::COLUMNS['rrsp_no'], true)) {
                    $map = $this->buildMap($line);
                }

                continue;
            }

            $rrspNo = $this->rrspNo($this->cell($line, $map, 'rrsp_no'));
            $description = $this->value($this->cell($line, $map, 'description'));

            if ($rrspNo !== null) {
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
            throw new \RuntimeException('Could not find the "RRSP no." header row.');
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

            // Fallback: header that merely starts with the candidate (e.g. "Kind of Semi-Expandable Property")
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
        $rrspNo = $this->rrspNo($this->cell($line, $map, 'rrsp_no'));

        if ($rrspNo === null || strlen($rrspNo) > 50) {
            return null;
        }

        // po_number intentionally omitted: imported RRSPs have no PO, and
        // re-imports won't wipe a PO that was set manually later.
        return [
            'rrsp_no' => $rrspNo,
            'date_received' => $this->date($this->cell($line, $map, 'date')),
            'end_user_name' => $this->value($this->cell($line, $map, 'end_user')),
            'return_by' => $this->value($this->cell($line, $map, 'office')),
        ];
    }

    private function itemData(array $line, array $map): array
    {
        $property = $this->value($this->cell($line, $map, 'property_no'));
        $description = $this->value($this->cell($line, $map, 'description'));

        return [
            'item_name' => $this->itemName($description),
            'item_description' => $description,
            'quantity' => max(1, $this->integerValue($this->cell($line, $map, 'quantity'))),
            'property_no' => ($property !== null && strtoupper($property) === 'N/A') ? null : $property,
            'cost' => $this->numberValue($this->cell($line, $map, 'cost')),
            'kind_of_semi_expendable' => $this->value($this->cell($line, $map, 'kind')),
            'status' => $this->value($this->cell($line, $map, 'status')),
            'area' => $this->value($this->cell($line, $map, 'area')),
            'remarks' => $this->value($this->cell($line, $map, 'remarks')),
        ];
    }

    /**
     * Item name is the text before the first "," or ";" in the description
     * (that's how the bold item name was written in the source RRSP doc,
     * e.g. "SOFA, 3 seater color Green" -> "SOFA", "Acer; Computer Set,
     * Branded..." -> "Acer"). Falls back to the full description if neither
     * delimiter is present.
     */
    private function itemName(?string $description): ?string
    {
        if ($description === null) {
            return null;
        }

        if (preg_match('/^(.*?)[,]/', $description, $matches)) {
            return trim($matches[1]);
        }

        return $description;
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
    private function rrspNo($value): ?string
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