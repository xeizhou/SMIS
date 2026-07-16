<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PreRepairMonitoring extends Model
{
    protected $table = 'pre_repair_monitoring';

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
    public function itrPtrMonitoring(): BelongsTo
    {
        return $this->belongsTo(ItrPtrMonitoring::class, 'transaction_no', 'transaction_no');
    }

    public function forDisposalMonitorings(): HasMany
    {
        return $this->hasMany(ForDisposalMonitoring::class, 'pre_repair_no', 'pre_repair_no');
    }
}
