<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class RRPPEMonitoring extends Model
{
    use HasFactory, LogsActivity;

    const LOG_NAME = 'RRPPE Monitoring';

    protected $table = 'RRPPE_Monitoring';

    protected $fillable = [
        'rrppe_no',
        'date_received',
        'end_user_name',
        'return_by',
    ];

    public function items()
    {
        return $this->hasMany(RrppeItem::class, 'rrppe_monitoring_id');
    }

    public function getActivityUrl()
    {
        return route('rrppe-monitoring.index') . '?highlight_id=' . $this->getKey();
    }
}
