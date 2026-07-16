<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Delivery extends Model
{
    protected $table = 'delivery';
    protected $primaryKey = 'delivery_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false; // source table tracks data_entry_timestamp instead

    protected $fillable = [
        'delivery_id',
        'po_number',
        'supplier_id',
        'delivery_date',
        'po_date_received',
        'delivery_term',
        'due_date',
        'no_of_days_ld',
        'received_by_1',
        'received_by_2',
        'end_user',
        'place_of_delivery',
        'status',
        'remarks',
        'data_entry_timestamp',
        'total_amount_delivered',
        'po_total_amount',
        'folder_link',
    ];

    protected $casts = [
        'delivery_date' => 'date',
        'po_date_received' => 'date',
        'due_date' => 'date',
        'data_entry_timestamp' => 'datetime',
        'total_amount_delivered' => 'decimal:2',
        'po_total_amount' => 'decimal:2',
    ];

    public function servePo(): BelongsTo
    {
        return $this->belongsTo(ServePo::class, 'po_number', 'po_number');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}
