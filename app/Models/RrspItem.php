<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RrspItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'rrsp_monitoring_id',
        'item_name',
        'item_description',
        'quantity',
        'property_no',
        'cost',
        'status',
        'kind_of_semi_expendable',
        'area',
        'remarks',
    ];

    public function rrsp()
    {
        return $this->belongsTo(RrspMonitoring::class, 'rrsp_monitoring_id');
    }
}
