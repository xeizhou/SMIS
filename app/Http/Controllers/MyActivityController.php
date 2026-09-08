<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class MyActivityController extends Controller
{
    private function resolveReference($module, $action, $targetUrl)
    {
        if ($module !== 'RegSPI' && $targetUrl && preg_match('/(?:highlight_search|search)=([^&]+)/', $targetUrl, $matches)) {
            return urldecode($matches[1]);
        }
        
        $id = null;
        if ($targetUrl && preg_match('/(?:highlight_id|id)=([^&]+)/', $targetUrl, $matches)) {
            $id = urldecode($matches[1]);
        }
        
        if (!$id) {
            if (preg_match('/#([\w-]+)/', $action, $matches)) {
                return $matches[1];
            }
            return null;
        }

        try {
            $resolved = match ($module) {
                'RRPPE' => \Illuminate\Support\Facades\DB::table('RRPPE_Monitoring')->where('id', $id)->value('rrppe_no'),
                'RRSP' => \Illuminate\Support\Facades\DB::table('rrsp_monitoring')->where('id', $id)->value('rrsp_no'),
                'RegSPI' => \Illuminate\Support\Facades\DB::table('regspi_monitoring')->where('regspi_id', $id)->value('semi_expendable_property_no') ?? \Illuminate\Support\Facades\DB::table('regspi_monitoring')->where('regspi_id', $id)->value('rrsp_no'),
                'ITRPTR' => \Illuminate\Support\Facades\DB::table('itr_ptr_monitoring')->where('id', $id)->value('transaction_no'),
                'For Disposal' => \Illuminate\Support\Facades\DB::table('for_disposal_monitoring')->where('id', $id)->value('transaction_no'),
                'Bona Vida' => \Illuminate\Support\Facades\DB::table('bona_vida_monitoring')->where('bvm_id', $id)->value('invoice_no'),
                'Purchase Orders' => $id,
                'PO Letter' => \Illuminate\Support\Facades\DB::table('po_letter_monitoring')->where('id', $id)->value('reference_no') ?? \Illuminate\Support\Facades\DB::table('po_letter_monitoring')->where('id', $id)->value('po_number'),
                'Delivery Monitoring', 'Delivery' => \Illuminate\Support\Facades\DB::table('delivery')->where('delivery_id', $id)->value('po_number'),
                'Suppliers' => \Illuminate\Support\Facades\DB::table('supplier_list')->where('supplier_id', $id)->value('supplier_name'),
                'FundClusters' => $id,
                'EmployeeFileLocator' => (function() use ($id) {
                    $emp = \Illuminate\Support\Facades\DB::table('employee_file_locator')->where('efr_id', $id)->first();
                    return $emp ? trim("$emp->first_name $emp->last_name") : null;
                })(),
                'Offices' => $id,
                'Clearance' => \Illuminate\Support\Facades\DB::table('clearance')->where('clearance_id', $id)->value('name'),
                'StockItems' => $id,
                'Units' => \Illuminate\Support\Facades\DB::table('units')->where('unitID', $id)->value('unit_name'),
                'Transaction Logs' => \Illuminate\Support\Facades\DB::table('transactions')->where('transactionID', $id)->value('reference'),
                default => null,
            };
            return $resolved ?: $id;
        } catch (\Exception $e) {
            return $id;
        }
    }
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->input('search');
        $moduleFilter = $request->input('module');
        $actionFilter = $request->input('action');
        $dateRange = $request->input('date_range'); // 'today', '7days', '30days', 'all'
        
        $userId = Auth::id();

        // Get distinct actions for this user for the dropdown
        $userActions = AuditLog::where('userID', $userId)
            ->select('action')
            ->distinct()
            ->pluck('action')
            ->unique()
            ->filter()
            ->values();

        $query = AuditLog::where('userID', $userId)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('action', 'like', "%{$search}%")
                      ->orWhere('auditLogID', 'like', "%{$search}%");
                });
            })
            ->when($moduleFilter && $moduleFilter !== 'All', function ($query, $module) {
                $mappedAction = match ($module) {
                    'Delivery Monitoring', 'Delivery' => 'Delivery',
                    'RRSP' => 'RRSP',
                    'RRPPE' => 'RRPPE',
                    'RegSPI' => 'RegSPI',
                    'ITRPTR' => 'ITRPTR',
                    'For Disposal' => 'For Disposal',
                    'Bona Vida' => 'Bona Vida',
                    'Purchase Orders' => 'Purchase Orders',
                    'PO Letter' => 'PO Letter',
                    'Suppliers' => 'Supplier',
                    'FundClusters' => 'Fund Clusters',
                    'EmployeeFileLocator' => 'Employee File Locator',
                    'Offices' => 'Offices',
                    'Clearance' => 'Clearance',
                    'StockItems' => 'Stock Items',
                    'Units' => 'Units',
                    'Transactions' => 'Transactions',
                    default => null,
                };

                if ($mappedAction) {
                    $query->where('action', 'like', "%{$mappedAction}%");
                } elseif ($module === 'System Audit Logs') {
                    $query->where(function ($q) {
                        $q->where('action', 'like', '%Audit Log%')
                          ->orWhere('action', 'like', '%Force Cleanup%');
                    });
                } elseif ($module === 'Notifications') {
                    $query->where(function ($q) {
                        $q->where('action', 'like', '%Notification%')
                          ->orWhere('action', 'like', '%Force Send%');
                    });
                } else {
                    $query->where('action', 'like', "%{$module}%");
                }
            })
            ->when($actionFilter && $actionFilter !== 'All', function ($query, $action) {
                $query->where('action', 'like', "{$action}%");
            })
            ->when($dateRange && $dateRange !== 'All', function ($query, $date) {
                match ($date) {
                    'Today' => $query->whereDate('log_timestamp', today()),
                    'Last 7 Days' => $query->where('log_timestamp', '>=', now()->subDays(7)),
                    'Last 30 Days' => $query->where('log_timestamp', '>=', now()->subDays(30)),
                    default => null,
                };
            })
            ->orderBy('log_timestamp', 'desc');

        $logs = $query->paginateWithHighlight($perPage)->withQueryString();

        $logs->getCollection()->transform(function ($log) {
            $actionLower = strtolower($log->action);
            
            // Try to extract module from action
            $module = match (true) {
                str_contains($actionLower, 'delivery') => 'Delivery Monitoring',
                str_contains($actionLower, 'rrsp') => 'RRSP',
                str_contains($actionLower, 'rrppe') => 'RRPPE',
                str_contains($actionLower, 'regspi') => 'RegSPI',
                str_contains($actionLower, 'itrptr') => 'ITRPTR',
                str_contains($actionLower, 'disposal') => 'For Disposal',
                str_contains($actionLower, 'bona vida') => 'Bona Vida',
                str_contains($actionLower, 'purchase order') => 'Purchase Orders',
                str_contains($actionLower, 'po letter') => 'PO Letter',
                str_contains($actionLower, 'supplier') => 'Suppliers',
                str_contains($actionLower, 'fund cluster') => 'FundClusters',
                str_contains($actionLower, 'employee file locator') => 'EmployeeFileLocator',
                str_contains($actionLower, 'office') => 'Offices',
                str_contains($actionLower, 'clearance') => 'Clearance',
                str_contains($actionLower, 'stock item') => 'StockItems',
                str_contains($actionLower, 'unit') => 'Units',
                str_contains($actionLower, 'transaction') => 'Transaction Logs',
                str_contains($actionLower, 'audit log') || str_contains($actionLower, 'cleanup') => 'System Audit Logs',
                str_contains($actionLower, 'notification') || str_contains($actionLower, 'force send') => 'Notifications',
                default => 'Other',
            };
            
            // Try to extract reference
            $reference = $this->resolveReference($module, $log->action, $log->target_url);

            return [
                'log_id' => $log->auditLogID,
                'timestamp' => $log->log_timestamp->format('M d, Y h:i A'),
                'module' => $module,
                'action' => $log->action,
                'reference' => $reference,
                'description' => $log->action,
                'target_url' => $log->target_url ? str_replace('search=', 'highlight_search=', $log->target_url) : null,
            ];
        });

        return Inertia::render('my-activity/index', [
            'logs' => $logs,
            'userActions' => $userActions,
            'filters' => [
                'search' => $search ?? '',
                'module' => $moduleFilter ?? 'All',
                'action' => $actionFilter ?? 'All',
                'date_range' => $dateRange ?? 'All Time',
                'per_page' => $perPage,
            ],
        ]);
    }
}
