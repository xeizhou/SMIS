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
use App\Http\Controllers\StockItemDashboardController;
use App\Http\Controllers\StockReportsController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\DocumentCenterController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified', 'single-session', \App\Http\Middleware\PreventBackHistory::class])->group(function () {
    Route::get('dashboard', function (\Illuminate\Http\Request $request) {
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
                $diffDays = null;

                if ($due) {
                    $dueStart = $due->copy()->startOfDay();
                    $diffDays = (int) $today->diffInDays($dueStart, false);
                    if ($deliveryDate && $deliveryDate->gt($due)) {
                        $isOverdue = true;
                        $daysOverdue = (int) $due->diffInDays($deliveryDate);
                    } else if (!$deliveryDate && $today->gt($dueStart)) {
                        $isOverdue = true;
                        $daysOverdue = (int) $dueStart->diffInDays($today);
                    }
                }

                return [
                    'delivery_id' => $delivery->delivery_id,
                    'po_number' => $delivery->po_number,
                    'time_ago' => ($delivery->data_entry_timestamp ?? now())->diffForHumans(),
                    'is_overdue' => $isOverdue,
                    'daysOverdue' => $daysOverdue,
                    'diff_days' => $diffDays,
                    'due_date' => $due ? $due->format('Y-m-d') : null,
                    'due_date_formatted' => $due ? $due->format('M d, Y') : null,
                    'status' => $delivery->status,
                ];
            });

        $dueDeliveries = \App\Models\Delivery::with('supplier')
            ->withExists('deliveryFollowUps')
            ->where(function($query) {
                $query->whereNull('status')
                      ->orWhere('status', '!=', 'CANCELLED');
            })
            ->get()
            ->filter(function ($delivery) {
                return $delivery->due_date !== null;
            })
            ->sortByDesc(function ($delivery) {
                return $delivery->due_date;
            })
            ->map(function ($delivery) {
                $due = $delivery->due_date;
                $deliveryDate = $delivery->delivery_date;
                $today = now()->startOfDay();

                $isOverdue = false;
                $daysOverdue = 0;
                $diffDays = 0;

                if ($due) {
                    $dueStart = $due->copy()->startOfDay();
                    $diffDays = (int) $today->diffInDays($dueStart, false);
                    if ($deliveryDate && $deliveryDate->gt($due)) {
                        $isOverdue = true;
                        $daysOverdue = (int) $due->diffInDays($deliveryDate);
                    } else if (!$deliveryDate && $today->gt($dueStart)) {
                        $isOverdue = true;
                        $daysOverdue = (int) $dueStart->diffInDays($today);
                    }
                }

                return [
                    'delivery_id' => $delivery->delivery_id,
                    'po_number' => $delivery->po_number,
                    'due_date' => $due ? $due->format('Y-m-d') : null,
                    'due_date_formatted' => $due ? $due->format('M d, Y') : null,
                    'time_ago' => ($delivery->data_entry_timestamp ?? $delivery->created_at ?? now())->diffForHumans(),
                    'is_overdue' => $isOverdue,
                    'days_overdue' => $daysOverdue,
                    'diff_days' => $diffDays,
                    'status' => $delivery->status,
                    'end_user' => $delivery->end_user,
                    'has_follow_up' => $delivery->delivery_follow_ups_exists ?? false,
                    'supplier' => $delivery->supplier ? [
                        'supplier_name' => $delivery->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values();

        $pendingDeliveriesCount = \App\Models\Delivery::where('status', 'PENDING')->count();
        $deliveriesLastWeek = \App\Models\Delivery::where('status', 'PENDING')
            ->where('data_entry_timestamp', '>=', now()->startOfWeek())
            ->count();

        $allPendingDeliveries = \App\Models\Delivery::with(['supplier', 'servePo'])
            ->withExists('deliveryFollowUps')
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
                    'has_follow_up' => $delivery->delivery_follow_ups_exists ?? false,
                    'supplier' => $delivery->supplier ? [
                        'supplier_name' => $delivery->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values();

        $getPoLettersStatusByPeriod = function ($period) {
            $query = \App\Models\PoLetterMonitoring::selectRaw("
                type_of_letter,
                SUM(CASE WHEN status_of_the_letter = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN status_of_the_letter = 'DISAPPROVED' THEN 1 ELSE 0 END) as disapproved_count
            ")
            ->whereIn('type_of_letter', ['EXTENSION', 'WAIVER', 'CANCELLATION', 'REPLACEMENT/ALTERNATIVE OFFER'])
            ->groupBy('type_of_letter');

            if ($period === 'This Week') {
                $query->where('created_at', '>=', now()->startOfWeek());
            } elseif ($period === 'This Month') {
                $query->where('created_at', '>=', now()->startOfMonth());
            } elseif ($period === 'This Year') {
                $query->where('created_at', '>=', now()->startOfYear());
            }

            $raw = $query->get()->keyBy('type_of_letter');

            return collect([
                'EXTENSION' => 'Extension',
                'WAIVER' => 'Waiver',
                'CANCELLATION' => 'Cancellation',
                'REPLACEMENT/ALTERNATIVE OFFER' => 'Replacement',
            ])->map(function ($label, $key) use ($raw) {
                $item = $raw->get($key);
                return [
                    'type' => $label,
                    'approved' => $item ? (int) $item->approved_count : 0,
                    'disapproved' => $item ? (int) $item->disapproved_count : 0,
                ];
            })->values();
        };

        $poLettersStatus = [
            'This Week' => $getPoLettersStatusByPeriod('This Week'),
            'This Month' => $getPoLettersStatusByPeriod('This Month'),
            'This Year' => $getPoLettersStatusByPeriod('This Year'),
        ];

        $pendingInspectionsCount = \App\Models\PirMonitoring::whereNull('inspection_date')
            ->whereDoesntHave('inspectionEntries', function($query) {
                $query->whereNotNull('inspection_date');
            })
            ->where(function($query) {
                $query->whereNull('status')
                      ->orWhere('status', '!=', 'CANCELLED');
            })
            ->count();

        $inspectionsLastWeek = \App\Models\PirMonitoring::whereNull('inspection_date')
            ->whereDoesntHave('inspectionEntries', function($query) {
                $query->whereNotNull('inspection_date');
            })
            ->where(function($query) {
                $query->whereNull('status')
                      ->orWhere('status', '!=', 'CANCELLED');
            })
            ->where('created_at', '>=', now()->startOfWeek())
            ->count();

        $allPendingInspections = \App\Models\PirMonitoring::with('supplier')
            ->whereNull('inspection_date')
            ->whereDoesntHave('inspectionEntries', function($query) {
                $query->whereNotNull('inspection_date');
            })
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

        $pendingClearancesCount = \App\Models\PirMonitoring::where(function($query) {
                $query->whereNull('receipt_claimed_by')
                      ->whereNull('items_claimed_by');
            })
            ->where(function($query) {
                $query->whereNull('status')
                      ->orWhere('status', '!=', 'CANCELLED');
            })
            ->count();

        $clearancesLastWeek = \App\Models\PirMonitoring::where(function($query) {
                $query->whereNull('receipt_claimed_by')
                      ->whereNull('items_claimed_by');
            })
            ->where(function($query) {
                $query->whereNull('status')
                      ->orWhere('status', '!=', 'CANCELLED');
            })
            ->where('created_at', '>=', now()->startOfWeek())
            ->count();

        $allPendingClearances = \App\Models\PirMonitoring::with('supplier')
            ->where(function($query) {
                $query->whereNull('receipt_claimed_by')
                      ->whereNull('items_claimed_by');
            })
            ->where(function($query) {
                $query->whereNull('status')
                      ->orWhere('status', '!=', 'CANCELLED');
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($issuance) {
                return [
                    'pir_id' => $issuance->pir_id,
                    'po_number' => $issuance->po_number,
                    'iar_number' => $issuance->iar_number,
                    'invoice_number' => $issuance->invoice_number,
                    'supplier' => $issuance->supplier ? [
                        'supplier_name' => $issuance->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values();

        $reportsYear = $request->input('reports_year', now()->year);
        $reportsQuarter = $request->input('reports_quarter', now()->quarter);
        $startMonth = ($reportsQuarter - 1) * 3 + 1;
        $endMonth = $startMonth + 2;

        $reportsQuery = \App\Models\PirMonitoring::whereYear('created_at', $reportsYear)
            ->whereMonth('created_at', '>=', $startMonth)
            ->whereMonth('created_at', '<=', $endMonth);

        $reportsStats = [
            'COMPLETED' => (clone $reportsQuery)->where('status', 'COMPLETED')->count(),
            'CANCELLED' => (clone $reportsQuery)->where('status', 'CANCELLED')->count(),
            'ONGOING' => (clone $reportsQuery)->where(function($q) {
                $q->where('status', 'ONGOING')
                  ->orWhereNull('status')
                  ->orWhere('status', '');
            })->count(),
        ];

        $allPos = \App\Models\ServePo::with('deliveries:delivery_id,po_number,status')->get();
        $poStats = ['COMPLETE' => 0, 'PARTIAL' => 0, 'PENDING' => 0, 'CANCELLED' => 0];
        
        foreach ($allPos as $po) {
            $deliveries = $po->deliveries;
            if ($deliveries->isEmpty()) {
                $poStats['PENDING']++;
                continue;
            }
            
            $totalCount = $deliveries->count();
            $completedCount = 0;
            $cancelledCount = 0;
            $pendingCount = 0;
            
            foreach ($deliveries as $d) {
                $status = strtoupper($d->status ?? '');
                if ($status === 'COMPLETE' || $status === 'COMPLETED') {
                    $completedCount++;
                } elseif ($status === 'CANCELLED') {
                    $cancelledCount++;
                } else {
                    $pendingCount++;
                }
            }
            
            if ($completedCount === $totalCount) {
                $poStats['COMPLETE']++;
            } elseif ($cancelledCount === $totalCount) {
                $poStats['CANCELLED']++;
            } elseif ($pendingCount === $totalCount) {
                $poStats['PENDING']++;
            } else {
                $poStats['PARTIAL']++;
            }
        }

        return Inertia::render('dashboard', [
            'recentActivity' => $recentActivity,
            'recentDeliveries' => $recentDeliveries,
            'deliveries' => $dueDeliveries,
            'pendingDeliveries' => $pendingDeliveriesCount,
            'deliveriesLastWeek' => $deliveriesLastWeek,
            'allPendingDeliveries' => $allPendingDeliveries,
            'poLettersStatus' => $poLettersStatus,
            'pendingInspections' => $pendingInspectionsCount,
            'inspectionsLastWeek' => $inspectionsLastWeek,
            'allPendingInspections' => $allPendingInspections,
            'pendingClearances' => $pendingClearancesCount,
            'clearancesLastWeek' => $clearancesLastWeek,
            'allPendingClearances' => $allPendingClearances,
            'reportsStats' => $reportsStats,
            'reportsYear' => (int) $reportsYear,
            'reportsQuarter' => (int) $reportsQuarter,
            'poStats' => $poStats,
            'userNotifications' => $request->user()->notifications()->latest()->take(20)->get(),    
        ]);
    })->name('dashboard');

    Route::get('/api/online-users', function () {
            return \App\Models\User::query()
                ->select('id', 'name', 'email', 'role', 'avatar_path', 'current_session_id')
                ->get()
                ->map(function ($u) {
                    $lastActivity = $u->current_session_id
                        ? DB::table('sessions')->where('id', $u->current_session_id)->value('last_activity')
                        : null;

                    $online = $lastActivity !== null && $lastActivity >= now()->subMinutes(2)->timestamp;

                    return [
                        'id' => $u->id,
                        'name' => $u->name,
                        'email' => $u->email,
                        'role' => $u->role,
                        'avatar' => $u->avatar_url,
                        'online' => $online,
                        'last_seen' => $lastActivity ? \Carbon\Carbon::createFromTimestamp($lastActivity)->diffForHumans() : null,
                    ];
                });
    })->name('online-users');

    Route::get('/avatar/{user}', function (\App\Models\User $user) {
        abort_unless($user->avatar_path, 404);
        abort_unless(\Illuminate\Support\Facades\Storage::disk('public')->exists($user->avatar_path), 404);

        return \Illuminate\Support\Facades\Storage::disk('public')->response($user->avatar_path);
    })->name('avatar.show');

    Route::post('/notifications/clear', function (\Illuminate\Http\Request $request) {
        $request->user()->notifications()->delete();
        return back();
    })->name('notifications.clear');

    Route::post('/notifications/{id}/read', function (\Illuminate\Http\Request $request, $id) {
        $notification = $request->user()->notifications()->find($id);
        if ($notification) {
            $notification->markAsRead();
        }
        return response()->json(['success' => true]);
    })->name('notifications.read');

    // ==========================================================
    // Assets (sidebar: "Assets")
    // ==========================================================
    Route::get('/rrppe-monitoring', [RRPPEController::class, 'index'])->name('rrppe-monitoring.index');
    Route::post('/rrppe-monitoring', [RRPPEController::class, 'store'])->name('rrppe-monitoring.store');
    Route::put('/rrppe-monitoring/{id}', [RRPPEController::class, 'update'])->name('rrppe-monitoring.update');
    Route::delete('/rrppe-monitoring/{id}', [RRPPEController::class, 'destroy'])->name('rrppe-monitoring.destroy');

    Route::get('/rrppe-monitoring/areas', [App\Http\Controllers\RrppeAreaController::class, 'index'])->name('rrppe-monitoring.areas.index');
    Route::post('/rrppe-monitoring/areas', [App\Http\Controllers\RrppeAreaController::class, 'store'])->name('rrppe-monitoring.areas.store');
    Route::put('/rrppe-monitoring/areas/{area}', [App\Http\Controllers\RrppeAreaController::class, 'update'])->name('rrppe-monitoring.areas.update');
    Route::delete('/rrppe-monitoring/areas/{area}', [App\Http\Controllers\RrppeAreaController::class, 'destroy'])->name('rrppe-monitoring.areas.destroy');

    Route::get('/rrsp-monitoring', [RRSPController::class, 'index'])->name('rrsp-monitoring.index');
    Route::get('/rrsp-monitoring/areas', [App\Http\Controllers\AreaController::class, 'index'])->name('rrsp-monitoring.areas.index');
    Route::post('/rrsp-monitoring/areas', [App\Http\Controllers\AreaController::class, 'store'])->name('rrsp-monitoring.areas.store');
    Route::put('/rrsp-monitoring/areas/{area}', [App\Http\Controllers\AreaController::class, 'update'])->name('rrsp-monitoring.areas.update');
    Route::delete('/rrsp-monitoring/areas/{area}', [App\Http\Controllers\AreaController::class, 'destroy'])->name('rrsp-monitoring.areas.destroy');
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

    Route::get('/bona-vida-monitoring', [BonaVidaController::class, 'index'])->name('bona-vida-monitoring.index');
    Route::get('/bona-vida-monitoring/summary', [BonaVidaController::class, 'summary'])->name('bona-vida-monitoring.summary');
    Route::get('/bona-vida-monitoring/by-invoice/{invoice_no}', [BonaVidaController::class, 'getByInvoice'])->name('bona-vida-monitoring.getByInvoice');
    Route::post('/bona-vida-monitoring/bulk', [BonaVidaController::class, 'bulkStore'])->name('bona-vida-monitoring.bulkStore');
    Route::put('/bona-vida-monitoring/bulk/{invoice_no}', [BonaVidaController::class, 'bulkUpdate'])->name('bona-vida-monitoring.bulkUpdate');
    Route::post('/bona-vida-monitoring', [BonaVidaController::class, 'store'])->name('bona-vida-monitoring.store');
    Route::put('/bona-vida-monitoring/{bonavida}', [BonaVidaController::class, 'update'])->name('bona-vida-monitoring.update');
    Route::delete('/bona-vida-monitoring/{bonavida}', [BonaVidaController::class, 'destroy'])->name('bona-vida-monitoring.destroy');

    // ==========================================================
    // Procurement (sidebar: "Procurement")
    // ==========================================================
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
    Route::get('/notice-of-delivery', [\App\Http\Controllers\NoticeOfDeliveryReportController::class, 'index'])->name('notice-of-delivery.index');
    Route::post('/deliveries', [DeliveriesController::class, 'store'])->name('deliveries.store');
    Route::put('/deliveries/{delivery}', [DeliveriesController::class, 'update'])->name('deliveries.update');
    Route::delete('/deliveries/{delivery}', [DeliveriesController::class, 'destroy'])->name('deliveries.destroy');
    Route::post('/deliveries/{delivery}/attachments', [DeliveriesController::class, 'uploadAttachments'])
        ->name('deliveries.attachments.upload');

    Route::get('/delivery-follow-ups', [\App\Http\Controllers\DeliveryFollowUpController::class, 'index'])->name('delivery-follow-ups.index');
    Route::post('/delivery-follow-ups', [\App\Http\Controllers\DeliveryFollowUpController::class, 'store'])->name('delivery-follow-ups.store');
    Route::delete('/delivery-follow-ups/{id}', [\App\Http\Controllers\DeliveryFollowUpController::class, 'destroy'])->name('delivery-follow-ups.destroy');
    Route::get('/deliveries/{id}/recent-follow-ups', [\App\Http\Controllers\DeliveryFollowUpController::class, 'recentFollowUps'])->name('deliveries.recent-follow-ups');
    Route::post('/deliveries/{id}/send-follow-up', [\App\Http\Controllers\DeliveryFollowUpController::class, 'sendFollowUpEmail'])->name('deliveries.send-follow-up');

    Route::get('/iar', [IARController::class, 'index'])->name('iar.index');
    Route::post('/iar', [IARController::class, 'store'])->name('iar.store');
    Route::put('/iar/{pirMonitoring}', [IARController::class, 'update'])->name('iar.update');
    Route::delete('/iar/{pirMonitoring}', [IARController::class, 'destroy'])->name('iar.destroy');
    Route::post('/iar/{pirMonitoring}/attachments', [IARController::class, 'storeAttachments'])
        ->where('po_number', '[^/]+')
        ->name('iar.attachments.upload');

    Route::get('/supplier', [SupplierController::class, 'index'])->name('supplier.index');
    Route::post('/supplier', [SupplierController::class, 'store'])->name('supplier.store');
    Route::post('/supplier/quick-add', [SupplierController::class, 'quickAdd'])->name('supplier.quick-add');
    Route::put('/supplier/{supplier}', [SupplierController::class, 'update']);
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy']);

    Route::get('/fund-clusters', [FundClustersController::class, 'index'])->name('fund-clusters.index');
    Route::post('/fund-clusters', [FundClustersController::class, 'store'])->name('fund-clusters.store');
    Route::put('/fund-clusters/{fundCluster}', [FundClustersController::class, 'update'])->name('fund-clusters.update');
    Route::delete('/fund-clusters/{fundCluster}', [FundClustersController::class, 'destroy'])->name('fund-clusters.destroy');

    // Shared polymorphic attachment delete route — used by Purchase Orders,
    // Deliveries, and PIR. Previously this was declared separately (and
    // duplicated) under both PO and Deliveries pointing at different
    // controllers; Laravel silently let the second definition win. Now
    // there's exactly one route, one controller, reused everywhere.
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy'])
        ->name('attachments.delete');

    // Email Functionality
    Route::post('/offices/{office}/send-test-email', [OfficesController::class, 'sendTestEmail'])
    ->name('offices.send-test-email');

    // ==========================================================
    // Personnel Files (sidebar: "Personnel Files")
    // ==========================================================
    Route::get('/employee-file-locator', [EmployeeFileLocatorController::class, 'index'])->name('employee-file-locator.index');
    Route::post('/employee-file-locator', [EmployeeFileLocatorController::class, 'store'])->name('employee-file-locator.store');
    Route::put('/employee-file-locator/{employeefilelocator}', [EmployeeFileLocatorController::class, 'update'])->name('employee-file-locator.update');
    Route::delete('/employee-file-locator/{employeefilelocator}', [EmployeeFileLocatorController::class, 'destroy'])->name('employee-file-locator.destroy');

    Route::get('/offices', [OfficesController::class, 'index'])->name('offices.index');
    Route::post('/offices', [OfficesController::class, 'store'])->name('offices.store');
    Route::put('/offices/{office}', [OfficesController::class, 'update'])->name('offices.update');
    Route::delete('/offices/{office}', [OfficesController::class, 'destroy']);

    Route::get('/clearance', [ClearanceController::class, 'index'])->name('clearance.index');
    Route::post('/clearance', [ClearanceController::class, 'store'])->name('clearance.store');
    Route::put('/clearance/{clearance}', [ClearanceController::class, 'update'])->name('clearance.update');
    Route::patch('/clearance/{clearance}/process', [ClearanceController::class, 'process'])->name('clearance.process');
    Route::delete('/clearance/{clearance}', [ClearanceController::class, 'destroy'])->name('clearance.destroy');
    Route::post('/clearance/{clearance}/attachments', [ClearanceController::class, 'uploadAttachments'])
        ->name('clearance.attachments.upload');

    // ==========================================================
    // Stock Cards (sidebar: "Stock Cards")
    // ==========================================================

    Route::get('/stock-items-dashboard', [StockItemDashboardController::class, 'index'])
    ->name('stock-items-dashboard.index');

    Route::get('/stock-items', [StockItemsController::class, 'index'])->name('stock-items.index');
    Route::post('/stock-items', [StockItemsController::class, 'store'])->name('stock-items.store');
    Route::put('/stock-items/{stockItem}', [StockItemsController::class, 'update'])->name('stock-items.update');
    Route::delete('/stock-items/{stockItem}', [StockItemsController::class, 'destroy'])->name('stock-items.destroy');
    Route::post('/stock-items/quick-add', [StockItemsController::class, 'quickAdd'])->name('stock-items.quick-add');

    Route::get('/units', [UnitsController::class, 'index'])->name('units.index');
    Route::post('/units', [UnitsController::class, 'store'])->name('units.store');
    Route::put('/units/{unit}', [UnitsController::class, 'update'])->name('units.update');
    Route::delete('/units/{unit}', [UnitsController::class, 'destroy'])->name('units.destroy');

    Route::get('/transaction-logs', [TransactionLogsController::class, 'index'])->name('transaction-logs.index');
    Route::post('/transaction-logs', [TransactionLogsController::class, 'store'])->name('transaction-logs.store');
    Route::put('/transaction-logs/{transaction}', [TransactionLogsController::class, 'update'])->name('transaction-logs.update');
    Route::delete('/transaction-logs/{transaction}', [TransactionLogsController::class, 'destroy'])->name('transaction-logs.destroy');

    Route::get('/stock-items-list', [StockItemsListController::class, 'index'])->name('stock-items-list.index');
    Route::get('/stock-items/print-cards', [StockItemsListController::class, 'printCards'])->name('stock-items.print-cards');

    Route::get('/stock-reports', [StockReportsController::class, 'index'])->name('stock-reports.index');
    Route::get('/stock-reports/print', [StockReportsController::class, 'printPdf'])->name('stock-reports.print');
    Route::get('/stock-reports/export-excel', [StockReportsController::class, 'exportExcel'])->name('stock-reports.export-excel');
    Route::get('/stock-items/print-cards-html', [StockItemsListController::class, 'printCardsView'])->name('stock-items.print-cards-html');

    Route::get('/import/template/{type}', [ImportController::class, 'template'])->name('import.template');
    Route::post('/import/items', [ImportController::class, 'items'])->name('import.items');
    Route::post('/import/units', [ImportController::class, 'units'])->name('import.units');
    Route::post('/import/transactions', [ImportController::class, 'transactions'])->name('import.transactions');
    Route::post('/import/offices', [ImportController::class, 'offices'])->name('import.offices');

    Route::get('/backup/folders', [BackupController::class, 'folders'])->name('backup.folders');
    Route::post('/backup/create', [BackupController::class, 'create'])->name('backup.create');
    Route::post('/backup/restore', [BackupController::class, 'restore'])->name('backup.restore');

    Route::get('/document-center', [DocumentCenterController::class, 'index'])->name('document-center');
    Route::get('/document-center/po/{po_number}/attachments', [DocumentCenterController::class, 'poAttachments'])
    ->name('document-center.po-attachments');
    Route::get('/document-center/clearance/{id}/attachments', [DocumentCenterController::class, 'clearanceAttachments'])
    ->name('document-center.clearance-attachments'); 
    
    // Scheduled Tasks API
    Route::get('/api/scheduled-tasks', function () {
        \Illuminate\Support\Facades\Artisan::call('schedule:list');
        $output = preg_replace('/\x1b\[[0-9;]*m/', '', \Illuminate\Support\Facades\Artisan::output());
        
        $lines = explode("\n", trim($output));
        $tasks = [];
        foreach ($lines as $line) {
            if (empty(trim($line))) continue;
            if (preg_match('/^\s*([0-9\*\/\-\,]+(?:\s+[0-9\*\/\-\,]+){4})\s+(.+?)\s+\.{2,}\s+Next Due:\s+(.+)$/i', $line, $matches)) {
                $tasks[] = [
                    'cron' => trim($matches[1]),
                    'command' => trim($matches[2]),
                    'next_due' => trim($matches[3]),
                ];
            }
        }

        return response()->json([
            'delivery_email_enabled' => \App\Models\Setting::get('delivery_email_enabled', true),
            'delivery_email_schedule_time' => \App\Models\Setting::get('delivery_email_schedule_time', '08:00'),
            'raw_tasks' => $tasks,
        ]);
    })->name('api.scheduled-tasks.index');

    Route::post('/api/scheduled-tasks', function (\Illuminate\Http\Request $request) {
        $request->validate([
            'delivery_email_enabled' => 'required|boolean',
            'delivery_email_schedule_time' => 'required|string',
        ]);

        \App\Models\Setting::set('delivery_email_enabled', $request->boolean('delivery_email_enabled'));
        \App\Models\Setting::set('delivery_email_schedule_time', $request->input('delivery_email_schedule_time'));

        return response()->json(['message' => 'Settings saved successfully.']);
    })->name('api.scheduled-tasks.store');

    Route::get('/api/messages/{message}/attachment', [\App\Http\Controllers\MessageController::class, 'attachment'])
    ->name('messages.attachment');   

    // ==========================================================
    // System/Administration (sidebar: "System/Administration")
    // Admin-only: nested inside auth+verified, plus the "admin" gate.
    // ==========================================================
    Route::middleware('admin')->group(function () {
        Route::get('/users', [UsersController::class, 'index'])->name('users.index');
        Route::post('/users', [UsersController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [UsersController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [UsersController::class, 'destroy'])->name('users.destroy');
        Route::post('/users/{user}/avatar', [UsersController::class, 'updateAvatar'])->name('users.avatar.update');
        Route::delete('/users/{user}/avatar', [UsersController::class, 'removeAvatar'])->name('users.avatar.remove');   
        Route::get('/register', function () {
            return redirect()->route('login');
        });

        Route::get('/audit-logs', [AuditLogsController::class, 'index'])->name('audit-logs.index');
    });

    Route::get('/api/messages/unread-counts', [\App\Http\Controllers\MessageController::class, 'unreadCounts']);
    Route::get('/api/messages/{user}', [\App\Http\Controllers\MessageController::class, 'show']);
    Route::post('/api/messages/{user}', [\App\Http\Controllers\MessageController::class, 'store']);

    Route::get('/api/messages', function (\Illuminate\Http\Request $request) {
        $me = $request->user();

        $partnerIds = \App\Models\Message::where('sender_id', $me->id)
            ->orWhere('receiver_id', $me->id)
            ->get(['sender_id', 'receiver_id'])
            ->flatMap(fn ($m) => [$m->sender_id, $m->receiver_id])
            ->unique()
            ->reject(fn ($id) => $id == $me->id)
            ->values();

        return \App\Models\User::whereIn('id', $partnerIds)
            ->select('id', 'name', 'avatar_path')
            ->get()
            ->map(function ($u) use ($me) {
                $last = \App\Models\Message::where(function ($q) use ($me, $u) {
                        $q->where('sender_id', $me->id)->where('receiver_id', $u->id);
                    })
                    ->orWhere(function ($q) use ($me, $u) {
                        $q->where('sender_id', $u->id)->where('receiver_id', $me->id);
                    })
                    ->latest('created_at')
                    ->first();

                $unread = \App\Models\Message::where('sender_id', $u->id)
                    ->where('receiver_id', $me->id)
                    ->whereNull('read_at')
                    ->count();

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'avatar' => $u->avatar_url,
                    'last_message' => $last?->body,
                    'last_at' => $last?->created_at?->diffForHumans(),
                    'unread' => $unread,
                ];
            })
            ->sortByDesc(fn ($u) => $u['unread'] > 0 ? 1 : 0)
            ->values();
    })->name('messages.index');

    // Calendar
    Route::get('/calendar', function () {
        return Inertia::render('calendar/index');
    })->name('calendar.index');

});

require __DIR__.'/settings.php';