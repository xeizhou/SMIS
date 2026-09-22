<?php

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\Office;
use App\Models\FundCluster;
use App\Models\Import;
use App\Models\EmployeeFileLocator;
use App\Jobs\ProcessRegspiImport;
use App\Jobs\ProcessRrspImport;
use App\Jobs\ProcessRrppeImport;
use App\Jobs\ProcessWmrImport;
use App\Jobs\ProcessBonaVidaImport;
use App\Jobs\ProcessDataImport;
use App\Jobs\ProcessEmployeeFileImport;
use App\Services\ImportProcessor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Handles "Import Data" (Items / Units / Transactions / Offices, from
 * Excel or JSON) and the matching "download template" links.
 *
 * xlsx/csv uploads for all four types still run synchronously here.
 * json uploads for items/transactions are dispatched to a queued job
 * (ProcessDataImport) instead, since those two files can get large
 * enough to blow past the request timeout — see ImportProcessor for
 * the shared row logic both paths call.
 *
 * RegSPI, RRSP, RRPPE, WMR and Bona-Vida CSV imports are queued too
 * (ProcessRegspiImport / ProcessRrspImport / ProcessRrppeImport /
 * ProcessWmrImport / ProcessBonaVidaImport) and report progress through
 * the Import model.
 *
 * Employee File Locator import is queued (see employeeFiles() below)
 * and CSV-only.
 *
 * Requires PhpSpreadsheet, which ships as a dependency of maatwebsite/excel.
 * If it's not already in composer.json:
 *   composer require phpoffice/phpspreadsheet
 */
class ImportController extends Controller
{
    private const SCHEMAS = [
        'items' => [
            'stock_no' => true,
            'item_name' => true,
            'description' => false,
            'unit_short_name' => false,
            'fund_cluster_id' => false,
        ],
        'units' => [
            'unit_name' => true,
            'unit_short_name' => true,
        ],
        'transactions' => [
            'transaction_type' => true,
            'transaction_date' => true,
            'stock_no' => false,
            'item_name' => true,
            'description' => false,
            'unit_short_name' => true,
            'reference' => true,
            'quantity' => true,
            'office_code' => true,
            'fund_cluster' => true,
        ],
        'offices' => [
            'office_code' => true,
            'office_name' => true,
            'entity_name' => false,
            'office_head' => false,
            'email' => false,
        ],
        'regspi' => [
            'month_year' => true,
            'ics_no' => false,
            'rrsp_no' => false,
            'fund_cluster_id' => false,
            'semi_expendable_property_no' => true,
            'item_description' => true,
            'estimated_useful_life' => false,
            'issued_qty' => false,
            'issued_office_officer' => false,
            'returned_qty' => false,
            'returned_office_officer' => false,
            'reissued_qty' => false,
            'reissued_office_officer' => false,
            'disposed_qty' => false,
            'amount' => true,
            'remarks' => false,
        ],
    ];

    private const ALIASES = [
        'unit_name' => ['name', 'unit'],
        'unit_short_name' => ['short', 'short_name', 'abbreviation', 'abbr', 'symbol', 'unit'],
        'item_name' => ['name', 'item'],
        'stock_no' => ['stock', 'stock_number', 'stockno', 'code', 'item_code'],
        'description' => ['desc'],
        'fund_cluster_id' => ['fund', 'fund_cluster'],
        'transaction_type' => ['type'],
        'transaction_date' => ['date'],
        'reference' => ['ref', 'ref_no', 'reference_no'],
        'office_code' => ['office', 'code', 'short'],
        'office_name' => ['name'],
        'office_head' => ['head', 'chief', 'director'],
        'entity_name' => ['entity'],
        'fund_cluster' => ['fund', 'fund_cluster_id'],
    ];

    public function __construct(private ImportProcessor $processor)
    {
    }

    /**
     * POST /import/items
     * xlsx/csv -> synchronous (unchanged). json -> queued.
     */
    public function items(Request $request)
    {
        if ($request->input('file_format') === 'json') {
            return $this->dispatchJsonImport($request, 'items');
        }

        return $this->handleImport($request, 'items', function (array $rows, bool $merge) {
            return $this->processor->importItems($rows, $merge);
        });
    }

    /**
     * POST /import/units
     * Unchanged — small enough to always run synchronously.
     */
    public function units(Request $request)
    {
        return $this->handleImport($request, 'units', function (array $rows, bool $merge) {
            $created = 0;
            $updated = 0;
            $skipped = [];

            foreach ($rows as $i => $row) {
                $validator = Validator::make($row, [
                    'unit_name' => 'required|string|max:255',
                    'unit_short_name' => 'required|string|max:255',
                ]);

                if ($validator->fails()) {
                    $skipped[] = "Row {$this->rowLabel($i)}: " . $validator->errors()->first();
                    continue;
                }

                $existing = Unit::where('unit_short_name', $row['unit_short_name'])->first();

                if ($existing && ! $merge) {
                    $skipped[] = "Row {$this->rowLabel($i)}: unit '{$row['unit_short_name']}' already exists (merge is off).";
                    continue;
                }

                if ($existing) {
                    $existing->update(['unit_name' => $row['unit_name']]);
                    $updated++;
                } else {
                    Unit::create($row);
                    $created++;
                }
            }

            return [$created, $updated, $skipped];
        });
    }

    /**
     * Cancel endpoint shared by every queued import type (regspi, rrsp,
     * rrppe, wmr, bona-vida, ...) — they all just flip the status on the
     * same Import model.
     */
    public function regspiCancel(Import $import)
    {
        if (in_array($import->status, ['pending', 'processing'], true)) {
            $import->update(['status' => 'cancelled']);
        }

        return back();
    }

    /**
     * POST /import/offices
     * Unchanged — small enough to always run synchronously.
     */
    public function offices(Request $request)
    {
        return $this->handleImport($request, 'offices', function (array $rows, bool $merge) {
            $created = 0;
            $updated = 0;
            $skipped = [];

            foreach ($rows as $i => $row) {
                $validator = Validator::make($row, [
                    'office_code' => 'required|string|max:20',
                    'office_name' => 'required|string|max:255',
                    'entity_name' => 'nullable|string|max:255',
                    'office_head' => 'nullable|string|max:150',
                    'email' => 'nullable|email|max:255',
                ]);

                if ($validator->fails()) {
                    $skipped[] = "Row {$this->rowLabel($i)}: " . $validator->errors()->first();
                    continue;
                }

                $existing = Office::where('office_code', $row['office_code'])->first();

                if ($existing && ! $merge) {
                    $skipped[] = "Row {$this->rowLabel($i)}: office '{$row['office_code']}' already exists (merge is off).";
                    continue;
                }

                $attrs = [
                    'office_name' => $row['office_name'],
                    'entity_name' => $row['entity_name'] ?? null,
                    'office_head' => $row['office_head'] ?? null,
                    'email' => $row['email'] ?? null,
                ];

                if ($existing) {
                    $existing->update($attrs);
                    $updated++;
                } else {
                    Office::create(['office_code' => $row['office_code'], ...$attrs]);
                    $created++;
                }
            }

            return [$created, $updated, $skipped];
        });
    }

    /**
     * POST /import/regspi
     * Requires a user-selected fund_cluster_id, since these CSVs
     * don't carry a "Fund Cluster:" line the way other report types
     * do. Passed straight through to the job rather than stored on
     * the Import row.
     */
    public function regspi(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:51200',
            'fund_cluster_id' => 'required|string|exists:fund_clusters,fund_cluster_id',
        ]);

        $path = $validated['file']->store('imports/regspi');
        $import = Import::create([
            'user_id' => $request->user()->getKey(),
            'file_path' => $path,
            'status' => 'pending',
        ]);

        ProcessRegspiImport::dispatch($import->getKey(), $validated['fund_cluster_id']);

        return back()->with('success', "RegSPI import started.|||import_id:{$import->getKey()}");
    }

    /**
     * POST /import/rrsp
     * Queued CSV import for RRSP monitoring (header rows + item rows).
     * No fund cluster needed — the RRSP CSV doesn't use one.
     */
    public function rrsp(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:51200',
        ]);

        $path = $validated['file']->store('imports/rrsp');
        $import = Import::create([
            'user_id' => $request->user()->getKey(),
            'file_path' => $path,
            'status' => 'pending',
        ]);

        ProcessRrspImport::dispatch($import->getKey());

        return back()->with('success', "RRSP import started.|||import_id:{$import->getKey()}");
    }

    /**
     * GET /import/template/rrsp
     * Registered BEFORE /import/template/{type} in web.php, so it never
     * reaches template() (which only knows the SCHEMAS types).
     */
    public function rrspTemplate(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'wb');

            fputcsv($handle, ['RECEIPT OF RETURN OF SEMI-EXPENDABLE PROPERTY 2026']);
            fputcsv($handle, [
                'RRSP no.', 'Date', 'Item Description', 'Quantity', 'Property Number',
                'End-Users Name', 'Cost', 'Office', 'Kind of Semi-Expandable',
                'Status', 'Area', 'Remarks',
            ]);
            fputcsv($handle, [
                '2026-01-0001', '1/8/2026', 'Printer, Epson L3110', 1, 'ICS-05-IGF-2019091225',
                'Juan Dela Cruz', '7,750.00', 'CED', 'High Value',
                'Unserviceable', 'SMU Bodega (Side)', '',
            ]);
            // Blank RRSP no. = another item under the RRSP above
            fputcsv($handle, [
                '', '', 'UPS, APC 650VA', 1, 'ICS-05-IGF-2023100250',
                '', '1,595.00', '', 'Low Value',
                'Unserviceable', 'SMU Bodega (Side)', '',
            ]);

            fclose($handle);
        }, 'rrsp_import_template.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * POST /import/rrppe
     * Queued CSV import for RRPPE monitoring (header rows + item rows).
     */
    public function rrppe(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:51200',
        ]);

        $path = $validated['file']->store('imports/rrppe');
        $import = Import::create([
            'user_id' => $request->user()->getKey(),
            'file_path' => $path,
            'status' => 'pending',
        ]);

        ProcessRrppeImport::dispatch($import->getKey());

        return back()->with('success', "RRPPE import started.|||import_id:{$import->getKey()}");
    }

    /**
     * GET /import/template/rrppe
     * Registered BEFORE /import/template/{type} in web.php.
     */
    public function rrppeTemplate(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'wb');

            fputcsv($handle, ['RECEIPT OF RETURN OF PROPERTY, PLANT AND EQUIPMENT 2026']);
            fputcsv($handle, [
                'RRPPE NO.', 'Date', 'Item Description', 'Quantity', 'Property Number',
                'End-Users Name', 'Cost', 'Status', 'Area', 'Remarks',
            ]);
            fputcsv($handle, [
                '2026-01-0001', '1/27/2026', 'REFRIGERATOR, 19 cu.ft', 1, '164-2012090111',
                'Juan Dela Cruz', '57,999.00', 'UNSERVICEABLE', 'SMU Bodega (Side)', '',
            ]);
            // Blank RRPPE no. = another item under the RRPPE above
            fputcsv($handle, [
                '', '', 'PROJECTOR, DLP-3000ANSI', 1, '164-2014120003',
                '', '53,000.00', 'UNSERVICEABLE', 'SMU Bodega (Side)', '',
            ]);

            fclose($handle);
        }, 'rrppe_import_template.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * POST /import/wmr
     * Queued CSV import for WMR monitoring (one WMR = a block of rows).
     */
    public function wmr(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:51200',
        ]);

        $path = $validated['file']->store('imports/wmr');
        $import = Import::create([
            'user_id' => $request->user()->getKey(),
            'file_path' => $path,
            'status' => 'pending',
        ]);

        ProcessWmrImport::dispatch($import->getKey());

        return back()->with('success', "WMR import started.|||import_id:{$import->getKey()}");
    }

    /**
     * GET /import/template/wmr
     * Registered BEFORE /import/template/{type} in web.php.
     */
    public function wmrTemplate(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'wb');

            // 20 columns; only the cells we fill are listed
            $row = fn (array $cells) => array_replace(array_fill(0, 20, ''), $cells);

            fputcsv($handle, $row([
                0 => 'SUPPLIER', 1 => 'IAR No.', 2 => 'IAR Date', 3 => 'ITEM/VEHICLE',
                4 => 'Details', 12 => 'DEFECTS/COMPLAINTS', 14 => 'COST', 15 => 'OFFICE',
                16 => 'REQUESTED BY', 17 => 'RECEIVED BY', 18 => 'DATED', 19 => 'REMARKS',
            ]));

            // One WMR = these 6 rows. A filled SUPPLIER cell starts a new WMR.
            // Extra materials can go on the following rows of the same column.
            fputcsv($handle, $row([
                0 => 'JASMIN PETRON SERVICE STATION', 2 => '1/15/2026', 3 => 'SUZUKI ERTIGA GOT 836',
                4 => 'WMR:', 5 => '2026010002', 6 => 'Date:', 7 => '1/15/2026',
                12 => 'LABOR:', 14 => '2,755.00', 15 => 'MOTORPOOL', 16 => 'Juan Dela Cruz',
            ]));
            fputcsv($handle, $row([
                4 => 'JOB ORDER No:', 5 => 'M0-48-12-25', 6 => 'Date:', 7 => '12/2/2025',
                8 => 'Type:', 9 => 'SUV', 12 => 'Replacement',
            ]));
            fputcsv($handle, $row([
                4 => 'Fund:', 5 => '05-IGF', 6 => 'Brand Name:', 7 => 'SUZUKI',
                8 => 'MODEL:', 9 => 'ERTIGA', 10 => 'PLATE NO.', 11 => 'GOT 836', 12 => 'Materials:',
            ]));
            fputcsv($handle, $row([
                4 => 'Serial/Engine No:', 5 => 'K14BT1281578', 6 => 'Acquisition Date:', 7 => '2018',
                8 => 'PROPERTY NO.', 9 => '164-2018070044', 12 => 'ALTERNATOR BELT, COMPRESSOR BELT',
            ]));
            fputcsv($handle, $row([
                4 => 'Inspector Name:', 5 => 'Orvil M. Basug', 6 => 'Date:', 7 => '12/3/2025',
            ]));
            fputcsv($handle, $row([
                4 => 'Invoice:', 5 => '34942', 6 => 'Date:', 7 => '12/10/2025',
            ]));

            fclose($handle);
        }, 'wmr_import_template.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * POST /import/bona-vida
     * Queued CSV import for Bona-Vida delivery monitoring. No fund
     * cluster or dialog-selected value needed — office_code comes
     * straight off the CSV's OFFICES column.
     */
    public function bonaVida(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:51200',
        ]);

        $path = $validated['file']->store('imports/bona-vida');
        $import = Import::create([
            'user_id' => $request->user()->getKey(),
            'file_path' => $path,
            'status' => 'pending',
        ]);

        ProcessBonaVidaImport::dispatch($import->getKey());

        return back()->with('success', "Bona-Vida import started.|||import_id:{$import->getKey()}");
    }

    /**
     * GET /import/template/bona-vida
     * Registered BEFORE /import/template/{type} in web.php.
     */
    public function bonaVidaTemplate(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'wb');

            fputcsv($handle, [
                'DATE RECIEVE', 'OFFICES', 'QTY', 'U/M', 'PRICE',
                'TOTAL AMOUNT', 'INVOICE NO.', 'INVOICE DATE', 'REMARKS',
            ]);
            fputcsv($handle, [
                '11/3/2022', 'COE-DEANS OFFICE', 6, 'bot', 32.5, 195.0, 1302, '11/3/2022', '',
            ]);

            fclose($handle);
        }, 'bona_vida_import_template.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * POST /import/employee-files
     * Queued import for the Employee File Locator sheet — same pattern as
     * bonaVida(). CSV-only (xlsx uploads are no longer accepted). See
     * ProcessEmployeeFileImport for the two-block parsing logic.
     */
    public function employeeFiles(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:20480',
        ]);

        $path = $validated['file']->store('imports/employee-files');
        $import = Import::create([
            'user_id' => $request->user()->getKey(),
            'file_path' => $path,
            'status' => 'pending',
        ]);

        ProcessEmployeeFileImport::dispatch($import->getKey());

        return back()->with('success', "Employee File Locator import started.|||import_id:{$import->getKey()}");
    }

    /**
     * GET /import/template/employee-files
     * Registered BEFORE /import/template/{type} in web.php (same reason
     * as the rrsp/rrppe/wmr/bona-vida templates).
     */
    public function employeeFileTemplate(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'wb');

            fputcsv($handle, ['EMPLOYEE FILE LOCATOR']);
            fputcsv($handle, ['ACTIVE FILES', '', '', '', '', '', '', 'DEAD FILES']);
            fputcsv($handle, []);
            fputcsv($handle, [
                'NO.', 'LAST NAME', 'FIRST NAME', 'MIDDLE NAME', 'AREA', 'STATUS', '',
                'NO.', 'LAST NAME', 'FIRST NAME', 'MIDDLE NAME', 'AREA', 'STATUS',
            ]);
            fputcsv($handle, []);
            fputcsv($handle, [
                1, 'DELA CRUZ', 'JUAN', 'S.', '1-L1', 'Active', '',
                1, 'SANTOS', 'MARIA', 'P.', 'DEAD FILES', 'Dead',
            ]);

            fclose($handle);
        }, 'employee_file_locator_import_template.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * GET /import/{import}/status
     * Generic across all queued import types (regspi, rrsp, rrppe, wmr,
     * bona-vida, items, transactions) since they all just read off the
     * same Import model.
     */
    public function status(Request $request, Import $import)
    {
        abort_unless($import->user_id === $request->user()->getKey(), 403);

        return response()->json([
            'id' => $import->getKey(),
            'status' => $import->status,
            'total_rows' => $import->total_rows,
            'processed_rows' => $import->processed_rows,
            'created_rows' => $import->created_rows,
            'updated_rows' => $import->updated_rows,
            'skipped_rows' => $import->skipped_rows,
            'error_message' => $import->error_message,
        ]);
    }

    /**
     * Kept as an alias in case existing routes/frontend still reference
     * regspiStatus by name — safe to delete once you've updated the
     * route file to point at status() directly.
     */
    public function regspiStatus(Request $request, Import $import)
    {
        return $this->status($request, $import);
    }

    /**
     * POST /import/transactions
     * xlsx/csv -> synchronous (unchanged, same dedupe/resolution rules
     * documented below). json -> queued.
     *
     * Transactions are always additive (there's no natural unique key to
     * "merge" against — two receipts can legitimately have the same item,
     * date, and quantity). The merge checkbox here only controls whether
     * unmatched office_code/fund_cluster values are created on the fly
     * (merge = create missing refs) or skipped (merge off = strict, row
     * must already resolve against existing data).
     *
     * Duplicate detection uses a fingerprint of transaction_type +
     * transaction_date + item_name + reference + quantity + office_code
     * + fund_cluster, compared by COUNT not existence — see
     * ImportProcessor::processTransactionRow() for the full reasoning.
     */
    public function transactions(Request $request)
    {
        if ($request->input('file_format') === 'json') {
            return $this->dispatchJsonImport($request, 'transactions');
        }

        return $this->handleImport($request, 'transactions', function (array $rows, bool $merge) {
            return $this->processor->importTransactions($rows, $merge);
        });
    }

    /**
     * Shared dispatch path for the queued (json-only) items/transactions
     * imports. Stores the raw upload, creates the Import tracking row,
     * and hands off to ProcessDataImport — the job re-reads and parses
     * the file itself so this request can return immediately.
     */
    private function dispatchJsonImport(Request $request, string $type)
    {
        $request->validate([
            'file' => 'required|file|mimes:json|max:20480',
            'merge_existing' => 'nullable|boolean',
        ]);

        $path = $request->file('file')->store("imports/{$type}");

        $import = Import::create([
            'user_id' => $request->user()->getKey(),
            'file_path' => $path,
            'status' => 'pending',
        ]);

        ProcessDataImport::dispatch(
            $import->getKey(),
            $type,
            $path,
            $request->boolean('merge_existing', true)
        );

        return back()->with('success', "Import started.|||import_id:{$import->getKey()}");
    }

    /**
     * GET /import/template/{type}
     * Unchanged.
     */
    public function template(string $type): StreamedResponse
    {
        abort_unless(isset(self::SCHEMAS[$type]), 404);

        $headers = array_keys(self::SCHEMAS[$type]);

        if ($type === 'regspi') {
            return response()->streamDownload(function () use ($headers) {
                $handle = fopen('php://output', 'wb');
                fputcsv($handle, $headers);
                fputcsv($handle, $this->exampleRow('regspi'));
                fclose($handle);
            }, 'regspi_import_template.csv', [
                'Content-Type' => 'text/csv; charset=UTF-8',
            ]);
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray($headers, null, 'A1');
        $sheet->fromArray($this->exampleRow($type), null, 'A2');

        foreach (range('A', $sheet->getHighestColumn()) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = "{$type}_import_template.xlsx";

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function exampleRow(string $type): array
    {
        return match ($type) {
            'items' => ['STK-0001', 'Bond Paper A4', 'Substance 20', 'REAM', '101'],
            'units' => ['Ream', 'REAM'],
            'transactions' => ['RECEIVE', now()->format('Y-m-d'), 'STK-0001', 'Bond Paper A4', 'Substance 20', 'REAM', 'DR-0001', 50, 'OFC-01', '101'],
            'offices' => ['OFC-01', 'Supply Management Unit', 'University of Southeastern Philippines', 'Juan Dela Cruz', 'smu@usep.edu.ph'],
            'regspi' => ['2026-01', 'ICS-0001', null, '101', 'SEP-0001', 'Laptop', 5, 1, 'Juan Dela Cruz', 0, null, 0, null, 0, 50000, null],
        };
    }

    /**
     * Shared plumbing for the SYNCHRONOUS (xlsx/csv) path only. json is
     * intercepted before this in items()/transactions() and never
     * reaches here for those two types; units/offices still always come
     * through here regardless of format.
     */
    private function handleImport(Request $request, string $type, callable $importer)
    {
        $request->validate([
            'file' => 'required|file|max:20480',
            'file_format' => 'required|in:xlsx,json,csv',
            'merge_existing' => 'nullable|boolean',
        ]);

        $merge = $request->boolean('merge_existing', true);
        $format = $request->input('file_format');

        try {
            $rows = match ($format) {
                'json' => $this->parseJson($request->file('file'), $type),
                'csv' => $this->parseCsv($request->file('file'), $type),
                default => $this->parseXlsx($request->file('file'), $type),
            };
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read file: ' . $e->getMessage()]);
        }

        if (empty($rows)) {
            return back()->withErrors(['file' => 'No rows found in the uploaded file.']);
        }

        $model = match ($type) {
            'items' => StockItem::class,
            'units' => Unit::class,
            'offices' => Office::class,
            'transactions' => Transaction::class,
            default => null,
        };

        [$created, $updated, $skipped] = $model
            ? $model::withoutActivityLogging(fn () => $importer($rows, $merge))
            : $importer($rows, $merge);

        $this->logAudit(sprintf(
            'Imported %s: %d created, %d updated, %d skipped.',
            $type,
            $created,
            $updated,
            count($skipped)
        ));

        $message = "Import complete: {$created} created, {$updated} updated";
        if (! empty($skipped)) {
            $message .= ', ' . count($skipped) . ' row(s) skipped.';
            $preview = array_slice($skipped, 0, 10);
            $message .= '|||' . implode('|||', $preview);
        }

        return back()->with('success', $message);
    }

    private function parseXlsx($file, string $type): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getActiveSheet();
        $raw = $sheet->toArray(null, true, true, false);

        if (count($raw) < 2) {
            return [];
        }

        $headers = array_map(fn ($h) => trim((string) $h), $raw[0]);
        $rows = [];

        foreach (array_slice($raw, 1) as $line) {
            if (count(array_filter($line, fn ($v) => $v !== null && $v !== '')) === 0) {
                continue;
            }

            $row = [];
            foreach ($headers as $idx => $key) {
                if ($key === '') continue;
                $value = $line[$idx] ?? null;
                $row[$key] = $value === '' ? null : $value;
            }

            $rows[] = $this->coerceRow($row, $type);
        }

        return $rows;
    }

    /**
     * Still used for units/offices json uploads (those stay synchronous).
     * items/transactions json uploads no longer come through here — see
     * dispatchJsonImport() / ProcessDataImport.
     */
    private function parseJson($file, string $type): array
    {
        $decoded = json_decode(file_get_contents($file->getRealPath()), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Invalid JSON: ' . json_last_error_msg());
        }

        $list = $decoded['data'] ?? $decoded;

        if (! is_array($list)) {
            throw new \RuntimeException('Expected a JSON array of rows (or {"data": [...]}).');
        }

        return array_map(fn ($row) => $this->coerceRow($row, $type), $list);
    }

    private function parseCsv($file, string $type): array
    {
        $handle = fopen($file->getRealPath(), 'rb');

        if ($handle === false) {
            throw new \RuntimeException('Could not open CSV file.');
        }

        $headers = fgetcsv($handle);
        if ($headers === false) {
            fclose($handle);
            return [];
        }

        $firstLine = implode(',', $headers);
        $delimiter = $this->detectCsvDelimiter($firstLine);
        if ($delimiter !== ',') {
            rewind($handle);
            $headers = fgetcsv($handle, 0, $delimiter);
        }

        $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $headers[0]);
        $headers = array_map(fn ($header) => trim((string) $header), $headers);
        $rows = [];

        while (($line = fgetcsv($handle, 0, $delimiter)) !== false) {
            if (count(array_filter($line, fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }

            $row = [];
            foreach ($headers as $index => $key) {
                if ($key !== '') {
                    $value = trim((string) ($line[$index] ?? ''));
                    $row[$key] = $value === '' ? null : $value;
                }
            }

            $rows[] = $this->coerceRow($row, $type);
        }

        fclose($handle);

        return $rows;
    }

    private function detectCsvDelimiter(string $line): string
    {
        $candidates = [',', ';', "\t", '|'];
        $delimiter = ',';
        $highestCount = 0;

        foreach ($candidates as $candidate) {
            $count = substr_count($line, $candidate);
            if ($count > $highestCount) {
                $delimiter = $candidate;
                $highestCount = $count;
            }
        }

        return $delimiter;
    }

    private function coerceRow(array $row, string $type): array
    {
        $schema = self::SCHEMAS[$type];
        $lower = [];
        foreach ($row as $k => $v) {
            $lower[strtolower(trim((string) $k))] = $v;
        }

        $out = [];

        foreach ($schema as $field => $required) {
            if (array_key_exists(strtolower($field), $lower)) {
                $out[$field] = $lower[strtolower($field)];
                continue;
            }

            $value = null;
            foreach (self::ALIASES[$field] ?? [] as $alias) {
                if (array_key_exists(strtolower($alias), $lower)) {
                    $value = $lower[strtolower($alias)];
                    break;
                }
            }

            $out[$field] = $value;
        }

        if ($type === 'items' && empty($out['unit_short_name'])) {
            $unitsList = $row['units'] ?? null;
            if (is_array($unitsList) && count($unitsList) > 0) {
                $chosen = null;
                foreach ($unitsList as $u) {
                    if (is_array($u) && ! empty($u['is_default'])) {
                        $chosen = $u;
                        break;
                    }
                }
                $chosen = $chosen ?? $unitsList[0];
                if (is_array($chosen)) {
                    $out['unit_short_name'] = $chosen['unit_short_name']
                        ?? $chosen['short']
                        ?? $chosen['name']
                        ?? $chosen['unit_name']
                        ?? null;
                }
            }
        }

        if ($type === 'transactions' && empty($out['transaction_type']) && empty($out['quantity'])) {
            $receipt = $lower['receipt'] ?? $lower['received'] ?? null;
            $issue = $lower['issue'] ?? $lower['issued'] ?? null;

            if (is_numeric($receipt) && (float) $receipt > 0) {
                $out['transaction_type'] = 'RECEIVE';
                $out['quantity'] = $receipt;
            } elseif (is_numeric($issue) && (float) $issue > 0) {
                $out['transaction_type'] = 'ISSUE';
                $out['quantity'] = $issue;
            }
        }

        if ($type === 'transactions' && ! empty($out['transaction_date'])) {
            $out['transaction_date'] = $this->normalizeDate($out['transaction_date']);
        }

        if (isset($out['quantity'])) {
            $out['quantity'] = is_numeric($out['quantity']) ? (int) $out['quantity'] : $out['quantity'];
        }

        return $out;
    }

    private function normalizeDate($value): string
    {
        if (is_numeric($value)) {
            return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d H:i:s');
        }

        try {
            return \Illuminate\Support\Carbon::parse($value)->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return (string) $value;
        }
    }

    private function rowLabel(int $zeroBasedIndex): int
    {
        return $zeroBasedIndex + 2;
    }

    private function logAudit(string $action): void
    {
        DB::table('audit_logs')->insert([
            'log_timestamp' => now(),
            'userID' => Auth::id(),
            'role' => Auth::user()->role ?? 'user',
            'action' => $action,
        ]);
    }

    /**
     * CSV path for the Employee File Locator import. Scans forward for
     * the "NO." / "LAST NAME" header row rather than assuming a fixed
     * line number, same approach as the Bona-Vida job.
     */
    private function parseEmployeeFileCsv($file): array
    {
        $handle = fopen($file->getRealPath(), 'rb');

        if ($handle === false) {
            throw new \RuntimeException('Could not open CSV file.');
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

            if ($isBlank) {
                continue;
            }

            array_push($rows, ...$this->splitEmployeeFileRow($line));
        }

        fclose($handle);

        return $rows;
    }

    /**
     * One physical row can yield up to two records: left block (Active)
     * and right block (Dead). A side only produces a record if it has a
     * LAST NAME — this is what lets us ignore the right block's
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
            // every column filled except STATUS (e.g. "DAPITON, VITA
            // JULE" has no STATUS cell) — those still default to
            // 'Inactive' via $defaultStatus, matching the "Dead" ->
            // "Inactive" mapping above.
            'status' => $status !== '' ? $status : $defaultStatus,
        ];
    }

    private function nullableTrim($value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }
}