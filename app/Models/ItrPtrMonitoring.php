<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class ItrPtrMonitoring extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'itr_ptr_monitoring';

    protected $fillable = [
        'transaction_no',
        'date_release',
        'claimed_by',
        'from_accountable_officer',
        'to_accountable_officer',
        'property_no',
        'description',
        'amount',
        'condition_of_ppe',
        'location',
        'date_received',
    ];

    protected $casts = [
        'date_release' => 'date:Y-m-d',
        'date_received' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    /**
     * NOTE: the real relationship key is the composite pair
     * (transaction_no, property_no). Eloquent's hasMany() only supports a
     * single foreign key column, so this matches on transaction_no alone —
     * add ->where('property_no', $this->property_no) at the call site if
     * you need the full composite match enforced.
     */
    public function preRepairMonitorings(): HasMany
    {
        return $this->hasMany(PreRepairMonitoring::class, 'transaction_no', 'transaction_no');
    }

    public function getActivityUrl()
    {
        return route('itr-ptr-monitoring.index') . '?highlight_id=' . $this->id;
    }
}
