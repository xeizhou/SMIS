<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Clearance extends Model
{
    protected $table = 'clearance';

    protected $primaryKey = 'clearance_id';

    protected $fillable = [
        'name',
        'office',
        'claim_date',
        'received_by',
        'status',
        'cleared',
        'pending',
        'remarks',
    ];

    protected $casts = [
        'claim_date' => 'date',
        'cleared' => 'boolean',
        'pending' => 'boolean',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office', 'office_code');
    }
}
