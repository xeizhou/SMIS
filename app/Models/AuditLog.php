<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $table = 'audit_logs';

    protected $primaryKey = 'auditLogID';

    public $timestamps = false; // source table has no created_at/updated_at

    protected $fillable = [
        'log_timestamp',
        'userID',
        'role',
        'action',
    ];

    protected $casts = [
        'log_timestamp' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'userID', 'userID');
    }
}
