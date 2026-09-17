<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

trait LogsActivity
{
    protected static bool $activityLoggingSuppressed = false;

    /**
     * Boot the trait and register Eloquent events.
     */
    public static function bootLogsActivity()
    {
        static::created(function ($model) {
            if (! static::$activityLoggingSuppressed) {
                $model->logActivity('Added a new ' . static::getModelName(), $model->getActivityUrl());
            }
        });

        static::updated(function ($model) {
            if (! static::$activityLoggingSuppressed) {
                if (in_array(\Illuminate\Database\Eloquent\SoftDeletes::class, class_uses_recursive($model)) &&
                    $model->wasChanged('deleted_at') &&
                    is_null($model->deleted_at)) {
                    $model->logActivity('Restored a record to ' . static::getModelName(), $model->getActivityUrl());
                    return;
                }

                $model->logActivity('Edited a record in ' . static::getModelName(), $model->getActivityUrl());
            }
        });

        static::deleted(function ($model) {
            if (! static::$activityLoggingSuppressed) {
                if (method_exists($model, 'archiveMetadata')) {
                    $archive = $model->archiveMetadata()->first();
                    if ($archive) {
                        $url = route('document-center') . '?highlight_id=' . urlencode($archive->id);
                        $model->logActivity("Archived a record ({$archive->identity_document}) from " . static::getModelName(), $url);
                        return;
                    }
                }

                $model->logActivity('Deleted a record from ' . static::getModelName(), null); // Deletions have no URL
            }
        });
    }

    /**
     * Temporarily disable per-record activity logs for a bulk operation.
     */
    public static function withoutActivityLogging(callable $callback): mixed
    {
        $wasSuppressed = static::$activityLoggingSuppressed;
        static::$activityLoggingSuppressed = true;

        try {
            return $callback();
        } finally {
            static::$activityLoggingSuppressed = $wasSuppressed;
        }
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
