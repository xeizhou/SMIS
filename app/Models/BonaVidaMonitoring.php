<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BonaVidaMonitoring extends Model
{
    protected $table = 'bona_vida_monitoring';
    protected $primaryKey = 'bvm_id';

    protected $fillable = [
        'date_received',
        'office_code',
        'qty',
        'price',
        'total_amount',
        'invoice_no',
        'invoice_date',
        'remarks',
    ];

    protected $casts = [
        'date_received' => 'date',
        'invoice_date' => 'date',
        'price' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_code', 'office_code');
    }
}
