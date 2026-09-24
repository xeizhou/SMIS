<?php

namespace App\Jobs;

use App\Models\Clearance;
use App\Models\ClearanceOffice;
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
 * Source CSV layout (see clearancesample.csv):
 *
 *   Row 1: "USeP Clearance Monitoring" (title)
 *   Row 2: NAME, COLLEGE/ OFFICE, CLAIM DATE, RECEIVED BY, STATUS, CLEARED, PENDING, REMARKS
 *   Row 3+: data.
 *
 * Column mapping:
 *   NAME            -> clearance.name
 *   COLLEGE/ OFFICE -> split on "/" or "-" into one or more offices
 *                      (e.g. "COE/KTTD" -> COE and KTTD as two separate
 *                      offices), each looked up / auto-created in
 *                      clearance_offices and attached via the
 *                      clearance_clearance_office pivot. Typo/spacing
 *                      variants of the same combo ("COE-KTTD",
 *                      "COE/KTTD", "KTTD/ COE") are normalized to the
 *                      same office set — see splitOffices()/officeKey().
 *   CLAIM DATE      -> clearance.claim_date (n/j/Y, e.g. "12/19/2023")
 *   RECEIVED BY     -> clearance.received_by. Despite the header, this
 *                      is who RELEASED the clearance to the person
 *                      (Released By), not who received something from
 *                      them — the sheet's own naming is just backwards.
 *                      No transformation needed, stored as-is.
 *   STATUS          -> clearance.form_attribute — this is the clearance
 *                      *type* (e.g. "retired"/"resignation"), not the
 *                      workflow status. Normalized via
 *                      formAttributeValue() so typo/wording variants of
 *                      the same type collapse to one canonical value —
 *                      e.g. "JO/COS", "JO / COS", "Job Order", "COS",
 *                      "Reliever" all become "jo/cos/reliever", and
 *                      "Teachers Clearance", "Teacher", "TEACHER'S
 *                      CLEARANCE" all become "teacher's clearance".
 *                      Anything that doesn't match a known pattern is
 *                      just lowercased and kept as-is.
 *   CLEARED         -> "TRUE"/"FALSE" -> clearance.cleared
 *   PENDING         -> ignored; clearance.status/pending are derived
 *                      instead, using the exact same rule as
 *                      ClearanceController::process(), so imported rows
 *                      land in the same states the UI can produce:
 *                        cleared=false            -> status=Pending,   pending=true,  claim_date=null
 *                        cleared=true + claim_date -> status=Completed, pending=false
 *                        cleared=true, no claim_date -> status=Cleared,  pending=true
 *   REMARKS         -> clearance.remarks
 *
 * This import always INSERTS — no dedup/merge key, same as the
 * Employee File Locator import.
 *
 * Unlike the batched raw-insert jobs (Bona-Vida, Employee File
 * Locator), each row here goes through Clearance::create() + a pivot
 * sync individually rather than a bulk insert, since the office
 * lookup/auto-create and the pivot attach both need the row's
 * resolved data and the newly created clearance_id. For the row
 * counts this app deals with, that's not a meaningful cost.
 */
class ProcessClearanceImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    private const PROGRESS_EVERY = 50;

    /**
     * form_attribute normalization rules, checked in order. Each entry
     * is [pattern, canonical value]; pattern is matched against the
     * lowercased, whitespace-collapsed STATUS cell. First match wins.
     *
     * Add new variants here rather than in formAttributeValue() itself
     * so the mapping stays a flat, scannable list.
     */
    private const FORM_ATTRIBUTE_PATTERNS = [
        // JO (Job Order) / COS (Contract of Service) / Reliever — these
        // three are treated as one clearance type in practice, however
        // the sheet happens to spell/combine them.
        '/\bjo\b|\bcos\b|job\s*order|contract\s*of\s*service|reliever/' => 'jo/cos/reliever',

        // Teacher's clearance — with or without the apostrophe/"'s",
        // with or without the trailing "clearance".
        '/\bteacher/' => "teacher's clearance",
    ];

    public function __construct(
        public int $importId,
    ) {
    }

    public function handle(): void
    {
        $import = Import::findOrFail($this->importId);

        if ($import->status === 'cancelled') {
            $this->logAudit($import, 'Clearance import cancelled before it started processing.');
            return;
        }

        $import->update(['status' => 'processing']);

        try {
            $path = Storage::path($import->file_path);

            [$headerLine, $totalRows] = $this->findHeaderAndCount($path);
            $import->update(['total_rows' => $totalRows]);

            $officeIdsByKey = ClearanceOffice::query()
                ->pluck('id', 'clearance_office_name')
                ->mapWithKeys(fn ($id, $name) => [$this->officeKey($name) => $id]);
            $officesCreated = 0;

            $created = 0;
            $skipped = 0;
            $processed = 0;

            $handle = $this->openCsv($path);
            $this->skipToHeader($handle, $headerLine);
            fgetcsv($handle);

            while (($line = fgetcsv($handle)) !== false) {
                $row = $this->mapReportRow($line);

                if ($row === null) {
                    $processed++;

                    if ($this->maybeStop($import, $processed, $skipped, $created, $officesCreated)) {
                        fclose($handle);
                        return;
                    }

                    continue;
                }

                $validator = Validator::make($row, [
                    'name' => 'required|string|max:100',
                    'offices' => 'required|array|min:1',
                    'received_by' => 'nullable|string|max:100',
                    'remarks' => 'nullable|string|max:255',
                    'form_attribute' => 'nullable|string|max:100',
                    'claim_date' => 'nullable|date',
                ]);

                if ($validator->fails()) {
                    $skipped++;
                    $processed++;

                    if ($this->maybeStop($import, $processed, $skipped, $created, $officesCreated)) {
                        fclose($handle);
                        return;
                    }

                    continue;
                }

                $officeIds = [];

                foreach ($row['offices'] as $officeName) {
                    $key = $this->officeKey($officeName);

                    if (! $officeIdsByKey->has($key)) {
                        $office = ClearanceOffice::firstOrCreate(
                            ['clearance_office_name' => $officeName]
                        );

                        $officeIdsByKey->put($key, $office->id);
                        $officesCreated++;
                    }

                    $officeIds[] = $officeIdsByKey->get($key);
                }

                $officeIds = array_values(array_unique($officeIds));

                [$status, $pending, $claimDate] = $this->deriveStatus($row['cleared'], $row['claim_date']);

                $clearance = Clearance::withoutActivityLogging(fn () => Clearance::create([
                    'name' => $row['name'],
                    'claim_date' => $claimDate,
                    'received_by' => $row['received_by'] ?? '',
                    'status' => $status,
                    'cleared' => $row['cleared'],
                    'pending' => $pending,
                    'remarks' => $row['remarks'],
                    'form_attribute' => $row['form_attribute'],
                ]));

                $clearance->offices()->sync($officeIds);

                $created++;
                $processed++;

                if ($this->maybeStop($import, $processed, $skipped, $created, $officesCreated)) {
                    fclose($handle);
                    return;
                }
            }

            fclose($handle);

            $import->update([
                'status' => 'completed',
                'processed_rows' => $totalRows,
                'created_rows' => $created,
                'skipped_rows' => $skipped,
            ]);

            $this->logAudit($import, sprintf(
                'Imported Clearance: %d created, %d skipped, %d office(s) auto-created.',
                $created,
                $skipped,
                $officesCreated
            ));
        } catch (\Throwable $exception) {
            $import->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);

            $this->logAudit($import, 'Clearance import failed: ' . $exception->getMessage());

            throw $exception;
        }
    }

    /**
     * Reports progress every PROGRESS_EVERY rows and, if the import has
     * since been cancelled, persists final counts + logs + returns true
     * so the caller can stop and close the handle.
     */
    private function maybeStop(Import $import, int $processed, int $skipped, int $created, int $officesCreated): bool
    {
        if ($processed % self::PROGRESS_EVERY !== 0) {
            return false;
        }

        $import->update([
            'processed_rows' => $processed,
            'created_rows' => $created,
            'skipped_rows' => $skipped,
        ]);

        if ($import->fresh()->status !== 'cancelled') {
            return false;
        }

        $this->logAudit($import, sprintf(
            'Cancelled Clearance import: %d created, %d skipped, %d office(s) auto-created before stopping.',
            $created,
            $skipped,
            $officesCreated
        ));

        return true;
    }

    /**
     * Same rule as ClearanceController::process(): cleared=false always
     * wins and clears the claim date, even if the sheet had one.
     *
     * @return array{0: string, 1: bool, 2: ?string} [status, pending, claim_date]
     */
    private function deriveStatus(bool $cleared, ?string $claimDate): array
    {
        if (! $cleared) {
            return ['Pending', true, null];
        }

        if ($claimDate !== null) {
            return ['Completed', false, $claimDate];
        }

        return ['Cleared', true, null];
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
                if (strtoupper(trim((string) ($line[0] ?? ''))) === 'NAME') {
                    $headerLine = $lineNumber;
                }

                continue;
            }

            if (trim((string) ($line[0] ?? '')) !== '') {
                $totalRows++;
            }
        }

        fclose($handle);

        if ($headerLine === null) {
            throw new \RuntimeException('Could not find the NAME header row.');
        }

        return [$headerLine, $totalRows];
    }

    /**
     * Returns null for a blank line (still counted toward processed/
     * total via the caller) or a row with no NAME/office.
     */
    private function mapReportRow(array $line): ?array
    {
        $name = trim((string) ($line[0] ?? ''));
        $rawOffice = trim((string) ($line[1] ?? ''));

        if ($name === '' || $rawOffice === '') {
            return null;
        }

        $offices = $this->splitOffices($rawOffice);

        if ($offices === []) {
            return null;
        }

        return [
            'name' => $name,
            'offices' => $offices,
            'claim_date' => $this->dateValue($line[2] ?? null),
            // Header says "RECEIVED BY" but this is actually who
            // RELEASED the clearance to the person (Released By).
            'received_by' => $this->nullableTrim($line[3] ?? null),
            'form_attribute' => $this->formAttributeValue($line[4] ?? null),
            'cleared' => $this->boolValue($line[5] ?? null),
            'remarks' => $this->nullableTrim($line[7] ?? null),
        ];
    }

    /**
     * The COLLEGE/OFFICE column sometimes packs more than one office
     * into a single cell, joined by "/" or "-" — e.g. "COE/KTTD" means
     * two offices, COE and KTTD, not one office literally named
     * "COE/KTTD". Split on either delimiter and dedupe the resulting
     * tokens against what's already been seen (case- and
     * whitespace-insensitively) so typo/spacing variants like
     * "COE-KTTD", "COE/KTTD", and "KTTD/ COE" all resolve to the same
     * two offices regardless of which order or delimiter the sheet used.
     *
     * Caveat: this assumes "-" is never part of a genuine single office
     * name in this sheet (none in the sample are). If a real office name
     * legitimately contains a hyphen, it would get incorrectly split —
     * worth a quick scan of the full file before running this at scale.
     */
    private function splitOffices(string $rawOffice): array
    {
        $tokens = preg_split('/[\/\-]+/', $rawOffice) ?: [];

        $seen = [];
        $offices = [];

        foreach ($tokens as $token) {
            $clean = preg_replace('/\s+/', ' ', trim($token));

            if ($clean === '' || $clean === null) {
                continue;
            }

            $key = $this->officeKey($clean);

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $offices[] = $clean;
        }

        return $offices;
    }

    /**
     * Normalized dedupe key for an office name/token — case-insensitive,
     * with internal whitespace collapsed, so "COE", " coe", and "COE "
     * all match the same office.
     */
    private function officeKey(string $officeName): string
    {
        return strtolower(preg_replace('/\s+/', ' ', trim($officeName)) ?? '');
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

    private function nullableTrim($value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }

    /**
     * Normalizes the STATUS cell (the clearance *type*) against
     * FORM_ATTRIBUTE_PATTERNS so wording/spacing variants of the same
     * type collapse to one canonical value — e.g. any of "JO/COS",
     * "JO / COS", "Job Order", "COS", "Reliever" become
     * "jo/cos/reliever"; any of "Teachers Clearance", "Teacher",
     * "TEACHER'S CLEARANCE" become "teacher's clearance". Falls back to
     * a plain lowercase of the original cell when nothing matches.
     */
    private function formAttributeValue($value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        $normalized = strtolower(preg_replace('/\s+/', ' ', $value) ?? $value);

        foreach (self::FORM_ATTRIBUTE_PATTERNS as $pattern => $canonical) {
            if (preg_match($pattern, $normalized) === 1) {
                return $canonical;
            }
        }

        return $normalized;
    }

    private function boolValue($value): bool
    {
        return strtoupper(trim((string) $value)) === 'TRUE';
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