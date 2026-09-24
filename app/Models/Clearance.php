<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class Clearance extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    const LOG_NAME = 'Clearance';

    protected $table = 'clearance';

    protected $primaryKey = 'clearance_id';

    protected $fillable = [
        'name',
        'claim_date',
        'received_by',
        'status',
        'cleared',
        'pending',
        'remarks',
        'checked_by_id',
        'form_attribute',
        'end_user_claim',
    ];

    protected $casts = [
        'claim_date' => 'datetime',
        'cleared' => 'boolean',
        'pending' => 'boolean',
    ];

    public function offices(): BelongsToMany
    {
        return $this->belongsToMany(
            ClearanceOffice::class,
            'clearance_clearance_office',
            'clearance_id',
            'clearance_office_id'
        );
    }

    public function checker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by_id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function getActivityUrl()
    {
        return route('clearance.index') . '?highlight_id=' . $this->getKey();
    }

    public function archiveMetadata(): MorphOne
    {
        return $this->morphOne(Archive::class, 'archivable');
    }
}
