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
        'delivery_term',
        'pr_number',
        'pr_date',
        'philgeps_reference_no',
        'procurement_type',
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
        
        // Workflow fields
        'po_step',
        'date_forwarded_to_end_user',
        'end_user_forwarded_by',
        'po_received_date',
        'po_vpad_forwarded_by',
        'date_forwarded_supplier',
        'forwarded_by_supplier',
        'claimed_by_supplier',
        'supplier_signature_date',
        'date_forwarded_coa',
        'forwarded_by_coa',
        'date_returned_from_coa',
        'coa_date',
        'claim_date',
        'claimed_by_coa',
        'date_received_by_supplier',
        'receipt_receiving_date',
        'receipt_claimed_by',
        'items_receiving_date',
        'items_claimed_by',
        'payment_status',
        'workflow_remarks',
        'invoice_number',
        'invoice_date',
        'delivery_receipt',
        'par_ics_number',
        'ris_number',
        'date_completed',
        'date_forwarded_to_finance',
        'finance_forwarded_by',
        'po_vpad_notified_date',
        'po_vpad_notified_via',
        'coa_stamp_notified_date',
        'coa_stamp_notified_via',
        'receipt_claimed_notified_date',
        'receipt_claimed_notified_via',
    ];

    protected $casts = [
        'po_date' => 'date',
        'po_received_date' => 'date',
        'pr_date' => 'date',
        'ors_burs_date' => 'date',
        'date_forwarded_to_smu' => 'date',
        'coa_processed_date' => 'date',
        'date_forwarded_frontdesk' => 'date',
        'date_forwarded_to_end_user' => 'date',
        'date_forwarded_supplier' => 'date',
        'supplier_signature_date' => 'date',
        'date_forwarded_coa' => 'date',
        'date_returned_from_coa' => 'date',
        'coa_date' => 'date',
        'claim_date' => 'date',
        'date_received_by_supplier' => 'date',
        'receipt_receiving_date' => 'date',
        'items_receiving_date' => 'date',
        'invoice_date' => 'date',
        'date_completed' => 'date',
        'date_forwarded_to_finance' => 'date',
        'po_vpad_notified_date' => 'date',
        'coa_stamp_notified_date' => 'date',
        'receipt_claimed_notified_date' => 'date',
        'delivery_term' => 'integer',
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

    public function inspectionEntries(): HasMany
    {
        return $this->hasMany(PoInspectionEntry::class, 'po_number', 'po_number');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'end_user', 'office_code');
    }

    public function items(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            StockItem::class,
            'serve_po_items',
            'po_number',
            'stock_no',
            'po_number',
            'stock_no'
        )->withTimestamps();
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
