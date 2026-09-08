<?php

namespace App\Jobs;

use App\Models\Import;
use App\Services\ImportProcessor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\{Storage, Log};

class ProcessDataImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 1800;

    public function __construct(
        public int $importId,
        public string $type,   // 'items' | 'transactions'
        public string $path,
        public bool $merge = true,
    ) {}

    public function handle(ImportProcessor $processor): void
    {
        $import = Import::findOrFail($this->importId);
        $import->update(['status' => 'processing']);

        try {
            $decoded = json_decode(Storage::get($this->path), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \RuntimeException('Invalid JSON: ' . json_last_error_msg());
            }

            $list = $decoded['data'] ?? $decoded;

            if (! is_array($list)) {
                throw new \RuntimeException('Expected a JSON array of rows (or {"data": [...]}).');
            }

            $rows = array_map(fn ($row) => $this->coerceRow($row, $this->type), $list);

            if (empty($rows)) {
                $import->update(['status' => 'completed', 'error_message' => 'No rows found in the uploaded file.']);
                return;
            }

            $processor->runQueued($import, $this->type, $this->merge, $rows);
        } catch (\Throwable $e) {
            $import->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            Log::error('Import job failed', ['import_id' => $this->importId, 'type' => $this->type, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Same coercion rules as ImportController::coerceRow(), duplicated
     * here rather than shared because it depends on the private
     * SCHEMAS/ALIASES constants that live on the controller. If you
     * change one, change both — or better, move SCHEMAS/ALIASES/
     * coerceRow into ImportProcessor too in a follow-up so this can call
     * $processor->coerceRow(...) directly instead of duplicating it.
     */
    private function coerceRow(array $row, string $type): array
    {
        $schemas = [
            'items' => ['stock_no' => true, 'item_name' => true, 'description' => false, 'unit_short_name' => false, 'fund_cluster_id' => false],
            'transactions' => ['transaction_type' => true, 'transaction_date' => true, 'stock_no' => false, 'item_name' => true, 'description' => false, 'unit_short_name' => true, 'reference' => true, 'quantity' => true, 'office_code' => true, 'fund_cluster' => true],
        ];
        $aliases = [
            'unit_short_name' => ['short', 'short_name', 'abbreviation', 'abbr', 'symbol', 'unit'],
            'item_name' => ['name', 'item'],
            'stock_no' => ['stock', 'stock_number', 'stockno', 'code', 'item_code'],
            'description' => ['desc'],
            'fund_cluster_id' => ['fund', 'fund_cluster'],
            'transaction_type' => ['type'],
            'transaction_date' => ['date'],
            'reference' => ['ref', 'ref_no', 'reference_no'],
            'office_code' => ['office', 'code', 'short'],
            'fund_cluster' => ['fund', 'fund_cluster_id'],
        ];

        $schema = $schemas[$type];
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
            foreach ($aliases[$field] ?? [] as $alias) {
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
                    $out['unit_short_name'] = $chosen['unit_short_name'] ?? $chosen['short'] ?? $chosen['name'] ?? $chosen['unit_name'] ?? null;
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
            try {
                $out['transaction_date'] = \Illuminate\Support\Carbon::parse($out['transaction_date'])->format('Y-m-d H:i:s');
            } catch (\Throwable $e) {
                // leave as-is, same fallback as controller's normalizeDate()
            }
        }

        if (isset($out['quantity'])) {
            $out['quantity'] = is_numeric($out['quantity']) ? (int) $out['quantity'] : $out['quantity'];
        }

        return $out;
    }
}