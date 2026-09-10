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
                'RRPPE Monitoring' => \Illuminate\Support\Facades\DB::table('RRPPE_Monitoring')->where('id', $id)->value('rrppe_no'),
                'RRSP Monitoring' => \Illuminate\Support\Facades\DB::table('rrsp_monitoring')->where('id', $id)->value('rrsp_no'),
                'RegSPI Monitoring' => \Illuminate\Support\Facades\DB::table('regspi_monitoring')->where('regspi_id', $id)->value('semi_expendable_property_no') ?? \Illuminate\Support\Facades\DB::table('regspi_monitoring')->where('regspi_id', $id)->value('rrsp_no'),
                'ITR/PTR', 'ITR/PTR Monitoring' => \Illuminate\Support\Facades\DB::table('itr_ptr_monitoring')->where('id', $id)->value('transaction_no'),
                'For Disposal', 'For Disposal Monitoring' => \Illuminate\Support\Facades\DB::table('for_disposal_monitoring')->where('id', $id)->value('transaction_no'),
                'Bona Vida', 'Bona Vida Monitoring' => \Illuminate\Support\Facades\DB::table('bona_vida_monitoring')->where('bvm_id', $id)->value('invoice_no'),
                'Purchase Order' => $id,
                'PO Letter Monitoring' => \Illuminate\Support\Facades\DB::table('po_letter_monitoring')->where('id', $id)->value('reference_no'),
                'Delivery Monitoring', 'Delivery', 'Delivery Follow-ups' => str_contains(strtolower($action), 'follow-up')
                    ? \Illuminate\Support\Facades\DB::table('delivery_follow_ups')
                        ->join('delivery', 'delivery.delivery_id', '=', 'delivery_follow_ups.delivery_id')
                        ->where('delivery_follow_ups.id', $id)
                        ->value('delivery.po_number')
                    : \Illuminate\Support\Facades\DB::table('delivery')->where('delivery_id', $id)->value('po_number'),
                'Supplier List' => \Illuminate\Support\Facades\DB::table('supplier_list')->where('supplier_id', $id)->value('supplier_name'),
                'Fund Clusters' => $id,
                'Employee File Locator' => (function() use ($id) {
                    $emp = \Illuminate\Support\Facades\DB::table('employee_file_locator')->where('efr_id', $id)->first();
                    return $emp ? trim("$emp->first_name $emp->last_name") : null;
                })(),
                'Offices' => $id,
                'Areas' => \Illuminate\Support\Facades\DB::table('areas')->where('areaID', $id)->value('name'),
                'Clearance' => \Illuminate\Support\Facades\DB::table('clearance')->where('clearance_id', $id)->value('name'),
                'Stock Items' => $id,
                'Units' => \Illuminate\Support\Facades\DB::table('units')->where('unitID', $id)->value('unit_name'),
                'Transactions' => \Illuminate\Support\Facades\DB::table('transactions')->where('transactionID', $id)->value('reference'),
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
        $userActions = ['Added', 'Edited'];

        $query = AuditLog::where('userID', $userId)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('action', 'like', "%{$search}%")
                      ->orWhere('auditLogID', 'like', "%{$search}%");
                });
            })
            ->when($moduleFilter && $moduleFilter !== 'All', function ($query) use ($moduleFilter) {
                $mappedAction = match ($moduleFilter) {
                    'RRPPE Monitoring' => ['RRPPE', 'Area'],
                    'RRSP Monitoring' => ['RRSP', 'Area'],
                    'RegSPI Monitoring' => 'RegSPI',
                    'ITR PTR' => 'ITR/PTR',
                    'For Disposal' => 'For Disposal',
                    'Bona Vida' => 'Bona Vida',
                    'Purchase Order' => 'Purchase Orders',
                    'PO Letter Monitoring' => 'PO Letter',
                    'Delivery' => 'Delivery',
                    'Supplier List' => 'Supplier',
                    'Fund Clusters' => 'Fund Clusters',
                    'Employee File Locator' => 'Employee File Locator',
                    'Offices' => 'Offices',
                    'Clearance' => 'Clearance',
                    'Stock Items' => 'Stock Items',
                    'Units' => 'Units',
                    'Transactions' => 'Transactions',
                    default => null,
                };

                if ($mappedAction) {
                    $query->where(function ($q) use ($mappedAction) {
                        foreach ((array) $mappedAction as $act) {
                            $q->orWhere('action', 'like', "%{$act}%");
                        }
                    });
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
            ->when($dateRange && !in_array($dateRange, ['All', 'All Time']), function ($query) use ($dateRange) {
                match ($dateRange) {
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
            $targetUrl = strtolower($log->target_url ?? '');
            
            // Try to extract module from action
            $module = match (true) {
                str_contains($actionLower, 'delivery') => 'Delivery Monitoring',
                str_contains($actionLower, 'area') && str_contains($targetUrl, 'rrppe') => 'RRPPE Monitoring',
                str_contains($actionLower, 'area') => 'RRSP Monitoring',
                str_contains($actionLower, 'rrsp') => 'RRSP Monitoring',
                str_contains($actionLower, 'rrppe') => 'RRPPE Monitoring',
                str_contains($actionLower, 'regspi') => 'RegSPI Monitoring',
                str_contains($actionLower, 'itrptr') || str_contains($actionLower, 'itr/ptr') => 'ITR/PTR Monitoring',
                str_contains($actionLower, 'disposal') => 'For Disposal Monitoring',
                str_contains($actionLower, 'bona vida') => 'Bona Vida Monitoring',
                str_contains($actionLower, 'purchase order') => 'Purchase Order',
                str_contains($actionLower, 'po letter') => 'PO Letter Monitoring',
                str_contains($actionLower, 'supplier') => 'Supplier List',
                str_contains($actionLower, 'fund cluster') => 'Fund Clusters',
                str_contains($actionLower, 'employee file locator') => 'Employee File Locator',
                str_contains($actionLower, 'office') => 'Offices',
                str_contains($actionLower, 'clearance') => 'Clearance',
                str_contains($actionLower, 'stock item') => 'Stock Items',
                str_contains($actionLower, 'unit') => 'Units',
                str_contains($actionLower, 'transaction') => 'Transactions',
                str_contains($actionLower, 'audit log') || str_contains($actionLower, 'cleanup') => 'System Audit Logs',
                str_contains($actionLower, 'notification') || str_contains($actionLower, 'force send') => 'Notifications',
                default => 'Other',
            };
            
            // Try to extract reference
            $reference = $this->resolveReference($module, $log->action, $log->target_url);

            $sub_module = null;
            if ($module === 'Delivery Monitoring') {
                $sub_module = str_contains($actionLower, 'follow-up') ? 'Delivery Follow-ups' : null;
            } elseif ($module === 'RRSP Monitoring') {
                $sub_module = str_contains($actionLower, 'area') ? 'Area Records' : null;
            } elseif ($module === 'RRPPE Monitoring') {
                $sub_module = str_contains($actionLower, 'area') ? 'Area Records' : null;
            }

            return [
                'log_id' => $log->auditLogID,
                'timestamp' => $log->log_timestamp->format('M d, Y h:i A'),
                'module' => $module,
                'sub_module' => $sub_module,
                'action' => $log->action,
                'reference' => $reference,
                'description' => $log->action,
                'target_url' => $log->target_url ? preg_replace('/(\?|&)search=/', '$1highlight_search=', $log->target_url) : null,
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
