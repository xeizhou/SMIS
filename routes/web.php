<?php

use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\AuditLogsController;
use App\Http\Controllers\BonaVidaController;
use App\Http\Controllers\ClearanceController;
use App\Http\Controllers\DeliveriesController;
use App\Http\Controllers\EmployeeFileLocatorController;
use App\Http\Controllers\ForDisposalController;
use App\Http\Controllers\FundClustersController;
use App\Http\Controllers\IARController;
use App\Http\Controllers\ITRPTRController;
use App\Http\Controllers\OfficesController;
use App\Http\Controllers\POLetterMonitoringController;
use App\Http\Controllers\PreRepairController;
use App\Http\Controllers\PurchaseOrdersController;
use App\Http\Controllers\RegSPIController;
use App\Http\Controllers\RRPPEController;
use App\Http\Controllers\RRSPController;
use App\Http\Controllers\StockItemsController;
use App\Http\Controllers\StockItemsListController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TransactionLogsController;
use App\Http\Controllers\UnitsController;
use App\Http\Controllers\UsersController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $recentActivity = \App\Models\AuditLog::with('user')
            ->orderBy('log_timestamp', 'desc')
            ->take(50)
            ->get()
            ->map(function ($log) {
                return [
                    'log_id' => $log->auditLogID,
                    'timestamp' => $log->log_timestamp->format('Y-m-d H:i:s'),
                    'user' => $log->user ? $log->user->name : 'Unknown',
                    'role' => $log->role,
                    'action' => $log->action,
                    'target_url' => $log->target_url ? str_replace('search=', 'highlight_search=', $log->target_url) : null,
                ];
            });

        $recentDeliveries = \App\Models\Delivery::where('status', 'PENDING')
            ->orderBy('data_entry_timestamp', 'desc')
            ->take(10)
            ->get()
            ->map(function ($delivery) {
                $due = $delivery->due_date;
                $deliveryDate = $delivery->delivery_date;
                $today = now()->startOfDay();

                $isOverdue = false;
                $daysOverdue = 0;

                if ($due) {
                    if ($deliveryDate && $deliveryDate->gt($due)) {
                        $isOverdue = true;
                        $daysOverdue = (int) $due->diffInDays($deliveryDate);
                    } else if (!$deliveryDate && $today->gt($due)) {
                        $isOverdue = true;
                        $daysOverdue = (int) $due->diffInDays($today);
                    }
                }

                return [
                    'delivery_id' => $delivery->delivery_id,
                    'po_number' => $delivery->po_number,
                    'time_ago' => ($delivery->data_entry_timestamp ?? now())->diffForHumans(),
                    'is_overdue' => $isOverdue,
                    'days_overdue' => $daysOverdue,
                    'due_date' => $due ? $due->format('M d, Y') : null,
                ];
            });

        $dueDeliveries = \App\Models\Delivery::with('supplier')
            ->where('status', 'PENDING')
            ->get()
            ->filter(function ($delivery) {
                return $delivery->due_date !== null;
            })
            ->sortBy(function ($delivery) {
                return $delivery->due_date;
            })
            ->take(5)
            ->map(function ($delivery) {
                return [
                    'delivery_id' => $delivery->delivery_id,
                    'po_number' => $delivery->po_number,
                    'due_date' => $delivery->due_date->format('Y-m-d'),
                    'status' => $delivery->status,
                    'end_user' => $delivery->end_user,
                    'supplier' => $delivery->supplier ? [
                        'supplier_name' => $delivery->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values();

        $pendingDeliveriesCount = \App\Models\Delivery::where('status', 'PENDING')->count();
        $deliveriesLastWeek = \App\Models\Delivery::where('status', 'PENDING')
            ->where('data_entry_timestamp', '>=', now()->subWeek())
            ->count();

        $allPendingDeliveries = \App\Models\Delivery::with(['supplier', 'servePo'])
            ->where('status', 'PENDING')
            ->orderBy('data_entry_timestamp', 'desc')
            ->get()
            ->map(function ($delivery) {
                return [
                    'delivery_id' => $delivery->delivery_id,
                    'po_number' => $delivery->po_number,
                    'due_date' => $delivery->due_date ? $delivery->due_date->format('Y-m-d') : null,
                    'status' => $delivery->status,
                    'end_user' => $delivery->end_user,
                    'supplier' => $delivery->supplier ? [
                        'supplier_name' => $delivery->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values();

        $rawPoLettersStatus = \App\Models\PoLetterMonitoring::selectRaw("
            type_of_letter,
            SUM(CASE WHEN status_of_the_letter = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status_of_the_letter = 'DISAPPROVED' THEN 1 ELSE 0 END) as disapproved_count
        ")
        ->whereIn('type_of_letter', ['EXTENSION', 'WAIVER', 'CANCELLATION', 'REPLACEMENT/ALTERNATIVE OFFER'])
        ->groupBy('type_of_letter')
        ->get()
        ->keyBy('type_of_letter');

        $poLettersStatus = collect([
            'EXTENSION' => 'Extension',
            'WAIVER' => 'Waiver',
            'CANCELLATION' => 'Cancellation',
            'REPLACEMENT/ALTERNATIVE OFFER' => 'Replacement',
        ])->map(function ($label, $key) use ($rawPoLettersStatus) {
            $item = $rawPoLettersStatus->get($key);
            return [
                'type' => $label,
                'approved' => $item ? (int) $item->approved_count : 0,
                'disapproved' => $item ? (int) $item->disapproved_count : 0,
            ];
        })->values();

        $pendingInspectionsCount = \App\Models\PirMonitoring::whereNull('inspection_date')
            ->where(function($query) {
                $query->whereNull('status')
                      ->orWhere('status', '!=', 'CANCELLED');
            })
            ->count();

        $allPendingInspections = \App\Models\PirMonitoring::with('supplier')
            ->whereNull('inspection_date')
            ->where(function($query) {
                $query->whereNull('status')
                      ->orWhere('status', '!=', 'CANCELLED');
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($inspection) {
                return [
                    'pir_id' => $inspection->pir_id,
                    'po_number' => $inspection->po_number,
                    'iar_number' => $inspection->iar_number,
                    'invoice_number' => $inspection->invoice_number,
                    'supplier' => $inspection->supplier ? [
                        'supplier_name' => $inspection->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values();

        return Inertia::render('dashboard', [
            'recentActivity' => $recentActivity,
            'recentDeliveries' => $recentDeliveries,
            'deliveries' => $dueDeliveries,
            'pendingDeliveries' => $pendingDeliveriesCount,
            'deliveriesLastWeek' => $deliveriesLastWeek,
            'allPendingDeliveries' => $allPendingDeliveries,
            'poLettersStatus' => $poLettersStatus,
            'pendingInspections' => $pendingInspectionsCount,
            'allPendingInspections' => $allPendingInspections,
        ]);
    })->name('dashboard');

    // Property Monitoring
    Route::get('/rrppe-monitoring', [RRPPEController::class, 'index'])->name('rrppe-monitoring.index');
    Route::post('/rrppe-monitoring', [RRPPEController::class, 'store'])->name('rrppe-monitoring.store');
    Route::put('/rrppe-monitoring/{id}', [RRPPEController::class, 'update'])->name('rrppe-monitoring.update');
    Route::delete('/rrppe-monitoring/{id}', [RRPPEController::class, 'destroy'])->name('rrppe-monitoring.destroy');

    Route::get('/rrsp-monitoring', [RRSPController::class, 'index'])->name('rrsp-monitoring.index');
    Route::post('/rrsp-monitoring', [RRSPController::class, 'store'])->name('rrsp-monitoring.store');
    Route::put('/rrsp-monitoring/{rrsp}', [RRSPController::class, 'update'])->name('rrsp-monitoring.update');
    Route::delete('/rrsp-monitoring/{rrsp}', [RRSPController::class, 'destroy'])->name('rrsp-monitoring.destroy');

    Route::get('/regspi-monitoring', [RegSPIController::class, 'index'])->name('regspi-monitoring.index');
    Route::post('/regspi-monitoring', [RegSPIController::class, 'store'])->name('regspi-monitoring.store');
    Route::put('/regspi-monitoring/{regspi}', [RegSPIController::class, 'update'])->name('regspi-monitoring.update');
    Route::delete('/regspi-monitoring/{regspi}', [RegSPIController::class, 'destroy'])->name('regspi-monitoring.destroy');

    Route::get('/itr-ptr-monitoring', [ITRPTRController::class, 'index'])->name('itr-ptr-monitoring.index');
    Route::post('/itr-ptr-monitoring', [ITRPTRController::class, 'store'])->name('itr-ptr-monitoring.store');
    Route::put('/itr-ptr-monitoring/{id}', [ITRPTRController::class, 'update'])->name('itr-ptr-monitoring.update');
    Route::delete('/itr-ptr-monitoring/{id}', [ITRPTRController::class, 'destroy'])->name('itr-ptr-monitoring.destroy');

    Route::get('/pre-repair-monitoring', [PreRepairController::class, 'index'])->name('pre-repair-monitoring.index');
    Route::post('/pre-repair-monitoring', [PreRepairController::class, 'store'])->name('pre-repair-monitoring.store');
    Route::put('/pre-repair-monitoring/{id}', [PreRepairController::class, 'update'])->name('pre-repair-monitoring.update');
    Route::delete('/pre-repair-monitoring/{id}', [PreRepairController::class, 'destroy'])->name('pre-repair-monitoring.destroy');

    Route::get('/for-disposal-monitoring', [ForDisposalController::class, 'index'])->name('for-disposal-monitoring.index');
    Route::post('/for-disposal-monitoring', [ForDisposalController::class, 'store'])->name('for-disposal-monitoring.store');
    Route::put('/for-disposal-monitoring/{id}', [ForDisposalController::class, 'update'])->name('for-disposal-monitoring.update');
    Route::delete('/for-disposal-monitoring/{id}', [ForDisposalController::class, 'destroy'])->name('for-disposal-monitoring.destroy');

    Route::get('/transaction-logs', [TransactionLogsController::class, 'index'])->name('transaction-logs.index');
    Route::post('/transaction-logs', [TransactionLogsController::class, 'store'])->name('transaction-logs.store');
    Route::put('/transaction-logs/{transaction}', [TransactionLogsController::class, 'update'])->name('transaction-logs.update');
    Route::delete('/transaction-logs/{transaction}', [TransactionLogsController::class, 'destroy'])->name('transaction-logs.destroy');

    Route::get('/bona-vida-monitoring', [BonaVidaController::class, 'index'])->name('bona-vida-monitoring.index');
    Route::get('/bona-vida-monitoring/summary', [BonaVidaController::class, 'summary'])->name('bona-vida-monitoring.summary');
    Route::post('/bona-vida-monitoring', [BonaVidaController::class, 'store'])->name('bona-vida-monitoring.store');
    Route::put('/bona-vida-monitoring/{bonavida}', [BonaVidaController::class, 'update'])->name('bona-vida-monitoring.update');
    Route::delete('/bona-vida-monitoring/{bonavida}', [BonaVidaController::class, 'destroy'])->name('bona-vida-monitoring.destroy');

    // Stock Items Monitoring
    Route::get('/stock-items', [StockItemsController::class, 'index'])->name('stock-items.index');
    Route::post('/stock-items', [StockItemsController::class, 'store'])->name('stock-items.store');
    Route::put('/stock-items/{stockItem}', [StockItemsController::class, 'update'])->name('stock-items.update');
    Route::delete('/stock-items/{stockItem}', [StockItemsController::class, 'destroy'])->name('stock-items.destroy');

    Route::get('/units', [UnitsController::class, 'index'])->name('units.index');
    Route::post('/units', [UnitsController::class, 'store'])->name('units.store');
    Route::put('/units/{unit}', [UnitsController::class, 'update'])->name('units.update');
    Route::delete('/units/{unit}', [UnitsController::class, 'destroy'])->name('units.destroy');

    Route::get('/stock-items-list', [StockItemsListController::class, 'index'])->name('stock-items-list.index');

    Route::get('/stock-items/print-cards', [StockItemsListController::class, 'printCards'])->name('stock-items.print-cards');

    // Purchase Order Monitoring
    Route::get('/purchase-orders', [PurchaseOrdersController::class, 'index'])->name('purchase-orders.index');
    Route::post('/purchase-orders', [PurchaseOrdersController::class, 'store'])->name('purchase-orders.store');
    Route::put('/purchase-orders/{servePo}', [PurchaseOrdersController::class, 'update'])->name('purchase-orders.update');
    Route::delete('/purchase-orders/{purchaseOrder}', [PurchaseOrdersController::class, 'destroy'])->name('purchase-orders.destroy');
    Route::post('/purchase-orders/{purchaseOrder}/attachments', [PurchaseOrdersController::class, 'uploadAttachments'])
        ->name('purchase-orders.attachments.upload');

    Route::get('/po-letter-monitoring', [POLetterMonitoringController::class, 'index'])->name('po-letter-monitoring.index');
    Route::post('/po-letter-monitoring', [POLetterMonitoringController::class, 'store'])->name('po-letter-monitoring.store');
    Route::put('/po-letter-monitoring/{poLetterMonitoring}', [POLetterMonitoringController::class, 'update'])->name('po-letter-monitoring.update');
    Route::delete('/po-letter-monitoring/{poLetterMonitoring}', [POLetterMonitoringController::class, 'destroy'])->name('po-letter-monitoring.destroy');
    Route::post('/po-letter-monitoring/{poLetterMonitoring}/attachments', [POLetterMonitoringController::class, 'uploadAttachments'])
        ->name('po-letter-monitoring.attachments.upload');

    Route::get('/deliveries', [DeliveriesController::class, 'index'])->name('deliveries.index');
    Route::post('/deliveries', [DeliveriesController::class, 'store'])->name('deliveries.store');
    Route::put('/deliveries/{delivery}', [DeliveriesController::class, 'update'])->name('deliveries.update');
    Route::delete('/deliveries/{delivery}', [DeliveriesController::class, 'destroy'])->name('deliveries.destroy');
    Route::post('/deliveries/{delivery}/attachments', [DeliveriesController::class, 'uploadAttachments'])
        ->name('deliveries.attachments.upload');

    Route::get('/iar', [IARController::class, 'index'])->name('iar.index');
    Route::post('/iar', [IARController::class, 'store'])->name('iar.store');
    Route::put('/iar/{pirMonitoring}', [IARController::class, 'update'])->name('iar.update');
    Route::delete('/iar/{pirMonitoring}', [IARController::class, 'destroy'])->name('iar.destroy');
    Route::post('/iar/{pirMonitoring}/attachments', [IARController::class, 'storeAttachments'])
        ->where('po_number', '[^/]+')
        ->name('iar.attachments.upload');

    // Shared polymorphic attachment delete route — used by Purchase Orders,
    // Deliveries, and PIR. Previously this was declared separately (and
    // duplicated) under both PO and Deliveries pointing at different
    // controllers; Laravel silently let the second definition win. Now
    // there's exactly one route, one controller, reused everywhere.
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy'])
        ->name('attachments.delete');

    Route::get('/supplier', [SupplierController::class, 'index'])->name('supplier.index');
    Route::post('/supplier', [SupplierController::class, 'store']);
    Route::put('/supplier/{supplier}', [SupplierController::class, 'update']);
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy']);

    Route::get('/clearance', [ClearanceController::class, 'index'])->name('clearance.index');
    Route::post('/clearance', [ClearanceController::class, 'store'])->name('clearance.store');
    Route::put('/clearance/{clearance}', [ClearanceController::class, 'update'])->name('clearance.update');
    Route::delete('/clearance/{clearance}', [ClearanceController::class, 'destroy'])->name('clearance.destroy');

    Route::get('/fund-clusters', [FundClustersController::class, 'index'])->name('fund-clusters.index');
    Route::post('/fund-clusters', [FundClustersController::class, 'store'])->name('fund-clusters.store');
    Route::put('/fund-clusters/{fundCluster}', [FundClustersController::class, 'update'])->name('fund-clusters.update');
    Route::delete('/fund-clusters/{fundCluster}', [FundClustersController::class, 'destroy'])->name('fund-clusters.destroy');

    // Human Resource Monitoring
    Route::get('/employee-file-locator', [EmployeeFileLocatorController::class, 'index'])->name('employee-file-locator.index');
    Route::post('/employee-file-locator', [EmployeeFileLocatorController::class, 'store'])->name('employee-file-locator.store');
    Route::put('/employee-file-locator/{employeefilelocator}', [EmployeeFileLocatorController::class, 'update'])->name('employee-file-locator.update');
    Route::delete('/employee-file-locator/{employeefilelocator}', [EmployeeFileLocatorController::class, 'destroy'])->name('employee-file-locator.destroy');

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