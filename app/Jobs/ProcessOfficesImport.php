<?php

namespace App\Jobs;

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

/**
 * Queued CSV import for Offices — same shape as ProcessRrspImport /
 * ProcessRrppeImport / ProcessWmrImport / ProcessBonaVidaImport (Import
 * row for progress, cancellation checks, one audit entry for the whole
 * run), but simpler: one CSV row = one office, no header/item grouping.
 *
 * Kept separate from ImportController::offices() (the old synchronous
 * path) rather than replacing it outright — see the controller for
 * which one is wired to the route.
 */
class ProcessOfficesImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    private const PROGRESS_EVERY = 50;

    /** Header-name -> possible column titles (normalized: lowercase, letters/digits only). */
    private const COLUMNS = [
        'office_code' => ['officecode', 'code'],
        'office_name' => ['officename', 'name'],
        'entity_name' => ['entityname', 'entity'],
        'office_head' => ['officehead', 'head', 'chief', 'director'],
        'email' => ['email', 'emailaddress'],
    ];

    public function __construct(public int $importId, public bool $merge = true)
    {
    }

    public function handle(): void
    {
        $import = Import::findOrFail($this->importId);

        if ($import->status === 'cancelled') {
            $this->logAudit($import, 'Offices import cancelled before it started processing.');
            return;
        }

        $import->update(['status' => 'processing']);

        try {
            [$rows, $map] = $this->parseRows(Storage::path($import->file_path));
            $total = count($rows);

            $import->update(['total_rows' => $total]);

            [$created, $updated, $skipped, $cancelled] = Office::withoutActivityLogging(
                fn () => $this->processRows($import, $rows, $map)
            );

            if ($cancelled) {
                $this->logAudit($import, sprintf(
                    'Cancelled Offices import: %d created, %d updated, %d skipped before stopping.',
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
                'Imported Offices: %d created, %d updated, %d skipped.',
                $created, $updated, $skipped
            ));
        } catch (\Throwable $exception) {
            $import->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);

            $this->logAudit($import, 'Offices import failed: ' . $exception->getMessage());

            throw $exception;
        }
    }

    private function processRows(Import $import, array $rows, array $map): array
    {
        $created = $updated = $skipped = $processed = 0;

        // Single preload query instead of a ->where('office_code', ...)
        // ->first() per row — same idea as ProcessRrspImport's $existingByNo.
        $existingByCode = Office::withTrashed()
            ->get()
            ->keyBy('office_code');

        foreach ($rows as $line) {
            $processed++;

            $data = $this->rowData($line, $map);

            if ($data === null) {
                $skipped++;
            } else {
                DB::transaction(function () use ($data, &$created, &$updated, $existingByCode, $import, $processed) {
                    $office = $existingByCode->get($data['office_code']);

                    if ($office) {
                        if (! $this->merge) {
                            // merge off: leave the existing office untouched,
                            // don't count it as created/updated either.
                            return;
                        }

                        if ($office->trashed()) {
                            $office->restore();
                        }
                        $office->update($data);
                        $updated++;
                    } else {
                        $office = Office::create($data);
                        $created++;
                        $existingByCode->put($data['office_code'], $office);
                    }
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

        $import->update([
            'processed_rows' => $processed,
            'created_rows' => $created,
            'updated_rows' => $updated,
            'skipped_rows' => $skipped,
        ]);

        return [$created, $updated, $skipped, false];
    }

    /** Returns [rows, columnMap]. Every non-blank row after the header is one office. */
    private function parseRows(string $path): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new \RuntimeException('Could not open the stored CSV.');
        }

        $rows = [];
        $map = null;

        while (($line = fgetcsv($handle)) !== false) {
            if (count(array_filter($line, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            if ($map === null) {
                $map = $this->buildMap($line);
                continue;
            }

            $rows[] = $line;
        }

        fclose($handle);

        if ($map === null || $map['office_code'] === null || $map['office_name'] === null) {
            throw new \RuntimeException('Could not find the "Office Code" / "Office Name" header row.');
        }

        return [$rows, $map];
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
        }

        return $map;
    }

    private function rowData(array $line, array $map): ?array
    {
        $officeCode = $this->value($this->cell($line, $map, 'office_code'));
        $officeName = $this->value($this->cell($line, $map, 'office_name'));

        if ($officeCode === null || $officeName === null || strlen($officeCode) > 20) {
            return null;
        }

        $email = $this->value($this->cell($line, $map, 'email'));

        return [
            'office_code' => $officeCode,
            'office_name' => $officeName,
            'entity_name' => $this->value($this->cell($line, $map, 'entity_name')),
            'office_head' => $this->value($this->cell($line, $map, 'office_head')),
            'email' => ($email !== null && filter_var($email, FILTER_VALIDATE_EMAIL)) ? $email : null,
        ];
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

    private function value($value): ?string
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