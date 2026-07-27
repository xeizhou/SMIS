<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class RRPPEMonitoring extends Model
{
    use HasFactory, LogsActivity;

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

    public function getActivityUrl()
    {
        return route('rrppe-monitoring.index') . '?highlight_id=' . $this->id;
    }
}
