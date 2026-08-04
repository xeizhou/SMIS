<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

trait LogsActivity
{
    /**
     * Boot the trait and register Eloquent events.
     */
    public static function bootLogsActivity()
    {
        static::created(function ($model) {
            $model->logActivity('Added a new ' . static::getModelName(), $model->getActivityUrl());
        });

        static::updated(function ($model) {
            $model->logActivity('Edited a record in ' . static::getModelName(), $model->getActivityUrl());
        });

        static::deleted(function ($model) {
            $model->logActivity('Deleted a record from ' . static::getModelName(), null); // Deletions have no URL
        });
    }

    /**
     * Get a human-readable model name for the log.
     */
    protected static function getModelName()
    {
        if (defined('static::LOG_NAME')) {
            return static::LOG_NAME;
        }

        // e.g., PreRepairMonitoring -> Pre Repair
        $name = class_basename(static::class);
        return \Illuminate\Support\Str::headline(str_replace('Monitoring', '', $name));
    }

    /**
     * Create the audit log entry.
     */
    protected function logActivity($action, $url)
    {
        $user = Auth::user();
        if (!$user) {
            return;
        }

        AuditLog::create([
            'log_timestamp' => now(),
            'userID' => $user->id,
            'role' => $user->role ?? 'Staff',
            'action' => $action,
            'target_url' => $url,
        ]);
    }

    /**
     * Models using this trait should implement this method to return the URL for viewing/editing the model.
     * By default, returns null.
     */
    public function getActivityUrl()
    {
        return null;
    }
}
