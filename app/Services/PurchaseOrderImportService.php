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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;
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
     * Supports: the standard template, the 2025 SERVED PO sheet, and the 2026 PIR Monitoring sheet.
     */
    private const ALIASES = [
        // --- Core PO Details ---
        'po_number' => ['po_number', 'ponumber', 'po_no', 'p_o_no', 'pono', 'purchase_order_number', 'purchase_order_no', 'po #', 'po#'],
        'po_date' => ['po_date', 'p_o_date', 'podate', 'po_dt', 'date'],
        'supplier' => ['supplier', 'supplier_name', 'suppliername', 'supplier_id', 'vendor'],
        'end_user' => ['end_user', 'enduser', 'end_user_colleges_dept_units', 'unit_office', 'office', 'office_code', 'office_name', 'department', 'unit'],
        'fund_cluster_id' => ['fund_cluster_id', 'fund_cluster', 'fundcluster', 'fund', 'fund_cluster_code'],
        'item_description' => ['item_description', 'itemdescription', 'description', 'items', 'particulars', 'item_desc'],
        'operational_impact' => ['operational_impact', 'operationalimpact', 'operational impact', 'operational_impacts', 'operatinal_impact', 'op_impact', 'impact'],
        'stock_numbers' => ['stock_numbers', 'stock_numbers_list', 'stock_no', 'stock_nos', 'stocknumbers', 'item_stock_nos', 'stocks'],
        'total_amount_po' => ['total_amount_po', 'total_amount_of_p_o', 'po_amount', 'amount_po', 'total_amount', 'po_total', 'amount', 'total_po'],
        'total_amount_abc' => ['total_amount_abc', 'total_amount_of_abc', 'abc_amount', 'amount_abc', 'abc', 'total_abc', 'approved_budget'],
        'mode_of_procurement' => ['mode_of_procurement', 'mode', 'procurement_mode', 'mode_procurement'],
        'procurement_type' => ['procurement_type', 'type_of_delivery', 'type', 'proc_type'],
        'pr_number' => ['pr_number', 'pr_no', 'p_r_no', 'prnumber', 'prno', 'pr #', 'pr#'],
        'pr_date' => ['pr_date', 'p_r_date', 'prdate', 'pr_dt'],
        'philgeps_reference_no' => ['philgeps_reference_no', 'philgeps_no', 'philgeps_ref', 'philgeps', 'philgeps_ref_no'],
        'delivery_term' => ['delivery_term', 'term', 'terms', 'delivery_terms', 'delivery_period'],
        'inclusive_date' => ['inclusive_date', 'inclusivedate', 'inclusive_dates'],
        'ors_burs_no' => ['ors_burs_no', 'ors_bur_no', 'ors_no', 'burs_no', 'ors_burs', 'ors_burs_number', 'ors', 'burs'],
        'ors_burs_date' => ['ors_burs_date', 'ors_date', 'burs_date', 'ors_bur_date'],
        'responsibility_center' => ['responsibility_center', 'responsibility_ctr', 'resp_center', 'rc'],
        'uacs_object_code' => ['uacs_object_code', 'uacs_objects_code_expenditures', 'uacs', 'uacs_code', 'object_code'],
        'date_forwarded_to_smu' => ['date_forwarded_to_smu', 'date_forwarded_smu', 'forwarded_to_smu', 'forwarded_smu'],
        'date_forwarded_frontdesk' => ['date_forwarded_frontdesk', 'date_forwarded_to_smu_front_desk', 'forwarded_frontdesk', 'date_forwarded_fd'],

        // --- Workflow Tab 0: PO From VPAD ---
        'po_step' => ['po_step', 'step', 'workflow_step', 'current_step', 'status_step'],
        'po_received_date' => ['po_received_date', 'received_date', 'date_received', 'vpad_received_date', 'date_received_from_vpad'],
        'po_vpad_forwarded_by' => ['po_vpad_forwarded_by', 'vpad_forwarded_by', 'forwarded_by_vpad'],
        'po_vpad_notified_date' => ['po_vpad_notified_date', 'vpad_notified_date', 'date_noified_the_end_user'],
        'po_vpad_notified_via' => ['po_vpad_notified_via', 'vpad_notified_via', 'vpad_email', 'vpad_notified_email', 'notify_the_end_user_via_email'],

        // --- Workflow Tab 1: End User ---
        'date_forwarded_to_end_user' => ['date_forwarded_to_end_user', 'date_forwarded_end_user', 'forwarded_to_end_user', 'end_user_forwarded_date', 'date_forwarded'],
        'end_user_forwarded_by' => ['end_user_forwarded_by', 'forwarded_by_end_user', 'forwarded_by'],

        // --- Workflow Tab 2: For COA Stamp (Supplier's Signature & COA Stamp) ---
        'supplier_signature_date' => ['supplier_signature_date', 'supplier_signed_date', 'signature_date'],
        'date_forwarded_supplier' => ['date_forwarded_supplier', 'forwarded_to_supplier'],
        'forwarded_by_supplier' => ['forwarded_by_supplier'],
        'claimed_by_supplier' => ['claimed_by_supplier'],
        'date_forwarded_coa' => ['date_forwarded_coa', 'forwarded_to_coa', 'date_forwarded_2'],
        'forwarded_by_coa' => ['forwarded_by_coa', 'forwarded_by_2'],
        'date_returned_from_coa' => ['date_returned_from_coa', 'returned_from_coa'],
        'coa_date' => ['coa_date', 'coa_stamp_date', 'date_coa'],
        'coa_processed_date' => ['coa_processed_date', 'date_coa_processed'],
        'claim_date' => ['claim_date', 'coa_claim_date'],
        'claimed_by_coa' => ['claimed_by_coa', 'claimed_by_2'],
        'coa_stamp_notified_date' => ['coa_stamp_notified_date', 'coa_notified_date', 'date_notified_the_end_user_2'],
        'coa_stamp_notified_via' => ['coa_stamp_notified_via', 'coa_notified_via', 'coa_email', 'notify_the_end_user_via_email_2'],

        // --- Workflow Tab 3: For Release & Inspection ---
        'date_received_by_supplier' => ['date_received_by_supplier', 'date_received_by_suppplier', 'supplier_received_date'],
        'receipt_receiving_date' => ['receipt_receiving_date', 'date_receipt_receiving'],
        'receipt_claimed_by' => ['receipt_claimed_by', 'claimed_by_receipt', 'claimed_by_3'],
        'receipt_claimed_notified_date' => ['receipt_claimed_notified_date', 'release_notified_date', 'notify_to_claim_the_receipt'],
        'receipt_claimed_notified_via' => ['receipt_claimed_notified_via', 'release_notified_via', 'release_email', 'notify_the_end_user_via_email_3'],
        'items_receiving_date' => ['items_receiving_date', 'item_s_receiving_date', 'date_items_receiving'],
        'items_claimed_by' => ['items_claimed_by', 'claimed_by_items', 'claimed_by_4'],
        'iar_number' => ['iar_number', 'iar_no', 'iar', 'iar_numbers'],
        'inspected_by' => ['inspected_by', 'inspector', 'inspectors', 'inspector_name'],
        'inspection_date' => ['inspection_date', 'date_inspected', 'inspection_dt'],

        // --- Workflow Tab 4: Payment Processing ---
        'ris_number' => ['ris_number', 'ris_no', 'ris'],
        'invoice_number' => ['invoice_number', 'invoice_no', 'invoice'],
        'invoice_date' => ['invoice_date', 'inv_date'],
        'delivery_receipt' => ['delivery_receipt', 'delivery_reciept', 'dr_number', 'dr_no', 'dr'],
        'par_ics_number' => ['par_ics_number', 'par_number', 'ics_number', 'ics_no', 'par_ics'],
        'payment_status' => ['payment_status', 'payment'],
        'workflow_remarks' => ['workflow_remarks', 'remarks', 'workflow_notes'],
        'date_completed' => ['date_completed', 'completed_date', 'completion_date'],

        // --- Workflow Tab 5: Forwarded to Finance ---
        'date_forwarded_to_finance' => ['date_forwarded_to_finance', 'forwarded_to_finance', 'date_forwarded_finance'],
        'finance_forwarded_by' => ['finance_forwarded_by', 'forwarded_by_finance'],
    ];

    /**
     * Headers that mean something different in the 2026 PIR Monitoring sheet than in the generic
     * aliases above. Applied first (only when the sheet is detected as the 2026 PIR layout).
     *
     * FROM OVPAD group:  DATE FORWARDED / FORWARDED BY = PO received from VPAD
     *                    DATE CLAIMED / CLAIMED BY     = end user claimed the PO
     * SUPPLIER'S SIGNATURE group: DATE RECEIVED BY SUPPLIER = supplier signature date
     */
    private const PIR_2026_MAP = [
        'date_forwarded' => 'po_received_date',
        'forwarded_by' => 'po_vpad_forwarded_by',
        'date_claimed' => 'date_forwarded_to_end_user',
        'claimed_by' => 'end_user_forwarded_by',
        'date_received_by_suppplier' => 'supplier_signature_date',
        'date_notified_the_end_user' => 'coa_stamp_notified_date',
        'status' => 'sheet_status',
    ];

    private const RELEASE_STEPS = ['For Release', 'Payment Processing', 'Forwarded to Finance'];

    /**
     * Sheet label (lowercase, no spaces) => real fund_cluster_id in your fund_clusters table.
     * Fill in whatever the auto-matching below misses, e.g. '05-igf' => '164'.
     */
    private const FUND_CLUSTER_OVERRIDES = [
        // '01-raf' => '101',
        // '05-igf' => '164',
        // '07-tr'  => '...',
        // '06-brf' => '...',
    ];

    /** Short fund codes used in the sheets => words expected in fund_description. */
    private const FUND_NAME_HINTS = [
        'raf' => 'regular agency',
        'igf' => 'internally generated',
        'brf' => 'business related',
        'tr' => 'trust',
        'itr' => 'trust',
    ];

    /**
     * Import an uploaded CSV/Excel file.
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

            $this->logAudit($import, 'Purchase Orders import failed: '.$e->getMessage());
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

        $knownHeaders = [];
        foreach (self::ALIASES as $aliases) {
            foreach ($aliases as $alias) {
                $knownHeaders[$this->normalizeHeaderKey($alias)] = true;
            }
        }

        $poNumberHeaders = array_fill_keys(
            array_map(fn ($alias) => $this->normalizeHeaderKey($alias), self::ALIASES['po_number']),
            true
        );

        $headerIndex = null;
        $bestHeaderScore = 0;
        foreach ($raw as $idx => $row) {
            $score = 0;
            $hasPoNumberHeader = false;
            foreach ($row as $cell) {
                $header = $this->normalizeHeaderKey($cell);
                if (isset($knownHeaders[$header])) {
                    $score++;
                    $hasPoNumberHeader = $hasPoNumberHeader || isset($poNumberHeaders[$header]);
                }
            }

            if ($hasPoNumberHeader && $score > $bestHeaderScore) {
                $headerIndex = $idx;
                $bestHeaderScore = $score;
            }
        }

        if ($headerIndex === null) {
            foreach ($raw as $idx => $row) {
                $nonEmpty = array_filter($row, fn ($cell) => $cell !== null && trim((string) $cell) !== '');
                if (count($nonEmpty) >= 2) {
                    $headerIndex = $idx;
                    break;
                }
            }
        }

        if ($headerIndex === null) {
            return [];
        }

        $headers = array_map(fn ($h) => trim((string) $h), $raw[$headerIndex]);
        $headerOccurrences = [];
        foreach ($headers as $idx => $header) {
            $headerKey = $this->normalizeHeaderKey($header);
            if ($headerKey === '') {
                continue;
            }

            $headerOccurrences[$headerKey] = ($headerOccurrences[$headerKey] ?? 0) + 1;
            if ($headerOccurrences[$headerKey] > 1) {
                $headers[$idx] .= '_'.$headerOccurrences[$headerKey];
            }
        }

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

    private function normalizeHeaderKey(mixed $header): string
    {
        $cleanKey = strtolower(trim((string) $header));
        $cleanKey = preg_replace('/[^a-z0-9_#]/', '_', $cleanKey);
        $cleanKey = preg_replace('/_+/', '_', $cleanKey);

        return trim($cleanKey, '_');
    }

    /**
     * Normalize row keys using self::PIR_2026_MAP (2026 sheet only) and then self::ALIASES.
     */
    private function normalizeRow(array $row): array
    {
        $normalized = [];
        $lookup = [];

        foreach ($row as $k => $v) {
            $lookup[$this->normalizeHeaderKey($k)] = $v;
        }

        // The 2026 PIR sheet is the only one with this (misspelled) header.
        if (array_key_exists('date_received_by_suppplier', $lookup)) {
            foreach (self::PIR_2026_MAP as $header => $field) {
                if (($lookup[$header] ?? null) !== null) {
                    $normalized[$field] = $lookup[$header];
                }
                // Remove it so the generic aliases can't claim the same column again.
                unset($lookup[$header]);
            }
        }

        foreach (self::ALIASES as $targetField => $aliases) {
            if (isset($normalized[$targetField])) {
                continue;
            }

            foreach ($aliases as $alias) {
                $cleanAlias = $this->normalizeHeaderKey($alias);

                if (array_key_exists($cleanAlias, $lookup) && $lookup[$cleanAlias] !== null) {
                    $normalized[$targetField] = $lookup[$cleanAlias];
                    break;
                }
            }
        }

        return $normalized;
    }

    /**
     * Match a sheet fund label ("05-IGF") to a fund_clusters row.
     * Tries: override map, exact id, number part, code part, description hints, description contains.
     * If nothing matches, the fund cluster is created on the spot.
     */
    private function resolveFundCluster(string $value, $fundClusters): ?string
    {
        $key = strtolower(preg_replace('/\s+/', '', $value));
        if ($key === '') {
            return null;
        }

        if (isset(self::FUND_CLUSTER_OVERRIDES[$key])) {
            return self::FUND_CLUSTER_OVERRIDES[$key];
        }

        if (isset($fundClusters[$key])) {
            return $fundClusters[$key]->fund_cluster_id;
        }

        // "05-igf" -> number "05", code "igf"
        preg_match('/^(\d+)?[-_]?([a-z]+)?$/', $key, $m);
        $num = $m[1] ?? null;
        $code = $m[2] ?? null;
        $hint = $code ? (self::FUND_NAME_HINTS[$code] ?? null) : null;

        foreach ($fundClusters as $fc) {
            $id = strtolower(trim((string) $fc->fund_cluster_id));
            $desc = strtolower((string) ($fc->fund_description ?? ''));

            $hit = ($num !== null && $id === $num)
                || ($code && ($id === $code || str_ends_with($id, $code) || preg_match('/\b'.preg_quote($code, '/').'\b/', $desc)))
                || ($hint && str_contains($desc, $hint))
                || str_contains($desc, $key);

            if ($hit) {
                return $fc->fund_cluster_id;
            }
        }

        // Nothing matched: add the fund cluster now (e.g. "05-IGF"), then reuse it for the rest of the import.
        try {
            $newId = substr(strtoupper(preg_replace('/\s+/', '', $value)), 0, 20);

            $fundCluster = new FundCluster();
            $fundCluster->fund_cluster_id = $newId;
            $fundCluster->fund_description = $newId;
            $fundCluster->save();

            $fundClusters->put(strtolower($newId), $fundCluster);

            return $fundCluster->fund_cluster_id;
        } catch (\Throwable $e) {
            Log::warning("PO import: could not add fund cluster '{$value}': ".$e->getMessage());

            return null;
        }
    }

    /**
     * Build inspection entries from a row. Handles multi-value cells ("a; b; c").
     *
     * @return array<int, array{iar_number: ?string, inspected_by: ?string, inspection_date: ?string}>
     */
    private function inspectionEntriesFromRow(array $row): array
    {
        $split = fn ($v) => array_values(array_filter(
            array_map('trim', preg_split('/\s*;\s*/', (string) $v)),
            fn ($x) => $x !== ''
        ));

        $iars = $split($row['iar_number'] ?? '');
        $by = $split($row['inspected_by'] ?? '');
        $dates = $split($row['inspection_date'] ?? '');

        $entries = [];
        for ($i = 0, $n = max(count($iars), count($by), count($dates)); $i < $n; $i++) {
            $entries[] = [
                'iar_number' => isset($iars[$i]) ? substr($iars[$i], 0, 100) : null,
                'inspected_by' => isset($by[$i]) ? substr($by[$i], 0, 255) : (end($by) ?: null),
                'inspection_date' => isset($dates[$i]) ? $this->parseDate($dates[$i]) : null,
            ];
        }

        return $entries;
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
                    // The 2025 sheet has ~100 leftover rows that only hold TRUE/FALSE checkboxes; ignore them quietly.
                    if (! empty($row['supplier']) || ! empty($row['po_date'])) {
                        $skipped[] = "Row #{$rowNumber}: Skipped because PO Number is missing.";
                    }

                    continue;
                }

                // 2025 sheet: reserved PO numbers that never got any details (no supplier, date, or amount).
                if (empty($row['supplier']) && empty($row['po_date']) && empty($row['total_amount_po']) && empty($row['po_received_date'])) {
                    continue;
                }

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
                }

                // End User (Office) resolution
                $endUser = null;
                if (! empty($row['end_user'])) {
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

                // Fund Cluster resolution ("05-IGF", "01- RAF", "07-TR" ...)
                $fundClusterId = ! empty($row['fund_cluster_id'])
                    ? $this->resolveFundCluster(trim((string) $row['fund_cluster_id']), $fundClustersById)
                    : null;

                // Parse amounts (null when the sheet has no such column, e.g. 2026 has no ABC)
                $totalAmountPo = $this->parseNumeric($row['total_amount_po'] ?? null);
                $totalAmountAbc = $this->parseNumeric($row['total_amount_abc'] ?? null);
                $totalAmountDiff = ($totalAmountPo !== null && $totalAmountAbc !== null)
                    ? $totalAmountAbc - $totalAmountPo
                    : null;

                // Delivery term: numeric -> days, anything else ("45-60", "Until Dec. 31, 2026") -> inclusive date text
                $deliveryTerm = null;
                $inclusiveDate = ! empty($row['inclusive_date']) ? trim((string) $row['inclusive_date']) : null;
                if (! empty($row['delivery_term'])) {
                    $termRaw = trim((string) $row['delivery_term']);
                    if (preg_match('/^\d+$/', $termRaw)) {
                        $deliveryTerm = (int) $termRaw;
                    } else {
                        $inclusiveDate ??= $termRaw;
                    }
                }

                // Parse Procurement Type
                $procurementType = null;
                if (! empty($row['procurement_type'])) {
                    $ptLower = strtolower(trim((string) $row['procurement_type']));
                    if (str_contains($ptLower, 'service')) {
                        $procurementType = 'Services';
                    } elseif (str_contains($ptLower, 'item')) {
                        $procurementType = 'Items';
                    }
                }

                // Parse Mode of Procurement
                $modeOfProcurement = null;
                if (! empty($row['mode_of_procurement'])) {
                    $modeOfProcurement = substr(strtoupper(trim((string) $row['mode_of_procurement'])), 0, 100);
                }

                // Parse Stock Numbers
                $validStockNos = [];
                if (! empty($row['stock_numbers'])) {
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
                $dateForwardedFrontdesk = $this->parseDate($row['date_forwarded_frontdesk'] ?? null);

                // 2026 sheet STATUS column (COMPLETED / CANCELLED)
                $sheetStatus = strtoupper(trim((string) ($row['sheet_status'] ?? '')));

                // Determine Workflow Step
                $poStep = null;
                if (! empty($row['po_step'])) {
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
                    } elseif ($dateCompleted || ! empty($row['invoice_number']) || ! empty($row['ris_number']) || ! empty($row['payment_status']) || $sheetStatus === 'COMPLETED') {
                        $poStep = 'Payment Processing';
                    } elseif ($dateReceivedBySupplier || $receiptReceivingDate || $itemsReceivingDate || $dateForwardedFrontdesk) {
                        $poStep = 'For Release';
                    } elseif ($coaDate || $dateForwardedCoa || $supplierSignatureDate || $coaProcessedDate || $dateReturnedFromCoa) {
                        $poStep = 'For COA Stamp';
                    } elseif ($dateForwardedToEndUser) {
                        $poStep = 'End User';
                    } else {
                        $poStep = 'PO From VPAD';
                    }
                }

                // Payment Status
                $paymentStatus = null;
                if (! empty($row['payment_status'])) {
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

                $itemDescription = ! empty($row['item_description']) ? trim((string) $row['item_description']) : null;
                if ($itemDescription) {
                    PoItemDescription::firstOrCreate(['name' => strtoupper($itemDescription)]);
                }

                $operationalImpact = ! empty($row['operational_impact']) ? strtoupper(trim((string) $row['operational_impact'])) : null;
                if ($operationalImpact && ! in_array($operationalImpact, ['HIGH', 'MEDIUM', 'LOW'], true)) {
                    $operationalImpact = null;
                }

                // Remarks (flag cancelled POs from the 2026 sheet)
                $remarks = ! empty($row['workflow_remarks']) ? trim((string) $row['workflow_remarks']) : null;
                if ($sheetStatus === 'CANCELLED') {
                    $remarks = trim('[CANCELLED] '.($remarks ?? ''));
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
                    'pr_number' => ! empty($row['pr_number']) ? substr(trim((string) $row['pr_number']), 0, 50) : null,
                    'pr_date' => $this->parseDate($row['pr_date'] ?? null),
                    'philgeps_reference_no' => ! empty($row['philgeps_reference_no']) ? substr(trim((string) $row['philgeps_reference_no']), 0, 50) : null,
                    'delivery_term' => $deliveryTerm,
                    'inclusive_date' => $inclusiveDate ? substr($inclusiveDate, 0, 100) : null,
                    'ors_burs_no' => ! empty($row['ors_burs_no']) ? substr(trim((string) $row['ors_burs_no']), 0, 50) : null,
                    'ors_burs_date' => $this->parseDate($row['ors_burs_date'] ?? null),
                    'responsibility_center' => ! empty($row['responsibility_center']) ? substr(trim((string) $row['responsibility_center']), 0, 100) : null,
                    'uacs_object_code' => ! empty($row['uacs_object_code']) ? substr(trim((string) $row['uacs_object_code']), 0, 50) : null,
                    'date_forwarded_to_smu' => $this->parseDate($row['date_forwarded_to_smu'] ?? null),
                    'date_forwarded_frontdesk' => $dateForwardedFrontdesk,

                    // --- Workflow Details ---
                    'po_step' => $poStep,
                    'po_received_date' => $poReceivedDate,
                    'po_vpad_forwarded_by' => ! empty($row['po_vpad_forwarded_by']) ? substr(trim((string) $row['po_vpad_forwarded_by']), 0, 255) : null,
                    'po_vpad_notified_date' => $this->parseDate($row['po_vpad_notified_date'] ?? null),
                    'po_vpad_notified_via' => ! empty($row['po_vpad_notified_via']) ? substr(trim((string) $row['po_vpad_notified_via']), 0, 100) : null,

                    'date_forwarded_to_end_user' => $dateForwardedToEndUser,
                    'end_user_forwarded_by' => ! empty($row['end_user_forwarded_by']) ? substr(trim((string) $row['end_user_forwarded_by']), 0, 255) : null,

                    'supplier_signature_date' => $supplierSignatureDate,
                    'date_forwarded_supplier' => $dateForwardedSupplier,
                    'forwarded_by_supplier' => ! empty($row['forwarded_by_supplier']) ? substr(trim((string) $row['forwarded_by_supplier']), 0, 255) : null,
                    'claimed_by_supplier' => ! empty($row['claimed_by_supplier']) ? substr(trim((string) $row['claimed_by_supplier']), 0, 255) : null,
                    'date_forwarded_coa' => $dateForwardedCoa,
                    'forwarded_by_coa' => ! empty($row['forwarded_by_coa']) ? substr(trim((string) $row['forwarded_by_coa']), 0, 255) : null,
                    'date_returned_from_coa' => $dateReturnedFromCoa,
                    'coa_date' => $coaDate,
                    'coa_processed_date' => $coaProcessedDate,
                    'claim_date' => $claimDate,
                    'claimed_by_coa' => ! empty($row['claimed_by_coa']) ? substr(trim((string) $row['claimed_by_coa']), 0, 255) : null,
                    'coa_stamp_notified_date' => $this->parseDate($row['coa_stamp_notified_date'] ?? null),
                    'coa_stamp_notified_via' => ! empty($row['coa_stamp_notified_via']) ? substr(trim((string) $row['coa_stamp_notified_via']), 0, 100) : null,

                    'date_received_by_supplier' => $dateReceivedBySupplier,
                    'receipt_receiving_date' => $receiptReceivingDate,
                    'receipt_claimed_by' => ! empty($row['receipt_claimed_by']) ? substr(trim((string) $row['receipt_claimed_by']), 0, 255) : null,
                    'receipt_claimed_notified_date' => $this->parseDate($row['receipt_claimed_notified_date'] ?? null),
                    'receipt_claimed_notified_via' => ! empty($row['receipt_claimed_notified_via']) ? substr(trim((string) $row['receipt_claimed_notified_via']), 0, 100) : null,
                    'items_receiving_date' => $itemsReceivingDate,
                    'items_claimed_by' => ! empty($row['items_claimed_by']) ? substr(trim((string) $row['items_claimed_by']), 0, 255) : null,

                    'ris_number' => ! empty($row['ris_number']) ? substr(trim((string) $row['ris_number']), 0, 100) : null,
                    'invoice_number' => ! empty($row['invoice_number']) ? substr(trim((string) $row['invoice_number']), 0, 100) : null,
                    'invoice_date' => $invoiceDate,
                    'delivery_receipt' => ! empty($row['delivery_receipt']) ? substr(trim((string) $row['delivery_receipt']), 0, 100) : null,
                    'par_ics_number' => ! empty($row['par_ics_number']) ? substr(trim((string) $row['par_ics_number']), 0, 100) : null,
                    'payment_status' => $paymentStatus,
                    'workflow_remarks' => $remarks,
                    'date_completed' => $dateCompleted,

                    'date_forwarded_to_finance' => $dateForwardedToFinance,
                    'finance_forwarded_by' => ! empty($row['finance_forwarded_by']) ? substr(trim((string) $row['finance_forwarded_by']), 0, 255) : null,
                ];

                $inspectionEntries = $this->inspectionEntriesFromRow($row);

                $existingPo = ServePo::where('po_number', $attributes['po_number'])->first();

                if ($existingPo) {
                    if (! $mergeExisting) {
                        $skipped[] = "Row #{$rowNumber}: PO '{$attributes['po_number']}' already exists (skipped).";

                        continue;
                    }

                    $updateData = array_filter($attributes, fn ($val) => $val !== null);
                    $existingPo->update($updateData);

                    if (! empty($validStockNos)) {
                        $existingPo->items()->syncWithoutDetaching($validStockNos);
                    }

                    // Save Inspection Details if present
                    if (! empty($inspectionEntries)) {
                        $existingPo->inspectionEntries()->delete();
                        $existingPo->inspectionEntries()->createMany($inspectionEntries);
                    }

                    // If workflow reached For Release or beyond, update Deliveries status
                    if (in_array($existingPo->po_step, self::RELEASE_STEPS, true) && $existingPo->coa_date) {
                        Delivery::where('po_number', $existingPo->po_number)
                            ->whereNull('status')
                            ->update(['status' => 'PENDING']);
                    }

                    $updated++;
                } else {
                    // New records need numeric amounts even when the sheet has none (e.g. 2026 has no ABC)
                    foreach (['total_amount_po', 'total_amount_abc', 'total_amount_diff'] as $amountKey) {
                        $attributes[$amountKey] ??= 0.0;
                    }

                    $newPo = ServePo::create($attributes);

                    if (! empty($validStockNos)) {
                        $newPo->items()->sync($validStockNos);
                    }

                    // Save Inspection Details if present
                    if (! empty($inspectionEntries)) {
                        $newPo->inspectionEntries()->createMany($inspectionEntries);
                    }

                    if (in_array($newPo->po_step, self::RELEASE_STEPS, true) && $newPo->coa_date) {
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
     * - Real Excel serials (int/float) are converted; numeric *strings* from CSV are not treated as serials.
     * - Multi-value cells ("2/5/2026; 2/27/2026") resolve to the latest date.
     * - Dates outside 2015-2035 (typos like 4/16/20026) are rejected.
     */
    private function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value) || is_float($value)) {
            try {
                return Date::excelToDateTimeObject((float) $value)->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        preg_match_all(
            '/(?<!\d)\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}(?!\d)|\d{4}-\d{2}-\d{2}/',
            (string) $value,
            $matches
        );

        foreach (array_reverse($matches[0]) as $candidate) {
            try {
                $date = Carbon::parse($candidate);
                if ($date->year >= 2015 && $date->year <= 2035) {
                    return $date->format('Y-m-d');
                }
            } catch (\Throwable) {
                // try the next candidate
            }
        }

        return null;
    }

    /**
     * Clean and parse numeric values. Returns $default (null) when the value is empty or not numeric.
     */
    private function parseNumeric(mixed $value, ?float $default = null): ?float
    {
        if ($value === null || $value === '') {
            return $default;
        }

        $clean = preg_replace('/[^0-9.-]/', '', (string) $value);

        return is_numeric($clean) ? (float) $clean : $default;
    }

    /**
     * Template headers. Mirrors the 2026 PIR Monitoring sheet column-for-column (same names, same order,
     * including its repeated headers), then appends the columns that only exist in the 2025 SERVED PO sheet.
     * Keep the PIR spellings ("SUPPPLIER", "NOIFIED", "RECIEPT"): the importer relies on them to detect the layout.
     */
    public function getTemplateHeaders(): array
    {
        return [
            'SUPPLIER',
            'P.O. NO.',
            'UNIT/OFFICE',
            'P.O. DATE',
            'DELIVERY TERM',
            'FUND CLUSTER',
            'P.R. NO.',
            'P.R. DATE',
            'ORS/BUR NO.',
            'ORS/BUR DATE',
            'PO AMOUNT',
            'ITEM DESCRIPTION',
            'OPERATINAL IMPACT',
            'DATE FORWARDED',
            'FORWARDED BY',
            'NOTIFY THE END-USER (VIA EMAIL)',
            'DATE NOIFIED THE END-USER',
            'DATE CLAIMED',
            'CLAIMED BY',
            'DATE RECEIVED BY SUPPPLIER',
            'DATE FORWARDED',
            'FORWARDED BY',
            'DATE RETURNED FROM COA',
            'COA DATE',
            'CLAIM DATE',
            'CLAIMED BY',
            'NOTIFY THE END-USER (VIA EMAIL)',
            'DATE NOTIFIED THE END-USER',
            'INVOICE NO.',
            'INVOICE DATE',
            'DELIVERY RECIEPT',
            'DATE COMPLETED',
            'ICS NO.',
            'RIS NO.',
            'INSPECTED BY',
            'INSPECTION DATE',
            'NOTIFY TO CLAIM THE RECEIPT',
            'NOTIFY THE END-USER (VIA EMAIL)',
            'RECEIPT RECEIVING DATE',
            'CLAIMED BY',
            'ITEM/S RECEIVING DATE',
            'CLAIMED BY',
            'IAR NO.',
            'DATE FORWARDED TO FINANCE',
            'STATUS',
            'LINK (COMPLETE DOCUMENTS)',
            'REMARKS',
            'INCLUSIVE DATE',
            'TYPE OF DELIVERY',
            'PHILGEPS REFERENCE NO.',
            'MODE OF PROCUREMENT',
            'TOTAL AMOUNT OF ABC',
            'RESPONSIBILITY CENTER',
            'UACS OBJECTS CODE/ EXPENDITURES',
            'DATE FORWARDED TO SMU',
            'COA PROCESSED DATE',
            'DATE FORWARDED TO SMU FRONT DESK',
        ];
    }

    /**
     * Sample rows taken from the real sheets: three 2026 PIR rows (full workflow, short workflow, just received)
     * and one 2025 SERVED PO row (core PO columns + the 2025-only columns).
     */
    public function getExampleRows(): array
    {
        return [
            [
                'E AND K. I. T. SOLUTIONS',
                '2025-12-1377',
                'SSU',
                '12/23/2025',
                '25',
                '01-RAF',
                '2025-11-1413',
                '11/28/2025',
                '06-101101-2025-12-2043',
                '12/23/2025',
                '₱648,000.00',
                '',
                '',
                '1/8/2026',
                'Shin',
                '',
                '1/14/2026',
                '1/14/2025',
                'Matmat',
                '1/14/2025',
                '1/15/2026',
                'Marivic',
                '1/16/2026',
                '1/16/2026',
                '1/20/2026',
                'Tilud',
                '',
                '1/20/2026',
                '834',
                '2/13/2026',
                '2563; 2562',
                '2/13/2026',
                'PAR No.: 2026020001; ICS No.: 2026020016',
                '',
                'Chris B. Villahermosa',
                '2/19/2026',
                '2/24/2026',
                'SSU',
                '2/25/2026',
                'Ortega',
                '',
                '',
                '202602130004',
                '3/11/2026',
                'COMPLETED',
                '',
                'Receipts and other documents forwarded on 2/24/26 due to consecutive FWA. Docs claimed by SG Ramil 2/16/2026. Docs forwarded by Ma\'am Marivic for IAE no., and to be forwarded to finance dept. 3/11/2026.',
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
            ],
            [
                'N\'JOY BAR-BQ AT KAINAN',
                '2026-01-0001',
                'CCO',
                '1/15/2026',
                '25',
                '05-IGF',
                '2026-01-0004',
                '1/13/2026',
                '02-206441-2026-01-0001',
                '1/16/2026',
                '₱20,075.00',
                '',
                '',
                '1/19/2026',
                'Shin',
                '',
                '1/19/2026',
                '1/19/2026',
                'Benjamin',
                '1/20/2026',
                '1/22/2026',
                'Benjamin',
                '1/22/2026',
                '1/22/2026',
                '1/23/2026',
                'Benjamin',
                '',
                '1/22/2026',
                '10',
                '1/17/2026',
                '',
                '1/17/2026',
                '',
                '',
                'Maricris B. Palomar',
                '1/17/2026',
                '',
                '',
                '',
                '',
                '',
                '',
                '202601170001',
                '',
                'COMPLETED',
                '',
                'Docs forwarded by Benjamin for IAR no., and claimed by him; may procced to finance dept. 1/26/2026',
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
            ],
            [
                'A-COLD REFRIGERATION REPAIR SERVICES',
                '2026-09-0623-A',
                'USeP MINTAL',
                '9/14/2026',
                '30',
                '06-BRF',
                '2026-06-0506',
                '6/29/2026',
                '06-206441-2026-10-0060',
                '10/8/2026',
                '₱5,888.00',
                'OFFICE EQUIPMENT',
                'HIGH',
                '10/14/2026',
                'Shin',
                'BAC',
                '10/14/2026',
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
            ],
            [
                'KAIROS KITCHEN',
                '2025-01-0001',
                'PMMED',
                '1/8/2025',
                '',
                '01-RAF',
                '2025-01-0001',
                '1/6/2025',
                '02-101101-2025-01-0002',
                '1/7/2025',
                '28,704.00',
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
                '',
                '',
                '',
                '',
                '',
                '',
                'JAN 8-9',
                'SERVICES',
                '',
                'SMALL VALUE PROCUREMENT',
                '30,000.00',
                '101 PMMED',
                '50299030',
                '1/8/2025',
                '1/8/2025',
                '1/9/2025',
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

        // Repeated headers (DATE FORWARDED, CLAIMED BY ...) need unique keys for the JSON view
        $seen = [];
        $jsonKeys = array_map(function ($h) use (&$seen) {
            $seen[$h] = ($seen[$h] ?? 0) + 1;

            return $seen[$h] > 1 ? $h.' ('.$seen[$h].')' : $h;
        }, $headers);

        $jsonRows = array_map(fn ($r) => array_combine($jsonKeys, $r), $rows);

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