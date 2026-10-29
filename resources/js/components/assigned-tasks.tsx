import { useState, useMemo, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { 
    ListTodo, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Calendar, 
    Plus, 
    User as UserIcon, 
    Loader2, 
    Check, 
    FileText, 
    ArrowUpRight, 
    Building2, 
    CalendarDays, 
    Archive,
    Pencil,
    Trash2,
    RefreshCw,
    ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';
import { TaskArchiveModal } from './task-archive-modal';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'archived';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface AssignedTask {
    id: string;
    title: string;
    description?: string | null;
    po_number?: string | null;
    supplier_name?: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    due_date?: string | null;
    due_date_formatted?: string | null;
    days_due?: number | null;
    assigned_to?: { id: number; name: string } | null;
    assigned_by?: { id: number; name: string } | null;
    created_at?: string;
    completed_at?: string | null;
    archived_at?: string | null;
}

export interface UserOption {
    id: number;
    name: string;
    role: string;
}

interface Props {
    embedded?: boolean;
    tasks?: AssignedTask[];
    usersList?: UserOption[];
    poNumbers?: string[];
    onOpenInfo?: () => void;
}

interface SearchablePoSelectProps {
    value: string;
    onChange: (value: string) => void;
    poNumbers: string[];
    placeholder?: string;
    id?: string;
}

function SearchablePoSelect({
    value,
    onChange,
    poNumbers = [],
    placeholder = 'Search PO Number...',
    id,
}: SearchablePoSelectProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const options = useMemo(() => {
        const list = [...poNumbers];
        if (value && !list.includes(value)) {
            list.unshift(value);
        }
        return list;
    }, [poNumbers, value]);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        'mt-1 flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring font-normal text-left cursor-pointer',
                        !value && 'text-muted-foreground'
                    )}
                >
                    <span className="truncate">{value || placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent 
                className="p-0 z-50 w-(--radix-popover-trigger-width) min-w-[220px]" 
                align="start"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
            >
                <Command>
                    <CommandInput 
                        placeholder={placeholder} 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty className="py-2.5 px-3 text-center text-xs">
                            <div className="text-neutral-500 mb-1.5">No PO Number found.</div>
                            {searchQuery.trim() && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(searchQuery.trim());
                                        setOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className="w-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer py-1"
                                >
                                    Use &quot;{searchQuery.trim()}&quot;
                                </button>
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="none not po-specific clear"
                                onSelect={() => {
                                    onChange('');
                                    setOpen(false);
                                    setSearchQuery('');
                                }}
                                className="cursor-pointer text-xs"
                            >
                                <Check
                                    className={cn(
                                        'mr-2 h-4 w-4 shrink-0',
                                        !value ? 'opacity-100 text-indigo-600 dark:text-indigo-400' : 'opacity-0'
                                    )}
                                />
                                <span className="text-neutral-500 italic">None / Not PO-specific</span>
                            </CommandItem>
                            {options.map((po) => (
                                <CommandItem
                                    key={po}
                                    value={po}
                                    onSelect={() => {
                                        onChange(po);
                                        setOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className="cursor-pointer text-xs"
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4 shrink-0',
                                            value === po ? 'opacity-100 text-indigo-600 dark:text-indigo-400' : 'opacity-0'
                                        )}
                                    />
                                    <span>{po}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export function AssignedTasks({
    embedded = false,
    tasks = [],
    usersList = [],
    poNumbers = [],
    onOpenInfo,
}: Props) {
    const { auth } = usePage<any>().props;
    const currentUserId = auth?.user?.id;

    // Scope: Tasks assigned to the current user vs tasks assigned by the current user to others
    const [taskScope, setTaskScope] = useState<'to_me' | 'by_me'>('to_me');
    const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');

    // Bulk selection state
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [isBulkArchiveConfirmOpen, setIsBulkArchiveConfirmOpen] = useState(false);
    const [bulkArchiveMode, setBulkArchiveMode] = useState<'all' | 'selected'>('all');

    // Modals state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [selectedDetailTask, setSelectedDetailTask] = useState<AssignedTask | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Edit Modal state (for Assigner)
    const [taskToEdit, setTaskToEdit] = useState<AssignedTask | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        id: '',
        title: '',
        description: '',
        po_number: '',
        assigned_to: '',
        priority: 'normal' as TaskPriority,
        due_date: '',
    });

    // Delete Modal state (for Assigner)
    const [taskToDelete, setTaskToDelete] = useState<AssignedTask | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Loading indicators
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [archivingTaskId, setArchivingTaskId] = useState<string | null>(null);
    const [isBulkArchiving, setIsBulkArchiving] = useState(false);

    // Form state for "Assign Task"
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        po_number: '',
        assigned_to: currentUserId ? String(currentUserId) : '',
        priority: 'normal' as TaskPriority,
        due_date: new Date().toISOString().split('T')[0],
    });

    // Reset selection when changing scope or status filter
    const handleSetTaskScope = (scope: 'to_me' | 'by_me') => {
        setTaskScope(scope);
        setSelectedTaskIds(new Set());
    };

    const handleSetStatusFilter = (filter: 'pending' | 'completed' | 'all') => {
        setStatusFilter(filter);
        setSelectedTaskIds(new Set());
    };

    // Counts for scope pills (self-assigned tasks appear in both)
    const toMePendingCount = useMemo(() => {
        return tasks.filter(t => t.assigned_to?.id === currentUserId && t.status !== 'completed').length;
    }, [tasks, currentUserId]);

    const byMePendingCount = useMemo(() => {
        return tasks.filter(t => t.assigned_by?.id === currentUserId && t.status !== 'completed').length;
    }, [tasks, currentUserId]);

    // Tasks filtered by scope (self-assigned tasks appear in both)
    const scopedTasks = useMemo(() => {
        if (taskScope === 'by_me') {
            return tasks.filter(t => t.assigned_by?.id === currentUserId);
        }
        return tasks.filter(t => t.assigned_to?.id === currentUserId);
    }, [tasks, taskScope, currentUserId]);

    // Sub-counts for status within the current scope
    const currentScopeCounts = useMemo(() => {
        return {
            all: scopedTasks.length,
            pending: scopedTasks.filter(t => t.status !== 'completed').length,
            completed: scopedTasks.filter(t => t.status === 'completed').length,
        };
    }, [scopedTasks]);

    // Final list of tasks for the current filters
    const filteredTasks = useMemo(() => {
        if (statusFilter === 'all') return scopedTasks;
        if (statusFilter === 'completed') return scopedTasks.filter(t => t.status === 'completed');
        return scopedTasks.filter(t => t.status !== 'completed');
    }, [scopedTasks, statusFilter]);

    // Handlers
    const handleCreateTask = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.assigned_to) return;

        setIsSubmitting(true);
        router.post('/tasks', formData, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Task assigned successfully.', { id: 'task-assigned-success' });
                setIsAssignModalOpen(false);
                setFormData({
                    title: '',
                    description: '',
                    po_number: '',
                    assigned_to: currentUserId ? String(currentUserId) : '',
                    priority: 'normal',
                    due_date: new Date().toISOString().split('T')[0],
                });
            },
            onError: (errors) => {
                const first = Object.values(errors)[0] as string;
                toast.error(first || 'Failed to assign task. Please check the inputs.');
            },
            onFinish: () => setIsSubmitting(false),
        });
    }, [formData, currentUserId]);

    const handleToggleStatus = useCallback((task: AssignedTask, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        // Guard: Only the assignee can mark complete/uncomplete
        if (task.assigned_to?.id !== currentUserId) {
            return;
        }

        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        setUpdatingTaskId(task.id);

        router.patch(`/tasks/${task.id}/status`, { status: newStatus }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success(newStatus === 'completed' ? 'Task marked as completed.' : 'Task marked as pending.', { id: 'task-status-toggle' });
                if (selectedDetailTask && selectedDetailTask.id === task.id) {
                    setSelectedDetailTask(prev => prev ? { ...prev, status: newStatus } : null);
                }
            },
            onError: () => {
                toast.error('Failed to update task status.');
            },
            onFinish: () => setUpdatingTaskId(null),
        });
    }, [currentUserId, selectedDetailTask]);

    const handleArchiveTask = useCallback((task: AssignedTask, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        // Only assignee or assigner can archive
        if (task.assigned_to?.id !== currentUserId && task.assigned_by?.id !== currentUserId) {
            return;
        }

        setArchivingTaskId(task.id);
        router.patch(`/tasks/${task.id}/archive`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Task archived successfully.', { id: 'task-archive-success' });
                setSelectedTaskIds(prev => {
                    if (prev.has(task.id)) {
                        const next = new Set(prev);
                        next.delete(task.id);
                        return next;
                    }
                    return prev;
                });
                if (selectedDetailTask && selectedDetailTask.id === task.id) {
                    setIsDetailModalOpen(false);
                    setSelectedDetailTask(null);
                }
            },
            onError: () => {
                toast.error('Failed to archive task.');
            },
            onFinish: () => setArchivingTaskId(null),
        });
    }, [currentUserId, selectedDetailTask]);

    const completedTasksInView = useMemo(() => {
        return filteredTasks.filter(t => 
            t.status?.toLowerCase() === 'completed' || 
            t.status?.toLowerCase() === 'archived' || 
            Boolean(t.completed_at)
        );
    }, [filteredTasks]);

    const handleToggleSelectTask = useCallback((taskId: string, e?: React.MouseEvent | React.ChangeEvent) => {
        if (e && 'stopPropagation' in e) e.stopPropagation();
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    }, []);

    const handleToggleSelectAll = useCallback(() => {
        if (selectedTaskIds.size === completedTasksInView.length && completedTasksInView.length > 0) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(completedTasksInView.map(t => t.id)));
        }
    }, [completedTasksInView, selectedTaskIds]);

    const handleOpenArchiveSelectedConfirm = useCallback(() => {
        if (selectedTaskIds.size === 0) return;
        setBulkArchiveMode('selected');
        setIsBulkArchiveConfirmOpen(true);
    }, [selectedTaskIds]);

    const handleOpenArchiveAllConfirm = useCallback(() => {
        if (completedTasksInView.length === 0) return;
        setBulkArchiveMode('all');
        setIsBulkArchiveConfirmOpen(true);
    }, [completedTasksInView]);

    const handleConfirmBulkArchive = useCallback(() => {
        const taskIdsToArchive = bulkArchiveMode === 'selected'
            ? Array.from(selectedTaskIds)
            : completedTasksInView.map(t => t.id);

        if (taskIdsToArchive.length === 0) return;

        setIsBulkArchiving(true);
        router.post('/tasks/bulk-archive', { task_ids: taskIdsToArchive }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success(`${taskIdsToArchive.length} task(s) archived successfully.`, { id: 'bulk-archive-success' });
                setIsBulkArchiveConfirmOpen(false);
                setSelectedTaskIds(new Set());
            },
            onError: () => {
                toast.error('Failed to archive tasks.');
            },
            onFinish: () => setIsBulkArchiving(false),
        });
    }, [bulkArchiveMode, selectedTaskIds, completedTasksInView]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        router.reload({
            onSuccess: () => {
                toast.success('Tasks refreshed.', { id: 'tasks-refresh-success' });
            },
            onFinish: () => setIsRefreshing(false),
        });
    }, []);

    const handleOpenDetail = useCallback((task: AssignedTask, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedDetailTask(task);
        setIsDetailModalOpen(true);
    }, []);

    const handleOpenEdit = useCallback((task: AssignedTask, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        // Guard: Completed or archived tasks cannot be edited
        if (task.status === 'completed' || task.status === 'archived' || Boolean(task.completed_at)) {
            toast.error('Completed tasks cannot be edited or transferred.');
            return;
        }
        setTaskToEdit(task);
        setEditFormData({
            id: task.id,
            title: task.title,
            description: task.description || '',
            po_number: task.po_number || '',
            assigned_to: task.assigned_to ? String(task.assigned_to.id) : '',
            priority: task.priority || 'normal',
            due_date: task.due_date || '',
        });
        setIsEditModalOpen(true);
    }, []);

    const handleUpdateTask = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!editFormData.id || !editFormData.title.trim() || !editFormData.assigned_to) return;

        setIsSubmitting(true);
        router.patch(`/tasks/${editFormData.id}`, editFormData, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Task updated successfully.', { id: 'task-update-success' });
                setIsEditModalOpen(false);
                setTaskToEdit(null);
                if (selectedDetailTask && selectedDetailTask.id === editFormData.id) {
                    setIsDetailModalOpen(false);
                    setSelectedDetailTask(null);
                }
            },
            onError: (errors) => {
                const first = Object.values(errors)[0] as string;
                toast.error(first || 'Failed to update task.');
            },
            onFinish: () => setIsSubmitting(false),
        });
    }, [editFormData, selectedDetailTask]);

    const handleOpenDelete = useCallback((task: AssignedTask, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        // Guard: Completed or archived tasks cannot be deleted
        if (task.status === 'completed' || task.status === 'archived' || Boolean(task.completed_at)) {
            toast.error('Completed tasks cannot be deleted.');
            return;
        }
        setTaskToDelete(task);
        setIsDeleteModalOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!taskToDelete) return;

        setIsDeleting(true);
        router.delete(`/tasks/${taskToDelete.id}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Task deleted successfully.', { id: 'task-delete-success' });
                setIsDeleteModalOpen(false);
                setTaskToDelete(null);
                if (selectedDetailTask && selectedDetailTask.id === taskToDelete.id) {
                    setIsDetailModalOpen(false);
                    setSelectedDetailTask(null);
                }
            },
            onError: () => {
                toast.error('Failed to delete task.');
            },
            onFinish: () => setIsDeleting(false),
        });
    }, [taskToDelete, selectedDetailTask]);

    const handleNavigateToRecord = useCallback((poNumber: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsDetailModalOpen(false);
        auditLogsHighlight(poNumber, '/purchase-orders');
        router.visit(`/purchase-orders?highlight_id=${encodeURIComponent(poNumber)}`);
    }, []);

    const getPriorityBadge = (priority: TaskPriority) => {
        switch (priority) {
            case 'urgent':
                return (
                    <span className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                        Urgent
                    </span>
                );
            case 'high':
                return (
                    <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                        High
                    </span>
                );
            case 'low':
                return (
                    <span className="inline-flex items-center rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
                        Low
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                        Normal
                    </span>
                );
        }
    };

    const getDueBadge = (daysDue?: number | null, isCompleted = false) => {
        if (isCompleted) {
            return (
                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    Completed
                </span>
            );
        }
        if (daysDue === undefined || daysDue === null) return null;
        if (daysDue < 0) {
            return (
                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30">
                    <AlertCircle className="size-3" />
                    Overdue by {Math.abs(daysDue)}d
                </span>
            );
        }
        if (daysDue === 0) {
            return (
                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                    <Clock className="size-3" />
                    Due Today
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800">
                <Calendar className="size-3" />
                In {daysDue}d
            </span>
        );
    };

    return (
        <div className={`relative flex h-full flex-col overflow-hidden ${embedded ? '' : 'rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900 shadow-xs'}`}>
            {/* Top Clean Header */}
            <div className="flex flex-col gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                {/* Row 1: Scope toggle & Primary Action Buttons */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800">
                        <button
                            type="button"
                            onClick={() => handleSetTaskScope('to_me')}
                            className={cn(
                                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                                taskScope === 'to_me'
                                    ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                            )}
                        >
                            Assigned to Me ({toMePendingCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSetTaskScope('by_me')}
                            className={cn(
                                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                                taskScope === 'by_me'
                                    ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                            )}
                        >
                            Assigned by Me ({byMePendingCount})
                        </button>
                    </div>

                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => setIsAssignModalOpen(true)}
                        className="h-7 gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs px-2.5 dark:bg-indigo-700 dark:hover:bg-indigo-800 cursor-pointer"
                    >
                        <Plus className="size-3.5" />
                        <span>Assign Task</span>
                    </Button>
                </div>

                {/* Row 2: Status sub-filter pills & Archive actions */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => handleSetStatusFilter('pending')}
                            className={cn(
                                "rounded-md px-2 py-0.5 font-medium transition-colors cursor-pointer",
                                statusFilter === 'pending'
                                    ? "bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                            )}
                        >
                            Pending ({currentScopeCounts.pending})
                        </button>
                        <span className="text-neutral-300 dark:text-neutral-700">•</span>
                        <button
                            type="button"
                            onClick={() => handleSetStatusFilter('completed')}
                            className={cn(
                                "rounded-md px-2 py-0.5 font-medium transition-colors cursor-pointer",
                                statusFilter === 'completed'
                                    ? "bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                            )}
                        >
                            Completed ({currentScopeCounts.completed})
                        </button>
                        <span className="text-neutral-300 dark:text-neutral-700">•</span>
                        <button
                            type="button"
                            onClick={() => handleSetStatusFilter('all')}
                            className={cn(
                                "rounded-md px-2 py-0.5 font-medium transition-colors cursor-pointer",
                                statusFilter === 'all'
                                    ? "bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                            )}
                        >
                            All ({currentScopeCounts.all})
                        </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsArchiveModalOpen(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title="View all archived tasks"
                        >
                            <Archive className="size-3.5" />
                            <span>View Archives</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Completed Tasks Summary & Bulk Archive Banner */}
            {statusFilter === 'completed' && filteredTasks.length > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 mt-2 rounded-lg bg-neutral-50/90 border border-neutral-200/80 dark:bg-neutral-800/50 dark:border-neutral-800 shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox
                            checked={completedTasksInView.length > 0 && selectedTaskIds.size === completedTasksInView.length}
                            onCheckedChange={handleToggleSelectAll}
                            className="size-4 cursor-pointer data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                        <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                            Select All ({completedTasksInView.length})
                        </span>
                    </label>

                    <div className="flex items-center gap-2">
                        {selectedTaskIds.size > 0 ? (
                            <button
                                type="button"
                                onClick={handleOpenArchiveSelectedConfirm}
                                disabled={isBulkArchiving}
                                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                                title={`Archive ${selectedTaskIds.size} selected completed task(s)`}
                            >
                                {isBulkArchiving ? (
                                    <Loader2 className="size-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                    <Archive className="size-3 text-indigo-600 dark:text-indigo-400" />
                                )}
                                <span>Archive Selected ({selectedTaskIds.size})</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleOpenArchiveAllConfirm}
                                disabled={isBulkArchiving || completedTasksInView.length === 0}
                                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                                title="Archive all completed tasks in this view"
                            >
                                {isBulkArchiving ? (
                                    <Loader2 className="size-3 animate-spin text-neutral-400" />
                                ) : (
                                    <Archive className="size-3 text-neutral-500" />
                                )}
                                <span>Archive All ({completedTasksInView.length})</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Task Items List */}
            <ScrollArea className="flex-1 min-h-0 pr-2 pt-2">
                {filteredTasks.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center text-center p-4">
                        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-2">
                            <CheckCircle2 className="size-5" />
                        </div>
                        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                            {statusFilter === 'completed' 
                                ? 'No completed tasks' 
                                : taskScope === 'by_me'
                                    ? 'No tasks currently assigned by you'
                                    : 'No pending tasks!'}
                        </h4>
                        <p className="mt-0.5 text-xs text-neutral-400 max-w-xs">
                            {taskScope === 'by_me'
                                ? 'Tasks you assign to team members will appear here so you can monitor their progress.'
                                : statusFilter === 'completed' 
                                    ? 'Tasks you complete can be archived to keep your list clean.'
                                    : 'You are all caught up. Use "+ Assign Task" above to assign new work.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 pb-2">
                        {filteredTasks.map((task) => {
                            const isCompleted = task.status?.toLowerCase() === 'completed' || task.status?.toLowerCase() === 'archived' || Boolean(task.completed_at);
                            const isUpdating = updatingTaskId === task.id;
                            const isAssignedToMe = task.assigned_to?.id === currentUserId;
                            const canEditOrDelete = taskScope === 'by_me' && task.assigned_by?.id === currentUserId && !isCompleted;
                            const isSelected = selectedTaskIds.has(task.id);

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleOpenDetail(task)}
                                    className={`group rounded-lg border p-2.5 transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-indigo-50/70 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700 shadow-2xs'
                                            : isCompleted
                                                ? 'bg-neutral-50/70 border-neutral-200 dark:bg-neutral-900/50 dark:border-neutral-800 opacity-85 hover:bg-neutral-100/70'
                                                : 'bg-white border-neutral-200/90 hover:border-indigo-400 hover:shadow-xs dark:bg-neutral-900 dark:border-neutral-800 dark:hover:border-indigo-600'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        {/* Completed indicator: Only selectable for bulk archive when in 'completed' view. In 'All', shows clean completed check badge */}
                                        {isCompleted ? (
                                            statusFilter === 'completed' ? (
                                                <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => handleToggleSelectTask(task.id)}
                                                        className="size-4 cursor-pointer data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                        aria-label={`Select completed task: ${task.title}`}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="pt-0.5 shrink-0">
                                                    <div
                                                        className="flex size-4 items-center justify-center rounded-[4px] bg-emerald-600 text-white dark:bg-emerald-500 shadow-2xs"
                                                        title="Completed"
                                                    >
                                                        <Check className="size-2.5 stroke-[3]" />
                                                    </div>
                                                </div>
                                            )
                                        ) : isAssignedToMe ? (
                                            <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleToggleStatus(task, e)}
                                                    disabled={isUpdating}
                                                    className="flex size-4 items-center justify-center rounded-[4px] border border-neutral-300 hover:border-indigo-500 hover:bg-indigo-50/40 dark:border-neutral-700 bg-white dark:bg-neutral-900 transition-colors cursor-pointer"
                                                    title="Mark as Completed"
                                                >
                                                    {isUpdating ? (
                                                        <Loader2 className="size-2.5 animate-spin text-neutral-400" />
                                                    ) : null}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="pt-0.5 shrink-0">
                                                <div className="size-4 rounded-[4px] border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-800/60" />
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            {/* Header: Priority, Title, and PO Jump Link */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                                    {getPriorityBadge(task.priority)}
                                                    <h4 className={`text-xs font-semibold truncate ${
                                                        isCompleted
                                                            ? 'line-through text-neutral-400 dark:text-neutral-500'
                                                            : 'text-neutral-900 dark:text-neutral-100'
                                                    }`}>
                                                        {task.title}
                                                    </h4>
                                                </div>

                                                {task.po_number && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleNavigateToRecord(task.po_number!, e)}
                                                        className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                                                        title="Go to purchase order record"
                                                    >
                                                        <span>Go to Task</span>
                                                        <ArrowUpRight className="size-3" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Notes / Description */}
                                            {task.description && (
                                                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 leading-relaxed">
                                                    {task.description}
                                                </p>
                                            )}

                                            {/* Footer: Metadata & Actions */}
                                            <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800/80 pt-1 text-[11px] text-neutral-400 flex-wrap">
                                                {/* Left: Attribution & PO */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {taskScope === 'by_me' ? (
                                                        <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                                                            <UserIcon className="size-3 text-indigo-500" />
                                                            <span>To: {task.assigned_to?.id === currentUserId ? 'Myself' : (task.assigned_to?.name || 'Unassigned')}</span>
                                                        </span>
                                                    ) : (
                                                        task.assigned_by && (
                                                            <span className="inline-flex items-center gap-1 text-neutral-500">
                                                                <UserIcon className="size-3" />
                                                                <span>By {task.assigned_by.id === currentUserId ? 'Me' : task.assigned_by.name}</span>
                                                            </span>
                                                        )
                                                    )}

                                                    {task.po_number && (
                                                        <span className="inline-flex items-center gap-1 text-neutral-500">
                                                            <FileText className="size-3 text-neutral-400" />
                                                            <span>{task.po_number}</span>
                                                        </span>
                                                    )}

                                                    {getDueBadge(task.days_due, isCompleted)}
                                                </div>

                                                {/* Right: Actions */}
                                                <div className="flex items-center gap-1.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                                                    {/* Archive action for completed tasks */}
                                                    {isCompleted && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleArchiveTask(task, e)}
                                                            disabled={archivingTaskId === task.id}
                                                            className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 cursor-pointer transition-colors shadow-2xs"
                                                            title="Archive this completed task"
                                                        >
                                                            {archivingTaskId === task.id ? (
                                                                <Loader2 className="size-3 animate-spin text-neutral-400" />
                                                            ) : (
                                                                <Archive className="size-3 text-neutral-500" />
                                                            )}
                                                            <span>Archive</span>
                                                        </button>
                                                    )}

                                                    {/* Assigner Actions: Edit & Delete (only in Assigned by Me) */}
                                                    {canEditOrDelete && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleOpenEdit(task, e)}
                                                                className="p-1 text-neutral-400 hover:text-indigo-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                                                title="Edit & Transfer Task"
                                                            >
                                                                <Pencil className="size-3" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleOpenDelete(task, e)}
                                                                className="p-1 text-neutral-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                                title="Delete Task"
                                                            >
                                                                <Trash2 className="size-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* "Task Details" Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="sm:max-w-lg w-full overflow-hidden p-0 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
                    {selectedDetailTask && (
                        <div className="flex flex-col w-full min-w-0">
                            <DialogHeader className="p-5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center justify-between gap-2 pr-6">
                                    <div className="flex items-center gap-2">
                                        {getPriorityBadge(selectedDetailTask.priority)}
                                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                                            selectedDetailTask.status === 'completed'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                        }`}>
                                            {selectedDetailTask.status === 'completed' ? 'Completed' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                                <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-2 leading-snug">
                                    {selectedDetailTask.title}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    Assigned task details and actions
                                </DialogDescription>
                            </DialogHeader>

                            <div className="p-5 space-y-3.5 text-xs overflow-y-auto max-h-[60vh]">
                                {/* Associated PO banner */}
                                {selectedDetailTask.po_number && (
                                    <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50">
                                        <div className="flex items-center gap-1 font-bold text-indigo-950 dark:text-indigo-200">
                                            <FileText className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                                            <span>{selectedDetailTask.po_number}</span>
                                        </div>
                                        {selectedDetailTask.supplier_name && (
                                            <div className="flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 truncate">
                                                <Building2 className="size-3 text-neutral-400 shrink-0" />
                                                <span className="truncate">{selectedDetailTask.supplier_name}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Instructions / Description */}
                                <div>
                                    <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                                        Notes / Instructions
                                    </div>
                                    <div className="max-h-40 overflow-y-auto p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                                        {selectedDetailTask.description || (
                                            <span className="italic text-neutral-400">No additional notes provided for this task.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Metadata Grid: Due Date & Assignee */}
                                <div className="grid grid-cols-2 gap-2.5 pt-1 text-neutral-600 dark:text-neutral-400">
                                    <div className="p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                                        <span className="text-[10px] text-neutral-400 block uppercase font-medium">Due Date</span>
                                        <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-neutral-900 dark:text-neutral-100">
                                            <CalendarDays className="size-3.5 text-neutral-400" />
                                            <span>{selectedDetailTask.due_date_formatted || selectedDetailTask.due_date || 'No deadline'}</span>
                                        </div>
                                        <div className="mt-1.5">
                                            {getDueBadge(selectedDetailTask.days_due, selectedDetailTask.status === 'completed')}
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                                        <span className="text-[10px] text-neutral-400 block uppercase font-medium">Assigned To</span>
                                        <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                            <UserIcon className="size-3.5 text-indigo-500 shrink-0" />
                                            <span className="truncate">
                                                {selectedDetailTask.assigned_to?.id === currentUserId 
                                                    ? 'Me' 
                                                    : selectedDetailTask.assigned_to?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                        
                                        <div className="mt-1 text-[11px]">
                                            {selectedDetailTask.status === 'completed' ? (
                                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <Check className="size-3 stroke-[2.5]" />
                                                    Completed {selectedDetailTask.completed_at ? `(${selectedDetailTask.completed_at})` : ''}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                    <Clock className="size-3" />
                                                    Pending
                                                </span>
                                            )}
                                        </div>

                                        {selectedDetailTask.assigned_by && (
                                            <span className="text-[10px] text-neutral-400 block mt-1 truncate border-t border-neutral-200/60 dark:border-neutral-700/60 pt-1">
                                                By: {selectedDetailTask.assigned_by.name} {selectedDetailTask.created_at ? `• ${selectedDetailTask.created_at}` : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Clean Modal Footer */}
                            <DialogFooter className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsDetailModalOpen(false)}
                                        className="h-8 text-xs cursor-pointer"
                                    >
                                        Close
                                    </Button>

                                    {/* Assigner Actions: Edit & Delete in Details Modal (only in Assigned by Me and NOT completed) */}
                                    {taskScope === 'by_me' && 
                                        selectedDetailTask.assigned_by?.id === currentUserId && 
                                        selectedDetailTask.status !== 'completed' && 
                                        selectedDetailTask.status !== 'archived' && 
                                        !selectedDetailTask.completed_at && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setIsDetailModalOpen(false);
                                                    handleOpenEdit(selectedDetailTask);
                                                }}
                                                className="h-8 text-xs gap-1 text-neutral-700 hover:text-indigo-600 dark:text-neutral-300 cursor-pointer"
                                            >
                                                <Pencil className="size-3" />
                                                <span>Edit</span>
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setIsDetailModalOpen(false);
                                                    handleOpenDelete(selectedDetailTask);
                                                }}
                                                className="h-8 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:border-rose-300 dark:text-rose-400 cursor-pointer"
                                            >
                                                <Trash2 className="size-3" />
                                                <span>Delete</span>
                                            </Button>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    {/* Archive action for completed task */}
                                    {selectedDetailTask.status === 'completed' && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleArchiveTask(selectedDetailTask)}
                                            disabled={archivingTaskId === selectedDetailTask.id}
                                            className="h-8 text-xs gap-1.5 text-neutral-700 hover:text-indigo-600 dark:text-neutral-300 dark:hover:text-indigo-400 cursor-pointer"
                                            title="Move this task to archives"
                                        >
                                            {archivingTaskId === selectedDetailTask.id ? (
                                                <Loader2 className="size-3 animate-spin" />
                                            ) : (
                                                <Archive className="size-3 text-neutral-500" />
                                            )}
                                            <span>Archive Task</span>
                                        </Button>
                                    )}

                                    {/* Status toggle: only assignee can mark complete/uncomplete */}
                                    {selectedDetailTask.assigned_to?.id === currentUserId && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleStatus(selectedDetailTask)}
                                            disabled={updatingTaskId === selectedDetailTask.id}
                                            className="h-8 text-xs gap-1.5 cursor-pointer"
                                        >
                                            {updatingTaskId === selectedDetailTask.id ? (
                                                <Loader2 className="size-3 animate-spin" />
                                            ) : selectedDetailTask.status === 'completed' ? (
                                                <>
                                                    <Clock className="size-3 text-amber-600" />
                                                    <span>Mark as Pending</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="size-3 text-emerald-600" />
                                                    <span>Mark as Completed</span>
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {/* Direct jump to PO record */}
                                    {selectedDetailTask.po_number && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleNavigateToRecord(selectedDetailTask.po_number!)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs gap-1 font-semibold cursor-pointer shadow-xs"
                                        >
                                            <span>Go to PO Record</span>
                                            <ArrowUpRight className="size-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* "Assign Task" Dialog */}
            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCreateTask}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                                <ListTodo className="size-4 text-indigo-600" />
                                Assign New Task
                            </DialogTitle>
                            <DialogDescription className="text-xs text-neutral-500">
                                Assign operational responsibility to a staff member or colleague.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3.5 py-3">
                            <div>
                                <Label htmlFor="title" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Task Title <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Follow up on supplier delivery"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="mt-1"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="assigned_to" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Assign To <span className="text-rose-500">*</span>
                                </Label>
                                <Select
                                    value={formData.assigned_to}
                                    onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}
                                >
                                    <SelectTrigger id="assigned_to" className="mt-1 h-9">
                                        <SelectValue placeholder="Select staff..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-56">
                                        {usersList.map((user) => (
                                            <SelectItem key={user.id} value={String(user.id)}>
                                                {user.name} ({user.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="po_number" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Related P.O Number (Optional)
                                </Label>
                                {poNumbers && poNumbers.length > 0 ? (
                                    <SearchablePoSelect
                                        id="po_number"
                                        value={formData.po_number || ''}
                                        onChange={(val) => setFormData({ ...formData, po_number: val })}
                                        poNumbers={poNumbers}
                                        placeholder="Search PO Number..."
                                    />
                                ) : (
                                    <Input
                                        id="po_number"
                                        placeholder="e.g. PO-6772-3114"
                                        value={formData.po_number}
                                        onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                                        className="mt-1 h-9"
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="priority" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                        Priority
                                    </Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(val: TaskPriority) => setFormData({ ...formData, priority: val })}
                                    >
                                        <SelectTrigger id="priority" className="mt-1 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="due_date" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                        Due Date
                                    </Label>
                                    <Input
                                        id="due_date"
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="mt-1 h-9"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Notes / Instructions (Optional)
                                </Label>
                                <Textarea
                                    id="description"
                                    rows={2}
                                    placeholder="Add any specific details or steps..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="mt-1 text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAssignModalOpen(false)}
                                disabled={isSubmitting}
                                className="cursor-pointer"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !formData.title.trim() || !formData.assigned_to}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer"
                            >
                                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                                <span>Assign Task</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* "Edit & Transfer Task" Dialog (For Assigner) */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleUpdateTask}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                                <Pencil className="size-4 text-indigo-600" />
                                Edit & Transfer Task
                            </DialogTitle>
                            <DialogDescription className="text-xs text-neutral-500">
                                Modify task instructions or reassign this task to another team member.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3.5 py-3">
                            <div>
                                <Label htmlFor="edit_title" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Task Title <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    id="edit_title"
                                    value={editFormData.title}
                                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                    className="mt-1"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="edit_assigned_to" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Reassign / Transfer To <span className="text-rose-500">*</span>
                                </Label>
                                <Select
                                    value={editFormData.assigned_to}
                                    onValueChange={(val) => setEditFormData({ ...editFormData, assigned_to: val })}
                                >
                                    <SelectTrigger id="edit_assigned_to" className="mt-1 h-9">
                                        <SelectValue placeholder="Select staff..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-56">
                                        {usersList.map((user) => (
                                            <SelectItem key={user.id} value={String(user.id)}>
                                                {user.name} ({user.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="edit_po_number" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Related P.O Number (Optional)
                                </Label>
                                {poNumbers && poNumbers.length > 0 ? (
                                    <SearchablePoSelect
                                        id="edit_po_number"
                                        value={editFormData.po_number || ''}
                                        onChange={(val) => setEditFormData({ ...editFormData, po_number: val })}
                                        poNumbers={poNumbers}
                                        placeholder="Search PO Number..."
                                    />
                                ) : (
                                    <Input
                                        id="edit_po_number"
                                        placeholder="e.g. PO-6772-3114"
                                        value={editFormData.po_number}
                                        onChange={(e) => setEditFormData({ ...editFormData, po_number: e.target.value })}
                                        className="mt-1 h-9"
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="edit_priority" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                        Priority
                                    </Label>
                                    <Select
                                        value={editFormData.priority}
                                        onValueChange={(val: TaskPriority) => setEditFormData({ ...editFormData, priority: val })}
                                    >
                                        <SelectTrigger id="edit_priority" className="mt-1 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="edit_due_date" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                        Due Date
                                    </Label>
                                    <Input
                                        id="edit_due_date"
                                        type="date"
                                        value={editFormData.due_date}
                                        onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                                        className="mt-1 h-9"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="edit_description" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Notes / Instructions (Optional)
                                </Label>
                                <Textarea
                                    id="edit_description"
                                    rows={2}
                                    placeholder="Add any specific details or steps..."
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    className="mt-1 text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSubmitting}
                                className="cursor-pointer"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !editFormData.title.trim() || !editFormData.assigned_to}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer"
                            >
                                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                                <span>Save Changes</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* "Delete Task" Confirmation Dialog (For Assigner) */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                                <Trash2 className="size-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                    Delete Assigned Task
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 mt-0.5">
                                    This action will permanently delete this task record from the system.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {taskToDelete && (
                        <div className="my-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-xs">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">{taskToDelete.title}</span>
                            {taskToDelete.assigned_to && (
                                <span className="text-neutral-500 dark:text-neutral-400 mt-1 block">
                                    Assigned to: {taskToDelete.assigned_to.name}
                                </span>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isDeleting}
                            className="cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 cursor-pointer"
                        >
                            {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
                            <span>Delete Task</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Archive Confirmation Dialog */}
            <Dialog open={isBulkArchiveConfirmOpen} onOpenChange={setIsBulkArchiveConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                <Archive className="size-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                    {bulkArchiveMode === 'all' ? 'Archive All Completed Tasks' : 'Archive Selected Tasks'}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 mt-0.5">
                                    {bulkArchiveMode === 'all'
                                        ? `Move all ${completedTasksInView.length} completed task(s) to the archives.`
                                        : `Move ${selectedTaskIds.size} selected completed task(s) to the archives.`}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 my-2">
                        {bulkArchiveMode === 'all' ? (
                            <>
                                Are you sure you want to archive all <strong>{completedTasksInView.length}</strong> completed task(s) in this view? They will be moved from this dashboard view to the completed tasks archive.
                            </>
                        ) : (
                            <>
                                Are you sure you want to archive <strong>{selectedTaskIds.size}</strong> selected task(s)? They will be moved from this dashboard view to the completed tasks archive.
                            </>
                        )}
                    </p>

                    <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBulkArchiveConfirmOpen(false)}
                            disabled={isBulkArchiving}
                            className="cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmBulkArchive}
                            disabled={isBulkArchiving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer"
                        >
                            {isBulkArchiving && <Loader2 className="size-3.5 animate-spin" />}
                            <span>
                                {bulkArchiveMode === 'all'
                                    ? `Archive All (${completedTasksInView.length})`
                                    : `Archive Selected (${selectedTaskIds.size})`}
                            </span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Historical Archived Tasks Modal */}
            <TaskArchiveModal
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                currentUserId={currentUserId}
            />
        </div>
    );
}
