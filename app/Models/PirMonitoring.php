<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PirMonitoring extends Model
{
    protected $table = 'pir_monitoring';
    protected $primaryKey = 'pir_id';

    protected $fillable = [
        'supplier_id',
        'po_number',
        'unit_office',
        'po_date',
        'delivery_term',
        'fund_cluster',
        'pr_number',
        'pr_date',
        'ors_bur_number',
        'ors_bur_date',
        'po_amount',
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
        'invoice_number',
        'invoice_date',
        'delivery_receipt',
        'date_completed',
        'par_ics_number',
        'ris_number',
        'inspected_by',
        'inspection_date',
        'iar_number',
        'date_forwarded_to_finance',
        'receipt_receiving_date',
        'receipt_claimed_by',
        'items_receiving_date',
        'items_claimed_by',
        'notify_receipt',
        'notify_call',
        'notify_email',
        'status',
        'remarks',
    ];

    protected $casts = [
        'po_date' => 'date',
        'pr_date' => 'date',
        'ors_bur_date' => 'date',
        'date_forwarded_supplier' => 'date',
        'supplier_signature_date' => 'date',
        'date_forwarded_coa' => 'date',
        'date_returned_from_coa' => 'date',
        'coa_date' => 'date',
        'claim_date' => 'date',
        'date_received_by_supplier' => 'date',
        'invoice_date' => 'date',
        'date_completed' => 'date',
        'inspection_date' => 'date',
        'date_forwarded_to_finance' => 'date',
        'receipt_receiving_date' => 'date',
        'items_receiving_date' => 'date',
        'po_amount' => 'decimal:2',
    ];

    public function servePo(): BelongsTo
    {
        return $this->belongsTo(ServePo::class, 'po_number', 'po_number');
    }

    public function fundCluster(): BelongsTo
    {
        return $this->belongsTo(FundCluster::class, 'fund_cluster', 'fund_cluster_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}
