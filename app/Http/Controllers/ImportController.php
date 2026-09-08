<?php

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\Office;
use App\Models\FundCluster;
use App\Models\Import;
use App\Jobs\ProcessRegspiImport;
use App\Jobs\ProcessDataImport;
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
     * Unchanged.
     */
    public function regspi(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:51200',
        ]);

        $path = $validated['file']->store('imports/regspi');
        $import = Import::create([
            'user_id' => $request->user()->getKey(),
            'file_path' => $path,
            'status' => 'pending',
        ]);

        ProcessRegspiImport::dispatch($import->getKey());

        return back()->with('success', "RegSPI import started.|||import_id:{$import->getKey()}");
    }

    /**
     * GET /import/{import}/status
     * Renamed from regspiStatus — this is generic across all queued
     * import types (regspi, items, transactions) since they all just
     * read off the same Import model fields.
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
}