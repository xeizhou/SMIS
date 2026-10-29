import { useState, useEffect, useMemo } from 'react';
import { router, Link } from '@inertiajs/react';
import { 
    Bell, 
    Truck, 
    ListTodo, 
    Check, 
    CheckCheck, 
    Trash2, 
    X, 
    Clock, 
    BellOff,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { auditLogsHighlight } from '../pages/audit-logs/auditLogsHighlight';

export interface NotificationItem {
    id: string;
    type: 'delivery' | 'task' | 'system';
    title: string;
    message: string;
    supplier?: string | null;
    badge: string;
    badgeVariant: 'rose' | 'amber' | 'sky' | 'violet' | 'neutral';
    time: string;
    target_url: string;
    isOverdue?: boolean;
    isDueToday?: boolean;
    isDueSoon?: boolean;
    isRead: boolean;
}

export type NotificationPanelProps = {
    userNotifications?: any[];
    deliveries?: any[];
    recentDeliveries?: any[];
    assignedTasks?: any[];
};

export function NotificationPanel({ 
    userNotifications = [], 
    deliveries = [], 
    recentDeliveries = [],
    assignedTasks = [] 
}: NotificationPanelProps) {
    const [readIds, setReadIds] = useState<string[]>([]);
    const [clearedIds, setClearedIds] = useState<string[]>([]);
    const [clearingIds, setClearingIds] = useState<string[]>([]);
    const [isClearingAll, setIsClearingAll] = useState(false);
    const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'delivery' | 'task'>('all');
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('read_notifs');
            if (saved) {
                setReadIds(JSON.parse(saved));
            }
            const savedCleared = localStorage.getItem('cleared_notifs');
            if (savedCleared) {
                setClearedIds(JSON.parse(savedCleared));
            }
        } catch {}
        setIsLoaded(true);
    }, []);

    // Build normalized notification list
    const allNotifications = useMemo<NotificationItem[]>(() => {
        if (!isLoaded) return [];

        const notifMap = new Map<string, NotificationItem>();

        // 1. Process Deliveries (from recentDeliveries and deliveries)
        const combinedDeliveries = [...(deliveries || []), ...(recentDeliveries || [])];
        const seenDelIds = new Set<string>();

        combinedDeliveries.forEach((d: any) => {
            if (!d || !d.delivery_id) return;
            const delKey = String(d.delivery_id);
            if (seenDelIds.has(delKey)) return;
            seenDelIds.add(delKey);

            // Filter out completed deliveries
            if (d.status === 'COMPLETED' || d.status === 'CANCELLED') return;

            const idStr = `del-${delKey}`;
            if (clearedIds.includes(idStr)) return;

            const poNum = d.po_number || 'PO';
            const isOverdue = !!d.is_overdue;
            const daysOverdue = d.days_overdue ?? d.daysOverdue ?? 0;
            const diffDays = d.diff_days;
            const dueDateFormatted = d.due_date_formatted || d.due_date;
            const supplierName = d.supplier?.supplier_name || d.supplier_name;

            let badge = 'PENDING';
            let badgeVariant: NotificationItem['badgeVariant'] = 'neutral';
            let message = '';
            let isDueToday = false;
            let isDueSoon = false;

            if (isOverdue) {
                badge = daysOverdue > 0 ? `OVERDUE (${daysOverdue}d)` : 'OVERDUE';
                badgeVariant = 'rose';
                message = daysOverdue > 0 
                    ? `Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}${dueDateFormatted ? ` • Due ${dueDateFormatted}` : ''}`
                    : `Past delivery date${dueDateFormatted ? ` • Due ${dueDateFormatted}` : ''}`;
            } else if (d.due_date && diffDays === 0) {
                badge = 'DUE TODAY';
                badgeVariant = 'amber';
                message = dueDateFormatted 
                    ? `Delivery arrival scheduled for today (${dueDateFormatted})`
                    : 'Delivery arrival scheduled for today';
                isDueToday = true;
            } else if (d.due_date && diffDays === 1) {
                badge = 'DUE TOMORROW';
                badgeVariant = 'amber';
                message = dueDateFormatted 
                    ? `Delivery arrival expected tomorrow (${dueDateFormatted})`
                    : 'Delivery arrival expected tomorrow';
                isDueSoon = true;
            } else if (d.due_date && diffDays !== undefined && diffDays !== null && diffDays <= 7 && diffDays > 1) {
                badge = `IN ${diffDays} DAYS`;
                badgeVariant = 'sky';
                message = dueDateFormatted 
                    ? `Expected delivery in ${diffDays} days (${dueDateFormatted})`
                    : `Expected delivery in ${diffDays} days`;
                isDueSoon = true;
            } else if (dueDateFormatted) {
                badge = 'SCHEDULED';
                badgeVariant = 'neutral';
                message = `Scheduled delivery on ${dueDateFormatted}`;
            } else {
                badge = 'PENDING';
                badgeVariant = 'neutral';
                message = 'Awaiting delivery schedule';
            }

            notifMap.set(idStr, {
                id: idStr,
                type: 'delivery',
                title: poNum.startsWith('PO') ? poNum : `PO-${poNum}`,
                message,
                supplier: supplierName,
                badge,
                badgeVariant,
                time: d.time_ago || (dueDateFormatted ? `Due ${dueDateFormatted}` : 'Recently'),
                target_url: `/deliveries?highlight_id=${d.delivery_id}`,
                isOverdue,
                isDueToday,
                isDueSoon,
                isRead: readIds.includes(idStr),
            });
        });

        // 2. Process Assigned Tasks
        (assignedTasks || []).forEach((t: any) => {
            if (!t || !t.id || t.status === 'completed' || t.status === 'archived') return;
            const idStr = `task-${t.id}`;
            if (clearedIds.includes(idStr)) return;

            const isOverdue = t.days_due !== null && t.days_due !== undefined && t.days_due < 0;
            const isDueToday = t.days_due === 0;
            const isDueSoon = t.days_due !== null && t.days_due !== undefined && t.days_due > 0 && t.days_due <= 3;
            const isUrgent = t.priority === 'urgent';

            // Only notify for overdue, due today, due soon, or urgent tasks
            if (!isOverdue && !isDueToday && !isDueSoon && !isUrgent) return;

            let badge = t.priority ? t.priority.toUpperCase() : 'TASK';
            let badgeVariant: NotificationItem['badgeVariant'] = 'violet';
            let message = t.description ? t.description : `Assigned task: ${t.title}`;

            if (isOverdue) {
                const days = Math.abs(t.days_due);
                badge = `OVERDUE (${days}d)`;
                badgeVariant = 'rose';
                message = `Task overdue by ${days} day${days > 1 ? 's' : ''} • Due ${t.due_date_formatted || t.due_date}`;
            } else if (isDueToday) {
                badge = 'DUE TODAY';
                badgeVariant = 'amber';
                message = `Task deadline is today (${t.due_date_formatted || t.due_date})`;
            } else if (isUrgent) {
                badge = 'URGENT';
                badgeVariant = 'rose';
                message = `Urgent task • ${t.title}`;
            }

            notifMap.set(idStr, {
                id: idStr,
                type: 'task',
                title: t.title,
                message,
                supplier: t.po_number ? `Related to ${t.po_number}` : undefined,
                badge,
                badgeVariant,
                time: t.created_at || (t.due_date_formatted ? `Due ${t.due_date_formatted}` : 'Recently'),
                target_url: '/dashboard',
                isOverdue,
                isDueToday,
                isDueSoon,
                isRead: readIds.includes(idStr),
            });
        });

        // 3. Process Backend userNotifications
        (userNotifications || []).forEach((dbNotif: any) => {
            const idStr = `db_${dbNotif.id}`;
            if (clearedIds.includes(idStr)) return;

            const notifData = dbNotif.data || {};
            const msg = notifData.message || 'Notification alert';
            const targetUrl = notifData.target_url || '#';

            const dateObj = new Date(dbNotif.created_at);
            const isToday = dateObj.toDateString() === new Date().toDateString();
            const timeStr = isToday 
                ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                : dateObj.toLocaleDateString();

            notifMap.set(idStr, {
                id: idStr,
                type: 'system',
                title: 'System Notice',
                message: msg,
                badge: 'NOTICE',
                badgeVariant: 'neutral',
                time: timeStr,
                target_url: targetUrl,
                isRead: readIds.includes(idStr) || !!dbNotif.read_at,
            });
        });

        // Sort: Unread first, then Overdue first, then Due Today, then others
        return Array.from(notifMap.values()).sort((a, b) => {
            if (!a.isRead && b.isRead) return -1;
            if (a.isRead && !b.isRead) return 1;
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            if (a.isDueToday && !b.isDueToday) return -1;
            if (!a.isDueToday && b.isDueToday) return 1;
            return 0;
        });
    }, [deliveries, recentDeliveries, assignedTasks, userNotifications, readIds, clearedIds, isLoaded]);

    const filteredNotifications = useMemo(() => {
        return allNotifications.filter(n => {
            if (notifFilter === 'unread' && n.isRead) return false;
            if (typeFilter !== 'all' && n.type !== typeFilter) return false;
            return true;
        });
    }, [allNotifications, notifFilter, typeFilter]);

    const unreadCount = useMemo(() => {
        return allNotifications.filter(n => !n.isRead).length;
    }, [allNotifications]);

    const hasTasks = useMemo(() => allNotifications.some(n => n.type === 'task'), [allNotifications]);

    const toggleRead = (id: string) => {
        setReadIds(prev => {
            const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
            try {
                localStorage.setItem('read_notifs', JSON.stringify(next));
            } catch {}
            return next;
        });
    };

    const markAllAsRead = () => {
        const allIds = allNotifications.map(n => n.id);
        const unique = Array.from(new Set([...readIds, ...allIds]));
        setReadIds(unique);
        try {
            localStorage.setItem('read_notifs', JSON.stringify(unique));
        } catch {}
    };

    const dismissSingle = (id: string) => {
        setClearingIds(prev => [...prev, id]);
        setTimeout(() => {
            setClearedIds(prev => {
                const next = Array.from(new Set([...prev, id]));
                try {
                    localStorage.setItem('cleared_notifs', JSON.stringify(next));
                } catch {}
                return next;
            });
            setClearingIds(prev => prev.filter(item => item !== id));
        }, 200);
    };

    const clearAllNotifications = async () => {
        if (isClearingAll || allNotifications.length === 0) return;
        setIsClearingAll(true);
        
        const currentIds = allNotifications.map(n => n.id);
        setClearingIds(currentIds);

        await new Promise(resolve => setTimeout(resolve, 220));

        setClearedIds(prev => {
            const next = Array.from(new Set([...prev, ...currentIds]));
            try {
                localStorage.setItem('cleared_notifs', JSON.stringify(next));
            } catch {}
            return next;
        });

        router.post('/notifications/clear', {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['userNotifications']
        });

        setClearingIds([]);
        setIsClearingAll(false);
    };

    const handleItemClick = (notif: NotificationItem) => {
        if (!notif.isRead) {
            setReadIds(prev => {
                const next = Array.from(new Set([...prev, notif.id]));
                try {
                    localStorage.setItem('read_notifs', JSON.stringify(next));
                } catch {}
                return next;
            });
        }

        try {
            const url = new URL(notif.target_url, window.location.origin);
            const highlightId = url.searchParams.get('highlight_id');
            const highlightSearch = url.searchParams.get('highlight_search');
            if (highlightId) {
                auditLogsHighlight(highlightId, url.pathname);
            } else if (highlightSearch) {
                auditLogsHighlight(highlightSearch, url.pathname);
            }
        } catch {}
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="relative size-8 cursor-pointer rounded-lg border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    aria-label="Notifications"
                    title="Notifications"
                >
                    <Bell className="size-4 text-neutral-600 dark:text-neutral-300" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent 
                align="end" 
                sideOffset={8}
                className="w-[380px] sm:w-[420px] p-0 overflow-hidden shadow-xl rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 z-50"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3.5 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                            Notifications
                        </span>
                        {unreadCount > 0 ? (
                            <span className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.2 text-[10px] font-bold">
                                {unreadCount} unread
                            </span>
                        ) : (
                            <span className="rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 px-2 py-0.2 text-[10px] font-medium">
                                {allNotifications.length}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {unreadCount > 0 && (
                            <button 
                                type="button"
                                onClick={markAllAsRead}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                                <CheckCheck className="size-3" />
                                <span>Mark all read</span>
                            </button>
                        )}
                        {allNotifications.length > 0 && (
                            <button 
                                type="button"
                                onClick={clearAllNotifications}
                                disabled={isClearingAll}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 px-2 py-1 rounded transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <Trash2 className="size-3" />
                                <span>{isClearingAll ? 'Clearing...' : 'Clear all'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Subheader Filters */}
                <div className="flex items-center justify-between px-3 py-2 bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
                        <button
                            type="button"
                            onClick={() => setNotifFilter('all')}
                            className={cn(
                                "px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer",
                                notifFilter === 'all'
                                    ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                            )}
                        >
                            All ({allNotifications.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setNotifFilter('unread')}
                            className={cn(
                                "px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5",
                                notifFilter === 'unread'
                                    ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                            )}
                        >
                            <span>Unread</span>
                            {unreadCount > 0 && (
                                <span className="size-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                            )}
                        </button>
                    </div>

                    {/* Category Filter Chips */}
                    {hasTasks && (
                        <div className="flex items-center gap-1 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setTypeFilter(typeFilter === 'delivery' ? 'all' : 'delivery')}
                                className={cn(
                                    "px-2 py-0.5 rounded-md border text-[10px] font-medium transition-colors cursor-pointer",
                                    typeFilter === 'delivery' 
                                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/80 dark:border-blue-900 dark:text-blue-300 font-bold"
                                        : "border-neutral-200 text-neutral-500 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400"
                                )}
                            >
                                Deliveries
                            </button>
                            <button
                                type="button"
                                onClick={() => setTypeFilter(typeFilter === 'task' ? 'all' : 'task')}
                                className={cn(
                                    "px-2 py-0.5 rounded-md border text-[10px] font-medium transition-colors cursor-pointer",
                                    typeFilter === 'task'
                                        ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/80 dark:border-violet-900 dark:text-violet-300 font-bold"
                                        : "border-neutral-200 text-neutral-500 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400"
                                )}
                            >
                                Tasks
                            </button>
                        </div>
                    )}
                </div>

                {/* Notifications Scroll List */}
                <ScrollArea className="max-h-[360px] overflow-y-auto">
                    {filteredNotifications.length > 0 ? (
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                            {filteredNotifications.map((notif) => {
                                const isClearing = clearingIds.includes(notif.id);
                                return (
                                    <div 
                                        key={notif.id}
                                        className={cn(
                                            "group relative flex items-start gap-3 p-3 transition-all duration-200",
                                            !notif.isRead 
                                                ? "bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40" 
                                                : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40",
                                            isClearing && "opacity-0 translate-x-full duration-200"
                                        )}
                                    >
                                        {/* Category Icon */}
                                        <div className={cn(
                                            "relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border",
                                            notif.isOverdue
                                                ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400"
                                                : notif.isDueToday
                                                ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-400"
                                                : notif.type === 'task'
                                                ? "bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-950/40 dark:border-violet-900/60 dark:text-violet-400"
                                                : "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400"
                                        )}>
                                            {notif.type === 'task' ? (
                                                <ListTodo className="size-4" />
                                            ) : notif.type === 'delivery' ? (
                                                <Truck className="size-4" />
                                            ) : (
                                                <Bell className="size-4" />
                                            )}
                                            {!notif.isRead && (
                                                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-neutral-900" />
                                            )}
                                        </div>

                                        {/* Notification Content Body */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-1.5">
                                                <Link
                                                    href={notif.target_url}
                                                    onClick={() => handleItemClick(notif)}
                                                    className="font-bold text-xs text-neutral-900 dark:text-neutral-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                                                >
                                                    {notif.title}
                                                </Link>
                                                
                                                {/* Status Badge */}
                                                {notif.badge && (
                                                    <span className={cn(
                                                        "shrink-0 rounded px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider",
                                                        notif.badgeVariant === 'rose' && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                                                        notif.badgeVariant === 'amber' && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                                                        notif.badgeVariant === 'sky' && "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
                                                        notif.badgeVariant === 'violet' && "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
                                                        notif.badgeVariant === 'neutral' && "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                                                    )}>
                                                        {notif.badge}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Subtitle / Context Message */}
                                            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 leading-snug">
                                                {notif.message}
                                            </p>

                                            {/* Supplier / Details if available */}
                                            {notif.supplier && (
                                                <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                                                    <span className="text-neutral-400">Supplier:</span> {notif.supplier}
                                                </p>
                                            )}

                                            {/* Footer: Timestamp and Quick Actions */}
                                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
                                                <span className="flex items-center gap-1 text-[11px]">
                                                    <Clock className="size-3" />
                                                    <span>{notif.time}</span>
                                                </span>

                                                {/* Action Buttons (visible on hover) */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            toggleRead(notif.id);
                                                        }}
                                                        title={notif.isRead ? "Mark as unread" : "Mark as read"}
                                                        className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 cursor-pointer"
                                                    >
                                                        <Check className={cn("size-3.5", notif.isRead ? "text-neutral-400" : "text-indigo-600 font-bold")} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            dismissSingle(notif.id);
                                                        }}
                                                        title="Dismiss alert"
                                                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                                                    >
                                                        <X className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center flex flex-col items-center justify-center">
                            <div className="size-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-2">
                                {notifFilter === 'unread' ? (
                                    <CheckCircle2 className="size-5 text-emerald-500" />
                                ) : (
                                    <BellOff className="size-5" />
                                )}
                            </div>
                            <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                {notifFilter === 'unread' ? "All caught up!" : "No notifications"}
                            </h4>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {notifFilter === 'unread' 
                                    ? "You have reviewed all your active alerts." 
                                    : "There are no pending alerts or due delivery notices."}
                            </p>
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
