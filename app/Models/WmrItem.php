<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WmrItem extends Model
{
    protected $fillable = [
        'item_number',
        'quantity',
        'unit',
        'description',
        'item_control_no',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
    ];

    public function wmr(): BelongsTo
    {
        return $this->belongsTo(WmrMonitoring::class, 'wmr_monitoring_id');
    }
}
