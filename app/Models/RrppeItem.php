<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RrppeItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'rrppe_monitoring_id',
        'item_name',
        'item_description',
        'quantity',
        'property_no',
        'cost',
        'status',
        'area',
        'remarks',
    ];

    public function rrppe()
    {
        return $this->belongsTo(RRPPEMonitoring::class, 'rrppe_monitoring_id');
    }
}
