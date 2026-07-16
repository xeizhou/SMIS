<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegspiMonitoring extends Model
{
    protected $table = 'regspi_monitoring';
    protected $primaryKey = 'regspi_id';

    protected $fillable = [
        'month_year',
        'ics_no',
        'rrsp_no',
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
}
