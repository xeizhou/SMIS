<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\LogsActivity;

class RrspMonitoring extends Model
{
    use HasFactory;

    use LogsActivity;

    const LOG_NAME = 'RRSP Monitoring';

    public function getActivityUrl()
    {
        return route('rrsp-monitoring.index', ['highlight_search' => $this->rrsp_no]);
    }
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
