<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use PDO;

class BackupDatabase extends Command
{
    protected $signature = 'backup:database';
    protected $description = 'Dump the database into storage/app/database-backups as backupdatabase_{month}_{year}.{ext}';

    public function handle(): int
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        $backupDir = storage_path('app/database-backups');
        if (! File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        return match ($config['driver'] ?? $connection) {
            'sqlite' => $this->backupSqlite($config, $backupDir),
            'mysql' => $this->backupMysql($config, $backupDir),
            'pgsql' => $this->backupPostgres($config, $backupDir),
            default => $this->fail("Unsupported database driver: {$connection}"),
        };
    }

    private function backupSqlite(array $config, string $backupDir): int
    {
        $sourcePath = $config['database'] ?? null;

        if (! $sourcePath || ! file_exists($sourcePath)) {
            $this->error("SQLite database file not found at: {$sourcePath}");
            return self::FAILURE;
        }

        $filename = 'backupdatabase_' . strtolower(now()->format('F_Y')) . '.sqlite';
        $path = $backupDir . DIRECTORY_SEPARATOR . $filename;

        try {
            // VACUUM INTO produces a clean, defragmented, consistent snapshot
            // even while the app has the main DB open (unlike a raw file copy,
            // which can grab a half-written page mid-write on a busy WAL db).
            $pdo = new PDO('sqlite:' . $sourcePath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // VACUUM INTO refuses to overwrite an existing file, so clear
            // out any stale file from an earlier run this same month first.
            if (file_exists($path)) {
                unlink($path);
            }

            $pdo->exec('VACUUM INTO ' . $pdo->quote($path));
            $pdo = null;
        } catch (\Throwable $e) {
            $this->warn('VACUUM INTO failed, falling back to raw file copy: ' . $e->getMessage());

            if (! @copy($sourcePath, $path)) {
                $this->error('Database backup failed: could not copy sqlite file.');
                return self::FAILURE;
            }
        }

        if (! file_exists($path) || filesize($path) === 0) {
            $this->error('Database backup failed: output file missing or empty.');
            if (file_exists($path)) unlink($path);
            return self::FAILURE;
        }

        $this->info("Database backup created: {$filename}");
        return self::SUCCESS;
    }

    private function backupMysql(array $config, string $backupDir): int
    {
        if (! isset($config['username'], $config['host'], $config['database'])) {
            $this->error('MySQL connection config is missing required keys (username/host/database).');
            return self::FAILURE;
        }

        $filename = 'backupdatabase_' . strtolower(now()->format('F_Y')) . '.sql';
        $path = $backupDir . DIRECTORY_SEPARATOR . $filename;

        putenv('MYSQL_PWD=' . ($config['password'] ?? ''));

        $command = sprintf(
            'mysqldump --user=%s --host=%s --port=%s %s > %s 2>&1',
            escapeshellarg($config['username']),
            escapeshellarg($config['host']),
            escapeshellarg((string) ($config['port'] ?? 3306)),
            escapeshellarg($config['database']),
            escapeshellarg($path)
        );

        exec($command, $output, $returnVar);
        putenv('MYSQL_PWD');

        if ($returnVar !== 0 || ! file_exists($path) || filesize($path) === 0) {
            $this->error('Database backup failed: ' . implode("\n", $output));
            if (file_exists($path)) unlink($path);
            return self::FAILURE;
        }

        $this->info("Database backup created: {$filename}");
        return self::SUCCESS;
    }

    private function backupPostgres(array $config, string $backupDir): int
    {
        if (! isset($config['username'], $config['host'], $config['database'])) {
            $this->error('PostgreSQL connection config is missing required keys (username/host/database).');
            return self::FAILURE;
        }

        $filename = 'backupdatabase_' . strtolower(now()->format('F_Y')) . '.sql';
        $path = $backupDir . DIRECTORY_SEPARATOR . $filename;

        putenv('PGPASSWORD=' . ($config['password'] ?? ''));

        $command = sprintf(
            'pg_dump --username=%s --host=%s --port=%s %s > %s 2>&1',
            escapeshellarg($config['username']),
            escapeshellarg($config['host']),
            escapeshellarg((string) ($config['port'] ?? 5432)),
            escapeshellarg($config['database']),
            escapeshellarg($path)
        );

        exec($command, $output, $returnVar);
        putenv('PGPASSWORD');

        if ($returnVar !== 0 || ! file_exists($path) || filesize($path) === 0) {
            $this->error('Database backup failed: ' . implode("\n", $output));
            if (file_exists($path)) unlink($path);
            return self::FAILURE;
        }

        $this->info("Database backup created: {$filename}");
        return self::SUCCESS;
    }
}