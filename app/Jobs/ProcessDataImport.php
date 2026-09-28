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
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class ProcessDataImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 3600;

    public function __construct(
        public int $importId,
        public string $type,   // 'items' | 'units' | 'transactions' | 'offices'
        public string $path,
        public bool $merge = true,
        public string $format = 'json', // 'json' | 'csv' | 'xlsx' — defaults to json so old dispatch calls still work
    ) {}

    public function handle(ImportProcessor $processor): void
    {
        $import = Import::findOrFail($this->importId);

        // Cancelled while still waiting in the queue — don't overwrite that with "processing".
        if ($import->status === 'cancelled') {
            return;
        }

        $import->update(['status' => 'processing']);

        try {
            $list = $this->readRows();

            $rows = array_map(
                fn ($row) => $this->coerceRow((array) $row, $this->type),
                array_filter($list, 'is_array')
            );

            if (empty($rows)) {
                $import->update(['status' => 'completed', 'error_message' => 'No rows found in the uploaded file.']);
                return;
            }

            $processor->runQueued($import, $this->type, $this->merge, array_values($rows));
        } catch (\Throwable $e) {
            $import->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            Log::error('Import job failed', ['import_id' => $this->importId, 'type' => $this->type, 'error' => $e->getMessage()]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | File readers — every format ends up as a list of associative rows
    |--------------------------------------------------------------------------
    */

    private function readRows(): array
    {
        return match ($this->format) {
            'json' => $this->readJson(),
            'csv' => $this->readCsv(),
            'xlsx' => $this->readXlsx(),
            default => throw new \RuntimeException("Unsupported file format: {$this->format}"),
        };
    }

    private function readJson(): array
    {
        $decoded = json_decode(Storage::get($this->path), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Invalid JSON: ' . json_last_error_msg());
        }

        $list = $decoded['data'] ?? $decoded;

        if (! is_array($list)) {
            throw new \RuntimeException('Expected a JSON array of rows (or {"data": [...]}).');
        }

        return $list;
    }

    private function readCsv(): array
    {
        $handle = fopen(Storage::path($this->path), 'rb');

        if ($handle === false) {
            throw new \RuntimeException('Could not open the stored CSV.');
        }

        $firstLine = (string) fgets($handle);
        rewind($handle);

        $delimiter = $this->detectDelimiter($firstLine);

        $raw = [];
        while (($line = fgetcsv($handle, 0, $delimiter, '"', '\\')) !== false) {
            $raw[] = $line;
        }

        fclose($handle);

        if (! empty($raw)) {
            $raw[0][0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) ($raw[0][0] ?? ''));
        }

        return $this->rowsFromTable($raw);
    }

    private function readXlsx(): array
    {
        $spreadsheet = IOFactory::load(Storage::path($this->path));
        $raw = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return $this->rowsFromTable($raw);
    }

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
     * First row = headers, remaining rows = data. Blank rows and
     * blank-header columns are dropped; empty cells become null.
     */
    private function rowsFromTable(array $raw): array
    {
        if (count($raw) < 2) {
            return [];
        }

        $headers = array_map(fn ($h) => trim((string) $h), $raw[0]);
        $rows = [];

        foreach (array_slice($raw, 1) as $line) {
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
            'units' => ['unit_name' => true, 'unit_short_name' => true],
            'transactions' => ['transaction_type' => true, 'transaction_date' => true, 'stock_no' => false, 'item_name' => true, 'description' => false, 'unit_short_name' => true, 'reference' => true, 'quantity' => true, 'office_code' => true, 'fund_cluster' => true],
            'offices' => ['office_code' => true, 'office_name' => true, 'entity_name' => false, 'office_head' => false, 'email' => false],
        ];
        $aliases = [
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

        if (! isset($schemas[$type])) {
            throw new \RuntimeException("Queued import is not set up for type '{$type}' yet.");
        }

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
                $out['transaction_date'] = is_numeric($out['transaction_date'])
                    ? ExcelDate::excelToDateTimeObject($out['transaction_date'])->format('Y-m-d H:i:s')
                    : \Illuminate\Support\Carbon::parse($out['transaction_date'])->format('Y-m-d H:i:s');
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