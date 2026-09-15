<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class RestoreDatabase extends Command
{
    protected $signature = 'backup:restore {filename : Backup filename inside storage/app/database-backups}';
    protected $description = 'Restore the database from a specific backup file in storage/app/database-backups';

    public function handle(): int
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");
        $driver = $config['driver'] ?? $connection;

        if ($driver !== 'sqlite') {
            $this->error("Restore is currently only implemented for sqlite (active driver: {$driver}).");
            return self::FAILURE;
        }

        // basename() strips any ../ path traversal attempts — filename ultimately
        // comes from a user-facing dropdown/button, so never trust it as-is.
        $filename = basename($this->argument('filename'));
        $backupDir = storage_path('app/database-backups');
        $backupPath = $backupDir . DIRECTORY_SEPARATOR . $filename;

        if (! file_exists($backupPath)) {
            $this->error("Backup file not found: {$filename}");
            return self::FAILURE;
        }

        $liveDbPath = $config['database'] ?? null;
        if (! $liveDbPath) {
            $this->error('Could not resolve the live sqlite database path from config.');
            return self::FAILURE;
        }

        // Safety net: snapshot the current live db before overwriting it,
        // so a bad restore (wrong file, corrupted backup) is itself recoverable.
        $safetyDir = storage_path('app/database-backups/pre-restore');
        if (! File::exists($safetyDir)) {
            File::makeDirectory($safetyDir, 0755, true);
        }
        $safetyPath = $safetyDir . DIRECTORY_SEPARATOR . 'pre_restore_' . now()->format('Y_m_d_His') . '.sqlite';

        if (file_exists($liveDbPath) && ! @copy($liveDbPath, $safetyPath)) {
            $this->error('Aborting: could not create a safety snapshot of the current database before restoring.');
            return self::FAILURE;
        }

        try {
            // Drop the live connection so nothing holds a lock/handle on the
            // file while we swap it out from under the running app.
            DB::purge($connection);

            if (! @copy($backupPath, $liveDbPath)) {
                $this->error('Restore failed: could not copy backup file over the live database.');
                return self::FAILURE;
            }

            // Reconnect so the current process (and anything sharing it)
            // picks up the restored file immediately rather than a stale handle.
            DB::reconnect($connection);
        } catch (\Throwable $e) {
            $this->error('Restore failed: ' . $e->getMessage());
            return self::FAILURE;
        }

        $this->info("Database restored from: {$filename}");
        $this->info("Safety snapshot of the previous state saved as: pre-restore/" . basename($safetyPath));
        return self::SUCCESS;
    }
}