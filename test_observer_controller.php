<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$record = \App\Models\RRPPEMonitoring::first();
if (!$record) {
    echo "No record found.\n";
    exit;
}

// Mimic controller update
$record->items()->delete();
$record->items()->create([
    'item_name' => 'Test Item',
    'item_description' => 'Test Desc',
    'quantity' => 1,
    'property_no' => 'PROP-TEST-001',
    'cost' => 100,
    'status' => 'UNSERVICEABLE',
    'area' => 'Test Area',
    'remarks' => 'Test Remarks',
]);

echo "Created new unserviceable item for RRPPE {$record->id}\n";
$disposals = \App\Models\ForDisposalMonitoring::where('source_type', 'rrppe_item')->get()->toArray();
print_r($disposals);
