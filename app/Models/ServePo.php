<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use App\Traits\LogsActivity;
use App\Traits\SerializesDatesWithoutTimezoneShift;

class ServePo extends Model
{
    use HasFactory, LogsActivity, SerializesDatesWithoutTimezoneShift;

    protected $table = 'serve_po';

    const LOG_NAME = 'Purchase Orders';

    protected $primaryKey = 'po_number';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'po_number',
        'item_description',
        'po_date',
        'po_received_date',
        'inclusive_date',
        'due_date',
        'pr_number',
        'pr_date',
        'philgeps_reference_no',
        'mode_of_procurement',
        'total_amount_abc',
        'total_amount_po',
        'total_amount_diff',
        'fund_cluster_id',
        'ors_burs_no',
        'ors_burs_date',
        'responsibility_center',
        'uacs_object_code',
        'supplier_id',
        'end_user',
        'date_forwarded_to_smu',
        'coa_processed_date',
        'date_forwarded_frontdesk',
    ];

    protected $casts = [
        'po_date' => 'date',
        'po_received_date' => 'date',
        'due_date' => 'date',
        'pr_date' => 'date',
        'ors_burs_date' => 'date',
        'date_forwarded_to_smu' => 'date',
        'coa_processed_date' => 'date',
        'date_forwarded_frontdesk' => 'date',
        'total_amount_abc' => 'decimal:2',
        'total_amount_po' => 'decimal:2',
        'total_amount_diff' => 'decimal:2',
    ];

    public function fundCluster(): BelongsTo
    {
        return $this->belongsTo(FundCluster::class, 'fund_cluster_id', 'fund_cluster_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class, 'po_number', 'po_number');
    }

    public function letterMonitorings(): HasMany
    {
        return $this->hasMany(PoLetterMonitoring::class, 'po_number', 'po_number');
    }

    public function pirMonitorings(): HasMany
    {
        return $this->hasMany(PirMonitoring::class, 'po_number', 'po_number');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'end_user', 'office_code');
    }
    public function attachments(): MorphMany
    {
    return $this->morphMany(Attachment::class, 'attachable');
}

public function getActivityUrl()
{
    return route('purchase-orders.index') . '?highlight_id=' . $this->po_number;
}
}
