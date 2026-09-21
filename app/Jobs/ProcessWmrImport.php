<?php

namespace App\Jobs;

use App\Models\FundCluster;
use App\Models\Import;
use App\Models\Office;
use App\Models\Supplier;
use App\Models\User;
use App\Models\WmrMonitoring;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProcessWmrImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    /**
     * How often the imports row is updated and cancellation is checked.
     *
     * Lower frequency means fewer SQLite write operations.
     */
    private const PROGRESS_EVERY = 50;

    /**
     * Number of NEW WMR records to insert in one batch.
     */
    private const BATCH_SIZE = 100;

    /**
     * Header-name -> possible column titles
     * (normalized: lowercase, letters/digits only).
     */
    private const COLUMNS = [
        'supplier' => ['supplier', 'suppliername'],
        'iar_no' => ['iarno'],
        'iar_date' => ['iardate'],
        'item_vehicle' => ['itemvehicle', 'item', 'vehicle'],
        'details' => ['details'],
        'defects' => ['defectscomplaints', 'defects', 'complaints'],
        'cost' => ['cost', 'laborcost', 'amount'],
        'office' => ['office'],
        'requested_by' => ['requestedby'],
        'received_by' => ['receivedby'],
        'received_date' => ['dated', 'datereceived'],
        'remarks' => ['remarks'],
    ];

    /**
     * Max lengths matching the validation rules in WmrController.
     */
    private const LIMITS = [
        'iar_no' => 100,
        'item_vehicle' => 255,
        'job_order_no' => 100,
        'vehicle_type' => 50,
        'brand_name' => 100,
        'model' => 100,
        'plate_no' => 50,
        'serial_engine_no' => 100,
        'acquisition_date' => 20,
        'property_no' => 100,
        'inspector_name' => 150,
        'invoice_no' => 255,
        'invoice_date' => 255,
        'requested_by' => 150,
        'received_by' => 150,
    ];

    private array $supplierCache = [];
    private array $fundCache = [];
    private array $officeCache = [];

    private array $newSuppliers = [];
    private array $missingFunds = [];
    private array $missingOffices = [];

    public function __construct(public int $importId)
    {
    }

    public function handle(): void
    {
        $import = Import::findOrFail($this->importId);

        if ($import->status === 'cancelled') {
            $this->logAudit(
                $import,
                'WMR import cancelled before it started processing.'
            );

            return;
        }

        $import->update([
            'status' => 'processing',
        ]);

        try {
            [$blocks, $map] = $this->parseBlocks(
                Storage::path($import->file_path)
            );

            $total = count($blocks);

            $import->update([
                'total_rows' => $total,
            ]);

            /*
             * Disable per-record activity logging while importing.
             * We create one audit entry for the whole import instead.
             */
            [$created, $updated, $skipped, $cancelled] =
                WmrMonitoring::withoutActivityLogging(
                    fn () => $this->processBlocks(
                        $import,
                        $blocks,
                        $map
                    )
                );

            if ($cancelled) {
                $this->logAudit(
                    $import,
                    sprintf(
                        'Cancelled WMR import: %d created, %d updated, %d skipped before stopping.',
                        $created,
                        $updated,
                        $skipped
                    )
                );

                return;
            }

            $import->update([
                'status' => 'completed',
                'processed_rows' => $total,
                'created_rows' => $created,
                'updated_rows' => $updated,
                'skipped_rows' => $skipped,
            ]);

            $this->logAudit(
                $import,
                sprintf(
                    'Imported WMR: %d created, %d updated, %d skipped.%s',
                    $created,
                    $updated,
                    $skipped,
                    $this->notes()
                )
            );
        } catch (\Throwable $exception) {
            $import->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);

            $this->logAudit(
                $import,
                'WMR import failed: ' . $exception->getMessage()
            );

            throw $exception;
        }
    }

    /**
     * Process parsed WMR blocks.
     *
     * Database strategy:
     *
     * - No DB::transaction() around every WMR.
     * - Existing WMRs are updated directly.
     * - New WMRs are collected and inserted in batches.
     * - Progress is written every 50 records.
     *
     * This greatly reduces the number of SQLite write transactions.
     */
    private function processBlocks(
        Import $import,
        array $blocks,
        array $map
    ): array {
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $processed = 0;

        /**
         * New records waiting for batch insertion.
         */
        $batchRows = [];

        foreach ($blocks as $rows) {
            $processed++;

            $attrs = $this->attributes($rows, $map);

            /*
             * Invalid/unusable WMR.
             */
            if ($attrs === null) {
                $skipped++;

                if ($processed % self::PROGRESS_EVERY === 0) {
                    if (
                        $this->reportProgress(
                            $import,
                            $processed,
                            $skipped,
                            $created,
                            $updated
                        )
                    ) {
                        /*
                         * Flush anything already waiting before cancelling.
                         */
                        if ($batchRows !== []) {
                            $this->flushInsertBatch($batchRows);
                            $batchRows = [];
                        }

                        return [
                            $created,
                            $updated,
                            $skipped,
                            true,
                        ];
                    }
                }

                continue;
            }

            /*
             * Check whether this WMR already exists.
             *
             * We keep the existing behavior where WMR number is the
             * identifier used for re-importing.
             */
            $existing = WmrMonitoring::withTrashed()
                ->where('wmr_no', $attrs['wmr_no'])
                ->first();

            if ($existing) {
                /*
                 * Restore a soft-deleted WMR if it exists.
                 */
                if ($existing->trashed()) {
                    $existing->restore();
                }

                /*
                 * Preserve existing data when the CSV contains NULL.
                 *
                 * This is important because a re-import should not
                 * erase values previously entered manually in the UI.
                 */
                $existing->update(
                    array_filter(
                        $attrs,
                        fn ($value) => $value !== null
                    )
                );

                $updated++;
            } else {
                /*
                 * New WMR.
                 *
                 * Don't insert immediately.
                 * Keep it in memory until BATCH_SIZE is reached.
                 */
                $batchRows[] = $attrs;
                $created++;

                if (count($batchRows) >= self::BATCH_SIZE) {
                    $this->flushInsertBatch($batchRows);
                    $batchRows = [];
                }
            }

            /*
             * Update progress only every PROGRESS_EVERY records.
             */
            if ($processed % self::PROGRESS_EVERY === 0) {
                if (
                    $this->reportProgress(
                        $import,
                        $processed,
                        $skipped,
                        $created,
                        $updated
                    )
                ) {
                    /*
                     * Don't lose records waiting in memory.
                     */
                    if ($batchRows !== []) {
                        $this->flushInsertBatch($batchRows);
                        $batchRows = [];
                    }

                    return [
                        $created,
                        $updated,
                        $skipped,
                        true,
                    ];
                }
            }
        }

        /*
         * Flush remaining new WMRs after the CSV has completely finished.
         */
        if ($batchRows !== []) {
            $this->flushInsertBatch($batchRows);
        }

        return [
            $created,
            $updated,
            $skipped,
            false,
        ];
    }

    /**
     * Insert a group of NEW WMR records using one database operation.
     *
     * No explicit DB::transaction() is used here.
     */
    private function flushInsertBatch(array $batchRows): void
    {
        if ($batchRows === []) {
            return;
        }

        WmrMonitoring::insert($batchRows);
    }

    /**
     * Update import progress and check whether the user cancelled it.
     */
    private function reportProgress(
        Import $import,
        int $processed,
        int $skipped,
        int $created,
        int $updated
    ): bool {
        $import->update([
            'processed_rows' => $processed,
            'created_rows' => $created,
            'updated_rows' => $updated,
            'skipped_rows' => $skipped,
        ]);

        return $import->fresh()->status === 'cancelled';
    }

    /**
     * Returns [blocks, columnMap].
     *
     * A row with a supplier starts a new WMR block.
     * The rows under it belong to that WMR until the next supplier row.
     */
    private function parseBlocks(string $path): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new \RuntimeException(
                'Could not open the stored CSV.'
            );
        }

        $blocks = [];
        $map = null;

        while (($line = fgetcsv($handle)) !== false) {
            if ($map === null) {
                $first = $this->normalize(
                    $line[0] ?? ''
                );

                if (
                    in_array(
                        $first,
                        self::COLUMNS['supplier'],
                        true
                    )
                ) {
                    $map = $this->buildMap($line);
                }

                continue;
            }

            $supplierCol = $map['supplier'] ?? 0;

            if (
                $this->value(
                    $line[$supplierCol] ?? null
                ) !== null
            ) {
                $blocks[] = [$line];
            } elseif (! empty($blocks)) {
                $blocks[array_key_last($blocks)][] = $line;
            }
        }

        fclose($handle);

        if ($map === null) {
            throw new \RuntimeException(
                'Could not find the "SUPPLIER" header row.'
            );
        }

        return [
            $blocks,
            $map,
        ];
    }

    private function buildMap(array $headerLine): array
    {
        $normalized = array_map(
            fn ($h) => $this->normalize($h),
            $headerLine
        );

        $map = [];

        foreach (self::COLUMNS as $field => $candidates) {
            $map[$field] = null;

            foreach ($candidates as $candidate) {
                $index = array_search(
                    $candidate,
                    $normalized,
                    true
                );

                if ($index !== false) {
                    $map[$field] = $index;
                    break;
                }
            }

            if ($map[$field] === null) {
                foreach (
                    $normalized as $index => $name
                ) {
                    foreach ($candidates as $candidate) {
                        if (
                            $name !== ''
                            && str_starts_with(
                                $name,
                                $candidate
                            )
                        ) {
                            $map[$field] = $index;
                            break 2;
                        }
                    }
                }
            }
        }

        return $map;
    }

    /**
     * Turns one WMR block into WmrMonitoring attributes.
     *
     * Returns null if the block cannot become a valid WMR record.
     */
    private function attributes(
        array $rows,
        array $map
    ): ?array {
        $head = $rows[0];

        $col = fn (string $field) =>
            isset($map[$field])
                ? ($head[$map[$field]] ?? null)
                : null;

        $d = $this->blockData(
            $rows,
            $map
        );

        $supplier = $this->collapse(
            $col('supplier')
        );

        $itemVehicle = $this->collapse(
            $col('item_vehicle')
        );

        if (
            $d['wmr_no'] === null
            || strlen($d['wmr_no']) > 50
            || $d['wmr_date'] === null
            || $itemVehicle === null
            || $supplier === null
        ) {
            return null;
        }

        $supplierId = $this->supplierId(
            $supplier
        );

        if ($supplierId === null) {
            return null;
        }

        $attrs = [
            'wmr_no' => $d['wmr_no'],
            'wmr_date' => $d['wmr_date'],
            'supplier_id' => $supplierId,

            'iar_no' => $this->value(
                $col('iar_no')
            ),

            'iar_date' => $this->date(
                $col('iar_date')
            ),

            'item_vehicle' => $itemVehicle,

            'job_order_no' => $d['job_order_no'],
            'job_order_date' => $d['job_order_date'],

            'fund_cluster_id' => $this->fundClusterId(
                $d['fund']
            ),

            'vehicle_type' => $d['vehicle_type'],
            'brand_name' => $d['brand_name'],
            'model' => $d['model'],
            'plate_no' => $d['plate_no'],
            'serial_engine_no' => $d['serial_engine_no'],
            'acquisition_date' => $d['acquisition_date'],
            'property_no' => $d['property_no'],

            'inspector_name' => $d['inspector_name'],
            'inspection_date' => $d['inspection_date'],

            'invoice_no' => $d['invoice_no'],
            'invoice_date' => $d['invoice_date'],

            'defects_complaints' => $d['defects_complaints'],
            'materials' => $d['materials'],

            'labor_cost' => $this->numberValue(
                $col('cost')
            ),

            'office_code' => $this->officeCode(
                $this->collapse(
                    $col('office')
                )
            ),

            'requested_by' => $this->collapse(
                $col('requested_by')
            ),

            'received_by' => $this->collapse(
                $col('received_by')
            ),

            'received_date' => $this->date(
                $col('received_date')
            ),

            'remarks' => $d['remarks'],
        ];

        foreach (self::LIMITS as $field => $max) {
            if (
                is_string(
                    $attrs[$field] ?? null
                )
            ) {
                $attrs[$field] = mb_substr(
                    $attrs[$field],
                    0,
                    $max
                );
            }
        }

        return $attrs;
    }

    /**
     * Reads the Details label/value rows and free-text columns
     * of one WMR block.
     */
    private function blockData(
        array $rows,
        array $map
    ): array {
        $from = $map['details'] ?? 4;

        $textCol = $map['defects'] ?? 12;
        $extraCol = $textCol + 1;

        $d = array_fill_keys(
            [
                'wmr_no',
                'wmr_date',
                'job_order_no',
                'job_order_date',
                'vehicle_type',
                'fund',
                'brand_name',
                'model',
                'plate_no',
                'serial_engine_no',
                'acquisition_date',
                'property_no',
                'inspector_name',
                'inspection_date',
                'invoice_no',
                'invoice_date',
                'defects_complaints',
                'materials',
                'remarks',
            ],
            null
        );

        $seenJobOrder = false;
        $mode = 'defects';

        $defects = [];
        $materials = [];
        $extras = [];
        $remarks = [];

        foreach ($rows as $line) {
            /*
             * Free-text column:
             * LABOR / defects, then Materials / material lines.
             */
            $text = $this->value(
                $line[$textCol] ?? null
            );

            if ($text !== null) {
                if (
                    preg_match(
                        '/^labor\s*:?$/i',
                        $text
                    )
                ) {
                    $mode = 'defects';
                } elseif (
                    preg_match(
                        '/^materials\s*:?$/i',
                        $text
                    )
                ) {
                    $mode = 'materials';
                } elseif ($mode === 'defects') {
                    $defects[] = $text;
                } else {
                    $materials[] = $text;
                }
            }

            if (
                ($extra = $this->value(
                    $line[$extraCol] ?? null
                )) !== null
            ) {
                $extras[] = $extra;
            }

            if (
                isset($map['remarks'])
                && (
                    $remark = $this->value(
                        $line[$map['remarks']] ?? null
                    )
                ) !== null
            ) {
                $remarks[] = $remark;
            }

            /*
             * Details cells joined into one line so both
             * old and new CSV layouts are supported.
             */
            $s = trim(
                preg_replace(
                    '/\s+/',
                    ' ',
                    implode(
                        ' ',
                        array_map(
                            'trim',
                            array_slice(
                                $line,
                                $from,
                                $textCol - $from
                            )
                        )
                    )
                )
            );

            if ($s === '') {
                continue;
            }

            /*
             * WMR number and date.
             */
            if (
                $d['wmr_no'] === null
                && preg_match(
                    '/^WMR\s*:?\s*(\S*)\s*(?:(?:Date|DTD)\s*:?\s*(\S+))?/i',
                    $s,
                    $m
                )
            ) {
                $no = preg_match(
                    '/^(Date|DTD):?$/i',
                    $m[1]
                )
                    ? ''
                    : $m[1];

                $d['wmr_no'] = $this->value(
                    $no
                );

                $d['wmr_date'] = $this->date(
                    $m[2] ?? null
                );

                continue;
            }

            /*
             * Job Order.
             */
            if (
                ! $seenJobOrder
                && preg_match(
                    '/^JOB ORDER\b/i',
                    $s
                )
            ) {
                $seenJobOrder = true;

                if (
                    preg_match(
                        '/^JOB ORDER No\.?\s*:?\s*(.*?)\s*(?:(?:Date|DTD)\s*:|Type\b|$)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['job_order_no'] =
                        $this->value($m[1]);
                }

                if (
                    preg_match(
                        '/(?:Date|DTD)\s*:\s*([\d\/\-]+)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['job_order_date'] =
                        $this->date($m[1]);
                }

                if (
                    preg_match(
                        '/\bType\s*:?\s*(.*)$/i',
                        $s,
                        $m
                    )
                ) {
                    $d['vehicle_type'] =
                        $this->value($m[1]);
                }

                continue;
            }

            /*
             * Fund / Brand / Model / Plate.
             */
            if (
                preg_match(
                    '/^Fund\b/i',
                    $s
                )
            ) {
                if (
                    preg_match(
                        '/^Fund\s*:?\s*(.*?)\s*(?:Brand Name|$)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['fund'] =
                        $this->value($m[1]);
                }

                if (
                    preg_match(
                        '/Brand Name\s*:?\s*(.*?)\s*(?:\bMODEL\b|PLATE NO|FOR REFERENCE ONLY|$)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['brand_name'] =
                        $this->value($m[1]);
                }

                if (
                    preg_match(
                        '/\bMODEL\s*:?\s*(.*?)\s*(?:PLATE NO|FOR REFERENCE ONLY|$)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['model'] =
                        $this->value($m[1]);
                }

                if (
                    preg_match(
                        '/PLATE NO\.?\s*:?\s*(.*?)\s*(?:FOR REFERENCE ONLY|$)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['plate_no'] =
                        $this->value($m[1]);
                }

                continue;
            }

            /*
             * Serial / Acquisition Date / Property Number.
             */
            if (
                preg_match(
                    '/^Serial\b/i',
                    $s
                )
            ) {
                if (
                    preg_match(
                        '/^Serial(?:\s*\/\s*Engine)?\s*No\.?\s*:?\s*(.*?)\s*(?:Acquisition Date|$)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['serial_engine_no'] =
                        $this->value($m[1]);
                }

                if (
                    preg_match(
                        '/Acquisition Date\s*:?\s*(.*?)\s*(?:PROPERTY NO|$)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['acquisition_date'] =
                        $this->value($m[1]);
                }

                if (
                    preg_match(
                        '/PROPERTY NO\.?\s*:?\s*(.*)$/i',
                        $s,
                        $m
                    )
                ) {
                    $d['property_no'] =
                        $this->value($m[1]);
                }

                continue;
            }

            /*
             * Inspector.
             */
            if (
                preg_match(
                    '/^Inspector\b/i',
                    $s
                )
            ) {
                if (
                    preg_match(
                        '/^Inspector(?:\s*Name)?\s*:?\s*(.*?)\s*(?:(?:Date|DTD)\s*:|$)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['inspector_name'] =
                        $this->value($m[1]);
                }

                if (
                    preg_match(
                        '/(?:Date|DTD)\s*:?\s*([\d\/\-]+)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['inspection_date'] =
                        $this->date($m[1]);
                }

                continue;
            }

            /*
             * Invoice row.
             */
            if (
                preg_match(
                    '/^(Invoice|Job Order)\b/i',
                    $s
                )
            ) {
                if (
                    preg_match(
                        '/^[^:]*:\s*(.*?)\s*(?:(?:Date|dtd)\s*:|$)/i',
                        $s,
                        $m
                    )
                ) {
                    $d['invoice_no'] =
                        $this->value($m[1]);
                }

                if (
                    preg_match(
                        '/(?:Date|dtd)\s*:\s*(.*)$/i',
                        $s,
                        $m
                    )
                ) {
                    $d['invoice_date'] =
                        $this->value($m[1]);
                }
            }
        }

        $d['defects_complaints'] =
            $this->joinList($defects);

        $d['materials'] =
            $this->joinList(
                array_merge(
                    $materials,
                    $extras
                )
            );

        $d['remarks'] =
            $remarks
                ? implode('; ', $remarks)
                : null;

        return $d;
    }

    /**
     * Joins list lines into "A, B, C".
     */
    private function joinList(array $parts): ?string
    {
        $seen = [];
        $out = [];

        foreach ($parts as $part) {
            $part = preg_replace(
                '/^\d{10}-\d{2}\s+/',
                '',
                $part
            );

            foreach (
                explode(',', $part)
                as $token
            ) {
                $token = trim($token);
                $key = mb_strtolower($token);

                if (
                    $token === ''
                    || isset($seen[$key])
                ) {
                    continue;
                }

                $seen[$key] = true;
                $out[] = $token;
            }
        }

        return $out
            ? implode(', ', $out)
            : null;
    }

    /* -------------------------------------------------------------
     * LOOKUPS
     * ------------------------------------------------------------- */

    private function supplierId(string $name): ?int
    {
        $key = mb_strtolower($name);

        if (
            array_key_exists(
                $key,
                $this->supplierCache
            )
        ) {
            return $this->supplierCache[$key];
        }

        $id = Supplier::whereRaw(
            'LOWER(TRIM(supplier_name)) = ?',
            [$key]
        )->value('supplier_id');

        if ($id === null) {
            try {
                $make = fn () =>
                    Supplier::create([
                        'supplier_name' => $name,
                    ]);

                $supplier =
                    method_exists(
                        Supplier::class,
                        'withoutActivityLogging'
                    )
                        ? Supplier::withoutActivityLogging(
                            $make
                        )
                        : $make();

                $id = $supplier->getKey();

                $this->newSuppliers[$name] = true;
            } catch (\Throwable) {
                $id = null;
            }
        }

        return $this->supplierCache[$key] = $id;
    }

    private function fundClusterId(
        ?string $raw
    ): ?string {
        if ($raw === null) {
            return null;
        }

        $key = mb_strtolower($raw);

        if (
            array_key_exists(
                $key,
                $this->fundCache
            )
        ) {
            return $this->fundCache[$key];
        }

        $id =
            FundCluster::whereRaw(
                'LOWER(fund_cluster_id) = ?',
                [$key]
            )->value('fund_cluster_id')
            ??
            FundCluster::whereRaw(
                'LOWER(fund_description) = ?',
                [$key]
            )->value('fund_cluster_id');

        /*
         * Handle values like:
         *
         * 05-IGF
         */
        if (
            $id === null
            && str_contains($raw, '-')
        ) {
            [
                $first,
                $last
            ] = array_map(
                'trim',
                explode('-', $raw, 2)
            );

            $id =
                FundCluster::whereRaw(
                    'LOWER(fund_cluster_id) = ?',
                    [mb_strtolower($first)]
                )->value('fund_cluster_id');

            if ($id === null) {
                $matches =
                    FundCluster::whereRaw(
                        'LOWER(fund_description) LIKE ?',
                        [
                            '%' .
                            mb_strtolower($last) .
                            '%'
                        ]
                    )
                    ->limit(2)
                    ->pluck('fund_cluster_id');

                $id =
                    $matches->count() === 1
                        ? $matches->first()
                        : null;
            }
        }

        if ($id === null) {
            $this->missingFunds[$raw] = true;
        }

        return $this->fundCache[$key] = $id;
    }

    private function officeCode(
        ?string $raw
    ): ?string {
        if ($raw === null) {
            return null;
        }

        $key = mb_strtolower($raw);

        if (
            array_key_exists(
                $key,
                $this->officeCache
            )
        ) {
            return $this->officeCache[$key];
        }

        $code =
            Office::whereRaw(
                'LOWER(office_code) = ?',
                [$key]
            )->value('office_code')
            ??
            Office::whereRaw(
                'LOWER(office_name) = ?',
                [$key]
            )->value('office_code');

        if ($code === null) {
            $this->missingOffices[$raw] = true;
        }

        return $this->officeCache[$key] = $code;
    }

    /* -------------------------------------------------------------
     * CELL HELPERS
     * ------------------------------------------------------------- */

    private function normalize($value): string
    {
        $value = preg_replace(
            '/^\xEF\xBB\xBF/',
            '',
            (string) $value
        );

        return preg_replace(
            '/[^a-z0-9]/',
            '',
            strtolower($value)
        );
    }

    private function value($value): ?string
    {
        $value = trim(
            (string) $value
        );

        return $value === ''
            ? null
            : $value;
    }

    private function collapse($value): ?string
    {
        $value = $this->value($value);

        return $value === null
            ? null
            : preg_replace(
                '/\s+/',
                ' ',
                $value
            );
    }

    /**
     * Convert common date formats to Y-m-d.
     */
    private function date($value): ?string
    {
        $value = $this->value($value);

        if ($value === null) {
            return null;
        }

        if (
            preg_match(
                '#^(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})$#',
                $value,
                $m
            )
        ) {
            $year =
                strlen($m[3]) === 2
                    ? 2000 + (int) $m[3]
                    : (int) $m[3];

            return checkdate(
                (int) $m[1],
                (int) $m[2],
                $year
            )
                ? sprintf(
                    '%04d-%02d-%02d',
                    $year,
                    (int) $m[1],
                    (int) $m[2]
                )
                : null;
        }

        try {
            return Carbon::parse(
                $value
            )->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Handles values like:
     *
     * 2,808.00
     * N/A
     */
    private function numberValue(
        $value
    ): ?float {
        if (
            ! preg_match(
                '/[\d,]+(\.\d+)?/',
                (string) $value,
                $m
            )
        ) {
            return null;
        }

        $number =
            str_replace(
                ',',
                '',
                $m[0]
            );

        return is_numeric($number)
            ? (float) $number
            : null;
    }

    /**
     * Additional information for the import audit entry.
     */
    private function notes(): string
    {
        $parts = [];

        if ($this->newSuppliers) {
            $parts[] =
                'new suppliers created: ' .
                implode(
                    ', ',
                    array_slice(
                        array_keys(
                            $this->newSuppliers
                        ),
                        0,
                        5
                    )
                );
        }

        if ($this->missingFunds) {
            $parts[] =
                'fund clusters not found: ' .
                implode(
                    ', ',
                    array_slice(
                        array_keys(
                            $this->missingFunds
                        ),
                        0,
                        5
                    )
                );
        }

        if ($this->missingOffices) {
            $parts[] =
                'offices not found: ' .
                implode(
                    ', ',
                    array_slice(
                        array_keys(
                            $this->missingOffices
                        ),
                        0,
                        5
                    )
                );
        }

        return $parts
            ? ' ' . implode(
                '; ',
                $parts
            ) . '.'
            : '';
    }

    /**
     * Queue workers don't have an authenticated request,
     * so use the user who originally started the import.
     */
    private function logAudit(
        Import $import,
        string $action
    ): void {
        $user = User::find(
            $import->user_id
        );

        DB::table('audit_logs')->insert([
            'log_timestamp' => now(),
            'userID' => $import->user_id,
            'role' => $user->role ?? 'user',
            'action' => $action,
        ]);
    }
}