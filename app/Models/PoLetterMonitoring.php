<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PoLetterMonitoring extends Model
{
    protected $table = 'po_letter_monitoring';

    protected $fillable = [
        'reference_no',
        'supplier_id',
        'po_number',
        'po_date',
        'date_received_by_supplier',
        'delivery_term',
        'due_date',
        'office_end_user',
        'type_of_letter',
        'date_received_by_smu',
        'date_forwarded_to_ovpad',
        'received_by',
        'status_of_the_letter',
        'document_link',
        'date_forwarded_to_end_user',
        'remarks',
    ];

    protected $casts = [
        'po_date' => 'date',
        'date_received_by_supplier' => 'date',
        'delivery_term' => 'integer',
        'due_date' => 'date',
        'date_received_by_smu' => 'date',
        'date_forwarded_to_ovpad' => 'date',
        'date_forwarded_to_end_user' => 'date',
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
