<?php

namespace App\Models;

use App\Traits\LogsActivity;
use App\Traits\SerializesDatesWithoutTimezoneShift;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, LogsActivity, SerializesDatesWithoutTimezoneShift, SoftDeletes;

    const LOG_NAME = 'Tasks';

    protected $fillable = [
        'title',
        'description',
        'po_number',
        'assigned_to',
        'assigned_by',
        'priority',
        'status',
        'due_date',
        'completed_at',
        'archived_at',
    ];

    protected $casts = [
        'due_date' => 'date',
        'completed_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function servePo(): BelongsTo
    {
        return $this->belongsTo(ServePo::class, 'po_number', 'po_number');
    }
}

