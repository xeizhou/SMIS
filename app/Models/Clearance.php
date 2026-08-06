<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class Clearance extends Model
{
    use HasFactory, LogsActivity;

    const LOG_NAME = 'Clearance';

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

    public function getActivityUrl()
    {
        return route('clearance.index') . '?highlight_id=' . $this->getKey();
    }
}
