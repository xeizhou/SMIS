<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Delivery;
use App\Models\PoLetterMonitoring;
use App\Models\ServePo;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the Main Dashboard.
     */
    public function index(Request $request): Response
    {
        $reportsYear = (int) $request->input('reports_year', now()->year);
        $reportsQuarter = (int) $request->input('reports_quarter', now()->quarter);

        return Inertia::render('dashboard', [
            'recentDeliveries' => fn () => $this->getRecentDeliveries(),
            'deliveries' => fn () => $this->getDueDeliveries(),
            'calendarDeliveries' => fn () => $this->getCalendarDeliveries(),
            'pendingDeliveries' => fn () => Delivery::where('status', 'PENDING')->count(),
            'deliveriesLastWeek' => fn () => Delivery::where('status', 'PENDING')
                ->where('data_entry_timestamp', '>=', now()->startOfWeek())
                ->count(),
            'allPendingDeliveries' => fn () => $this->getAllPendingDeliveries(),
            'poLettersStatus' => fn () => [
                'This Week' => $this->getPoLettersStatusByPeriod('This Week'),
                'This Month' => $this->getPoLettersStatusByPeriod('This Month'),
                'This Year' => $this->getPoLettersStatusByPeriod('This Year'),
            ],
            'pendingInspections' => fn () => $this->getPendingInspectionsQuery()->count(),
            'inspectionsLastWeek' => fn () => $this->getPendingInspectionsQuery()
                ->where('created_at', '>=', now()->startOfWeek())
                ->count(),
            'allPendingInspections' => fn () => $this->getAllPendingInspections(),
            'pendingClearances' => fn () => ServePo::where(function ($query) {
                $query->whereNull('receipt_claimed_by')
                    ->orWhereNull('receipt_receiving_date');
            })
                ->where(function ($query) {
                    $query->whereNull('po_step')
                        ->orWhere('po_step', '!=', 'CANCELLED');
                })
                ->count(),
            'clearancesLastWeek' => fn () => ServePo::where(function ($query) {
                $query->whereNull('receipt_claimed_by')
                    ->orWhereNull('receipt_receiving_date');
            })
                ->where(function ($query) {
                    $query->whereNull('po_step')
                        ->orWhere('po_step', '!=', 'CANCELLED');
                })
                ->where('created_at', '>=', now()->startOfWeek())
                ->count(),
            'allPendingClearances' => fn () => $this->getAllPendingClearances(),
            'reportsStats' => fn () => $this->getReportsStats($reportsYear, $reportsQuarter),
            'reportsYear' => $reportsYear,
            'reportsQuarter' => $reportsQuarter,
            'poStats' => fn () => $this->getPoStats(),
            'userNotifications' => fn () => $request->user()?->notifications()->latest()->take(20)->get() ?? [],
            'assignedTasks' => function () use ($request) {
                $userId = Auth::id() ?? $request->user()?->id;
                if (! $userId) {
                    return [];
                }

                return Task::with([
                    'assignedTo:id,name,full_name',
                    'assignedBy:id,name,full_name',
                    'servePo:po_number,supplier_id',
                    'servePo.supplier:id,supplier_name',
                ])
                ->where(function ($q) use ($userId) {
                    $q->where('assigned_to', $userId)
                      ->orWhere('assigned_by', $userId);
                })
                ->where('status', '!=', 'archived')
                ->whereNull('archived_at')
                ->where(function ($q) {
                    $q->where('status', '!=', 'completed')
                      ->orWhere('completed_at', '>=', now()->subDays(30))
                      ->orWhereNull('completed_at');
                })
                ->orderByRaw("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")
                ->orderBy('due_date', 'asc')
                ->latest()
                ->take(100)
                ->get()
                ->map(function ($task) {
                    $due = $task->due_date ? Carbon::parse($task->due_date) : null;
                    $daysDue = null;
                    if ($due) {
                        $today = now()->startOfDay();
                        $dueStart = $due->copy()->startOfDay();
                        $daysDue = (int) $today->diffInDays($dueStart, false);
                    }

                    return [
                        'id' => (string) $task->id,
                        'title' => $task->title,
                        'description' => $task->description,
                        'po_number' => $task->po_number,
                        'supplier_name' => $task->servePo?->supplier?->supplier_name,
                        'priority' => $task->priority,
                        'status' => $task->status,
                        'due_date' => $due ? $due->format('Y-m-d') : null,
                        'due_date_formatted' => $due ? $due->format('M d, Y') : null,
                        'days_due' => $daysDue,
                        'assigned_to' => $task->assignedTo ? [
                            'id' => $task->assignedTo->id,
                            'name' => $task->assignedTo->full_name,
                        ] : null,
                        'assigned_by' => $task->assignedBy ? [
                            'id' => $task->assignedBy->id,
                            'name' => $task->assignedBy->full_name,
                        ] : null,
                        'created_at' => $task->created_at?->diffForHumans(),
                        'created_at_raw' => $task->created_at?->toISOString(),
                        'completed_at' => $task->completed_at ? Carbon::parse($task->completed_at)->diffForHumans() : null,
                    ];
                })
                ->values();
            },
            'usersList' => fn () => User::select('id', 'name', 'full_name', 'role')->orderBy('full_name')->get(),
            'poNumbers' => fn () => ServePo::select('po_number')->latest()->take(50)->pluck('po_number'),
        ]);
    }

    /**
     * API: Get operational records on-demand for modals.
     */
    public function operationalRecords(Request $request): JsonResponse
    {
        $type = $request->input('type');

        if ($type === 'deliveries') {
            return response()->json($this->getAllPendingDeliveries());
        }

        if ($type === 'inspections') {
            return response()->json($this->getAllPendingInspections());
        }

        if ($type === 'clearances') {
            return response()->json($this->getAllPendingClearances());
        }

        return response()->json([]);
    }

    /**
     * API: Get reports monitoring records on-demand for modals.
     */
    public function reportsMonitoringRecords(Request $request): JsonResponse
    {
        $year = (int) $request->input('year', now()->year);
        $quarter = (int) $request->input('quarter', now()->quarter);
        $filterStatus = strtoupper(trim((string) $request->input('status', 'ALL')));

        $startMonth = ($quarter - 1) * 3 + 1;
        $endMonth = $startMonth + 2;

        $pos = ServePo::with(['supplier:supplier_id,supplier_name'])
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', '>=', $startMonth)
            ->whereMonth('created_at', '<=', $endMonth)
            ->orderBy('created_at', 'desc')
            ->get();

        if ($pos->isEmpty()) {
            return response()->json([]);
        }

        $poNumbers = $pos->pluck('po_number')->filter()->values();

        $deliveriesByPo = DB::table('delivery')
            ->whereNull('deleted_at')
            ->whereIn('po_number', $poNumbers)
            ->select('po_number', DB::raw("UPPER(COALESCE(status, '')) as status_upper"))
            ->get()
            ->groupBy('po_number');

        $records = [];

        foreach ($pos as $po) {
            $poDeliveries = $deliveriesByPo->get($po->po_number, collect());

            $isCancelled = strtoupper((string) $po->po_step) === 'CANCELLED'
                || ($poDeliveries->isNotEmpty() && $poDeliveries->every(fn ($d) => $d->status_upper === 'CANCELLED'));

            if ($isCancelled) {
                $status = 'CANCELLED';
            } else {
                $isPaid = in_array(strtolower(trim((string) $po->payment_status)), ['paid', 'fully paid', 'completed'], true);
                $stepsComplete = in_array(strtolower(trim((string) $po->po_step)), ['forwarded to finance', 'completed'], true)
                    || ! empty($po->date_completed);

                $deliveryComplete = false;
                if ($poDeliveries->isNotEmpty()) {
                    $deliveryComplete = $poDeliveries->count() === $poDeliveries->filter(fn ($d) => in_array($d->status_upper, ['COMPLETE', 'COMPLETED'], true))->count();
                }

                if ($isPaid && $stepsComplete && $deliveryComplete) {
                    $status = 'COMPLETED';
                } else {
                    $status = 'ONGOING';
                }
            }

            if ($filterStatus !== 'ALL' && $status !== $filterStatus) {
                continue;
            }

            $dateFormatted = '—';
            if ($po->po_date) {
                $dateFormatted = Carbon::parse($po->po_date)->format('M d, Y');
            } elseif ($po->created_at) {
                $dateFormatted = $po->created_at->format('M d, Y');
            }

            $records[] = [
                'po_number' => $po->po_number,
                'supplier_name' => $po->supplier?->supplier_name ?? '—',
                'po_date' => $dateFormatted,
                'total_amount_po' => $po->total_amount_po !== null ? (float) $po->total_amount_po : 0,
                'total_amount_po_formatted' => $po->total_amount_po !== null ? number_format((float) $po->total_amount_po, 2) : '0.00',
                'po_step' => $po->po_step ?: 'Pending',
                'payment_status' => $po->payment_status ?: 'Pending',
                'status' => $status,
                'has_cancelled_delivery' => $poDeliveries->contains(fn ($d) => $d->status_upper === 'CANCELLED'),
                'end_user' => $po->end_user,
            ];
        }

        return response()->json($records);
    }

    /**
     * Helper: Recent activity audit logs.
     */
    protected function getRecentActivity(): array
    {
        return AuditLog::with('user')
            ->orderBy('log_timestamp', 'desc')
            ->take(50)
            ->get()
            ->map(function ($log) {
                return [
                    'log_id' => $log->auditLogID,
                    'timestamp' => $log->log_timestamp?->format('Y-m-d H:i:s'),
                    'user' => $log->user ? $log->user->name : 'Unknown',
                    'role' => $log->role,
                    'action' => $log->action,
                    'target_url' => $log->target_url ? str_replace('search=', 'highlight_search=', $log->target_url) : null,
                ];
            })
            ->all();
    }

    /**
     * Helper: Recent pending deliveries.
     */
    protected function getRecentDeliveries(): array
    {
        return Delivery::with('servePo')
            ->where('status', 'PENDING')
            ->orderBy('data_entry_timestamp', 'desc')
            ->take(10)
            ->get()
            ->map(function ($delivery) {
                $due = $delivery->due_date ? Carbon::parse($delivery->due_date) : null;
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
                    } elseif (! $deliveryDate && $today->gt($dueStart)) {
                        $isOverdue = true;
                        $daysOverdue = (int) $dueStart->diffInDays($today);
                    }
                }

                return [
                    'delivery_id' => $delivery->delivery_id,
                    'po_number' => $delivery->po_number,
                    'time_ago' => ($delivery->data_entry_timestamp ?? now())->diffForHumans(),
                    'created_at_raw' => ($delivery->data_entry_timestamp ?? $delivery->created_at)?->toISOString(),
                    'is_overdue' => $isOverdue,
                    'daysOverdue' => $daysOverdue,
                    'diff_days' => $diffDays,
                    'due_date' => $due ? $due->format('Y-m-d') : null,
                    'due_date_formatted' => $due ? $due->format('M d, Y') : null,
                    'status' => $delivery->status,
                ];
            })
            ->all();
    }

    /**
     * Helper: Due deliveries for Action Center.
     */
    protected function getDueDeliveries(): array
    {
        return Delivery::with(['supplier:supplier_id,supplier_name', 'servePo:po_number,po_received_date,delivery_term'])
            ->withExists('deliveryFollowUps')
            ->whereNotNull('due_date')
            ->where(function ($query) {
                $query->whereIn('status', ['PENDING', 'PARTIAL'])
                    ->orWhereNull('status');
            })
            ->orderBy('due_date', 'asc')
            ->take(50)
            ->get()
            ->map(function ($delivery) {
                $due = $delivery->due_date ? Carbon::parse($delivery->due_date) : null;
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
                    } elseif (! $deliveryDate && $today->gt($dueStart)) {
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
                    'created_at_raw' => ($delivery->data_entry_timestamp ?? $delivery->created_at)?->toISOString(),
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
            ->values()
            ->all();
    }

    /**
     * Helper: Calendar deliveries.
     */
    protected function getCalendarDeliveries(): array
    {
        return Delivery::with(['supplier:supplier_id,supplier_name', 'servePo:po_number,po_received_date,delivery_term'])
            ->whereNotNull('due_date')
            ->orderBy('due_date', 'asc')
            ->get()
            ->map(function ($delivery) {
                $due = $delivery->due_date ? Carbon::parse($delivery->due_date) : null;

                return [
                    'delivery_id' => $delivery->delivery_id,
                    'po_number' => $delivery->po_number,
                    'due_date' => $due ? $due->format('Y-m-d') : null,
                    'due_date_formatted' => $due ? $due->format('M d, Y') : null,
                    'status' => $delivery->status,
                    'end_user' => $delivery->end_user,
                    'supplier' => $delivery->supplier ? [
                        'supplier_name' => $delivery->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Helper: All pending deliveries.
     */
    protected function getAllPendingDeliveries(): array
    {
        return Delivery::with(['supplier', 'servePo'])
            ->withExists('deliveryFollowUps')
            ->where('status', 'PENDING')
            ->orderBy('data_entry_timestamp', 'desc')
            ->get()
            ->map(function ($delivery) {
                return [
                    'delivery_id' => $delivery->delivery_id,
                    'po_number' => $delivery->po_number,
                    'due_date' => $delivery->due_date,
                    'due_date_formatted' => $delivery->due_date ? Carbon::parse($delivery->due_date)->format('M d, Y') : null,
                    'status' => $delivery->status,
                    'end_user' => $delivery->end_user,
                    'has_follow_up' => $delivery->delivery_follow_ups_exists ?? false,
                    'supplier' => $delivery->supplier ? [
                        'supplier_name' => $delivery->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Helper: PO letters status by period.
     */
    protected function getPoLettersStatusByPeriod(string $period): array
    {
        $query = PoLetterMonitoring::selectRaw("
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
        })->values()->all();
    }

    /**
     * Helper: Query for pending inspections.
     */
    protected function getPendingInspectionsQuery()
    {
        return ServePo::query()
            ->whereDoesntHave('inspectionEntries', function ($query) {
                $query->whereNotNull('inspection_date');
            })
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('pir_monitoring')
                    ->whereColumn('pir_monitoring.po_number', 'serve_po.po_number')
                    ->whereNotNull('pir_monitoring.inspection_date')
                    ->whereNull('pir_monitoring.deleted_at');
            })
            ->where(function ($query) {
                $query->where('po_step', '!=', 'CANCELLED')
                    ->orWhere(function ($query) {
                        $query->whereNull('po_step')
                            ->whereNotExists(function ($legacyQuery) {
                                $legacyQuery->selectRaw('1')
                                    ->from('pir_monitoring')
                                    ->whereColumn('pir_monitoring.po_number', 'serve_po.po_number')
                                    ->where('pir_monitoring.status', 'CANCELLED')
                                    ->whereNull('pir_monitoring.deleted_at');
                            });
                    });
            });
    }

    /**
     * Helper: All pending inspections.
     */
    protected function getAllPendingInspections(): array
    {
        return $this->getPendingInspectionsQuery()
            ->with(['supplier', 'inspectionEntries'])
            ->addSelect([
                'legacy_iar_number' => DB::table('pir_monitoring')
                    ->select('iar_number')
                    ->whereColumn('pir_monitoring.po_number', 'serve_po.po_number')
                    ->whereNull('pir_monitoring.deleted_at')
                    ->orderByDesc('pir_id')
                    ->limit(1),
                'legacy_invoice_number' => DB::table('pir_monitoring')
                    ->select('invoice_number')
                    ->whereColumn('pir_monitoring.po_number', 'serve_po.po_number')
                    ->whereNull('pir_monitoring.deleted_at')
                    ->orderByDesc('pir_id')
                    ->limit(1),
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($po) {
                return [
                    'po_number' => $po->po_number,
                    'iar_number' => $po->inspectionEntries->firstWhere('iar_number')?->iar_number
                        ?? $po->legacy_iar_number,
                    'invoice_number' => $po->invoice_number ?? $po->legacy_invoice_number,
                    'created_at' => $po->created_at ? $po->created_at->format('M d, Y') : null,
                    'supplier' => $po->supplier ? [
                        'supplier_name' => $po->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Helper: All pending clearances / issuances.
     */
    protected function getAllPendingClearances(): array
    {
        return ServePo::with(['supplier', 'inspectionEntries'])
            ->where(function ($query) {
                $query->whereNull('receipt_claimed_by')
                    ->orWhereNull('receipt_receiving_date');
            })
            ->where(function ($query) {
                $query->whereNull('po_step')
                    ->orWhere('po_step', '!=', 'CANCELLED');
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($po) {
                return [
                    'po_number' => $po->po_number,
                    'iar_number' => $po->inspectionEntries->first()?->iar_number,
                    'invoice_number' => $po->invoice_number,
                    'created_at' => $po->created_at ? $po->created_at->format('M d, Y') : null,
                    'supplier' => $po->supplier ? [
                        'supplier_name' => $po->supplier->supplier_name,
                    ] : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Helper: Quarterly Reports monitoring stats.
     */
    protected function getReportsStats(int $reportsYear, int $reportsQuarter): array
    {
        $startMonth = ($reportsQuarter - 1) * 3 + 1;
        $endMonth = $startMonth + 2;

        $pos = ServePo::whereYear('created_at', $reportsYear)
            ->whereMonth('created_at', '>=', $startMonth)
            ->whereMonth('created_at', '<=', $endMonth)
            ->select(['po_number', 'po_step', 'payment_status', 'date_completed'])
            ->get();

        if ($pos->isEmpty()) {
            return ['COMPLETED' => 0, 'CANCELLED' => 0, 'ONGOING' => 0];
        }

        $poNumbers = $pos->pluck('po_number')->filter()->values();

        $deliveriesByPo = DB::table('delivery')
            ->whereNull('deleted_at')
            ->whereIn('po_number', $poNumbers)
            ->select('po_number', DB::raw("UPPER(COALESCE(status, '')) as status_upper"))
            ->get()
            ->groupBy('po_number');

        $completedCount = 0;
        $cancelledCount = 0;
        $ongoingCount = 0;

        foreach ($pos as $po) {
            $poDeliveries = $deliveriesByPo->get($po->po_number, collect());

            $isCancelled = strtoupper((string) $po->po_step) === 'CANCELLED'
                || ($poDeliveries->isNotEmpty() && $poDeliveries->every(fn ($d) => $d->status_upper === 'CANCELLED'));

            if ($isCancelled) {
                $cancelledCount++;
                continue;
            }

            $isPaid = in_array(strtolower(trim((string) $po->payment_status)), ['paid', 'fully paid', 'completed'], true);
            $stepsComplete = in_array(strtolower(trim((string) $po->po_step)), ['forwarded to finance', 'completed'], true)
                || ! empty($po->date_completed);

            $deliveryComplete = false;
            if ($poDeliveries->isNotEmpty()) {
                $deliveryComplete = $poDeliveries->count() === $poDeliveries->filter(fn ($d) => in_array($d->status_upper, ['COMPLETE', 'COMPLETED'], true))->count();
            }

            if ($isPaid && $stepsComplete && $deliveryComplete) {
                $completedCount++;
            } else {
                $ongoingCount++;
            }
        }

        return [
            'COMPLETED' => $completedCount,
            'CANCELLED' => $cancelledCount,
            'ONGOING' => $ongoingCount,
        ];
    }

    /**
     * Helper: Optimized Purchase Orders status aggregates.
     */
    protected function getPoStats(): array
    {
        $deliveryAggregates = DB::table('delivery')
            ->whereNull('deleted_at')
            ->whereNotNull('po_number')
            ->select(
                'po_number',
                DB::raw("COUNT(*) as total_count"),
                DB::raw("SUM(CASE WHEN UPPER(COALESCE(status, '')) IN ('COMPLETE', 'COMPLETED') THEN 1 ELSE 0 END) as completed_count"),
                DB::raw("SUM(CASE WHEN UPPER(COALESCE(status, '')) = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_count"),
                DB::raw("SUM(CASE WHEN UPPER(COALESCE(status, '')) NOT IN ('COMPLETE', 'COMPLETED', 'CANCELLED') THEN 1 ELSE 0 END) as pending_count")
            )
            ->groupBy('po_number')
            ->get()
            ->keyBy('po_number');

        $allPoNumbers = DB::table('serve_po')
            ->whereNull('deleted_at')
            ->pluck('po_number');

        $poStats = ['COMPLETE' => 0, 'PARTIAL' => 0, 'PENDING' => 0, 'CANCELLED' => 0];

        foreach ($allPoNumbers as $poNum) {
            $agg = $deliveryAggregates->get($poNum);
            if (! $agg || $agg->total_count == 0) {
                $poStats['PENDING']++;
                continue;
            }

            if ($agg->completed_count == $agg->total_count) {
                $poStats['COMPLETE']++;
            } elseif ($agg->cancelled_count == $agg->total_count) {
                $poStats['CANCELLED']++;
            } elseif ($agg->pending_count == $agg->total_count) {
                $poStats['PENDING']++;
            } else {
                $poStats['PARTIAL']++;
            }
        }

        return $poStats;
    }
}
