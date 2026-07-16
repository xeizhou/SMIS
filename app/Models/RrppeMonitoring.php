<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RrppeMonitoring extends Model
{
    protected $table = 'rrppe_monitoring';

    protected $fillable = [
        'rrppe_no',
        'date_received',
        'item_description',
        'quantity',
        'property_no',
        'end_user_name',
        'cost',
        'status',
        'area',
        'remarks',
    ];

    protected $casts = [
        'date_received' => 'date',
        'cost' => 'decimal:2',
    ];
}
