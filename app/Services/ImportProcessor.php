<?php

namespace App\Services;

use App\Models\{StockItem, Transaction, Unit, FundCluster, Office};
use Illuminate\Support\Facades\{DB, Validator, Log};

/**
 * Shared row-processing logic for items/transactions imports, used by
 * both the synchronous xlsx/csv path (ImportController::handleImport)
 * and the queued json path (ProcessDataImport job). Keeping this in one
 * place means the two paths can never silently drift apart.
 */
class ImportProcessor
{
    public const CHUNK_SIZE = 250;

    /**
     * Process every row in one pass, no chunking/progress tracking.
     * Used by the synchronous (xlsx/csv) controller path.
     */
    public function importItems(array $rows, bool $merge): array
    {
        $created = 0;
        $updated = 0;
        $skipped = [];

        foreach ($rows as $i => $row) {
            $this->processItemRow($i, $row, $merge, $created, $updated, $skipped);
        }

        return [$created, $updated, $skipped];
    }

    public function importTransactions(array $rows, bool $merge): array
    {
        $created = 0;
        $skipped = [];
        $existingCounts = [];
        $consumed = [];

        foreach ($rows as $i => $row) {
            $this->processTransactionRow($i, $row, $merge, $created, $skipped, $existingCounts, $consumed);
        }

        return [$created, 0, $skipped];
    }

    /**
     * Chunked variant with progress reporting via the Import model. Used
     * by the queued json path only. Runs each chunk in its own DB
     * transaction so a failure partway through doesn't roll back
     * everything already committed, and so we're not holding one giant
     * transaction open for the whole file.
     */
    public function runQueued(\App\Models\Import $import, string $type, bool $merge, array $rows): void
    {
        $total = count($rows);
        $import->update(['total_rows' => $total]);

        $created = 0;
        $updated = 0;
        $skipped = [];
        $processed = 0;

        // Transaction dedupe state must persist across the whole run,
        // not reset per chunk, or a fingerprint repeated in two
        // different chunks would double-count as non-duplicate.
        $existingCounts = [];
        $consumed = [];

        $model = $type === 'items' ? StockItem::class : Transaction::class;

        $model::withoutActivityLogging(function () use (
            $rows, $type, $merge, &$created, &$updated, &$skipped,
            &$processed, &$existingCounts, &$consumed, $import
        ) {
            foreach (array_chunk($rows, self::CHUNK_SIZE, true) as $chunk) {
                DB::transaction(function () use (
                    $chunk, $type, $merge, &$created, &$updated, &$skipped,
                    &$existingCounts, &$consumed
                ) {
                    foreach ($chunk as $i => $row) {
                        if ($type === 'items') {
                            $this->processItemRow($i, $row, $merge, $created, $updated, $skipped);
                        } else {
                            $this->processTransactionRow($i, $row, $merge, $created, $skipped, $existingCounts, $consumed);
                        }
                    }
                });

                $processed += count($chunk);
                $import->update([
                    'processed_rows' => $processed,
                    'created_rows' => $created,
                    'updated_rows' => $updated,
                    'skipped_rows' => count($skipped),
                ]);
            }
        });

        $import->update([
            'status' => 'completed',
            'error_message' => ! empty($skipped) ? implode('|||', array_slice($skipped, 0, 50)) : null,
        ]);
    }

    /**
     * Lifted verbatim from ImportController::items()'s closure body.
     */
    private function processItemRow(int $i, array $row, bool $merge, int &$created, int &$updated, array &$skipped): void
    {
        $validator = Validator::make($row, [
            'stock_no' => 'required|string|max:255',
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'unit_short_name' => 'nullable|string|max:255',
            'fund_cluster_id' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            $skipped[] = "Row {$this->rowLabel($i)}: " . $validator->errors()->first();
            return;
        }

        $existing = StockItem::where('stock_no', $row['stock_no'])->first();

        if ($existing && ! $merge) {
            $skipped[] = "Row {$this->rowLabel($i)}: stock_no '{$row['stock_no']}' already exists (merge is off).";
            return;
        }

        $attrs = [
            'item_name' => $row['item_name'],
            'description' => $row['description'] ?? null,
        ];

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

        if (! empty($row['unit_short_name'])) {
            $unit = Unit::where('unit_short_name', $row['unit_short_name'])
                ->orWhere('unit_name', $row['unit_short_name'])
                ->first();
            if ($unit) {
                // Unset every other default first, then set this one —
                // see original controller comment: syncWithoutDetaching
                // alone won't clear is_default on other attached units.
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

    /**
     * Lifted verbatim from ImportController::transactions()'s closure
     * body — same fingerprint-based dedupe, same stock_no/office/fund
     * resolution rules. See original controller docblock for the full
     * reasoning; unchanged here.
     */
    private function processTransactionRow(
        int $i,
        array $row,
        bool $merge,
        int &$created,
        array &$skipped,
        array &$existingCounts,
        array &$consumed
    ): void {
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
                return;
            }

            $unit = Unit::where('unit_short_name', $row['unit_short_name'])
                ->orWhere('unit_name', $row['unit_short_name'])
                ->first();
            if (! $unit || empty($unit->unitID)) {
                $skipped[] = "Row {$this->rowLabel($i)}: unit '{$row['unit_short_name']}' not found or invalid.";
                return;
            }

            $office = Office::where('office_code', $row['office_code'])
                ->orWhere('office_name', $row['office_code'])
                ->first();

            if (! $office) {
                if (! $merge) {
                    $skipped[] = "Row {$this->rowLabel($i)}: office '{$row['office_code']}' not found.";
                    return;
                }
                $office = $this->findOrCreateOffice($row['office_code']);
            }

            $fundCluster = FundCluster::where('fund_cluster_id', $row['fund_cluster'])->first();
            if (! $fundCluster) {
                if (! $merge) {
                    $skipped[] = "Row {$this->rowLabel($i)}: fund cluster '{$row['fund_cluster']}' not found.";
                    return;
                }
                $fundCluster = FundCluster::create([
                    'fund_cluster_id' => $row['fund_cluster'],
                    'fund_description' => $row['fund_cluster'],
                ]);
            }

            $resolvedStockNo = $row['stock_no'] ?? null;
            if (! empty($resolvedStockNo) && ! StockItem::where('stock_no', $resolvedStockNo)->exists()) {
                if (! $merge) {
                    $skipped[] = "Row {$this->rowLabel($i)}: stock_no '{$resolvedStockNo}' not found.";
                    return;
                }
                $resolvedStockNo = null;
            }

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
                return;
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
            Log::warning('Transaction import row failed', ['row' => $row, 'error' => $e->getMessage()]);
        }
    }

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
        return $zeroBasedIndex + 2;
    }
}