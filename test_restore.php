<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $req = Illuminate\Http\Request::create('/document-center/archive/restore', 'POST', ['ids' => [1,2,3,4]]);
    $c = app(App\Http\Controllers\DocumentCenterController::class);
    $res = $c->restoreArchive($req);
    echo 'Response: ' . $res->getContent();
} catch (\Exception $e) {
    echo 'Error: ' . $e->getMessage() . "\n" . $e->getTraceAsString();
}
