<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\Illuminate\Support\Facades\Artisan::call('schedule:list');
$output = \Illuminate\Support\Facades\Artisan::output();

// strip ansi codes
$output = preg_replace('/\x1b\[[0-9;]*m/', '', $output);

$lines = explode("\n", trim($output));
$tasks = [];
foreach ($lines as $line) {
    if (empty(trim($line))) continue;
    
    // The format is roughly: "  0 0 * * *  php artisan model:prune .................................... Next Due: 7 hours from now"
    // Use regex to match the cron, the command, and the next due
    if (preg_match('/^\s*([0-9\*\/\-\,]+(?:\s+[0-9\*\/\-\,]+){4})\s+(.+?)\s+\.{2,}\s+Next Due:\s+(.+)$/i', $line, $matches)) {
        $tasks[] = [
            'cron' => trim($matches[1]),
            'command' => trim($matches[2]),
            'next_due' => trim($matches[3]),
        ];
    }
}

print_r($tasks);
