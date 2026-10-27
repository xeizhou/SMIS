<?php

namespace App\Services;

use App\Models\Import;
use App\Models\Office;
use App\Models\PoLetterMonitoring;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PoLetterImportService
{
    public const VALID_TYPES = [
        'EXTENSION',
        'WAIVER',
        'CANCELLATION',
        'REPLACEMENT/ALTERNATIVE OFFER',
    ];

    /**
     * Normalized aliases for column mapping across all PO Letter fields.
     */
    private const ALIASES = [
        'reference_no' => [
            'reference_no', 'reference_number', 'ref_no', 'ref_number',
            'referenceno', 'refno', 'ref_#', 'reference_#', 'ref#', 'ref',
            'reference', 'letter_ref', 'letter_reference', 'letter_no', 'letter_number',
        ],
        'po_number' => [
            'po_number', 'p_o_number', 'ponumber', 'po_no', 'pono',
            'purchase_order_number', 'purchase_order_no', 'po_#', 'po#', 'po',
        ],
        'type_of_letter' => [
            'type_of_letter', 'type', 'letter_type', 'typeofletter',
            'type_letter', 'letter_request_type', 'request_type',
        ],
        'status_of_the_letter' => [
            'status_of_the_letter', 'status', 'letter_status',
            'statusoftheletter', 'status_letter', 'letter_condition',
        ],
        'supplier' => [
            'supplier', 'supplier_name', 'suppliername', 'supplier_id',
            'vendor', 'vendor_name',
        ],
        'po_date' => [
            'po_date', 'p_o_date', 'podate', 'po_dt', 'date_of_po', 'date', 'order_date',
        ],
        'date_received_by_supplier' => [
            'date_received_by_supplier', 'date_received_supplier',
            'date_received_by_the_supplier', 'supplier_received_date', 'received_by_supplier_date',
            'date_received', 'received_date',
        ],
        'delivery_term' => [
            'delivery_term', 'delivery_term_days', 'term', 'terms',
            'delivery_terms', 'delivery_period', 'term_days',
        ],
        'due_date' => [
            'due_date', 'duedate', 'due_dt', 'delivery_due_date', 'deadline',
        ],
        'office_end_user' => [
            'office_end_user', 'end_user', 'enduser', 'office',
            'department', 'unit', 'office_code', 'office_name', 'requesting_office',
        ],
        'date_received_by_smu' => [
            'date_received_by_smu', 'received_by_smu', 'smu_received_date',
            'date_received_by_the_smu', 'date_smu_received', 'date_received_smu', 'smu_date',
        ],
        'date_forwarded_to_ovpad' => [
            'date_forwarded_to_ovpad', 'date_forwarded_ovpad',
            'forwarded_to_ovpad', 'ovpad_forwarded_date',
            'forwarded_ovpad', 'date_ovpad', 'ovpad_date',
        ],
        'received_by' => [
            'received_by', 'receivedby', 'recipient', 'receiver',
            'receiver_name', 'received_by_name',
        ],
        'document_link' => [
            'document_link', 'document_url', 'doc_link', 'link',
            'url', 'drive_link', 'attachment_link',
        ],
        'date_forwarded_to_end_user' => [
            'date_forwarded_to_end_user', 'date_forwarded_end_user',
            'forwarded_to_end_user', 'forwarded_end_user',
            'date_forwarded_to_the_end_user', 'date_to_end_user', 'end_user_forwarded_date',
        ],
        'remarks' => [
            'remarks', 'remark', 'notes', 'comments', 'comment',
            'description', 'justification',
        ],
    ];

    /**
     * Import an uploaded CSV or Excel file.
     *
     * @return array{created: int, updated: int, skipped: string[]}
     */
    public function importFile(UploadedFile $file, bool $mergeExisting = true): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        if (in_array($extension, ['xlsx', 'xls'], true)) {
            $rows = $this->readExcel($file->getRealPath());
        } else {
            $rows = $this->readCsv($file->getRealPath());
        }

        if (empty($rows)) {
            throw new \RuntimeException('No data rows found in the uploaded file.');
        }

        return $this->importRows($rows, $mergeExisting);
    }

    /**
     * Process an Import model job in the background with progress reporting and cancellation checks.
     */
    public function runQueued(Import $import, bool $mergeExisting = true): void
    {
        $import->update(['status' => 'processing']);

        try {
            $path = Storage::path($import->file_path);
            $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

            if (in_array($extension, ['xlsx', 'xls'], true)) {
                $rows = $this->readExcel($path);
            } else {
                $rows = $this->readCsv($path);
            }

            $total = count($rows);
            $import->update(['total_rows' => $total]);

            $result = $this->importRows($rows, $mergeExisting, function ($processed, $created, $updated, $skippedCount, $total) use ($import) {
                if ($processed > 0 && ($processed % 25 === 0 || $processed === $total)) {
                    if ($import->fresh()->status === 'cancelled') {
                        $this->logAudit($import, sprintf(
                            'Cancelled PO Letter import: %d created, %d updated, %d skipped.',
                            $created, $updated, $skippedCount
                        ));

                        return false;
                    }

                    $import->update([
                        'processed_rows' => $processed,
                        'created_rows' => $created,
                        'updated_rows' => $updated,
                        'skipped_rows' => $skippedCount,
                    ]);
                }

                return true;
            });

            if ($import->fresh()->status === 'cancelled') {
                return;
            }

            $import->update([
                'status' => 'completed',
                'processed_rows' => $total,
                'created_rows' => $result['created'],
                'updated_rows' => $result['updated'],
                'skipped_rows' => count($result['skipped']),
            ]);

            $this->logAudit($import, sprintf(
                'Imported PO Letters: %d created, %d updated, %d skipped.',
                $result['created'], $result['updated'], count($result['skipped'])
            ));
        } catch (\Throwable $e) {
            $import->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            $this->logAudit($import, 'PO Letter import failed: '.$e->getMessage());
            throw $e;
        }
    }

    /**
     * Read Excel file into an array of associative rows.
     */
    private function readExcel(string $filePath): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $worksheet = $spreadsheet->getActiveSheet();
        $raw = $worksheet->toArray(null, true, true, false);

        return $this->rowsFromTable($raw);
    }

    /**
     * Read CSV file into an array of associative rows.
     */
    private function readCsv(string $filePath): array
    {
        $handle = fopen($filePath, 'rb');
        if ($handle === false) {
            throw new \RuntimeException('Could not open the uploaded CSV file.');
        }

        $firstLine = (string) fgets($handle);
        rewind($handle);

        $delimiter = $this->detectDelimiter($firstLine);

        $raw = [];
        while (($line = fgetcsv($handle, 0, $delimiter, '"', '\\')) !== false) {
            $raw[] = $line;
        }

        fclose($handle);

        if (! empty($raw) && isset($raw[0][0])) {
            $raw[0][0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $raw[0][0]);
        }

        return $this->rowsFromTable($raw);
    }

    /**
     * Detect CSV delimiter from first line.
     */
    private function detectDelimiter(string $line): string
    {
        $delimiter = ',';
        $highest = 0;

        foreach ([',', ';', "\t", '|'] as $candidate) {
            $count = substr_count($line, $candidate);
            if ($count > $highest) {
                $delimiter = $candidate;
                $highest = $count;
            }
        }

        return $delimiter;
    }

    /**
     * Turn raw 2D array into associative rows with header keys.
     */
    private function rowsFromTable(array $raw): array
    {
        if (count($raw) < 2) {
            return [];
        }

        $headerIndex = 0;
        foreach ($raw as $idx => $row) {
            $nonEmpty = array_filter($row, fn ($cell) => $cell !== null && trim((string) $cell) !== '');
            if (count($nonEmpty) >= 2) {
                $headerIndex = $idx;
                break;
            }
        }

        $headers = array_map(fn ($h) => trim((string) $h), $raw[$headerIndex]);
        $rows = [];

        foreach (array_slice($raw, $headerIndex + 1) as $lineIndex => $line) {
            if (count(array_filter($line, fn ($v) => $v !== null && trim((string) $v) !== '')) === 0) {
                continue;
            }

            $row = [];
            foreach ($headers as $idx => $key) {
                if ($key === '') {
                    continue;
                }

                $value = $line[$idx] ?? null;
                $row[$key] = ($value === null || trim((string) $value) === '')
                    ? null
                    : (is_string($value) ? trim($value) : $value);
            }

            $row['_row_number'] = $headerIndex + $lineIndex + 2;
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * Normalize row keys using self::ALIASES.
     */
    private function normalizeRow(array $row): array
    {
        $normalized = [];
        $lookup = [];

        foreach ($row as $k => $v) {
            $cleanKey = strtolower(trim((string) $k));
            $cleanKey = preg_replace('/[^a-z0-9_#]/', '_', $cleanKey);
            $cleanKey = preg_replace('/_+/', '_', $cleanKey);
            $cleanKey = trim($cleanKey, '_');
            $lookup[$cleanKey] = $v;
        }

        foreach (self::ALIASES as $targetField => $aliases) {
            foreach ($aliases as $alias) {
                $cleanAlias = strtolower(trim($alias));
                $cleanAlias = preg_replace('/[^a-z0-9_#]/', '_', $cleanAlias);
                $cleanAlias = preg_replace('/_+/', '_', $cleanAlias);
                $cleanAlias = trim($cleanAlias, '_');

                if (array_key_exists($cleanAlias, $lookup) && $lookup[$cleanAlias] !== null) {
                    $normalized[$targetField] = $lookup[$cleanAlias];
                    break;
                }
            }
        }

        return $normalized;
    }

    /**
     * Normalize Type of Letter to standard enum.
     */
    private function normalizeTypeOfLetter(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $upper = strtoupper(trim($raw));

        if (str_contains($upper, 'EXT')) {
            return 'EXTENSION';
        }
        if (str_contains($upper, 'WAIV')) {
            return 'WAIVER';
        }
        if (str_contains($upper, 'CANCEL')) {
            return 'CANCELLATION';
        }
        if (str_contains($upper, 'REPLACE') || str_contains($upper, 'ALTERNAT') || str_contains($upper, 'OFFER')) {
            return 'REPLACEMENT/ALTERNATIVE OFFER';
        }

        return in_array($upper, self::VALID_TYPES, true) ? $upper : null;
    }

    /**
     * Normalize status of letter.
     */
    private function normalizeStatus(?string $raw): string
    {
        if ($raw === null || trim($raw) === '') {
            return 'APPROVED';
        }

        $upper = strtoupper(trim($raw));

        if (str_contains($upper, 'DISAPPROV') || str_contains($upper, 'REJECT')) {
            return 'DISAPPROVED';
        }
        if (str_contains($upper, 'APPROV')) {
            return 'APPROVED';
        }
        if (str_contains($upper, 'PEND')) {
            return 'PENDING';
        }

        return substr($upper, 0, 50);
    }

    /**
     * Process array of associative rows and persist into database.
     *
     * @param  (callable(int, int, int, int, int): bool)|null  $progressCallback
     * @return array{created: int, updated: int, skipped: string[]}
     */
    public function importRows(array $rows, bool $mergeExisting = true, ?callable $progressCallback = null): array
    {
        $suppliersByName = Supplier::select('supplier_id', 'supplier_name')
            ->get()
            ->keyBy(fn ($s) => strtolower(trim($s->supplier_name)));

        $suppliersById = Supplier::select('supplier_id', 'supplier_name')
            ->get()
            ->keyBy('supplier_id');

        $officesByCode = Office::select('office_code', 'office_name')
            ->get()
            ->keyBy(fn ($o) => strtolower(trim($o->office_code)));

        $officesByName = Office::select('office_code', 'office_name')
            ->get()
            ->keyBy(fn ($o) => strtolower(trim($o->office_name)));

        $existingServePos = ServePo::select(
            'po_number',
            'supplier_id',
            'po_date',
            'po_received_date',
            'end_user',
            'delivery_term'
        )->get()->keyBy('po_number');

        $created = 0;
        $updated = 0;
        $skipped = [];
        $importKeyOccurrences = [];

        PoLetterMonitoring::withoutActivityLogging(function () use (
            $rows,
            $mergeExisting,
            $progressCallback,
            &$suppliersByName,
            &$suppliersById,
            &$officesByCode,
            &$officesByName,
            &$existingServePos,
            &$created,
            &$updated,
            &$skipped,
            &$importKeyOccurrences
        ) {
            foreach ($rows as $index => $rawRow) {
                $rowNumber = isset($rawRow['_row_number']) ? (int) $rawRow['_row_number'] : $index + 2;
                $row = $this->normalizeRow($rawRow);

                $poNumber = isset($row['po_number']) ? trim((string) $row['po_number']) : '';

                if ($poNumber === '') {
                    $skipped[] = "Row #{$rowNumber}: Skipped because PO Number is missing.";

                    continue;
                }

                $rawType = $row['type_of_letter'] ?? null;
                $typeOfLetter = $this->normalizeTypeOfLetter($rawType ? (string) $rawType : null);

                if (! $typeOfLetter) {
                    if (empty($rawType)) {
                        $skipped[] = "Row #{$rowNumber}: Skipped because Type of Letter is missing.";
                    } else {
                        $skipped[] = "Row #{$rowNumber}: Invalid letter type '{$rawType}'. Must be EXTENSION, WAIVER, CANCELLATION, or REPLACEMENT/ALTERNATIVE OFFER.";
                    }

                    continue;
                }

                $rowSignature = hash('sha256', serialize($row));
                $importKeyOccurrences[$rowSignature] = ($importKeyOccurrences[$rowSignature] ?? 0) + 1;
                $importKey = hash('sha256', $rowSignature.'|'.$importKeyOccurrences[$rowSignature]);

                // Reference linked ServePo if available
                $linkedPo = $existingServePos->get($poNumber);

                // Supplier resolution
                $supplierId = null;
                if (! empty($row['supplier'])) {
                    $supplierVal = trim((string) $row['supplier']);
                    if (is_numeric($supplierVal) && isset($suppliersById[(int) $supplierVal])) {
                        $supplierId = (int) $supplierVal;
                    } else {
                        $supplierLower = strtolower($supplierVal);
                        if (isset($suppliersByName[$supplierLower])) {
                            $supplierId = $suppliersByName[$supplierLower]->supplier_id;
                        } else {
                            $newSupplier = Supplier::create([
                                'supplier_name' => $supplierVal,
                                'status' => 'active',
                            ]);
                            $supplierId = $newSupplier->supplier_id;
                            $suppliersByName[$supplierLower] = $newSupplier;
                            $suppliersById[$newSupplier->supplier_id] = $newSupplier;
                        }
                    }
                } elseif ($linkedPo?->supplier_id) {
                    $supplierId = $linkedPo->supplier_id;
                }

                // If still missing supplier, ensure we have a fallback supplier to fulfill not-null DB constraint
                if (! $supplierId) {
                    $firstSupplier = Supplier::first();
                    if ($firstSupplier) {
                        $supplierId = $firstSupplier->supplier_id;
                    } else {
                        $newSupplier = Supplier::create([
                            'supplier_name' => 'General Supplier',
                            'status' => 'active',
                        ]);
                        $supplierId = $newSupplier->supplier_id;
                        $suppliersByName[strtolower('General Supplier')] = $newSupplier;
                        $suppliersById[$newSupplier->supplier_id] = $newSupplier;
                    }
                }

                // Office / End User resolution
                $officeEndUser = null;
                if (! empty($row['office_end_user'])) {
                    $officeVal = trim((string) $row['office_end_user']);
                    $officeLower = strtolower($officeVal);
                    if (isset($officesByCode[$officeLower])) {
                        $officeEndUser = $officesByCode[$officeLower]->office_code;
                    } elseif (isset($officesByName[$officeLower])) {
                        $officeEndUser = $officesByName[$officeLower]->office_code;
                    } else {
                        $officeEndUser = substr($officeVal, 0, 100);
                    }
                } elseif ($linkedPo?->end_user) {
                    $officeEndUser = substr($linkedPo->end_user, 0, 100);
                } else {
                    $officeEndUser = 'General';
                }

                // Parse dates
                $poDate = $this->parseDate($row['po_date'] ?? null);
                if (! $poDate && $linkedPo?->po_date) {
                    $poDate = $linkedPo->po_date->format('Y-m-d');
                }
                if (! $poDate) {
                    $poDate = now()->format('Y-m-d');
                }

                $dateReceivedBySupplier = $this->parseDate($row['date_received_by_supplier'] ?? null);
                if (! $dateReceivedBySupplier && $linkedPo?->po_received_date) {
                    $dateReceivedBySupplier = $linkedPo->po_received_date->format('Y-m-d');
                }

                $dueDate = $this->parseDate($row['due_date'] ?? null);

                // Delivery term calculation or fallback
                $deliveryTerm = null;
                if (! empty($row['delivery_term']) && preg_match('/\d+/', (string) $row['delivery_term'], $termMatch)) {
                    $deliveryTerm = (int) $termMatch[0];
                } elseif ($dateReceivedBySupplier && $dueDate) {
                    $deliveryTerm = max(0, Carbon::parse($dateReceivedBySupplier)->diffInDays(Carbon::parse($dueDate)));
                } elseif ($linkedPo?->delivery_term !== null) {
                    $deliveryTerm = (int) $linkedPo->delivery_term;
                } else {
                    $deliveryTerm = 0;
                }

                // If due_date was not given but dateReceivedBySupplier and deliveryTerm exist, compute due_date
                if (! $dueDate && $dateReceivedBySupplier && $deliveryTerm > 0) {
                    $dueDate = Carbon::parse($dateReceivedBySupplier)->addDays($deliveryTerm)->format('Y-m-d');
                }

                $dateReceivedBySmu = $this->parseDate($row['date_received_by_smu'] ?? null);
                $dateForwardedToOvpad = $this->parseDate($row['date_forwarded_to_ovpad'] ?? null);
                $dateForwardedToEndUser = $this->parseDate($row['date_forwarded_to_end_user'] ?? null);

                $statusOfTheLetter = $this->normalizeStatus($row['status_of_the_letter'] ?? null);

                $referenceNo = ! empty($row['reference_no'])
                    ? substr(trim((string) $row['reference_no']), 0, 50)
                    : null;

                $receivedBy = ! empty($row['received_by'])
                    ? substr(trim((string) $row['received_by']), 0, 50)
                    : null;

                $documentLink = ! empty($row['document_link'])
                    ? substr(trim((string) $row['document_link']), 0, 500)
                    : null;

                $remarks = ! empty($row['remarks'])
                    ? trim((string) $row['remarks'])
                    : null;

                // Ensure linked ServePo exists to satisfy foreign key constraint
                if (! $linkedPo) {
                    ServePo::withoutActivityLogging(function () use (
                        $poNumber,
                        $poDate,
                        $supplierId,
                        $officeEndUser,
                        $dateReceivedBySupplier,
                        $deliveryTerm,
                        &$existingServePos
                    ) {
                        $newPo = ServePo::create([
                            'po_number' => substr($poNumber, 0, 50),
                            'po_date' => $poDate,
                            'supplier_id' => $supplierId,
                            'end_user' => substr($officeEndUser, 0, 150),
                            'po_received_date' => $dateReceivedBySupplier,
                            'delivery_term' => $deliveryTerm,
                            'po_step' => 'PO From VPAD',
                        ]);
                        $existingServePos->put($poNumber, $newPo);
                    });
                }

                $attributes = [
                    'reference_no' => $referenceNo,
                    'import_key' => $importKey,
                    'supplier_id' => $supplierId,
                    'po_number' => substr($poNumber, 0, 50),
                    'po_date' => $poDate,
                    'date_received_by_supplier' => $dateReceivedBySupplier,
                    'delivery_term' => $deliveryTerm,
                    'due_date' => $dueDate,
                    'office_end_user' => substr($officeEndUser, 0, 100),
                    'type_of_letter' => $typeOfLetter,
                    'date_received_by_smu' => $dateReceivedBySmu,
                    'date_forwarded_to_ovpad' => $dateForwardedToOvpad,
                    'received_by' => $receivedBy,
                    'status_of_the_letter' => $statusOfTheLetter,
                    'document_link' => $documentLink,
                    'date_forwarded_to_end_user' => $dateForwardedToEndUser,
                    'remarks' => $remarks,
                ];

                $existingLetter = PoLetterMonitoring::where('import_key', $importKey)->first();
                if (! $existingLetter) {
                    $existingLetter = PoLetterMonitoring::where('po_number', $attributes['po_number'])
                        ->where('type_of_letter', $attributes['type_of_letter'])
                        ->whereNull('import_key')
                        ->first();
                }

                if ($existingLetter) {
                    if (! $mergeExisting) {
                        $skipped[] = "Row #{$rowNumber}: PO Letter for '{$attributes['po_number']}' ({$attributes['type_of_letter']}) already exists (skipped).";

                        continue;
                    }

                    $updateData = array_filter($attributes, fn ($val) => $val !== null);
                    $existingLetter->update($updateData);
                    $updated++;
                } else {
                    PoLetterMonitoring::create($attributes);
                    $created++;
                }

                if ($progressCallback !== null) {
                    $shouldContinue = $progressCallback($index + 1, $created, $updated, count($skipped), count($rows));
                    if ($shouldContinue === false) {
                        break;
                    }
                }
            }
        });

        // Audit Log
        if (Auth::check()) {
            DB::table('audit_logs')->insert([
                'log_timestamp' => now(),
                'userID' => Auth::id(),
                'role' => Auth::user()->role ?? 'user',
                'action' => sprintf(
                    'Imported PO Letters: %d created, %d updated, %d skipped.',
                    $created,
                    $updated,
                    count($skipped)
                ),
            ]);
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
        ];
    }

    /**
     * Parse date value to Y-m-d.
     */
    private function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            try {
                return Date::excelToDateTimeObject((float) $value)->format('Y-m-d');
            } catch (\Throwable) {
                // fallback
            }
        }

        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Template headers for PO Letter Monitoring import.
     */
    public function getTemplateHeaders(): array
    {
        return [
            'REFERENCE NO.',
            'SUPPLIER',
            'P.O NUMBER',
            'P.O DATE',
            'DATE RECEIVED BY THE SUPPLIER',
            'DELIVERY TERM',
            'DUE DATE',
            'OFFICE/ END-USER',
            'TYPE OF LETTER',
            'DATE RECEIVED BY THE SMU',
            'DATE FORWARDED TO OVPAD',
            'RECEIVED BY',
            'STATUS OF THE LETTER',
            'LINK',
            'DATE FORWARDED TO THE END-USER',
            'REMARKS',
        ];
    }

    /**
     * Sample template rows demonstrating PO letter values.
     */
    public function getExampleRows(): array
    {
        return [
            [
                '',
                'Sample Supplier Inc.',
                'PO-2026-0001',
                '1/15/2026',
                '1/20/2026',
                '30 Days',
                '2/19/2026',
                'OFC-01',
                'EXTENSION',
                '1/22/2026',
                '1/25/2026',
                'JOHN DOE',
                'APPROVED',
                '[VIEW HERE]',
                '',
                'Approved 15-day extension due to port congestion delay',
            ],
            [
                '',
                'Tech Solutions Co.',
                'PO-2026-0002',
                '2/1/2026',
                '2/5/2026',
                '45 Days',
                '3/22/2026',
                'CED',
                'WAIVER',
                '2/10/2026',
                '2/12/2026',
                'MARIA SANTOS',
                'DISAPPROVED',
                '[VIEW HERE]',
                '',
                'Waiver request rejected per BAC resolution',
            ],
            [
                '',
                'Global Trade Partners',
                'PO-2026-0003',
                '2/15/2026',
                '2/20/2026',
                '15 Days',
                '3/7/2026',
                'ITRC',
                'CANCELLATION',
                '2/22/2026',
                '2/24/2026',
                'JUAN DELA CRUZ',
                'APPROVED',
                '[VIEW HERE]',
                '2026-02-28',
                'PO cancelled due to vendor inability to supply items',
            ],
            [
                '',
                'Prime Office Supplies',
                'PO-2026-0004',
                '3/1/2026',
                '3/5/2026',
                '30 Days',
                '4/4/2026',
                'HRMD',
                'REPLACEMENT/ALTERNATIVE OFFER',
                '3/8/2026',
                '3/10/2026',
                'ANA REYES',
                'APPROVED',
                '[VIEW HERE]',
                '2026-03-15',
                'Alternative item accepted with equivalent technical specifications',
            ],
        ];
    }

    /**
     * Preview payload for JSON inspection.
     */
    public function getTemplatePreview(): array
    {
        $headers = $this->getTemplateHeaders();
        $rows = $this->getExampleRows();
        $jsonRows = array_map(fn ($r) => array_combine($headers, $r), $rows);

        return [
            'headers' => $headers,
            'rows' => $rows,
            'json' => json_encode(
                ['data' => $jsonRows],
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
            ),
        ];
    }

    /**
     * Download CSV template.
     */
    public function downloadTemplate(?string $format = 'csv'): StreamedResponse
    {
        $headers = $this->getTemplateHeaders();
        $rows = $this->getExampleRows();

        return response()->streamDownload(function () use ($headers, $rows) {
            $handle = fopen('php://output', 'wb');
            if ($handle === false) {
                throw new \RuntimeException('Could not write the PO letter import template.');
            }

            fputcsv($handle, ['', '', 'REGULAR P.O']);
            fputcsv($handle, ['', '', 'CONSOLIDATED']);
            fputcsv($handle, $headers);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, 'po_letters_import_template.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
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
