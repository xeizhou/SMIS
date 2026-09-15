<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Archive extends Model
{
    protected $fillable = [
        'archivable_type',
        'archivable_id',
        'identity_document',
        'archived_from',
        'archived_by',
    ];

    public function archivable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by');
    }
}
