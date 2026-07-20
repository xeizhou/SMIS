<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RRPPEMonitoring extends Model
{
    protected $table = 'RRPPE_Monitoring';

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
}
