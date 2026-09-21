<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class RRPPEMonitoring extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    const LOG_NAME = 'RRPPE Monitoring';

    protected $table = 'RRPPE_Monitoring';

    protected $fillable = [
        'rrppe_no',
        'date_received',
        'end_user_name',
        'return_by',
    ];

    protected $casts = [
        'date_received' => 'date',
    ];

    public function items()
    {
        return $this->hasMany(RrppeItem::class, 'rrppe_monitoring_id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function getActivityUrl()
    {
        return route('rrppe-monitoring.index') . '?highlight_id=' . $this->getKey();
    }

    public function archiveMetadata(): MorphOne
    {
        return $this->morphOne(Archive::class, 'archivable');
    }
}