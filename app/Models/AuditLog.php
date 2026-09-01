<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\MassPrunable;

class AuditLog extends Model
{
    use MassPrunable;

    protected $table = 'audit_logs';

    protected $primaryKey = 'auditLogID';

    public $timestamps = false; // source table has no created_at/updated_at

    protected $fillable = [
        'log_timestamp',
        'userID',
        'role',
        'action',
        'target_url',
    ];

    protected $casts = [
        'log_timestamp' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'userID', 'id');
    }

    /**
     * Get the prunable models.
     */
    public function prunable()
    {
        return static::where('log_timestamp', '<', now()->subDays(30));
    }
}
