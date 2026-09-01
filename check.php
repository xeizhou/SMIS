<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$yesterday = \Carbon\Carbon::yesterday()->format('Y-m-d');
$today = \Carbon\Carbon::today()->format('Y-m-d');

$deliveries = \App\Models\Delivery::whereNotIn('status', ['COMPLETED', 'COMPLETE', 'CANCELLED'])->get();

foreach ($deliveries as $d) {
    echo "PO: " . $d->po_number . "\n";
    echo "Raw DB Due Date: " . $d->getRawOriginal('due_date') . "\n";
    echo "Computed Due Date: " . ($d->due_date ? $d->due_date->format('Y-m-d') : 'NULL') . "\n";
}

echo "\nQuerying whereDate due_date = yesterday ($yesterday):\n";
$q = \App\Models\Delivery::whereDate('due_date', $yesterday)->get();
foreach ($q as $d) {
    echo "PO: " . $d->po_number . "\n";
}
