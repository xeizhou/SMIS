<?php

namespace App\Jobs;

use App\Models\FundCluster;
use App\Models\Import;
use App\Models\RegspiMonitoring;
use App\Models\RrspMonitoring;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ProcessRegspiImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    public function __construct(public int $importId)
    {
    }

    public function handle(): void
    {
        $import = Import::findOrFail($this->importId);
        $import->update(['status' => 'processing']);

        try {
            $path = Storage::path($import->file_path);
            [$headerLine, $fundClusterId] = $this->findHeader($path);
            $totalRows = $this->countDataRows($path, $headerLine);
            $import->update(['total_rows' => $totalRows]);

            $rrspNos = RrspMonitoring::query()->pluck('rrsp_no')->flip();
            $fundClusterIds = FundCluster::query()->pluck('fund_cluster_id')->flip();
            $existing = RegspiMonitoring::query()
                ->get(['regspi_id', 'month_year', 'semi_expendable_property_no'])
                ->keyBy(fn ($row) => "{$row->month_year}|{$row->semi_expendable_property_no}");

            $created = 0;
            $updated = 0;
            $skipped = 0;
            $insertRows = [];
            $handle = $this->openCsv($path);
            $this->skipToHeader($handle, $headerLine);
            fgetcsv($handle);

            while (($line = fgetcsv($handle)) !== false) {
                $row = $this->mapReportRow($line, $fundClusterId, $fundClusterIds);
                if ($row === null) {
                    continue;
                }

                $validator = Validator::make($row, [
                    'month_year' => 'required|string|max:20',
                    'ics_no' => 'nullable|string|max:50',
                    'rrsp_no' => 'nullable|string|max:50',
                    'fund_cluster_id' => 'nullable|string|max:20',
                    'semi_expendable_property_no' => 'required|string|max:100',
                    'item_description' => 'required|string|max:255',
                    'estimated_useful_life' => 'nullable|integer|min:0',
                    'issued_qty' => 'nullable|integer|min:0',
                    'issued_office_officer' => 'nullable|string|max:255',
                    'returned_qty' => 'nullable|integer|min:0',
                    'returned_office_officer' => 'nullable|string|max:255',
                    'reissued_qty' => 'nullable|integer|min:0',
                    'reissued_office_officer' => 'nullable|string|max:255',
                    'disposed_qty' => 'nullable|integer|min:0',
                    'amount' => 'required|numeric|min:0',
                    'remarks' => 'nullable|string|max:255',
                ]);

                if ($validator->fails() || (! empty($row['rrsp_no']) && ! $rrspNos->has($row['rrsp_no']))) {
                    $skipped++;
                    $this->incrementProgress($import, $skipped, $created, $updated);
                    continue;
                }

                $key = "{$row['month_year']}|{$row['semi_expendable_property_no']}";
                if ($existing->has($key)) {
                    $existing->get($key)->update($row);
                    $updated++;
                } else {
                    $insertRows[$key] = $row;
                }

                if (count($insertRows) >= 500) {
                    RegspiMonitoring::insert(array_values($insertRows));
                    $created += count($insertRows);
                    $insertRows = [];
                }

                $processed = $created + $updated + $skipped + count($insertRows);
                $this->incrementProgress($import, $skipped, $created, $updated, $processed);
            }

            fclose($handle);

            if ($insertRows !== []) {
                RegspiMonitoring::insert(array_values($insertRows));
                $created += count($insertRows);
            }

            $import->update([
                'status' => 'completed',
                'processed_rows' => $totalRows,
                'created_rows' => $created,
                'updated_rows' => $updated,
                'skipped_rows' => $skipped,
            ]);
        } catch (\Throwable $exception) {
            $import->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);
            throw $exception;
        }
    }

    private function findHeader(string $path): array
    {
        $handle = $this->openCsv($path);
        $lineNumber = 0;
        $fundClusterId = null;

        while (($line = fgetcsv($handle)) !== false) {
            $lineNumber++;
            foreach ($line as $index => $value) {
                if (strtolower(trim((string) $value)) === 'fund cluster:') {
                    $fundClusterId = trim((string) ($line[$index + 1] ?? '')) ?: null;
                }
            }

            if (strtolower(trim((string) ($line[0] ?? ''))) === 'month/yr') {
                fclose($handle);
                return [$lineNumber, $fundClusterId];
            }
        }

        fclose($handle);
        throw new \RuntimeException('Could not find the MONTH/YR header row.');
    }

    private function countDataRows(string $path, int $headerLine): int
    {
        $handle = $this->openCsv($path);
        $this->skipToHeader($handle, $headerLine);
        fgetcsv($handle);
        $count = 0;

        while (($line = fgetcsv($handle)) !== false) {
            if (trim((string) ($line[4] ?? '')) !== '') {
                $count++;
            }
        }

        fclose($handle);
        return $count;
    }

    private function mapReportRow(array $line, ?string $fundClusterId, $fundClusterIds): ?array
    {
        $propertyNo = trim((string) ($line[4] ?? ''));
        $description = trim((string) ($line[5] ?? ''));
        if ($propertyNo === '' || $description === '') {
            return null;
        }

        $issued = $this->integerValue($line[7] ?? null);
        $returned = $this->integerValue($line[9] ?? null);
        $reissued = $this->integerValue($line[11] ?? null);
        $disposed = $this->integerValue($line[13] ?? null);

        return [
            'month_year' => trim((string) ($line[0] ?? '')),
            'ics_no' => $this->value($line[2] ?? null),
            'rrsp_no' => $this->value($line[3] ?? null),
            'fund_cluster_id' => $fundClusterId && $fundClusterIds->has($fundClusterId) ? $fundClusterId : null,
            'semi_expendable_property_no' => $propertyNo,
            'item_description' => $description,
            'estimated_useful_life' => $this->integerValue($line[6] ?? null),
            'issued_qty' => $issued,
            'issued_office_officer' => $this->value($line[8] ?? null),
            'returned_qty' => $returned,
            'returned_office_officer' => $this->value($line[10] ?? null),
            'reissued_qty' => $reissued,
            'reissued_office_officer' => $this->value($line[12] ?? null),
            'disposed_qty' => $disposed,
            'balance_qty' => $issued - $returned + $reissued - $disposed,
            'amount' => $this->numberValue($line[15] ?? null),
            'remarks' => $this->value($line[16] ?? null),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function openCsv(string $path)
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new \RuntimeException('Could not open the stored CSV.');
        }
        return $handle;
    }

    private function skipToHeader($handle, int $headerLine): void
    {
        for ($line = 1; $line < $headerLine; $line++) {
            fgetcsv($handle);
        }
    }

    private function value($value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }

    private function integerValue($value): int
    {
        $value = trim((string) $value);
        return $value === '' || ! is_numeric($value) ? 0 : (int) $value;
    }

    private function numberValue($value): float
    {
        $value = str_replace(',', '', trim((string) $value));
        return $value === '' || ! is_numeric($value) ? 0 : (float) $value;
    }

    private function incrementProgress(Import $import, int $skipped, int $created, int $updated, ?int $processed = null): void
    {
        $import->update([
            'processed_rows' => $processed ?? $import->processed_rows,
            'created_rows' => $created,
            'updated_rows' => $updated,
            'skipped_rows' => $skipped,
        ]);
    }
}