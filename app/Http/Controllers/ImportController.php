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
 * Handles "Import Data" (Items / Units / Transactions / Offices, from
 * Excel or JSON) and the matching "download template" links.
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
            'unit_short_name' => false, // default unit, matched against units table
            'fund_cluster_id' => false, // optional, matched against fund_clusters table
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
                        'unit_short_name' => 'nullable|string|max:255',
                        'fund_cluster_id' => 'nullable|string|max:50',
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
                    ];

                    // Resolve fund cluster if given. It's a real FK (fund_cluster_id
                    // references fund_clusters.fund_cluster_id with nullOnDelete),
                    // so an unresolved value can't be saved as-is.
                    if (! empty($row['fund_cluster_id'])) {
                        $fundCluster = FundCluster::where('fund_cluster_id', $row['fund_cluster_id'])->first();

                        if ($fundCluster) {
                            $attrs['fund_cluster_id'] = $fundCluster->fund_cluster_id;
                        } elseif ($merge) {
                            $fundCluster = FundCluster::create([
                                'fund_cluster_id' => $row['fund_cluster_id'],
                                'fund_description' => $row['fund_cluster_id'],
                            ]);
                            $attrs['fund_cluster_id'] = $fundCluster->fund_cluster_id;
                        } else {
                            $skipped[] = "Row {$this->rowLabel($i)}: fund cluster '{$row['fund_cluster_id']}' not found, item saved without it.";
                        }
                    }

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
                            // IMPORTANT: syncWithoutDetaching only adds/updates
                            // the given pivot row — it does NOT clear is_default
                            // on any other unit already attached to this item.
                            // Re-importing the same stock_no under a different
                            // unit label (e.g. "bottle" in one file, "gallon" in
                            // another) would otherwise leave TWO units marked
                            // default, which silently double-counts the balance
                            // in every report that joins on is_default = true.
                            // Unset every other default first, then set this one.
                            $item->units()->updateExistingPivot(
                                $item->units->pluck('unitID')->all(),
                                ['is_default' => false]
                            );
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
     * unmatched office_code/fund_cluster values are created on the fly
     * (merge = create missing refs) or skipped (merge off = strict, row
     * must already resolve against existing data).
     *
     * Since source files (e.g. exports from the old system) have no
     * transactionID to key off of, duplicate detection instead uses a
     * fingerprint of transaction_type + transaction_date + item_name +
     * reference + quantity + office_code + fund_cluster — but compares
     * by COUNT, not existence. If the database already has N matching
     * transactions for a given fingerprint, only the first N occurrences
     * of that fingerprint in this import are skipped as duplicates; any
     * beyond that are created, since they represent genuinely separate
     * transactions the old system happened to record identically. This
     * always applies, independent of the merge checkbox.
     *
     * stock_no is a real foreign key on the transactions table, so unlike
     * office/fund_cluster it can never be passed through as an unresolved
     * value even when merge is on — SQLite will reject the insert outright.
     * If it doesn't resolve, it's set to null instead (the transaction is
     * still recorded, just without a stock-card link) rather than skipped,
     * since Items import — not Transactions import — is what should be
     * creating new stock items.
     */
    public function transactions(Request $request)
    {
        return $this->handleImport($request, 'transactions', function (array $rows, bool $merge) {
            $created = 0;
            $skipped = [];

            // Duplicate detection uses a fingerprint (no transactionID
            // exists in source data to key off of). A plain "does a match
            // already exist" check would wrongly treat legitimately
            // repeated transactions (same type/date/item/reference/qty/
            // office/fund, but genuinely two separate entries) as one
            // single duplicate forever. Instead, count how many matching
            // rows already exist in the DB per fingerprint, and only skip
            // up to that many — any rows beyond that count as new. Cached
            // per fingerprint since many rows can share one.
            $existingCounts = [];
            $consumed = [];

            foreach ($rows as $i => $row) {
                try {
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

                    $unit = Unit::where('unit_short_name', $row['unit_short_name'])
                        ->orWhere('unit_name', $row['unit_short_name'])
                        ->first();
                    if (! $unit || empty($unit->unitID)) {
                        $skipped[] = "Row {$this->rowLabel($i)}: unit '{$row['unit_short_name']}' not found or invalid.";
                        continue;
                    }

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

                    // stock_no is a real FK to stock_items — a value that
                    // doesn't exist there cannot be inserted at all, merge
                    // or not. If unresolved, null it rather than skip the
                    // whole row: the transaction still gets recorded (item
                    // name, quantity, etc. all intact), just without a
                    // stock-card link. Run an Items import first if you
                    // want these to link up automatically.
                    $resolvedStockNo = $row['stock_no'] ?? null;
                    if (! empty($resolvedStockNo) && ! StockItem::where('stock_no', $resolvedStockNo)->exists()) {
                        if (! $merge) {
                            $skipped[] = "Row {$this->rowLabel($i)}: stock_no '{$resolvedStockNo}' not found.";
                            continue;
                        }
                        $resolvedStockNo = null;
                    }

                    // No transactionID exists in the source data to dedupe
                    // against. A row is only treated as a duplicate if the
                    // database already has at least as many matching
                    // transactions (same type/date/item/reference/qty/
                    // office/fund) as we've encountered so far in this
                    // import — this lets genuinely repeated real-world
                    // transactions come through, while still blocking a
                    // straight re-import of the same file. Note: this
                    // can't catch a source file that itself contains
                    // accidental duplicate rows, since those look
                    // identical to legitimate repeats.
                    $fingerprint = implode('|', [
                        $row['transaction_type'],
                        $row['transaction_date'],
                        $row['item_name'],
                        $row['reference'],
                        $row['quantity'],
                        $office->office_code,
                        $fundCluster->fund_cluster_id,
                    ]);

                    if (! array_key_exists($fingerprint, $existingCounts)) {
                        $existingCounts[$fingerprint] = Transaction::where('transaction_type', $row['transaction_type'])
                            ->where('transaction_date', $row['transaction_date'])
                            ->where('item_name', $row['item_name'])
                            ->where('reference', $row['reference'])
                            ->where('quantity', $row['quantity'])
                            ->where('office_code', $office->office_code)
                            ->where('fund_cluster', $fundCluster->fund_cluster_id)
                            ->count();
                        $consumed[$fingerprint] = 0;
                    }

                    if ($consumed[$fingerprint] < $existingCounts[$fingerprint]) {
                        $consumed[$fingerprint]++;
                        $skipped[] = "Row {$this->rowLabel($i)}: duplicate of an existing transaction (same type/date/item/reference/qty/office/fund), skipped.";
                        continue;
                    }

                    Transaction::create([
                        'transaction_type' => $row['transaction_type'],
                        'transaction_date' => $row['transaction_date'],
                        'stock_no' => $resolvedStockNo,
                        'item_name' => $row['item_name'],
                        'description' => $row['description'] ?? null,
                        'unitID' => $unit->unitID,
                        'reference' => $row['reference'],
                        'quantity' => $row['quantity'],
                        'office_code' => $office->office_code,
                        'fund_cluster' => $fundCluster->fund_cluster_id,
                    ]);
                    $created++;
                } catch (\Throwable $e) {
                    $skipped[] = "Row {$this->rowLabel($i)}: import failed — " . $e->getMessage();
                    \Log::warning('Transaction import row failed', ['row' => $row, 'error' => $e->getMessage()]);
                    continue;
                }
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
            'items' => ['STK-0001', 'Bond Paper A4', 'Substance 20', 'REAM', '101'],
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

        return $out;
    }

    private function normalizeDate($value): string
    {
        // Excel sometimes gives a numeric serial date instead of a string.
        if (is_numeric($value)) {
            return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d H:i:s');
        }

        // Always resolve to the exact "Y-m-d H:i:s" format Eloquent's
        // datetime cast normalizes to on save. Without this, a plain
        // date string like "2026-03-10" gets stored as "2026-03-10
        // 00:00:00" but the duplicate-detection check further down
        // compares against the raw, un-normalized string — so it never
        // matches on re-import and rows silently double up.
        try {
            return \Illuminate\Support\Carbon::parse($value)->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return (string) $value;
        }
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