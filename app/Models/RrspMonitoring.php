<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RrspMonitoring extends Model
{
    protected $table = 'rrsp_monitoring';

    protected $fillable = [
        'rrsp_no',
        'date_received',
        'item_description',
        'quantity',
        'property_no',
        'end_user_name',
        'cost',
        'kind_of_semi_expendable',
        'status',
        'area',
    ];

    protected $casts = [
        'date_received' => 'date',
        'cost' => 'decimal:2',
    ];

    public function regspiMonitorings(): HasMany
    {
        return $this->hasMany(RegspiMonitoring::class, 'rrsp_no', 'rrsp_no');
    }
}
