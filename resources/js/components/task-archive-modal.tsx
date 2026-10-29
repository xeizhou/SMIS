import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { 
    Archive, 
    Search, 
    X, 
    Calendar, 
    User, 
    FileText, 
    ArrowUpRight, 
    ChevronLeft, 
    ChevronRight, 
    Loader2, 
    Download, 
    RotateCcw,
    CheckCircle2,
    Building2,
    CalendarDays,
    Clock,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';
import { TaskPriority } from './assigned-tasks';

export interface ArchivedTaskItem {
    id: string;
    title: string;
    description?: string | null;
    po_number?: string | null;
    priority: TaskPriority;
    status: string;
    due_date?: string | null;
    due_date_formatted?: string | null;
    completed_at?: string | null;
    completed_at_formatted?: string | null;
    assigned_to?: { id: number; name: string } | null;
    assigned_by?: { id: number; name: string } | null;
}

export interface ArchivePagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    data: ArchivedTaskItem[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: number;
}

export function TaskArchiveModal({ isOpen, onClose, currentUserId }: Props) {
    const [search, setSearch] = useState('');
    const [submittedSearch, setSubmittedSearch] = useState('');
    const [period, setPeriod] = useState<string>('all');
    const [scope, setScope] = useState<'all' | 'to_me' | 'by_me'>('all');
    const [priority, setPriority] = useState<string>('all');

    const [isLoading, setIsLoading] = useState(false);
    const [pagination, setPagination] = useState<ArchivePagination | null>(null);
    const [reopeningTaskId, setReopeningTaskId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<ArchivedTaskItem | null>(null);

    // Multi-select bulk unarchive state
    const [selectedArchiveIds, setSelectedArchiveIds] = useState<Set<string>>(new Set());
    const [isBulkUnarchiveConfirmOpen, setIsBulkUnarchiveConfirmOpen] = useState(false);
    const [isBulkUnarchiving, setIsBulkUnarchiving] = useState(false);

    const fetchArchive = useCallback(async (targetPage = 1, currentSearch = submittedSearch) => {
        setIsLoading(true);
        setSelectedArchiveIds(new Set());
        try {
            const params = new URLSearchParams({
                page: String(targetPage),
                period,
                scope,
                search: currentSearch.trim(),
            });
            if (priority !== 'all') {
                params.append('priority', priority);
            }

            const res = await fetch(`/tasks/archive?${params.toString()}`, {
                headers: {
                    Accept: 'application/json',
                },
            });
            if (!res.ok) throw new Error('Failed to fetch archive');
            const data: ArchivePagination = await res.json();
            setPagination(data);
        } catch (error) {
            console.error('Failed to load tasks archive:', error);
        } finally {
            setIsLoading(false);
        }
    }, [period, scope, priority, submittedSearch]);

    // Initial fetch when opened or filters change
    useEffect(() => {
        if (isOpen) {
            fetchArchive(1);
        } else {
            setSelectedArchiveIds(new Set());
        }
    }, [isOpen, period, scope, priority, submittedSearch, fetchArchive]);

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSubmittedSearch(search);
    };

    const handleClearSearch = () => {
        setSearch('');
        setSubmittedSearch('');
    };

    const handleExport = () => {
        const params = new URLSearchParams({
            period,
            scope,
            search: submittedSearch.trim(),
        });
        if (priority !== 'all') {
            params.append('priority', priority);
        }
        window.location.href = `/tasks/archive/export?${params.toString()}`;
    };

    const handleUnarchiveTask = (task: ArchivedTaskItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.assigned_to?.id !== currentUserId && task.assigned_by?.id !== currentUserId) return;

        setReopeningTaskId(task.id);
        router.patch(`/tasks/${task.id}/unarchive`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Task restored from archive.', { id: 'single-unarchive-success' });
                fetchArchive(pagination?.current_page || 1);
                if (selectedTask?.id === task.id) {
                    setSelectedTask(null);
                }
            },
            onError: () => {
                toast.error('Failed to restore task.');
            },
            onFinish: () => setReopeningTaskId(null),
        });
    };

    const handleConfirmBulkUnarchive = useCallback(() => {
        if (selectedArchiveIds.size === 0) return;

        setIsBulkUnarchiving(true);
        const taskIdsArray = Array.from(selectedArchiveIds);
        router.post('/tasks/bulk-unarchive', { task_ids: taskIdsArray }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success(`${taskIdsArray.length} task(s) restored from archive.`, { id: 'bulk-unarchive-success' });
                setSelectedArchiveIds(new Set());
                setIsBulkUnarchiveConfirmOpen(false);
                fetchArchive(pagination?.current_page || 1);
            },
            onError: () => {
                toast.error('Failed to restore selected tasks.');
            },
            onFinish: () => setIsBulkUnarchiving(false),
        });
    }, [selectedArchiveIds, pagination, fetchArchive]);

    const handleNavigateToRecord = (poNumber: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
        auditLogsHighlight(poNumber, '/purchase-orders');
        router.visit(`/purchase-orders?highlight_id=${encodeURIComponent(poNumber)}`);
    };

    const getPriorityBadge = (p: TaskPriority) => {
        switch (p) {
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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl w-full p-0 gap-0 overflow-hidden sm:max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
                {/* Header */}
                <DialogHeader className="p-5 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                <Archive className="size-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                    Task Archives
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                    Browse, search, and restore tasks that have been archived from the dashboard.
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={selectedArchiveIds.size === 0 || isBulkUnarchiving}
                                onClick={() => setIsBulkUnarchiveConfirmOpen(true)}
                                className="h-8 gap-1.5 text-xs text-neutral-700 hover:text-indigo-600 dark:text-neutral-300 dark:hover:text-indigo-400 cursor-pointer disabled:opacity-40"
                            >
                                <RotateCcw className="size-3.5" />
                                <span>Unarchive Selected {selectedArchiveIds.size > 0 ? `(${selectedArchiveIds.size})` : ''}</span>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                className="h-8 gap-1.5 text-xs text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100 cursor-pointer"
                            >
                                <Download className="size-3.5" />
                                <span>Export CSV</span>
                            </Button>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
                        {/* Search Input */}
                        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search title, description, PO number..."
                                className="h-8 pl-8 pr-7 text-xs bg-neutral-50/60 border-neutral-200 dark:bg-neutral-800/50 dark:border-neutral-700"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>

                        {/* Date Period Filter */}
                        <Select value={period} onValueChange={(val) => setPeriod(val)}>
                            <SelectTrigger className="h-8 w-[170px] text-xs bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="older_than_30_days">Older than 30 Days</SelectItem>
                                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                                <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                                <SelectItem value="this_year">This Year</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Scope Filter */}
                        <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 text-xs dark:border-neutral-800 dark:bg-neutral-950">
                            <button
                                type="button"
                                onClick={() => setScope('all')}
                                className={cn(
                                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                                    scope === 'all'
                                        ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                                )}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setScope('to_me')}
                                className={cn(
                                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                                    scope === 'to_me'
                                        ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                                )}
                            >
                                To Me
                            </button>
                            <button
                                type="button"
                                onClick={() => setScope('by_me')}
                                className={cn(
                                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                                    scope === 'by_me'
                                        ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                                )}
                            >
                                By Me
                            </button>
                        </div>

                        {/* Priority Filter */}
                        <Select value={priority} onValueChange={(val) => setPriority(val)}>
                            <SelectTrigger className="h-8 w-[110px] text-xs bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Priority: All</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </DialogHeader>

                {/* Content Area */}
                <ScrollArea className="flex-1 max-h-[58vh] p-5">
                    {isLoading ? (
                        <div className="flex h-56 flex-col items-center justify-center gap-2 text-neutral-400">
                            <Loader2 className="size-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                            <p className="text-xs">Loading archived tasks...</p>
                        </div>
                    ) : !pagination || pagination.data.length === 0 ? (
                        <div className="flex h-56 flex-col items-center justify-center text-center p-4">
                            <div className="flex size-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 mb-3">
                                <Archive className="size-5" />
                            </div>
                            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                                No archived tasks found
                            </h4>
                            <p className="mt-1 text-xs text-neutral-500 max-w-sm">
                                {submittedSearch || period !== 'all' || priority !== 'all' || scope !== 'all'
                                    ? 'No archived tasks match your active filters. Try broadening your search or resetting filters.'
                                    : 'Completed tasks that you explicitly archive from the dashboard will be stored here.'}
                            </p>
                            {(submittedSearch || period !== 'all' || priority !== 'all' || scope !== 'all') && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearch('');
                                        setSubmittedSearch('');
                                        setPeriod('all');
                                        setScope('all');
                                        setPriority('all');
                                    }}
                                    className="mt-3 h-7 text-xs"
                                >
                                    <RotateCcw className="size-3 mr-1" />
                                    <span>Reset Filters</span>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {/* Select All on Page Bar */}
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-neutral-50 border border-neutral-200/80 dark:bg-neutral-800/50 dark:border-neutral-800 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-600 dark:text-neutral-300 select-none">
                                    <Checkbox
                                        checked={pagination.data.length > 0 && pagination.data.every(t => selectedArchiveIds.has(t.id))}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedArchiveIds(new Set(pagination.data.map(t => t.id)));
                                            } else {
                                                setSelectedArchiveIds(new Set());
                                            }
                                        }}
                                        className="size-4 cursor-pointer data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                        aria-label="Select all on page"
                                    />
                                    <span>Select All on Page ({pagination.data.length})</span>
                                </label>

                                <span className="text-[11px] text-neutral-400">
                                    {selectedArchiveIds.size} selected
                                </span>
                            </div>

                            {pagination.data.map((task) => {
                                const isAssignedToMe = task.assigned_to?.id === currentUserId;
                                const isReopening = reopeningTaskId === task.id;

                                return (
                                    <div
                                        key={task.id}
                                        className="group rounded-lg border border-neutral-200/90 bg-white p-3.5 transition-all hover:border-neutral-300 hover:shadow-xs dark:border-neutral-800 dark:bg-neutral-900/90 dark:hover:border-neutral-700"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Item Selection Checkbox */}
                                            <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedArchiveIds.has(task.id)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedArchiveIds(prev => {
                                                            const next = new Set(prev);
                                                            if (checked) {
                                                                next.add(task.id);
                                                            } else {
                                                                next.delete(task.id);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="size-4 cursor-pointer data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                    aria-label={`Select ${task.title}`}
                                                />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                {/* Row 1: Priority, Title, Completion Date */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-2 min-w-0">
                                                        <div className="pt-0.5 shrink-0">
                                                            {getPriorityBadge(task.priority)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                                {task.title}
                                                            </h4>
                                                            {task.description && (
                                                                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
                                                                    {task.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Completed Timestamp */}
                                                    <div className="text-right shrink-0">
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 className="size-3" />
                                                            Completed
                                                        </span>
                                                        <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                                                            {task.completed_at_formatted || 'Finished'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Row 2: Metadata and Action Buttons */}
                                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800/80 pt-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {/* Linked PO */}
                                                        {task.po_number && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleNavigateToRecord(task.po_number!, e)}
                                                                className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50/70 px-2 py-0.5 font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 cursor-pointer transition-colors"
                                                                title="Jump to Purchase Order record"
                                                            >
                                                                <FileText className="size-3" />
                                                                <span>{task.po_number}</span>
                                                                <ArrowUpRight className="size-3" />
                                                            </button>
                                                        )}

                                                        {/* Supplier */}
                                                        {task.supplier_name && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]" title={task.supplier_name}>
                                                                <Building2 className="size-3 text-neutral-400 shrink-0" />
                                                                <span className="truncate">{task.supplier_name}</span>
                                                            </span>
                                                        )}

                                                        {/* Assigned To & By */}
                                                        <span className="inline-flex items-center gap-1 text-[11px]">
                                                            <User className="size-3 text-neutral-400" />
                                                            <span>
                                                                To: <strong className="font-semibold text-neutral-700 dark:text-neutral-300">{task.assigned_to?.id === currentUserId ? 'Me' : task.assigned_to?.name || 'Unassigned'}</strong>
                                                            </span>
                                                            {task.assigned_by && (
                                                                <span className="text-neutral-400">
                                                                    (by {task.assigned_by.name})
                                                                </span>
                                                            )}
                                                        </span>

                                                        {/* Due Date */}
                                                        {task.due_date_formatted && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                                                                <CalendarDays className="size-3 text-neutral-400" />
                                                                <span>Due: {task.due_date_formatted}</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Action: Restore task to dashboard */}
                                                    {(task.assigned_to?.id === currentUserId || task.assigned_by?.id === currentUserId) && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleUnarchiveTask(task, e)}
                                                            disabled={isReopening}
                                                            className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-indigo-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                                                            title="Restore this task back to the dashboard"
                                                        >
                                                            {isReopening ? (
                                                                <Loader2 className="size-3 animate-spin text-neutral-400" />
                                                            ) : (
                                                                <RotateCcw className="size-3" />
                                                            )}
                                                            <span>Restore to Dashboard</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer with Pagination */}
                <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/80 px-5 py-3">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {pagination && pagination.total > 0 ? (
                            <span>
                                Showing <strong className="font-semibold text-neutral-700 dark:text-neutral-200">{pagination.from}</strong> to <strong className="font-semibold text-neutral-700 dark:text-neutral-200">{pagination.to}</strong> of <strong className="font-semibold text-neutral-700 dark:text-neutral-200">{pagination.total}</strong> completed records
                            </span>
                        ) : (
                            <span>0 records</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination || pagination.current_page <= 1 || isLoading}
                            onClick={() => fetchArchive((pagination?.current_page || 1) - 1)}
                            className="h-8 gap-1 text-xs cursor-pointer"
                        >
                            <ChevronLeft className="size-3.5" />
                            <span>Previous</span>
                        </Button>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 px-1 font-medium">
                            Page {pagination?.current_page || 1} of {pagination?.last_page || 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination || pagination.current_page >= pagination.last_page || isLoading}
                            onClick={() => fetchArchive((pagination?.current_page || 1) + 1)}
                            className="h-8 gap-1 text-xs cursor-pointer"
                        >
                            <span>Next</span>
                            <ChevronRight className="size-3.5" />
                        </Button>
                    </div>
                </div>
            </DialogContent>

            {/* Bulk Unarchive Confirmation Dialog */}
            <Dialog open={isBulkUnarchiveConfirmOpen} onOpenChange={setIsBulkUnarchiveConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                <RotateCcw className="size-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                    Restore Selected Tasks
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 mt-0.5">
                                    Restore {selectedArchiveIds.size} task(s) back to the dashboard.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 my-2">
                        Are you sure you want to restore <strong>{selectedArchiveIds.size}</strong> selected task(s) back to the active dashboard?
                    </p>

                    <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBulkUnarchiveConfirmOpen(false)}
                            disabled={isBulkUnarchiving}
                            className="cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmBulkUnarchive}
                            disabled={isBulkUnarchiving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer"
                        >
                            {isBulkUnarchiving && <Loader2 className="size-3.5 animate-spin" />}
                            <span>Restore {selectedArchiveIds.size} Tasks</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}

