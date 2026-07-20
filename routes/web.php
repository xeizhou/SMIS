<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StockItemsController;
use App\Http\Controllers\UnitsController;
use App\Http\Controllers\RRPPEController;
use App\Http\Controllers\RRSPController;
use App\Http\Controllers\RegSPIController;
use App\Http\Controllers\ITRPTRController;
use App\Http\Controllers\PreRepairController;
use App\Http\Controllers\ForDisposalController;
use App\Http\Controllers\TransactionLogsController;
use App\Http\Controllers\BonaVidaController;
use App\Http\Controllers\PurchaseOrdersController;
use App\Http\Controllers\POLetterMonitoringController;
use App\Http\Controllers\DeliveriesController;
use App\Http\Controllers\IARController;
use App\Http\Controllers\ClearanceController;
use App\Http\Controllers\FundClustersController;
use App\Http\Controllers\EmployeeFileLocatorController;
use App\Http\Controllers\OfficesController;
use App\Http\Controllers\UsersController;
use App\Http\Controllers\AuditLogsController;
use App\Http\Controllers\SupplierController;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Property Monitoring
    Route::get('/rrppe-monitoring', [RRPPEController::class, 'index'])->name('rrppe-monitoring.index');
    Route::post('/rrppe-monitoring', [RRPPEController::class, 'store'])->name('rrppe-monitoring.store');
    Route::put('/rrppe-monitoring/{id}', [RRPPEController::class, 'update'])->name('rrppe-monitoring.update');
    Route::delete('/rrppe-monitoring/{id}', [RRPPEController::class, 'destroy'])->name('rrppe-monitoring.destroy');

    Route::get('/rrsp-monitoring', [RRSPController::class, 'index'])->name('rrsp-monitoring.index');

    Route::get('/regspi-monitoring', [RegSPIController::class, 'index'])->name('regspi-monitoring.index');

    Route::get('/itr-ptr-monitoring', [ITRPTRController::class, 'index'])->name('itr-ptr-monitoring.index');

    Route::get('/pre-repair-monitoring', [PreRepairController::class, 'index'])->name('pre-repair-monitoring.index');

    Route::get('/for-disposal-monitoring', [ForDisposalController::class, 'index'])->name('for-disposal-monitoring.index');

    Route::get('/transaction-logs', [TransactionLogsController::class, 'index'])->name('transaction-logs.index');

    Route::get('/bona-vida-monitoring', [BonaVidaController::class, 'index'])->name('bona-vida-monitoring.index');

    // Stock Items Monitoring
    Route::get('/stock-items', [StockItemsController::class, 'index'])->name('stock-items.index');
    Route::post('/stock-items', [StockItemsController::class, 'store'])->name('stock-items.store');
    Route::put('/stock-items/{stockItem}', [StockItemsController::class, 'update'])->name('stock-items.update');
    Route::delete('/stock-items/{stockItem}', [StockItemsController::class, 'destroy'])->name('stock-items.destroy');

    Route::get('/units', [UnitsController::class, 'index'])->name('units.index');
    
    // Purchase Order Monitoring
    Route::get('/purchase-orders', [PurchaseOrdersController::class, 'index'])->name('purchase-orders.index');
    Route::post('/purchase-orders', [PurchaseOrdersController::class, 'store'])->name('purchase-orders.store');

    Route::get('/po-letter-monitoring', [POLetterMonitoringController::class, 'index'])->name('po-letter-monitoring.index');

    Route::get('/deliveries', [DeliveriesController::class, 'index'])->name('deliveries.index');

    Route::get('/iar', [IARController::class, 'index'])->name('iar.index');

    Route::get('/supplier', [SupplierController::class, 'index'])->name('supplier.index');
    Route::post('/supplier', [SupplierController::class, 'store']);
    Route::put('/supplier/{supplier}', [SupplierController::class, 'update']);
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy']);

    Route::get('/clearance', [ClearanceController::class, 'index'])->name('clearance.index');

    Route::get('/fund-clusters', [FundClustersController::class, 'index'])->name('fund-clusters.index');
    Route::post('/fund-clusters', [FundClustersController::class, 'store'])->name('fund-clusters.store');
    Route::put('/fund-clusters/{fundCluster}', [FundClustersController::class, 'update'])->name('fund-clusters.update');
    Route::delete('/fund-clusters/{fundCluster}', [FundClustersController::class, 'destroy'])->name('fund-clusters.destroy');

    // Human Resource Monitoring
    Route::get('/employee-file-locator', [EmployeeFileLocatorController::class, 'index'])->name('employee-file-locator.index');

    Route::get('/offices', [OfficesController::class, 'index'])->name('offices.index');
    Route::post('/offices', [OfficesController::class, 'store'])->name('offices.store');
    Route::put('/offices/{office}', [OfficesController::class, 'update']);
    Route::delete('/offices/{office}', [OfficesController::class, 'destroy']);

    // System/Admin Monitoring
    Route::get('/users', [UsersController::class, 'index'])->name('users.index');
    Route::get('/audit-logs', [AuditLogsController::class, 'index'])->name('audit-logs.index');

    // Calendar
    Route::get('/calendar', function () {
    return Inertia::render('calendar/index');
    })->name('calendar.index');

});

require __DIR__.'/settings.php';