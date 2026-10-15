<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\FundCluster;
use App\Models\Import;
use App\Models\Office;
use App\Models\PoItemDescription;
use App\Models\ServePo;
use App\Models\StockItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseOrderImportService
{
    public const VALID_STEPS = [
        'PO From VPAD',
        'End User',
        'For COA Stamp',
        'For Release',
        'Payment Processing',
        'Forwarded to Finance',
    ];

    /**
     * Normalized aliases for column mapping across core and workflow fields.
     */
    private const ALIASES = [
        // --- Core PO Details ---
        'po_number' => ['po_number', 'ponumber', 'po_no', 'pono', 'purchase_order_number', 'purchase_order_no', 'po #', 'po#'],
        'po_date' => ['po_date', 'podate', 'po_dt', 'date'],
        'supplier' => ['supplier', 'supplier_name', 'suppliername', 'supplier_id', 'vendor'],
        'end_user' => ['end_user', 'enduser', 'office', 'office_code', 'office_name', 'department', 'unit'],
        'fund_cluster_id' => ['fund_cluster_id', 'fund_cluster', 'fundcluster', 'fund', 'fund_cluster_code'],
        'item_description' => ['item_description', 'itemdescription', 'description', 'items', 'particulars', 'item_desc'],
        'operational_impact' => ['operational_impact', 'operationalimpact', 'operational impact', 'operational_impacts', 'op_impact', 'impact'],
        'stock_numbers' => ['stock_numbers', 'stock_numbers_list', 'stock_no', 'stock_nos', 'stocknumbers', 'item_stock_nos', 'stocks'],
        'total_amount_po' => ['total_amount_po', 'po_amount', 'amount_po', 'total_amount', 'po_total', 'amount', 'total_po'],
        'total_amount_abc' => ['total_amount_abc', 'abc_amount', 'amount_abc', 'abc', 'total_abc', 'approved_budget'],
        'mode_of_procurement' => ['mode_of_procurement', 'mode', 'procurement_mode', 'mode_procurement'],
        'procurement_type' => ['procurement_type', 'type', 'proc_type'],
        'pr_number' => ['pr_number', 'pr_no', 'prnumber', 'prno', 'pr #', 'pr#'],
        'pr_date' => ['pr_date', 'prdate', 'pr_dt'],
        'philgeps_reference_no' => ['philgeps_reference_no', 'philgeps_no', 'philgeps_ref', 'philgeps', 'philgeps_ref_no'],
        'delivery_term' => ['delivery_term', 'term', 'terms', 'delivery_terms', 'delivery_period'],
        'inclusive_date' => ['inclusive_date', 'inclusivedate', 'inclusive_dates'],
        'ors_burs_no' => ['ors_burs_no', 'ors_no', 'burs_no', 'ors_burs', 'ors_burs_number', 'ors', 'burs'],
        'ors_burs_date' => ['ors_burs_date', 'ors_date', 'burs_date'],
        'responsibility_center' => ['responsibility_center', 'responsibility_ctr', 'resp_center', 'rc'],
        'uacs_object_code' => ['uacs_object_code', 'uacs', 'uacs_code', 'object_code'],
        'date_forwarded_to_smu' => ['date_forwarded_to_smu', 'date_forwarded_smu', 'forwarded_to_smu', 'forwarded_smu'],
        'date_forwarded_frontdesk' => ['date_forwarded_frontdesk', 'forwarded_frontdesk', 'date_forwarded_fd'],

        // --- Workflow Tab 0: PO From VPAD ---
        'po_step' => ['po_step', 'step', 'workflow_step', 'current_step', 'status_step'],
        'po_received_date' => ['po_received_date', 'received_date', 'date_received', 'vpad_received_date', 'date_received_from_vpad'],
        'po_vpad_forwarded_by' => ['po_vpad_forwarded_by', 'vpad_forwarded_by', 'forwarded_by_vpad'],
        'po_vpad_notified_date' => ['po_vpad_notified_date', 'vpad_notified_date'],
        'po_vpad_notified_via' => ['po_vpad_notified_via', 'vpad_notified_via', 'vpad_email', 'vpad_notified_email'],

        // --- Workflow Tab 1: End User ---
        'date_forwarded_to_end_user' => ['date_forwarded_to_end_user', 'date_forwarded_end_user', 'forwarded_to_end_user', 'end_user_forwarded_date'],
        'end_user_forwarded_by' => ['end_user_forwarded_by', 'forwarded_by_end_user'],

        // --- Workflow Tab 2: For COA Stamp (Supplier's Signature & COA Stamp) ---
        'supplier_signature_date' => ['supplier_signature_date', 'supplier_signed_date', 'signature_date'],
        'date_forwarded_supplier' => ['date_forwarded_supplier', 'forwarded_to_supplier'],
        'forwarded_by_supplier' => ['forwarded_by_supplier'],
        'claimed_by_supplier' => ['claimed_by_supplier'],
        'date_forwarded_coa' => ['date_forwarded_coa', 'forwarded_to_coa'],
        'forwarded_by_coa' => ['forwarded_by_coa'],
        'date_returned_from_coa' => ['date_returned_from_coa', 'returned_from_coa'],
        'coa_date' => ['coa_date', 'coa_stamp_date', 'date_coa'],
        'coa_processed_date' => ['coa_processed_date', 'date_coa_processed'],
        'claim_date' => ['claim_date', 'coa_claim_date'],
        'claimed_by_coa' => ['claimed_by_coa'],
        'coa_stamp_notified_date' => ['coa_stamp_notified_date', 'coa_notified_date'],
        'coa_stamp_notified_via' => ['coa_stamp_notified_via', 'coa_notified_via', 'coa_email'],

        // --- Workflow Tab 3: For Release & Inspection ---
        'date_received_by_supplier' => ['date_received_by_supplier', 'supplier_received_date'],
        'receipt_receiving_date' => ['receipt_receiving_date', 'date_receipt_receiving'],
        'receipt_claimed_by' => ['receipt_claimed_by', 'claimed_by_receipt'],
        'receipt_claimed_notified_date' => ['receipt_claimed_notified_date', 'release_notified_date'],
        'receipt_claimed_notified_via' => ['receipt_claimed_notified_via', 'release_notified_via', 'release_email'],
        'items_receiving_date' => ['items_receiving_date', 'date_items_receiving'],
        'items_claimed_by' => ['items_claimed_by', 'claimed_by_items'],
        'iar_number' => ['iar_number', 'iar_no', 'iar', 'iar_numbers'],
        'inspected_by' => ['inspected_by', 'inspector', 'inspectors', 'inspector_name'],
        'inspection_date' => ['inspection_date', 'date_inspected', 'inspection_dt'],

        // --- Workflow Tab 4: Payment Processing ---
        'ris_number' => ['ris_number', 'ris_no', 'ris'],
        'invoice_number' => ['invoice_number', 'invoice_no', 'invoice'],
        'invoice_date' => ['invoice_date', 'inv_date'],
        'delivery_receipt' => ['delivery_receipt', 'dr_number', 'dr_no', 'dr'],
        'par_ics_number' => ['par_ics_number', 'par_number', 'ics_number', 'par_ics'],
        'payment_status' => ['payment_status', 'payment'],
        'workflow_remarks' => ['workflow_remarks', 'remarks', 'workflow_notes'],
        'date_completed' => ['date_completed', 'completed_date', 'completion_date'],

        // --- Workflow Tab 5: Forwarded to Finance ---
        'date_forwarded_to_finance' => ['date_forwarded_to_finance', 'forwarded_to_finance', 'date_forwarded_finance'],
        'finance_forwarded_by' => ['finance_forwarded_by', 'forwarded_by_finance'],
    ];

    /**
     * Import an uploaded CSV file.
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
                            'Cancelled Purchase Orders import: %d created, %d updated, %d skipped.',
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
                'Imported Purchase Orders: %d created, %d updated, %d skipped.',
                $result['created'], $result['updated'], count($result['skipped'])
            ));
        } catch (\Throwable $e) {
            $import->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            $this->logAudit($import, 'Purchase Orders import failed: ' . $e->getMessage());
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

        $fundClustersById = FundCluster::select('fund_cluster_id', 'fund_description')
            ->get()
            ->keyBy(fn ($f) => strtolower(trim($f->fund_cluster_id)));

        $existingStockItems = StockItem::pluck('stock_no')
            ->keyBy(fn ($s) => strtolower(trim($s)));

        $created = 0;
        $updated = 0;
        $skipped = [];

        ServePo::withoutActivityLogging(function () use (
            $rows,
            $mergeExisting,
            $progressCallback,
            &$suppliersByName,
            &$suppliersById,
            &$officesByCode,
            &$officesByName,
            &$fundClustersById,
            &$existingStockItems,
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
                }

                // End User (Office) resolution
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
                }

                // Fund Cluster resolution
                $fundClusterId = null;
                if (!empty($row['fund_cluster_id'])) {
                    $fcVal = trim((string) $row['fund_cluster_id']);
                    $fcLower = strtolower($fcVal);
                    if (isset($fundClustersById[$fcLower])) {
                        $fundClusterId = $fundClustersById[$fcLower]->fund_cluster_id;
                    } else {
                        foreach ($fundClustersById as $fc) {
                            if (str_contains(strtolower($fc->fund_description ?? ''), $fcLower)) {
                                $fundClusterId = $fc->fund_cluster_id;
                                break;
                            }
                        }
                    }
                }

                // Parse amounts
                $totalAmountPo = $this->parseNumeric($row['total_amount_po'] ?? null, 0.0);
                $totalAmountAbc = $this->parseNumeric($row['total_amount_abc'] ?? null, 0.0);
                $totalAmountDiff = $totalAmountAbc - $totalAmountPo;

                // Parse Procurement Type
                $procurementType = null;
                if (!empty($row['procurement_type'])) {
                    $ptLower = strtolower(trim((string) $row['procurement_type']));
                    if (str_contains($ptLower, 'service')) {
                        $procurementType = 'Services';
                    } elseif (str_contains($ptLower, 'item')) {
                        $procurementType = 'Items';
                    }
                }

                // Parse Mode of Procurement
                $modeOfProcurement = null;
                if (!empty($row['mode_of_procurement'])) {
                    $modeOfProcurement = substr(strtoupper(trim((string) $row['mode_of_procurement'])), 0, 100);
                }

                // Parse Stock Numbers
                $validStockNos = [];
                if (!empty($row['stock_numbers'])) {
                    $rawStockList = preg_split('/[,;\s\n]+/', (string) $row['stock_numbers']);
                    if (is_array($rawStockList)) {
                        foreach ($rawStockList as $rawNo) {
                            $cleanNo = trim($rawNo);
                            $cleanLower = strtolower($cleanNo);
                            if ($cleanNo !== '' && isset($existingStockItems[$cleanLower])) {
                                $validStockNos[] = $existingStockItems[$cleanLower];
                            }
                        }
                    }
                }

                // Parse Workflow Dates
                $poReceivedDate = $this->parseDate($row['po_received_date'] ?? null);
                $dateForwardedToEndUser = $this->parseDate($row['date_forwarded_to_end_user'] ?? null);
                $supplierSignatureDate = $this->parseDate($row['supplier_signature_date'] ?? null);
                $dateForwardedSupplier = $this->parseDate($row['date_forwarded_supplier'] ?? null);
                $dateForwardedCoa = $this->parseDate($row['date_forwarded_coa'] ?? null);
                $dateReturnedFromCoa = $this->parseDate($row['date_returned_from_coa'] ?? null);
                $coaDate = $this->parseDate($row['coa_date'] ?? null);
                $coaProcessedDate = $this->parseDate($row['coa_processed_date'] ?? null);
                $claimDate = $this->parseDate($row['claim_date'] ?? null);
                $dateReceivedBySupplier = $this->parseDate($row['date_received_by_supplier'] ?? null);
                $receiptReceivingDate = $this->parseDate($row['receipt_receiving_date'] ?? null);
                $itemsReceivingDate = $this->parseDate($row['items_receiving_date'] ?? null);
                $invoiceDate = $this->parseDate($row['invoice_date'] ?? null);
                $dateCompleted = $this->parseDate($row['date_completed'] ?? null);
                $dateForwardedToFinance = $this->parseDate($row['date_forwarded_to_finance'] ?? null);

                // Determine Workflow Step
                $poStep = null;
                if (!empty($row['po_step'])) {
                    $stepCandidate = trim((string) $row['po_step']);
                    foreach (self::VALID_STEPS as $validStep) {
                        if (strcasecmp($stepCandidate, $validStep) === 0) {
                            $poStep = $validStep;
                            break;
                        }
                    }
                }

                if ($poStep === null) {
                    if ($dateForwardedToFinance) {
                        $poStep = 'Forwarded to Finance';
                    } elseif ($dateCompleted || !empty($row['invoice_number']) || !empty($row['ris_number']) || !empty($row['payment_status'])) {
                        $poStep = 'Payment Processing';
                    } elseif ($dateReceivedBySupplier || $receiptReceivingDate || $itemsReceivingDate) {
                        $poStep = 'For Release';
                    } elseif ($coaDate || $dateForwardedCoa || $supplierSignatureDate) {
                        $poStep = 'For COA Stamp';
                    } elseif ($dateForwardedToEndUser) {
                        $poStep = 'End User';
                    } else {
                        $poStep = 'PO From VPAD';
                    }
                }

                // Payment Status
                $paymentStatus = null;
                if (!empty($row['payment_status'])) {
                    $psLower = strtolower(trim((string) $row['payment_status']));
                    if (str_contains($psLower, 'paid')) {
                        $paymentStatus = 'Paid';
                    } elseif (str_contains($psLower, 'process')) {
                        $paymentStatus = 'Processing';
                    } elseif (str_contains($psLower, 'pend')) {
                        $paymentStatus = 'Pending';
                    } else {
                        $paymentStatus = substr(trim((string) $row['payment_status']), 0, 100);
                    }
                }

                $itemDescription = !empty($row['item_description']) ? trim((string) $row['item_description']) : null;
                if ($itemDescription) {
                    PoItemDescription::firstOrCreate(['name' => strtoupper($itemDescription)]);
                }

                $operationalImpact = !empty($row['operational_impact']) ? strtoupper(trim((string) $row['operational_impact'])) : null;
                if ($operationalImpact && !in_array($operationalImpact, ['HIGH', 'MEDIUM', 'LOW'], true)) {
                    $operationalImpact = null;
                }

                // Build PO record attributes
                $attributes = [
                    'po_number' => substr($poNumber, 0, 50),
                    'po_date' => $this->parseDate($row['po_date'] ?? null),
                    'item_description' => $itemDescription,
                    'operational_impact' => $operationalImpact,
                    'supplier_id' => $supplierId,
                    'end_user' => $endUser,
                    'fund_cluster_id' => $fundClusterId,
                    'total_amount_po' => $totalAmountPo,
                    'total_amount_abc' => $totalAmountAbc,
                    'total_amount_diff' => $totalAmountDiff,
                    'procurement_type' => $procurementType,
                    'mode_of_procurement' => $modeOfProcurement,
                    'pr_number' => !empty($row['pr_number']) ? substr(trim((string) $row['pr_number']), 0, 50) : null,
                    'pr_date' => $this->parseDate($row['pr_date'] ?? null),
                    'philgeps_reference_no' => !empty($row['philgeps_reference_no']) ? substr(trim((string) $row['philgeps_reference_no']), 0, 50) : null,
                    'delivery_term' => !empty($row['delivery_term']) && is_numeric($row['delivery_term']) ? (int) $row['delivery_term'] : null,
                    'inclusive_date' => !empty($row['inclusive_date']) ? substr(trim((string) $row['inclusive_date']), 0, 100) : null,
                    'ors_burs_no' => !empty($row['ors_burs_no']) ? substr(trim((string) $row['ors_burs_no']), 0, 50) : null,
                    'ors_burs_date' => $this->parseDate($row['ors_burs_date'] ?? null),
                    'responsibility_center' => !empty($row['responsibility_center']) ? substr(trim((string) $row['responsibility_center']), 0, 100) : null,
                    'uacs_object_code' => !empty($row['uacs_object_code']) ? substr(trim((string) $row['uacs_object_code']), 0, 50) : null,
                    'date_forwarded_to_smu' => $this->parseDate($row['date_forwarded_to_smu'] ?? null),
                    'date_forwarded_frontdesk' => $this->parseDate($row['date_forwarded_frontdesk'] ?? null),

                    // --- Workflow Details ---
                    'po_step' => $poStep,
                    'po_received_date' => $poReceivedDate,
                    'po_vpad_forwarded_by' => !empty($row['po_vpad_forwarded_by']) ? substr(trim((string) $row['po_vpad_forwarded_by']), 0, 255) : null,
                    'po_vpad_notified_date' => $this->parseDate($row['po_vpad_notified_date'] ?? null),
                    'po_vpad_notified_via' => !empty($row['po_vpad_notified_via']) ? substr(trim((string) $row['po_vpad_notified_via']), 0, 100) : null,

                    'date_forwarded_to_end_user' => $dateForwardedToEndUser,
                    'end_user_forwarded_by' => !empty($row['end_user_forwarded_by']) ? substr(trim((string) $row['end_user_forwarded_by']), 0, 255) : null,

                    'supplier_signature_date' => $supplierSignatureDate,
                    'date_forwarded_supplier' => $dateForwardedSupplier,
                    'forwarded_by_supplier' => !empty($row['forwarded_by_supplier']) ? substr(trim((string) $row['forwarded_by_supplier']), 0, 255) : null,
                    'claimed_by_supplier' => !empty($row['claimed_by_supplier']) ? substr(trim((string) $row['claimed_by_supplier']), 0, 255) : null,
                    'date_forwarded_coa' => $dateForwardedCoa,
                    'forwarded_by_coa' => !empty($row['forwarded_by_coa']) ? substr(trim((string) $row['forwarded_by_coa']), 0, 255) : null,
                    'date_returned_from_coa' => $dateReturnedFromCoa,
                    'coa_date' => $coaDate,
                    'coa_processed_date' => $coaProcessedDate,
                    'claim_date' => $claimDate,
                    'claimed_by_coa' => !empty($row['claimed_by_coa']) ? substr(trim((string) $row['claimed_by_coa']), 0, 255) : null,
                    'coa_stamp_notified_date' => $this->parseDate($row['coa_stamp_notified_date'] ?? null),
                    'coa_stamp_notified_via' => !empty($row['coa_stamp_notified_via']) ? substr(trim((string) $row['coa_stamp_notified_via']), 0, 100) : null,

                    'date_received_by_supplier' => $dateReceivedBySupplier,
                    'receipt_receiving_date' => $receiptReceivingDate,
                    'receipt_claimed_by' => !empty($row['receipt_claimed_by']) ? substr(trim((string) $row['receipt_claimed_by']), 0, 255) : null,
                    'receipt_claimed_notified_date' => $this->parseDate($row['receipt_claimed_notified_date'] ?? null),
                    'receipt_claimed_notified_via' => !empty($row['receipt_claimed_notified_via']) ? substr(trim((string) $row['receipt_claimed_notified_via']), 0, 100) : null,
                    'items_receiving_date' => $itemsReceivingDate,
                    'items_claimed_by' => !empty($row['items_claimed_by']) ? substr(trim((string) $row['items_claimed_by']), 0, 255) : null,

                    'ris_number' => !empty($row['ris_number']) ? substr(trim((string) $row['ris_number']), 0, 100) : null,
                    'invoice_number' => !empty($row['invoice_number']) ? substr(trim((string) $row['invoice_number']), 0, 100) : null,
                    'invoice_date' => $invoiceDate,
                    'delivery_receipt' => !empty($row['delivery_receipt']) ? substr(trim((string) $row['delivery_receipt']), 0, 100) : null,
                    'par_ics_number' => !empty($row['par_ics_number']) ? substr(trim((string) $row['par_ics_number']), 0, 100) : null,
                    'payment_status' => $paymentStatus,
                    'workflow_remarks' => !empty($row['workflow_remarks']) ? trim((string) $row['workflow_remarks']) : null,
                    'date_completed' => $dateCompleted,

                    'date_forwarded_to_finance' => $dateForwardedToFinance,
                    'finance_forwarded_by' => !empty($row['finance_forwarded_by']) ? substr(trim((string) $row['finance_forwarded_by']), 0, 255) : null,
                ];

                $existingPo = ServePo::where('po_number', $attributes['po_number'])->first();

                if ($existingPo) {
                    if (!$mergeExisting) {
                        $skipped[] = "Row #{$rowNumber}: PO '{$attributes['po_number']}' already exists (skipped).";
                        continue;
                    }

                    $updateData = array_filter($attributes, fn ($val) => $val !== null);
                    $existingPo->update($updateData);

                    if (!empty($validStockNos)) {
                        $existingPo->items()->syncWithoutDetaching($validStockNos);
                    }

                    // Save Inspection Details if present
                    if (!empty($row['iar_number']) || !empty($row['inspected_by']) || !empty($row['inspection_date'])) {
                        $existingPo->inspectionEntries()->delete();
                        $existingPo->inspectionEntries()->create([
                            'iar_number' => !empty($row['iar_number']) ? substr(trim((string) $row['iar_number']), 0, 100) : null,
                            'inspected_by' => !empty($row['inspected_by']) ? substr(trim((string) $row['inspected_by']), 0, 255) : null,
                            'inspection_date' => $this->parseDate($row['inspection_date'] ?? null),
                        ]);
                    }

                    // If workflow reached For Release or beyond, update Deliveries status
                    $releaseSteps = ['For Release', 'Payment Processing', 'Forwarded to Finance'];
                    if (in_array($existingPo->po_step, $releaseSteps, true) && $existingPo->coa_date) {
                        Delivery::where('po_number', $existingPo->po_number)
                            ->whereNull('status')
                            ->update(['status' => 'PENDING']);
                    }

                    $updated++;
                } else {
                    $newPo = ServePo::create($attributes);

                    if (!empty($validStockNos)) {
                        $newPo->items()->sync($validStockNos);
                    }

                    // Save Inspection Details if present
                    if (!empty($row['iar_number']) || !empty($row['inspected_by']) || !empty($row['inspection_date'])) {
                        $newPo->inspectionEntries()->create([
                            'iar_number' => !empty($row['iar_number']) ? substr(trim((string) $row['iar_number']), 0, 100) : null,
                            'inspected_by' => !empty($row['inspected_by']) ? substr(trim((string) $row['inspected_by']), 0, 255) : null,
                            'inspection_date' => $this->parseDate($row['inspection_date'] ?? null),
                        ]);
                    }

                    $releaseSteps = ['For Release', 'Payment Processing', 'Forwarded to Finance'];
                    if (in_array($newPo->po_step, $releaseSteps, true) && $newPo->coa_date) {
                        Delivery::where('po_number', $newPo->po_number)
                            ->whereNull('status')
                            ->update(['status' => 'PENDING']);
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
                    'Imported Purchase Orders: %d created, %d updated, %d skipped.',
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
     * Clean and parse numeric values.
     */
    private function parseNumeric(mixed $value, float $default = 0.0): float
    {
        if ($value === null || $value === '') {
            return $default;
        }

        $clean = preg_replace('/[^0-9.-]/', '', (string) $value);
        return is_numeric($clean) ? (float) $clean : $default;
    }

    /**
     * Complete template headers including all Core details and Workflow Modal details.
     */
    public function getTemplateHeaders(): array
    {
        return [
            // --- Core Purchase Order Details ---
            'PO Number',
            'PO Date',
            'Supplier',
            'End User',
            'Fund Cluster',
            'Item Description',
            'Operational Impact',
            'Stock Numbers',
            'Total Amount PO',
            'Total Amount ABC',
            'Mode of Procurement',
            'Procurement Type',
            'PR Number',
            'PR Date',
            'PhilGEPS Reference No',
            'Delivery Term',
            'Inclusive Date',
            'ORS/BURS No',
            'ORS/BURS Date',
            'Responsibility Center',
            'UACS Object Code',

            // --- Workflow Modal Details ---
            'PO Step',
            'Date Received from VPAD',
            'Forwarded by VPAD',
            'VPAD Notified Date',
            'VPAD Notified Via',
            'Date Forwarded to End User',
            'End User Forwarded by',
            'Supplier Signature Date',
            'Date Forwarded to Supplier',
            'Forwarded by Supplier',
            'Claimed by Supplier',
            'Date Forwarded to COA',
            'Forwarded by COA',
            'Date Returned from COA',
            'COA Stamp Date',
            'COA Processed Date',
            'Claim Date',
            'Claimed by COA',
            'COA Notified Date',
            'COA Notified Via',
            'Date Received by Supplier',
            'Receipt Receiving Date',
            'Receipt Claimed by',
            'Release Notified Date',
            'Release Notified Via',
            'Items Receiving Date',
            'Items Claimed by',
            'IAR Number',
            'Inspected by',
            'Inspection Date',
            'RIS Number',
            'Invoice Number',
            'Invoice Date',
            'Delivery Receipt',
            'PAR/ICS Number',
            'Payment Status',
            'Workflow Remarks',
            'Date Completed',
            'Date Forwarded to Finance',
            'Finance Forwarded by',
        ];
    }

    /**
     * Sample template rows demonstrating both Core PO and Workflow values.
     */
    public function getExampleRows(): array
    {
        return [
            [
                // Core
                'PO-2026-0001',
                '2026-01-15',
                'Sample Supplier Inc.',
                'OFC-01',
                '101',
                'Office Equipment and Consumables',
                'HIGH',
                'STK-0001',
                '50000.00',
                '55000.00',
                'SMALL VALUE PROCUREMENT',
                'Items',
                'PR-2026-0001',
                '2026-01-10',
                '1234567',
                '30',
                '15 Calendar Days',
                'ORS-2026-0001',
                '2026-01-12',
                'SMU',
                '5020301000',
                // Workflow
                'PO From VPAD',
                '2026-01-18',
                'Juan VPAD',
                '2026-01-19',
                'ovpad@usep.edu.ph',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                'Pending',
                '',
                '',
                '',
                '',
            ],
            [
                // Core
                'PO-2026-0002',
                '2026-02-01',
                'Tech Solutions Co.',
                'CED',
                '101',
                'Computer Peripherals and IT Equipment',
                'MEDIUM',
                'STK-0002',
                '125000.00',
                '130000.00',
                'PUBLIC BIDDING',
                'Items',
                'PR-2026-0015',
                '2026-01-25',
                '7654321',
                '45',
                '30 Calendar Days',
                'ORS-2026-0042',
                '2026-01-28',
                'ITRC',
                '5020302000',
                // Workflow (fully completed workflow)
                'Forwarded to Finance',
                '2026-02-05',
                'Juan VPAD',
                '',
                '',
                '2026-02-08',
                'Maria EndUser',
                '2026-02-12',
                '2026-02-10',
                'Pedro Supplier',
                'Pedro Supplier',
                '2026-02-14',
                'COA Liaison',
                '2026-02-18',
                '2026-02-18',
                '2026-02-18',
                '2026-02-19',
                'Auditor Santos',
                '',
                '',
                '2026-02-20',
                '2026-02-22',
                'Supply Officer',
                '',
                '',
                '2026-02-25',
                'Supply Officer',
                'IAR-2026-0045',
                'Inspector Ramos',
                '2026-02-26',
                'RIS-2026-010',
                'INV-99881',
                '2026-02-27',
                'DR-10293',
                'PAR-2026-001',
                'Paid',
                'All items delivered in good condition',
                '2026-02-28',
                '2026-03-01',
                'Finance Officer Gomez',
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
        }, 'purchase_orders_import_template.csv', [
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
