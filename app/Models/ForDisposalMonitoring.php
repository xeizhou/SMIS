<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ForDisposalMonitoring extends Model
{
    protected $table = 'for_disposal_monitoring';

    protected $fillable = [
        'transaction_no',
        'pre_repair_no',
        'from_accountable_officer',
        'to_accountable_officer',
        'property_no',
        'description',
        'amount',
        'condition_of_ppe',
        'location',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    // See note on ItrPtrMonitoring::preRepairMonitorings() re: composite key.
    public function preRepairMonitoring(): BelongsTo
    {
        return $this->belongsTo(PreRepairMonitoring::class, 'pre_repair_no', 'pre_repair_no');
    }
}
