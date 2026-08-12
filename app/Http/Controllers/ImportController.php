<?php

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\Office;
use App\Models\FundCluster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Handles "Import Data" (Items / Units / Transactions, from Excel or JSON)
 * and the matching "download template" links.
 *
 * Requires PhpSpreadsheet, which ships as a dependency of maatwebsite/excel.
 * If it's not already in composer.json:
 *   composer require phpoffice/phpspreadsheet
 */
class ImportController extends Controller
{
    /**
     * Column headers (Excel) / keys (JSON) expected for each data type.
     * Kept in one place so the parser and the template generator can't
     * drift apart from each other.
     */
    private const SCHEMAS = [
        'items' => [
            'stock_no' => true,
            'item_name' => true,
            'description' => false,
            'reorder_point' => false,
            'unit_short_name' => false, // default unit, matched against units table
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
    ];

    /**
     * Alternate key/header names accepted as synonyms for a schema field.
     * Lets people import files that don't use our exact column names
     * (e.g. a JSON export using "name"/"short" instead of
     * "unit_name"/"unit_short_name") without hand-editing the file first.
     * Matched case-insensitively; checked in the order listed, first
     * match wins.
     */
    private const ALIASES = [
        'unit_name' => ['name', 'unit'],
        'unit_short_name' => ['short', 'short_name', 'abbreviation', 'abbr', 'symbol', 'unit'],
        'item_name' => ['name', 'item'],
        'stock_no' => ['stock', 'stock_number', 'stockno', 'code', 'item_code'],
        'description' => ['desc'],
        'reorder_point' => ['reorder', 'reorder_qty', 'min_stock'],
        'transaction_type' => ['type'],
        'transaction_date' => ['date'],
        'reference' => ['ref', 'ref_no', 'reference_no'],
        'office_code' => ['office', 'code', 'short'],
        'office_name' => ['name'],
        'office_head' => ['head', 'chief', 'director'],
        'entity_name' => ['entity'],
        'fund_cluster' => ['fund', 'fund_cluster_id'],
    ];

    /**
     * POST /import/items
     */
    public function items(Request $request)
    {
        return $this->handleImport($request, 'items', function (array $rows, bool $merge) {
            $created = 0;
            $updated = 0;
            $skipped = [];

            foreach ($rows as $i => $row) {
                $validator = Validator::make($row, [
                    'stock_no' => 'required|string|max:255',
                    'item_name' => 'required|string|max:255',
                    'description' => 'nullable|string|max:255',
                    'reorder_point' => 'nullable|integer|min:0',
                    'unit_short_name' => 'nullable|string|max:255',
                ]);

                if ($validator->fails()) {
                    $skipped[] = "Row {$this->rowLabel($i)}: " . $validator->errors()->first();
                    continue;
                }

                $existing = StockItem::where('stock_no', $row['stock_no'])->first();

                if ($existing && ! $merge) {
                    $skipped[] = "Row {$this->rowLabel($i)}: stock_no '{$row['stock_no']}' already exists (merge is off).";
                    continue;
                }

                $attrs = [
                    'item_name' => $row['item_name'],
                    'description' => $row['description'] ?? null,
                    'reorder_point' => $row['reorder_point'] ?? 10,
                ];

                if ($existing) {
                    $existing->update($attrs);
                    $item = $existing;
                    $updated++;
                } else {
                    $item = StockItem::create(['stock_no' => $row['stock_no'], ...$attrs]);
                    $created++;
                }

                // Attach default unit if a matching unit_short_name was given.
                // The label might be a short code ("pcs") or a full unit
                // name ("bottle") depending on the source file — match either.
                if (! empty($row['unit_short_name'])) {
                    $unit = Unit::where('unit_short_name', $row['unit_short_name'])
                        ->orWhere('unit_name', $row['unit_short_name'])
                        ->first();
                    if ($unit) {
                        $item->units()->syncWithoutDetaching([$unit->unitID => ['is_default' => true]]);
                    } else {
                        $skipped[] = "Row {$this->rowLabel($i)}: unit '{$row['unit_short_name']}' not found, item saved without it.";
                    }
                }
            }

            return [$created, $updated, $skipped];
        });
    }

    /**
     * POST /import/units
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
     * POST /import/offices
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
     * POST /import/transactions
     *
     * Transactions are always additive (there's no natural unique key to
     * "merge" against — two receipts can legitimately have the same item,
     * date, and quantity). The merge checkbox here only controls whether
     * unmatched stock_no/office_code/fund_cluster values are created on
     * the fly (merge = create missing refs) or skipped (merge off = strict,
     * row must already resolve against existing data).
     */
    public function transactions(Request $request)
    {
        return $this->handleImport($request, 'transactions', function (array $rows, bool $merge) {
            $created = 0;
            $skipped = [];

            foreach ($rows as $i => $row) {
                $validator = Validator::make($row, [
                    'transaction_type' => 'required|in:RECEIVE,ISSUE',
                    'transaction_date' => 'required|date',
                    'stock_no' => 'nullable|string|max:255',
                    'item_name' => 'required|string|max:255',
                    'description' => 'nullable|string|max:255',
                    'unit_short_name' => 'required|string|max:255',
                    'reference' => 'required|string|max:255',
                    'quantity' => 'required|integer|min:0',
                    'office_code' => 'required|string|max:255',
                    'fund_cluster' => 'required|string|max:255',
                ]);

                if ($validator->fails()) {
                    $skipped[] = "Row {$this->rowLabel($i)}: " . $validator->errors()->first();
                    continue;
                }

                // The label might be a short code ("pcs") or a full unit
                // name ("bottle") depending on the source file — match either.
                $unit = Unit::where('unit_short_name', $row['unit_short_name'])
                    ->orWhere('unit_name', $row['unit_short_name'])
                    ->first();
                if (! $unit) {
                    $skipped[] = "Row {$this->rowLabel($i)}: unit '{$row['unit_short_name']}' not found.";
                    continue;
                }

                // office_code might already be a code, or a full office
                // name ("Gender and Development") depending on the source
                // file — match either and resolve to the actual code.
                $office = Office::where('office_code', $row['office_code'])
                    ->orWhere('office_name', $row['office_code'])
                    ->first();

                if (! $office) {
                    if (! $merge) {
                        $skipped[] = "Row {$this->rowLabel($i)}: office '{$row['office_code']}' not found.";
                        continue;
                    }
                    $office = $this->findOrCreateOffice($row['office_code']);
                }

                // fund_cluster: value may already be a fund_cluster_id
                // ("01-RAF"), or could reference one that doesn't exist
                // in this database yet.
                $fundCluster = FundCluster::where('fund_cluster_id', $row['fund_cluster'])->first();
                if (! $fundCluster) {
                    if (! $merge) {
                        $skipped[] = "Row {$this->rowLabel($i)}: fund cluster '{$row['fund_cluster']}' not found.";
                        continue;
                    }
                    $fundCluster = FundCluster::create([
                        'fund_cluster_id' => $row['fund_cluster'],
                        'fund_description' => $row['fund_cluster'],
                    ]);
                }

                if (! empty($row['stock_no']) && ! StockItem::where('stock_no', $row['stock_no'])->exists()) {
                    if (! $merge) {
                        $skipped[] = "Row {$this->rowLabel($i)}: stock_no '{$row['stock_no']}' not found.";
                        continue;
                    }
                    // merge on: allow it through with stock_no as a plain
                    // text reference even though it doesn't resolve to an
                    // existing stock item yet.
                }

                Transaction::create([
                    'transaction_type' => $row['transaction_type'],
                    'transaction_date' => $row['transaction_date'],
                    'stock_no' => $row['stock_no'] ?? null,
                    'item_name' => $row['item_name'],
                    'description' => $row['description'] ?? null,
                    'unitID' => $unit->unitID,
                    'reference' => $row['reference'],
                    'quantity' => $row['quantity'],
                    'office_code' => $office->office_code,
                    'fund_cluster' => $fundCluster->fund_cluster_id,
                ]);
                $created++;
            }

            return [$created, 0, $skipped];
        });
    }

    /**
     * GET /import/template/{type}
     * Streams a minimal .xlsx with the correct headers and one example row.
     */
    public function template(string $type): StreamedResponse
    {
        abort_unless(isset(self::SCHEMAS[$type]), 404);

        $headers = array_keys(self::SCHEMAS[$type]);

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
            'items' => ['STK-0001', 'Bond Paper A4', 'Substance 20', 10, 'REAM'],
            'units' => ['Ream', 'REAM'],
            'transactions' => ['RECEIVE', now()->format('Y-m-d'), 'STK-0001', 'Bond Paper A4', 'Substance 20', 'REAM', 'DR-0001', 50, 'OFC-01', '101'],
            'offices' => ['OFC-01', 'Supply Management Unit', 'University of Southeastern Philippines', 'Juan Dela Cruz', 'smu@usep.edu.ph'],
        };
    }

    /**
     * Shared plumbing: validate upload, parse to an array of rows keyed by
     * schema field name, run the type-specific importer, write an audit
     * log entry, and redirect back with a summary flash message.
     */
    private function handleImport(Request $request, string $type, callable $importer)
    {
        $request->validate([
            'file' => 'required|file|max:20480',
            'file_format' => 'required|in:xlsx,json',
            'merge_existing' => 'nullable|boolean',
        ]);

        $merge = $request->boolean('merge_existing', true);
        $format = $request->input('file_format');

        try {
            $rows = $format === 'json'
                ? $this->parseJson($request->file('file'), $type)
                : $this->parseXlsx($request->file('file'), $type);
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read file: ' . $e->getMessage()]);
        }

        if (empty($rows)) {
            return back()->withErrors(['file' => 'No rows found in the uploaded file.']);
        }

        [$created, $updated, $skipped] = $importer($rows, $merge);

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
            // Fold the first few reasons into the same message string using
            // a delimiter the frontend splits on. A separate flash key
            // (e.g. 'import_skipped') isn't reliable here because this
            // app's Inertia middleware only shares specific known flash
            // keys ('success'/'error'), not arbitrary ones.
            $preview = array_slice($skipped, 0, 10);
            $message .= '|||' . implode('|||', $preview);
        }

        return back()->with('success', $message);
    }

    /**
     * Reads an .xlsx/.xls upload. First row must be headers matching (a
     * subset of) the schema's field names — order doesn't matter, extra
     * unknown columns are ignored.
     */
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
            // Skip fully blank rows.
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
     * Reads a .json upload. Accepts either a top-level array of row
     * objects, or an object with a "data" key containing that array.
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

    /**
     * Normalizes date/number-ish string values (mainly relevant for xlsx,
     * where Excel dates/serials can arrive as raw numbers or spreadsheet
     * date strings) and drops keys the schema doesn't recognize.
     */
    private function coerceRow(array $row, string $type): array
    {
        $schema = self::SCHEMAS[$type];
        // Case-insensitive lookup map: lowercased key -> original key.
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

        // Items rows sometimes carry a nested `units: [{ name, is_default }]`
        // array instead of a flat unit_short_name column (e.g. exports from
        // another system). Pull the default (or first) entry's label out so
        // the normal unit lookup below has something to match against.
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
            // Some exports use separate receipt/issue quantity columns
            // instead of a single transaction_type + quantity pair.
            // Whichever one is a positive number wins; if both are given
            // and both are positive, receipt takes priority (row should
            // really be split into two transactions upstream).
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

        if (isset($out['reorder_point']) && is_numeric($out['reorder_point'])) {
            $out['reorder_point'] = (int) $out['reorder_point'];
        }

        return $out;
    }

    private function normalizeDate($value): string
    {
        // Excel sometimes gives a numeric serial date instead of a string.
        if (is_numeric($value)) {
            return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d H:i:s');
        }

        return (string) $value;
    }

    /**
     * Resolves an office value that could be a code or a full name into
     * an Office record, creating one if it doesn't exist yet (only
     * called when merge is on). If the value looks like a name rather
     * than a short code, a code is derived from its initials.
     */
    private function findOrCreateOffice(string $value): Office
    {
        $looksLikeCode = (bool) preg_match('/^[A-Z0-9][A-Z0-9\-]{1,14}$/', $value);

        if ($looksLikeCode) {
            return Office::firstOrCreate(
                ['office_code' => $value],
                ['office_name' => $value]
            );
        }

        $code = $this->deriveOfficeCode($value);

        return Office::firstOrCreate(
            ['office_name' => $value],
            ['office_code' => $code]
        );
    }

    private function deriveOfficeCode(string $name): string
    {
        $stopwords = ['and', 'of', 'the', 'for', 'a', 'an'];
        $words = preg_split('/\s+/', trim($name));
        $initials = '';

        foreach ($words as $word) {
            $clean = preg_replace('/[^A-Za-z]/', '', $word);
            if ($clean === '' || in_array(strtolower($clean), $stopwords, true)) {
                continue;
            }
            $initials .= strtoupper($clean[0]);
        }

        $base = 'OFC-' . ($initials !== '' ? $initials : 'GEN');
        $code = $base;
        $suffix = 1;

        while (Office::where('office_code', $code)->exists()) {
            $suffix++;
            $code = "{$base}{$suffix}";
        }

        return $code;
    }

    private function rowLabel(int $zeroBasedIndex): int
    {
        // +2: +1 for 0-index -> 1-index, +1 because row 1 is the header.
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