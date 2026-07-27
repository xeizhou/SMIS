<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditLogsController extends Controller
{
    /**
     * Display the Audit Logs page.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $role = $request->input('role');

        $query = AuditLog::with('user')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('action', 'like', "%{$search}%")
                        ->orWhere('auditLogID', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($role && $role !== 'All', function ($query, $role) {
                $query->where('role', $role);
            })
            ->orderBy('log_timestamp', 'desc');

        $logs = $query->paginate(15)->withQueryString();

        // Map the items to a more frontend-friendly format
        $logs->getCollection()->transform(function ($log) {
            return [
                'log_id' => $log->auditLogID,
                'timestamp' => $log->log_timestamp->format('Y-m-d H:i:s'),
                'user' => $log->user ? $log->user->name : 'Unknown',
                'role' => $log->role,
                'action' => $log->action,
                'target_url' => $log->target_url ? str_replace('search=', 'highlight_search=', $log->target_url) : null,
            ];
        });

        return Inertia::render('audit-logs/index', [
            'logs' => $logs,
            'filters' => [
                'search' => $search ?? '',
                'role' => $role ?? 'All',
            ],
        ]);
    }
}
