<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\LogsActivity;

class RegspiMonitoring extends Model
{
    use LogsActivity;
    use HasFactory;

    const LOG_NAME = 'REG-SPI Monitoring';

    public function getActivityUrl()
    {
        return route('regspi-monitoring.index', ['highlight_search' => $this->ics_no ?? $this->rrsp_no]);
    }
    protected $table = 'regspi_monitoring';

    protected $primaryKey = 'regspi_id';

    protected $fillable = [
        'month_year',
        'ics_no',
        'rrsp_no',
        'fund_cluster_id',
        'semi_expendable_property_no',
        'item_description',
        'estimated_useful_life',
        'issued_qty',
        'issued_office_officer',
        'returned_qty',
        'returned_office_officer',
        'reissued_qty',
        'reissued_office_officer',
        'disposed_qty',
        'balance_qty',
        'amount',
        'remarks',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function rrspMonitoring(): BelongsTo
    {
        return $this->belongsTo(RrspMonitoring::class, 'rrsp_no', 'rrsp_no');
    }

    public function fundCluster(): BelongsTo
    {
        return $this->belongsTo(FundCluster::class, 'fund_cluster_id', 'fund_cluster_id');
    }
}
