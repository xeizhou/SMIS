<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\SerializesDatesWithoutTimezoneShift;

class DeliveryDate extends Model
{
    use SerializesDatesWithoutTimezoneShift;

    protected $table = 'delivery_dates';

    protected $fillable = [
        'delivery_id',
        'delivery_date',
    ];

    protected $casts = [
        'delivery_date' => 'date',
    ];

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class, 'delivery_id', 'delivery_id');
    }
}