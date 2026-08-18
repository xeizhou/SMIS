<?php

namespace App\Http\Controllers;

use App\Models\FundCluster;
use App\Models\Office;
use App\Models\StockItem;
use App\Models\Transaction;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use ZipArchive;

class BackupController extends Controller
{
    private const ROOT = 'backups';

    /**
     * POST /backup/create
     */
    public function create(Request $request)
    {
        $validated = $request->validate([
            'backup_type' => 'required|in:dat,json,excel',
            'timestamped_subfolder' => 'nullable|boolean',
            'compress' => 'nullable|boolean',
        ]);

        $type = $validated['backup_type'];
        $timestamped = $request->boolean('timestamped_subfolder');
        $compress = $request->boolean('compress');

        $relativeDir = self::ROOT;
        
        if ($timestamped) {
            $relativeDir .= '/' . now()->format('Y-m-d_H_i_s');
        }

        $disk = Storage::disk('local');
        $disk->makeDirectory($relativeDir);
        $absoluteDir = $disk->path($relativeDir);

        $data = $this->collectData();
        $baseName = 'smis_backup_' . now()->format('Ymd_His');

        $files = match ($type) {
            'dat' => $this->writeEncryptedFiles($absoluteDir, $baseName, $data),
            'json' => $this->writeJsonFiles($absoluteDir, $baseName, $data),
            'excel' => $this->writeExcelFiles($absoluteDir, $baseName, $data),
        };

        $downloadZip = $this->zipFiles($files, "{$absoluteDir}/{$baseName}.zip");

        if ($compress) {
            // Keep the zip as the permanent stored copy, remote redundant loose files
            foreach ($files as $f) {
                @unlink($f);
            }
            $filePath = $downloadZip;
        } else {
            // Give client the zip to download, then delete it, keeping the loose files.
            $filePath = $downloadZip;
        }

        $this->logAudit(sprintf('Created %s backup: %s', strtoupper($type), basename($filePath)));

        return response()->download($filePath)->deleteFileAfterSend(! $compress ? true : false);
    }

    /**
     * POST /backup/restore
     */
    public function restore(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200',
            'confirm' => 'required|accepted',
        ]);

        $uploadPath = $request->file('file')->getRealPath();
        $extractDir = storage_path('app/tmp_restore_' . uniqid());

        $zip = new ZipArchive();
        if ($zip->open($uploadPath) !== true) {
            return back()->withErrors(['file' => 'Could not open this file as a backup archive. Make sure you selected the .zip produced by Create Backup.']);
        }
        $zip->extractTo($extractDir);
        $zip->close();

        $readEncrypted = function (string $table) use ($extractDir) {
            $path = "{$extractDir}/{$table}.dat";
            if (! file_exists($path)) {
                return null;
            }
            try {
                return json_decode(Crypt::decryptString(file_get_contents($path)), true);
            } catch (\Throwable $e) {
                return null;
            }
        };

        $info = $readEncrypted('backup_info');
        if (! is_array($info) || ($info['backup_type'] ?? null) !== 'dat') {
            $this->cleanupDir($extractDir);

            return back()->withErrors(['file' => 'This does not look like a valid SMIS encrypted backup.']);
        }

        $data = [
            'offices' => $readEncrypted('offices'),
            'fund_clusters' => $readEncrypted('fund_clusters'),
            'units' => $readEncrypted('units'),
            'stock_items' => $readEncrypted('stock_items'),
            'transactions' => $readEncrypted('transactions'),
        ];

        $requiredKeys = ['offices', 'fund_clusters', 'units', 'stock_items', 'transactions'];
        foreach ($requiredKeys as $key) {
            if (! isset($data[$key]) || ! is_array($data[$key])) {
                $this->cleanupDir($extractDir);

                return back()->withErrors(['file' => "This backup is missing or has a corrupted '{$key}.dat' file and cannot be restored."]);
            }
        }

        $pivotRelation = (new StockItem())->units();
        $pivotTable = $pivotRelation->getTable();
        $pivotForeignKey = $pivotRelation->getForeignPivotKeyName();
        $pivotRelatedKey = $pivotRelation->getRelatedPivotKeyName();

        DB::transaction(function () use ($data, $pivotTable, $pivotForeignKey, $pivotRelatedKey) {
            DB::statement('PRAGMA foreign_keys = OFF');

            DB::table('transactions')->delete();
            DB::table($pivotTable)->delete();
            DB::table('stock_items')->delete();
            DB::table('units')->delete();
            DB::table('fund_clusters')->delete();
            DB::table('offices')->delete();

            foreach ($data['offices'] as $row) {
                DB::table('offices')->insert($this->stripRelations($row));
            }
            foreach ($data['fund_clusters'] as $row) {
                DB::table('fund_clusters')->insert($this->stripRelations($row));
            }
            foreach ($data['units'] as $row) {
                DB::table('units')->insert($this->stripRelations($row));
            }

            foreach ($data['stock_items'] as $row) {
                $units = $row['units'] ?? [];
                $itemRow = $this->stripRelations($row);
                DB::table('stock_items')->insert($itemRow);

                foreach ($units as $u) {
                    if (! isset($u['unitID'])) {
                        continue;
                    }
                    DB::table($pivotTable)->insert([
                        $pivotForeignKey => $itemRow['stock_no'],
                        $pivotRelatedKey => $u['unitID'],
                        'is_default' => $u['pivot']['is_default'] ?? false,
                    ]);
                }
            }

            foreach ($data['transactions'] as $row) {
                DB::table('transactions')->insert($this->stripRelations($row));
            }

            DB::statement('PRAGMA foreign_keys = ON');
        });

        $this->logAudit('Restored system data from an encrypted backup. ALL prior data was overwritten.');

        $this->cleanupDir($extractDir);

        return back()->with('success', 'Restore complete. All data has been replaced from the backup file.');
    }

    private function cleanupDir(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }
        foreach (glob("{$dir}/*") as $f) {
            @unlink($f);
        }
        @rmdir($dir);
    }

    private function collectData(): array
    {
        return [
            'exported_at' => now()->toIso8601String(),
            'offices' => Office::all()->toArray(),
            'fund_clusters' => FundCluster::all()->toArray(),
            'units' => Unit::all()->toArray(),
            'stock_items' => StockItem::with('units')->get()->toArray(),
            'transactions' => Transaction::all()->toArray(),
        ];
    }

    private function writeJsonFiles(string $dir, string $baseName, array $data): array
    {
        $files = [];

        foreach ($data as $table => $rows) {
            if ($table === 'exported_at' || ! is_array($rows)) {
                continue;
            }
            $path = "{$dir}/{$table}.json";
            file_put_contents($path, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $files[] = $path;
        }

        $infoPath = "{$dir}/backup_info.json";
        file_put_contents($infoPath, json_encode([
            'exported_at' => $data['exported_at'],
            'backup_type' => 'json',
            'tables' => array_values(array_filter(array_keys($data), fn ($k) => $k !== 'exported_at')),
        ], JSON_PRETTY_PRINT));
        $files[] = $infoPath;

        return $files;
    }

    private function writeEncryptedFiles(string $dir, string $baseName, array $data): array
    {
        $files = [];

        foreach ($data as $table => $rows) {
            if ($table === 'exported_at' || ! is_array($rows)) {
                continue;
            }
            $path = "{$dir}/{$table}.dat";
            file_put_contents($path, Crypt::encryptString(json_encode($rows)));
            $files[] = $path;
        }

        $infoPath = "{$dir}/backup_info.dat";
        file_put_contents($infoPath, Crypt::encryptString(json_encode([
            'exported_at' => $data['exported_at'],
            'backup_type' => 'dat',
            'tables' => array_values(array_filter(array_keys($data), fn ($k) => $k !== 'exported_at')),
        ])));
        $files[] = $infoPath;

        return $files;
    }

    private function writeExcelFiles(string $dir, string $baseName, array $data): array
    {
        $files = [];

        foreach ($data as $table => $rows) {
            if ($table === 'exported_at' || ! is_array($rows)) {
                continue;
            }

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle(substr(ucwords(str_replace('_', ' ', $table)), 0, 31));

            if (! empty($rows)) {
                $headers = array_keys($rows[0]);
                $sheet->fromArray($headers, null, 'A1');

                $r = 2;
                foreach ($rows as $row) {
                    $line = [];
                    foreach ($headers as $h) {
                        $val = $row[$h] ?? null;
                        $line[] = is_array($val) ? json_encode($val) : $val;
                    }
                    $sheet->fromArray($line, null, "A{$r}");
                    $r++;
                }
            }

            $path = "{$dir}/{$table}.xlsx";
            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $writer->save($path);
            $files[] = $path;
        }

        return $files;
    }

    private function zipFiles(array $filePaths, string $zipPath): string
    {
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($filePaths as $path) {
            $zip->addFile($path, basename($path));
        }

        $zip->close();

        return $zipPath;
    }

    private function stripRelations(array $row): array
    {
        unset($row['units'], $row['pivot']);

        return $row;
    }

    private function logAudit(string $action): void
    {
        DB::table('audit_logs')->insert([
            'log_timestamp' => now(),
            'userID' => Auth::id(),
            'role' => Auth::user()->role ?? 'user',
            'action' => $action,
        ]);
    }
}