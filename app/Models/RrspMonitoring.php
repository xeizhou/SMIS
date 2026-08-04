<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\LogsActivity;

class RrspMonitoring extends Model
{
    use HasFactory, LogsActivity;

    const LOG_NAME = 'RRSP Monitoring';

    public function getActivityUrl()
    {
        return route('rrsp-monitoring.index', [
            'highlight_search' => $this->rrsp_no,
            'highlight_id' => $this->id,
        ]);
    }
    protected $table = 'rrsp_monitoring';

    protected $fillable = [
        'rrsp_no',
        'date_received',
        'end_user_name',
    ];

    protected $casts = [
        'date_received' => 'date',
    ];

    public function regspiMonitorings(): HasMany
    {
        return $this->hasMany(RegspiMonitoring::class, 'rrsp_no', 'rrsp_no');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RrspItem::class, 'rrsp_monitoring_id');
    }
}
