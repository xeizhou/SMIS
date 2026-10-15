<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\Import;
use App\Models\Office;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DeliveryImportService
{
    public const VALID_STATUSES = [
        'PENDING',
        'PARTIAL',
        'COMPLETE',
        'CANCELLED',
    ];

    /**
     * Normalized aliases for column mapping across all Delivery fields.
     */
    private const ALIASES = [
        'delivery_id' => [
            'delivery_id', 'deliveryid', 'delivery_#', 'delivery#',
            'dr_number', 'dr_no', 'dr', 'delivery_no', 'delivery_number',
        ],
        'po_number' => [
            'po_number', 'ponumber', 'po_no', 'pono',
            'purchase_order_number', 'purchase_order_no', 'po_#', 'po#', 'po',
        ],
        'supplier' => [
            'supplier', 'supplier_name', 'suppliername', 'supplier_id',
            'vendor', 'vendor_name',
        ],
        'delivery_date' => [
            'delivery_date', 'deliverydate', 'date_delivered', 'date_of_delivery',
            'actual_delivery_date', 'delivery_dates', 'dates_delivered',
        ],
        'po_date_received' => [
            'po_date_received', 'date_received_by_supplier', 'po_received_date',
            'date_po_received', 'received_date_supplier', 'date_received',
        ],
        'delivery_term' => [
            'delivery_term', 'delivery_term_days', 'term', 'terms',
            'delivery_terms', 'delivery_period', 'term_days',
        ],
        'due_date' => [
            'due_date', 'duedate', 'due_dt', 'delivery_due_date', 'deadline',
        ],
        'no_of_days_ld' => [
            'no_of_days_ld', 'days_ld', 'ld_days', 'days_late',
            'liquidated_damages_days', 'no_days_ld', 'ld',
        ],
        'received_by_1' => [
            'received_by_1', 'received_by', 'receiver_1', 'received_by_one',
            'inspecting_officer', 'receivedby', 'receiver',
        ],
        'received_by_2' => [
            'received_by_2', 'receiver_2', 'received_by_two', 'co_receiver',
        ],
        'end_user' => [
            'end_user', 'enduser', 'office', 'office_end_user',
            'department', 'unit', 'office_code', 'office_name', 'requesting_office',
        ],
        'place_of_delivery' => [
            'place_of_delivery', 'delivery_place', 'delivery_location',
            'location', 'destination', 'delivery_address',
        ],
        'status' => [
            'status', 'delivery_status', 'state', 'condition',
        ],
        'total_amount_delivered' => [
            'total_amount_delivered', 'amount_delivered', 'delivered_amount',
            'actual_amount', 'delivered_value',
        ],
        'po_total_amount' => [
            'po_total_amount', 'po_amount', 'total_amount_po',
            'total_po_amount', 'po_total', 'amount_po',
        ],
        'folder_link' => [
            'folder_link', 'drive_link', 'link', 'url',
            'document_link', 'folder_url', 'attachment_link',
        ],
        'remarks' => [
            'remarks', 'remark', 'notes', 'comments', 'comment',
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
                            'Cancelled Delivery import: %d created, %d updated, %d skipped.',
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
                'Imported Deliveries: %d created, %d updated, %d skipped.',
                $result['created'], $result['updated'], count($result['skipped'])
            ));
        } catch (\Throwable $e) {
            $import->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            $this->logAudit($import, 'Delivery import failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Read Excel file into an array of associative rows.
     */
    private function readExcel(string $filePath): array
    {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
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

        if (!empty($raw) && isset($raw[0][0])) {
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

        foreach (array_slice($raw, $headerIndex + 1) as $line) {
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
     * Normalize Status to standard values.
     */
    private function normalizeStatus(?string $raw, ?string $deliveryDate): string
    {
        if ($raw === null || trim($raw) === '') {
            return $deliveryDate ? 'COMPLETE' : 'PENDING';
        }

        $upper = strtoupper(trim($raw));

        if (str_contains($upper, 'PART')) {
            return 'PARTIAL';
        }
        if (str_contains($upper, 'COMPL')) {
            return 'COMPLETE';
        }
        if (str_contains($upper, 'CANC')) {
            return 'CANCELLED';
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
            'delivery_term',
            'total_amount_po'
        )->get()->keyBy('po_number');

        $created = 0;
        $updated = 0;
        $skipped = [];

        Delivery::withoutActivityLogging(function () use (
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
            &$skipped
        ) {
            foreach ($rows as $index => $rawRow) {
                $rowNumber = $index + 2;
                $row = $this->normalizeRow($rawRow);

                $poNumber = isset($row['po_number']) ? trim((string) $row['po_number']) : '';

                if ($poNumber === '') {
                    $skipped[] = "Row #{$rowNumber}: Skipped because PO Number is missing.";
                    continue;
                }

                $linkedPo = $existingServePos->get($poNumber);

                // Supplier resolution
                $supplierId = null;
                if (!empty($row['supplier'])) {
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

                // Office / End User resolution
                $endUser = null;
                if (!empty($row['end_user'])) {
                    $officeVal = trim((string) $row['end_user']);
                    $officeLower = strtolower($officeVal);
                    if (isset($officesByCode[$officeLower])) {
                        $endUser = $officesByCode[$officeLower]->office_code;
                    } elseif (isset($officesByName[$officeLower])) {
                        $endUser = $officesByName[$officeLower]->office_code;
                    } else {
                        $endUser = substr($officeVal, 0, 150);
                    }
                } elseif ($linkedPo?->end_user) {
                    $endUser = substr($linkedPo->end_user, 0, 150);
                }

                // Delivery Dates parsing
                $deliveryDates = [];
                if (!empty($row['delivery_date'])) {
                    $rawDateStrings = preg_split('/[,;\n]+/', (string) $row['delivery_date']);
                    if (is_array($rawDateStrings)) {
                        foreach ($rawDateStrings as $dtStr) {
                            $parsed = $this->parseDate(trim($dtStr));
                            if ($parsed) {
                                $deliveryDates[] = $parsed;
                            }
                        }
                    }
                }
                $deliveryDates = array_values(array_unique($deliveryDates));
                sort($deliveryDates);
                $latestDeliveryDate = !empty($deliveryDates) ? end($deliveryDates) : null;

                // Dates and Terms
                $poDateReceived = $this->parseDate($row['po_date_received'] ?? null);
                if (!$poDateReceived && $linkedPo?->po_received_date) {
                    $poDateReceived = $linkedPo->po_received_date->format('Y-m-d');
                }

                $deliveryTerm = null;
                if (isset($row['delivery_term']) && is_numeric($row['delivery_term'])) {
                    $deliveryTerm = (int) $row['delivery_term'];
                } elseif ($linkedPo?->delivery_term !== null) {
                    $deliveryTerm = (int) $linkedPo->delivery_term;
                } else {
                    $deliveryTerm = 0;
                }

                $dueDate = $this->parseDate($row['due_date'] ?? null);
                if (!$dueDate && $poDateReceived && $deliveryTerm > 0) {
                    $dueDate = Carbon::parse($poDateReceived)->addDays($deliveryTerm)->format('Y-m-d');
                }

                // Days Late (no_of_days_ld)
                $noOfDaysLd = null;
                if (isset($row['no_of_days_ld']) && is_numeric($row['no_of_days_ld'])) {
                    $noOfDaysLd = (int) $row['no_of_days_ld'];
                } elseif ($latestDeliveryDate && $dueDate) {
                    $delivCarbon = Carbon::parse($latestDeliveryDate);
                    $dueCarbon = Carbon::parse($dueDate);
                    $noOfDaysLd = $delivCarbon->greaterThan($dueCarbon)
                        ? $dueCarbon->diffInDays($delivCarbon)
                        : 0;
                } else {
                    $noOfDaysLd = 0;
                }

                // Amounts
                $poTotalAmount = isset($row['po_total_amount']) && is_numeric($row['po_total_amount'])
                    ? (float) $row['po_total_amount']
                    : (float) ($linkedPo?->total_amount_po ?? 0);

                $totalAmountDelivered = isset($row['total_amount_delivered']) && is_numeric($row['total_amount_delivered'])
                    ? (float) $row['total_amount_delivered']
                    : $poTotalAmount;

                // Status
                $status = $this->normalizeStatus($row['status'] ?? null, $latestDeliveryDate);

                $receivedBy1 = !empty($row['received_by_1'])
                    ? substr(trim((string) $row['received_by_1']), 0, 150)
                    : null;

                $receivedBy2 = !empty($row['received_by_2'])
                    ? substr(trim((string) $row['received_by_2']), 0, 150)
                    : null;

                $placeOfDelivery = !empty($row['place_of_delivery'])
                    ? substr(trim((string) $row['place_of_delivery']), 0, 255)
                    : null;

                $folderLink = !empty($row['folder_link'])
                    ? substr(trim((string) $row['folder_link']), 0, 500)
                    : null;

                $remarks = !empty($row['remarks'])
                    ? trim((string) $row['remarks'])
                    : null;

                // Ensure linked ServePo exists
                if (!$linkedPo) {
                    ServePo::withoutActivityLogging(function () use (
                        $poNumber,
                        $supplierId,
                        $endUser,
                        $poDateReceived,
                        $deliveryTerm,
                        $poTotalAmount,
                        &$existingServePos
                    ) {
                        $newPo = ServePo::create([
                            'po_number' => substr($poNumber, 0, 50),
                            'supplier_id' => $supplierId,
                            'end_user' => substr($endUser ?? 'General', 0, 150),
                            'po_received_date' => $poDateReceived,
                            'delivery_term' => $deliveryTerm,
                            'total_amount_po' => $poTotalAmount,
                            'po_step' => 'For Release',
                        ]);
                        $existingServePos->put($poNumber, $newPo);
                    });
                }

                // Delivery ID resolution
                $deliveryId = !empty($row['delivery_id'])
                    ? substr(trim((string) $row['delivery_id']), 0, 50)
                    : null;

                // Find existing delivery
                $existingDelivery = null;
                if ($deliveryId) {
                    $existingDelivery = Delivery::where('delivery_id', $deliveryId)->first();
                } else {
                    $existingDelivery = Delivery::where('po_number', $poNumber)->first();
                }

                $attributes = [
                    'po_number' => substr($poNumber, 0, 50),
                    'supplier_id' => $supplierId,
                    'delivery_date' => $latestDeliveryDate,
                    'po_date_received' => $poDateReceived,
                    'delivery_term' => $deliveryTerm,
                    'due_date' => $dueDate,
                    'no_of_days_ld' => $noOfDaysLd,
                    'received_by_1' => $receivedBy1,
                    'received_by_2' => $receivedBy2,
                    'end_user' => $endUser,
                    'place_of_delivery' => $placeOfDelivery,
                    'status' => $status,
                    'remarks' => $remarks,
                    'total_amount_delivered' => $totalAmountDelivered,
                    'po_total_amount' => $poTotalAmount,
                    'folder_link' => $folderLink,
                ];

                if ($existingDelivery) {
                    if (!$mergeExisting) {
                        $skipped[] = "Row #{$rowNumber}: Delivery for PO '{$poNumber}' (ID: {$existingDelivery->delivery_id}) already exists (skipped).";
                        continue;
                    }

                    $updateData = array_filter($attributes, fn ($val) => $val !== null);
                    $existingDelivery->update($updateData);

                    // Sync delivery dates if dates were specified
                    if (!empty($deliveryDates)) {
                        $existingDelivery->deliveryDates()->delete();
                        foreach ($deliveryDates as $dDate) {
                            $existingDelivery->deliveryDates()->create(['delivery_date' => $dDate]);
                        }
                    }

                    $updated++;
                } else {
                    $attributes['delivery_id'] = $deliveryId ?: (now()->format('YmdHis') . '-' . substr(md5(uniqid()), 0, 6));
                    $attributes['data_entry_timestamp'] = now();

                    $newDelivery = Delivery::create($attributes);

                    if (!empty($deliveryDates)) {
                        foreach ($deliveryDates as $dDate) {
                            $newDelivery->deliveryDates()->create(['delivery_date' => $dDate]);
                        }
                    }

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
                    'Imported Deliveries: %d created, %d updated, %d skipped.',
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
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $value)->format('Y-m-d');
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
     * Template headers for Delivery Monitoring import.
     */
    public function getTemplateHeaders(): array
    {
        return [
            'Delivery ID',
            'PO Number',
            'Supplier',
            'Delivery Date',
            'PO Date Received',
            'Delivery Term',
            'Due Date',
            'No of Days LD',
            'Received By 1',
            'Received By 2',
            'End User',
            'Place of Delivery',
            'Status',
            'Total Amount Delivered',
            'PO Total Amount',
            'Folder Link',
            'Remarks',
        ];
    }

    /**
     * Sample template rows demonstrating delivery records.
     */
    public function getExampleRows(): array
    {
        return [
            [
                'DEL-2026-0001',
                'PO-2026-0001',
                'Sample Supplier Inc.',
                '2026-02-15',
                '2026-01-20',
                '30',
                '2026-02-19',
                '0',
                'JUAN DELA CRUZ',
                'PEDRO SANTOS',
                'OFC-01',
                'Administration Building, SMU Warehouse',
                'COMPLETE',
                '50000.00',
                '50000.00',
                'https://drive.google.com/file/d/sample-delivery-receipt-1',
                'Delivered in good condition, inspected upon receipt',
            ],
            [
                'DEL-2026-0002',
                'PO-2026-0002',
                'Tech Solutions Co.',
                '2026-03-25',
                '2026-02-05',
                '45',
                '2026-03-22',
                '3',
                'MARIA GARCIA',
                '',
                'CED',
                'College of Education Laboratory',
                'COMPLETE',
                '125000.00',
                '125000.00',
                '',
                '3 days delayed due to courier logistics',
            ],
            [
                '',
                'PO-2026-0003',
                'Prime Office Supplies',
                '',
                '2026-03-01',
                '15',
                '2026-03-16',
                '0',
                '',
                '',
                'HRMD',
                'HRMD Supply Room',
                'PENDING',
                '0.00',
                '35000.00',
                '',
                'Awaiting delivery from supplier',
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
            fputcsv($handle, $headers);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, 'delivery_monitoring_import_template.csv', [
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
