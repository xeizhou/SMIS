<?php

namespace App\Models;

use App\Traits\LogsActivity;
use App\Traits\SerializesDatesWithoutTimezoneShift;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class WmrMonitoring extends Model
{
    use LogsActivity, SerializesDatesWithoutTimezoneShift, SoftDeletes;

    const LOG_NAME = 'WMR Monitoring';

    protected $table = 'wmr_monitoring';

    protected $fillable = [
        'wmr_no',
        'wmr_date',
        'supplier_id',
        'iar_no',
        'iar_date',
        'item_vehicle',
        'job_order_no',
        'job_order_date',
        'fund_cluster_id',
        'vehicle_type',
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
        'labor_cost',
        'office_code',
        'requested_by',
        'received_by',
        'received_date',
        'remarks',
    ];

    protected $casts = [
        'wmr_date' => 'date',
        'iar_date' => 'date',
        'job_order_date' => 'date',
        'inspection_date' => 'date',
        'received_date' => 'date',
        'labor_cost' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_code', 'office_code');
    }

    public function fundCluster(): BelongsTo
    {
        return $this->belongsTo(FundCluster::class, 'fund_cluster_id', 'fund_cluster_id');
    }

    public function getActivityUrl()
    {
        return route('wmr-monitoring.index') . '?highlight_id=' . $this->getKey();
    }

    public function archiveMetadata(): MorphOne
    {
        return $this->morphOne(Archive::class, 'archivable');
    }
}