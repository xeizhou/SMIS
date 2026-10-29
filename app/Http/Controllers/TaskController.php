<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    public function archive(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $query = Task::with([
                'assignedTo:id,name',
                'assignedBy:id,name',
            ])
            ->where(function ($q) {
                $q->where('status', 'archived')
                  ->orWhereNotNull('archived_at');
            });

        // Scope filter
        $scope = $request->input('scope', 'all');
        if ($scope === 'to_me') {
            $query->where('assigned_to', $user->id);
        } elseif ($scope === 'by_me') {
            $query->where('assigned_by', $user->id);
        } else {
            $query->where(function ($q) use ($user) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('assigned_by', $user->id);
            });
        }

        // Search filter (title, description, po_number)
        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('po_number', 'like', "%{$search}%");
            });
        }

        // Period filter (based on when the task was archived/completed)
        $period = $request->input('period', 'all');
        if ($period === 'last_30_days') {
            $query->where(function ($q) {
                $q->where('archived_at', '>=', now()->subDays(30))
                  ->orWhere('completed_at', '>=', now()->subDays(30));
            });
        } elseif ($period === 'last_90_days') {
            $query->where(function ($q) {
                $q->where('archived_at', '>=', now()->subDays(90))
                  ->orWhere('completed_at', '>=', now()->subDays(90));
            });
        } elseif ($period === 'this_year') {
            $query->where(function ($q) {
                $q->where('archived_at', '>=', now()->startOfYear())
                  ->orWhere('completed_at', '>=', now()->startOfYear());
            });
        } elseif ($period === 'older_than_30_days') {
            $query->where(function ($q) {
                $q->where('archived_at', '<', now()->subDays(30))
                  ->orWhere('completed_at', '<', now()->subDays(30));
            });
        }

        // Priority filter
        if ($priority = $request->input('priority')) {
            if (in_array($priority, ['urgent', 'high', 'normal', 'low'])) {
                $query->where('priority', $priority);
            }
        }

        $perPage = min(max($request->integer('per_page', 10), 5), 50);

        $paginated = $query->orderByRaw('COALESCE(archived_at, completed_at) DESC')
            ->orderBy('id', 'desc')
            ->paginate($perPage);

        $paginated->getCollection()->transform(function ($task) {
            $completedAt = $task->completed_at ? \Carbon\Carbon::parse($task->completed_at) : null;
            $archivedAt = $task->archived_at ? \Carbon\Carbon::parse($task->archived_at) : null;
            $dueDate = $task->due_date ? \Carbon\Carbon::parse($task->due_date) : null;

            return [
                'id' => (string) $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'po_number' => $task->po_number,
                'priority' => $task->priority,
                'status' => $task->status,
                'due_date' => $dueDate ? $dueDate->format('Y-m-d') : null,
                'due_date_formatted' => $dueDate ? $dueDate->format('M d, Y') : null,
                'completed_at' => $completedAt ? $completedAt->toIso8601String() : null,
                'completed_at_formatted' => $completedAt ? $completedAt->format('M d, Y g:i A') : null,
                'archived_at' => $archivedAt ? $archivedAt->toIso8601String() : null,
                'archived_at_formatted' => $archivedAt ? $archivedAt->format('M d, Y g:i A') : null,
                'assigned_to' => $task->assignedTo ? [
                    'id' => $task->assignedTo->id,
                    'name' => $task->assignedTo->name,
                ] : null,
                'assigned_by' => $task->assignedBy ? [
                    'id' => $task->assignedBy->id,
                    'name' => $task->assignedBy->name,
                ] : null,
            ];
        });

        return response()->json($paginated);
    }

    public function exportArchive(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $query = Task::with([
                'assignedTo:id,name',
                'assignedBy:id,name',
            ])
            ->where(function ($q) {
                $q->where('status', 'archived')
                  ->orWhereNotNull('archived_at');
            });

        $scope = $request->input('scope', 'all');
        if ($scope === 'to_me') {
            $query->where('assigned_to', $user->id);
        } elseif ($scope === 'by_me') {
            $query->where('assigned_by', $user->id);
        } else {
            $query->where(function ($q) use ($user) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('assigned_by', $user->id);
            });
        }

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('po_number', 'like', "%{$search}%");
            });
        }

        $period = $request->input('period', 'all');
        if ($period === 'last_30_days') {
            $query->where('completed_at', '>=', now()->subDays(30));
        } elseif ($period === 'last_90_days') {
            $query->where('completed_at', '>=', now()->subDays(90));
        } elseif ($period === 'this_year') {
            $query->where('completed_at', '>=', now()->startOfYear());
        } elseif ($period === 'older_than_30_days') {
            $query->where('completed_at', '<', now()->subDays(30));
        }

        if ($priority = $request->input('priority')) {
            if (in_array($priority, ['urgent', 'high', 'normal', 'low'])) {
                $query->where('priority', $priority);
            }
        }

        $tasks = $query->orderBy('completed_at', 'desc')->take(1000)->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="completed-tasks-archive-' . now()->format('Y-m-d') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($tasks) {
            $handle = fopen('php://output', 'w');
            // Add UTF-8 BOM
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));
            
            fputcsv($handle, [
                'ID',
                'Title',
                'Description',
                'PO Number',
                'Priority',
                'Assigned To',
                'Assigned By',
                'Due Date',
                'Completed At',
            ]);

            foreach ($tasks as $task) {
                fputcsv($handle, [
                    $task->id,
                    $task->title,
                    $task->description,
                    $task->po_number,
                    strtoupper($task->priority),
                    $task->assignedTo?->name,
                    $task->assignedBy?->name,
                    $task->due_date ? \Carbon\Carbon::parse($task->due_date)->format('Y-m-d') : '',
                    $task->completed_at ? \Carbon\Carbon::parse($task->completed_at)->format('Y-m-d H:i:s') : '',
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'po_number' => 'nullable|string|max:100',
            'assigned_to' => 'required|exists:users,id',
            'priority' => 'nullable|in:urgent,high,normal,low',
            'due_date' => 'nullable|date',
        ]);

        $task = Task::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'po_number' => $validated['po_number'] ?? null,
            'assigned_to' => $validated['assigned_to'],
            'assigned_by' => Auth::id(),
            'priority' => $validated['priority'] ?? 'normal',
            'status' => 'pending',
            'due_date' => $validated['due_date'] ?? null,
        ]);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => 'Task assigned successfully.',
                'task' => $task->load(['assignedTo', 'assignedBy', 'servePo']),
            ]);
        }

        return back()->with('success', 'Task assigned successfully.');
    }

    public function archiveTask(Request $request, Task $task)
    {
        $userId = Auth::id();
        if ($task->assigned_to !== $userId && $task->assigned_by !== $userId) {
            abort(403, 'Only the assigned user or assigner can archive this task.');
        }

        $task->status = 'archived';
        $task->archived_at = now();
        if (!$task->completed_at) {
            $task->completed_at = now();
        }
        $task->save();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => 'Task archived successfully.',
                'task' => $task,
            ]);
        }

        return back()->with('success', 'Task archived successfully.');
    }

    public function unarchiveTask(Request $request, Task $task)
    {
        $userId = Auth::id();
        if ($task->assigned_to !== $userId && $task->assigned_by !== $userId) {
            abort(403, 'Only the assigned user or assigner can restore this task.');
        }

        $task->status = 'completed';
        $task->archived_at = null;
        $task->save();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => 'Task restored from archive.',
                'task' => $task,
            ]);
        }

        return back()->with('success', 'Task restored from archive.');
    }

    public function updateStatus(Request $request, Task $task)
    {
        if ($task->assigned_to !== Auth::id()) {
            abort(403, 'Only the assigned user can update the task status.');
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,in_progress,completed,archived',
        ]);

        $task->status = $validated['status'];
        if ($validated['status'] === 'completed') {
            $task->completed_at = now();
            $task->archived_at = null;
        } elseif ($validated['status'] === 'archived') {
            if (!$task->completed_at) {
                $task->completed_at = now();
            }
            $task->archived_at = now();
        } else {
            $task->completed_at = null;
            $task->archived_at = null;
        }
        $task->save();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => 'Task status updated.',
                'task' => $task,
            ]);
        }

        return back()->with('success', 'Task status updated.');
    }

    public function bulkArchive(Request $request)
    {
        $userId = Auth::id();
        $validated = $request->validate([
            'task_ids' => 'nullable|array',
            'task_ids.*' => 'exists:tasks,id',
            'scope' => 'nullable|in:all,to_me,by_me',
        ]);

        $query = Task::where(function ($q) {
            $q->where('status', '!=', 'archived')
              ->orWhereNull('archived_at');
        });

        if (!empty($validated['task_ids'])) {
            $query->whereIn('id', $validated['task_ids'])
                  ->where(function ($q) use ($userId) {
                      $q->where('assigned_to', $userId)
                        ->orWhere('assigned_by', $userId);
                  });
        } else {
            $scope = $validated['scope'] ?? 'all';
            $query->where('status', 'completed');
            if ($scope === 'to_me') {
                $query->where('assigned_to', $userId);
            } elseif ($scope === 'by_me') {
                $query->where('assigned_by', $userId);
            } else {
                $query->where(function ($q) use ($userId) {
                    $q->where('assigned_to', $userId)
                      ->orWhere('assigned_by', $userId);
                });
            }
        }

        $tasks = $query->get();
        $count = 0;
        foreach ($tasks as $task) {
            $task->status = 'archived';
            $task->archived_at = now();
            if (!$task->completed_at) {
                $task->completed_at = now();
            }
            $task->save();
            $count++;
        }

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => "{$count} task(s) archived successfully.",
                'count' => $count,
            ]);
        }

        return back()->with('success', "{$count} task(s) archived successfully.");
    }

    public function bulkUnarchive(Request $request)
    {
        $userId = Auth::id();
        $validated = $request->validate([
            'task_ids' => 'required|array|min:1',
            'task_ids.*' => 'exists:tasks,id',
        ]);

        $tasks = Task::whereIn('id', $validated['task_ids'])
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to', $userId)
                  ->orWhere('assigned_by', $userId);
            })
            ->where(function ($q) {
                $q->where('status', 'archived')
                  ->orWhereNotNull('archived_at');
            })
            ->get();

        $count = 0;
        foreach ($tasks as $task) {
            $task->status = 'completed';
            $task->archived_at = null;
            $task->save();
            $count++;
        }

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => "{$count} task(s) restored from archive.",
                'count' => $count,
            ]);
        }

        return back()->with('success', "{$count} task(s) restored from archive.");
    }

    public function update(Request $request, Task $task)
    {
        $userId = Auth::id();
        // Guard: Only the assigner can edit or transfer the task
        if ($task->assigned_by !== $userId) {
            abort(403, 'Only the user who assigned this task can edit or transfer it.');
        }

        // Guard: Completed or archived tasks cannot be edited or transferred
        if ($task->status === 'completed' || $task->status === 'archived' || !empty($task->completed_at)) {
            abort(403, 'Completed tasks cannot be edited or transferred.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'po_number' => 'nullable|string|max:100',
            'assigned_to' => 'required|exists:users,id',
            'priority' => 'nullable|in:urgent,high,normal,low',
            'status' => 'nullable|in:pending,in_progress,completed,archived',
            'due_date' => 'nullable|date',
        ]);

        $task->update($validated);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => 'Task updated successfully.',
                'task' => $task->load(['assignedTo', 'assignedBy', 'servePo']),
            ]);
        }

        return back()->with('success', 'Task updated successfully.');
    }

    public function destroy(Request $request, Task $task)
    {
        $userId = Auth::id();
        // Guard: Only the assigner can delete the task
        if ($task->assigned_by !== $userId) {
            abort(403, 'Only the user who assigned this task can delete it.');
        }

        // Guard: Completed or archived tasks cannot be deleted
        if ($task->status === 'completed' || $task->status === 'archived' || !empty($task->completed_at)) {
            abort(403, 'Completed tasks cannot be deleted.');
        }

        $task->delete();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => 'Task deleted.',
            ]);
        }

        return back()->with('success', 'Task deleted.');
    }
}

