import { Head, usePage, router } from '@inertiajs/react';
import { RefreshCw, ClipboardCheck, FileText, Truck, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CalendarButton } from '@/calendar/components/calendar-button';
import { DueDeliveries  } from '@/components/due-deliveries';
import type {DueDelivery} from '@/components/due-deliveries';
import { PoLettersStatusChart  } from '@/components/po-letter-status-chart';
import type {POLetterStatusRow} from '@/components/po-letter-status-chart';
// import { RecentActivity  } from '@/components/recent-activity';
// import type {RecentActivityRow} from '@/components/recent-activity';
import { StatCard } from '@/components/stat-card';
import { ReportsMonitoringWidget } from '@/components/reports-monitoring-widget';
import { dashboard } from '@/routes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from '@inertiajs/react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationsHighlight } from './notificationsHighlight';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

// Remove MOCK_NOTIFICATIONS

type DashboardPageProps = {
    deliveries?: DueDelivery[];
    poLettersStatus?: Record<string, POLetterStatusRow[]>;
    pendingInspections?: number;
    inspectionsLastWeek?: number;
    pendingClearances?: number;
    clearancesLastWeek?: number;
    pendingDeliveries?: number;
    deliveriesLastWeek?: number;
    recentDeliveries?: { 
        delivery_id: string; 
        po_number: string; 
        time_ago: string;
        is_overdue?: boolean;
        days_overdue?: number;
        due_date?: string | null;
    }[];
    allPendingDeliveries?: {
        delivery_id: string;
        po_number: string;
        due_date?: string | null;
        status: string;
        end_user?: string;
        supplier?: { supplier_name: string } | null;
    }[];
    allPendingInspections?: {
        pir_id: string;
        po_number: string;
        iar_number?: string | null;
        invoice_number?: string | null;
        supplier?: { supplier_name: string } | null;
    }[];
    allPendingClearances?: {
        pir_id: string;
        po_number: string;
        iar_number?: string | null;
        invoice_number?: string | null;
        supplier?: { supplier_name: string } | null;
    }[];
    reportsStats?: {
        COMPLETED: number;
        CANCELLED: number;
        ONGOING: number;
    };
    reportsYear?: number;
    reportsQuarter?: number;
    // recentActivity?: RecentActivityRow[];
};

export default function Dashboard() {
    const {
        deliveries,
        poLettersStatus,
        pendingInspections,
        inspectionsLastWeek,
        pendingClearances,
        clearancesLastWeek,
        pendingDeliveries,
        deliveriesLastWeek,
        allPendingDeliveries,
        allPendingInspections,
        allPendingClearances,
        recentActivity,
        recentDeliveries,
        reportsStats,
        reportsYear,
        reportsQuarter,
    } = usePage<DashboardPageProps>().props;

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [readIds, setReadIds] = useState<string[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [isPendingInspectionsModalOpen, setIsPendingInspectionsModalOpen] = useState(false);
    const [isPendingClearancesModalOpen, setIsPendingClearancesModalOpen] = useState(false);

    // Initialize from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('read_notifs');
            if (saved) {
                setReadIds(JSON.parse(saved));
            }
        } catch {}
        setIsLoaded(true);
    }, []);

    // Sync notifications when recentDeliveries or deliveries updates
    useEffect(() => {
        if (!isLoaded) return;

        setNotifications(prev => {
            const notifMap = new Map<string, any>();
            const prevMap = new Map(prev.map(n => [String(n.id), n]));

            const formatItem = (d: any) => {
                const idStr = String(d.delivery_id);
                const prevItem = prevMap.get(idStr);

                let text = `Incoming Delivery ${d.po_number}`;
                let time = d.time_ago || (d.due_date ? `Due ${d.due_date_formatted || d.due_date}` : '');
                let isOverdue = !!d.is_overdue;
                let daysOverdue = d.days_overdue || 0;
                let isDueToday = false;
                let isDueSoon = false;

                if (d.due_date) {
                    if (d.is_overdue) {
                        text = `Delivery ${d.po_number} is OVERDUE (${daysOverdue}d)`;
                        time = d.time_ago ? `${d.time_ago} • ${daysOverdue}d overdue` : `${daysOverdue} day(s) overdue`;
                    } else if (d.diff_days === 0) {
                        text = `Delivery ${d.po_number} is DUE TODAY`;
                        time = d.time_ago ? `${d.time_ago} • Due today` : 'Due today';
                        isDueToday = true;
                    } else if (d.diff_days === 1) {
                        text = `Delivery ${d.po_number} is DUE TOMORROW`;
                        time = d.time_ago ? `${d.time_ago} • Due tomorrow` : 'Due tomorrow';
                        isDueSoon = true;
                    } else if (d.diff_days !== undefined && d.diff_days !== null && d.diff_days > 1) {
                        text = `Delivery ${d.po_number} is due on ${d.due_date_formatted || d.due_date}`;
                        time = d.time_ago ? `${d.time_ago} • Due in ${d.diff_days}d` : `Due in ${d.diff_days} days`;
                        if (d.diff_days <= 7) {
                            isDueSoon = true;
                        }
                    }
                }

                return {
                    id: idStr,
                    text,
                    target_url: `/deliveries?highlight_id=${d.delivery_id}`,
                    time,
                    isOverdue,
                    daysOverdue,
                    isDueToday,
                    isDueSoon,
                    dueDate: d.due_date,
                    isRead: readIds.includes(idStr) || (prevItem ? prevItem.isRead : false),
                };
            };

            // 1. Process recent deliveries
            if (recentDeliveries) {
                recentDeliveries.forEach(d => {
                    const item = formatItem(d);
                    notifMap.set(item.id, item);
                });
            }

            // 2. Process due deliveries (add any missing or enrich)
            if (deliveries) {
                deliveries.forEach(d => {
                    const item = formatItem(d);
                    if (notifMap.has(item.id)) {
                        const existing = notifMap.get(item.id);
                        notifMap.set(item.id, {
                            ...existing,
                            text: (item.isOverdue || item.isDueToday || item.isDueSoon) ? item.text : existing.text,
                            time: item.time || existing.time,
                            isOverdue: existing.isOverdue || item.isOverdue,
                            isDueToday: existing.isDueToday || item.isDueToday,
                            isDueSoon: existing.isDueSoon || item.isDueSoon,
                        });
                    } else {
                        notifMap.set(item.id, item);
                    }
                });
            }

            return Array.from(notifMap.values());
        });
    }, [recentDeliveries, deliveries, isLoaded, readIds]);

    // Auto-refresh data periodically and on tab focus to keep dashboard "real-time"
    useEffect(() => {
        const refreshData = () => {
            router.reload({
                only: [
                    'pendingDeliveries', 'allPendingDeliveries',
                    'pendingInspections', 'allPendingInspections',
                    'pendingClearances', 'allPendingClearances',
                    'deliveries', 'deliveriesLastWeek',
                    'poLettersStatus', 'recentDeliveries'
                ],
            });
        };

        // Refresh every 15 seconds
        const pollInterval = setInterval(refreshData, 15000);

        // Refresh when returning to the tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const markAsRead = (id: string | number) => {
        const stringId = String(id);
        setNotifications(prev => prev.map(n => String(n.id) === stringId ? { ...n, isRead: true } : n));
        setReadIds(prev => {
            if (prev.includes(stringId)) return prev;
            const next = [...prev, stringId];
            localStorage.setItem('read_notifs', JSON.stringify(next));
            return next;
        });
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setReadIds(prev => {
            const next = [...prev, ...notifications.map(n => String(n.id))];
            const unique = Array.from(new Set(next));
            localStorage.setItem('read_notifs', JSON.stringify(unique));
            return unique;
        });
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const filteredNotifs = notifFilter === 'all' ? notifications : notifications.filter(n => !n.isRead);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => setIsRefreshing(false),
        });
    };

    const { auth } = usePage().props as any;

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Welcome to Dashboard, {auth?.user?.name || 'User'}!</h1>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="relative cursor-pointer">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="relative"
                                        aria-label="Notifications"
                                        title="Incoming Deliveries"
                                    >
                                        <Bell className="size-4" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[320px]">
                                <div className="flex items-center justify-between p-3 pb-2">
                                    <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                                    {unreadCount > 0 && (
                                        <button 
                                            onClick={markAllAsRead}
                                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 px-3 pb-2 border-b">
                                    <button
                                        onClick={() => setNotifFilter('all')}
                                        className={`text-sm pb-2 border-b-2 transition-colors ${notifFilter === 'all' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setNotifFilter('unread')}
                                        className={`text-sm pb-2 border-b-2 transition-colors ${notifFilter === 'unread' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Unread
                                    </button>
                                </div>
                                <ScrollArea className="h-[300px] pt-1">
                                     {filteredNotifs.length > 0 ? (
                                        filteredNotifs.map((notif) => (
                                            <DropdownMenuItem key={notif.id} asChild className="p-3 cursor-pointer items-start">
                                                <Link 
                                                    href={notif.target_url} 
                                                    onClick={() => {
                                                        markAsRead(notif.id);
                                                        try {
                                                            const url = new URL(notif.target_url, window.location.origin);
                                                            const highlightId = url.searchParams.get('highlight_id');
                                                            if (highlightId) {
                                                                notificationsHighlight(highlightId, url.pathname);
                                                            }
                                                        } catch (e) {
                                                            console.error("Failed to parse notification URL for highlight", e);
                                                        }
                                                    }} 
                                                    className="flex gap-2 w-full"
                                                >
                                                    {!notif.isRead && (
                                                        <span className={`mt-1.5 flex h-2 w-2 shrink-0 rounded-full ${notif.isOverdue ? 'bg-rose-600' : notif.isDueToday ? 'bg-amber-500' : 'bg-blue-600'}`} />
                                                    )}
                                                    <div className="flex flex-col gap-1 w-full">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className={`text-sm ${!notif.isRead ? 'font-semibold' : 'font-medium'} ${notif.isOverdue ? 'text-rose-600 dark:text-rose-400' : notif.isDueToday ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                                                {notif.text}
                                                            </span>
                                                            {notif.isOverdue ? (
                                                                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                                                                    Overdue
                                                                </span>
                                                            ) : notif.isDueToday ? (
                                                                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                                                                    Due Today
                                                                </span>
                                                            ) : notif.isDueSoon ? (
                                                                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 shrink-0">
                                                                    Due Soon
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">{notif.time}</span>
                                                    </div>
                                                </Link>
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <div className="p-6 text-center text-sm text-muted-foreground">
                                            No {notifFilter === 'unread' ? 'unread ' : ''}notifications
                                        </div>
                                    )}
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <CalendarButton deliveries={deliveries} />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <div className="flex flex-col gap-4 md:col-span-3">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <StatCard
                                label="Pending Deliveries"
                                value={pendingDeliveries ?? 0}
                                change={deliveriesLastWeek !== undefined ? `+ ${deliveriesLastWeek} this week` : ""}
                                icon={Truck}
                                iconClassName="bg-blue-100 text-blue-500"
                                onClick={() => setIsPendingModalOpen(true)}
                            />
                            <StatCard
                                label="Pending Inspection"
                                value={pendingInspections ?? 0}
                                change={inspectionsLastWeek !== undefined ? `+ ${inspectionsLastWeek} this week` : ""}
                                icon={ClipboardCheck}
                                iconClassName="bg-amber-100 text-amber-600"
                                onClick={() => setIsPendingInspectionsModalOpen(true)}
                            />
                            <StatCard
                                label="Pending Issuance"
                                value={pendingClearances ?? 0}
                                change={clearancesLastWeek !== undefined ? `+ ${clearancesLastWeek} this week` : ""}
                                icon={FileText}
                                iconClassName="bg-rose-100 text-rose-500"
                                onClick={() => setIsPendingClearancesModalOpen(true)}
                            />
                        </div>
                        
                        <div className="flex-1">
                            <PoLettersStatusChart data={poLettersStatus} />
                        </div>
                        
                        {reportsStats && reportsYear && reportsQuarter && (
                            <div className="w-full sm:w-2/3">
                                <ReportsMonitoringWidget 
                                    stats={reportsStats}
                                    year={reportsYear}
                                    quarter={reportsQuarter}
                                />
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-1 h-full max-h-[416px]">
                        <DueDeliveries deliveries={deliveries} />
                    </div>
                </div>
            </div>

            <Dialog open={isPendingModalOpen} onOpenChange={setIsPendingModalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
                    <DialogHeader className="p-6 pb-4 border-b border-border/50">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Truck className="size-5 text-blue-500" />
                            Pending Deliveries ({pendingDeliveries ?? 0})
                        </DialogTitle>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 p-6 pt-2">
                        {allPendingDeliveries && allPendingDeliveries.length > 0 ? (
                            <div className="grid gap-3 mt-4">
                                {allPendingDeliveries.map((delivery) => (
                                    <div key={delivery.delivery_id} className="flex items-start justify-between rounded-lg border border-border p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                                        <div className="grid gap-1">
                                            <Link 
                                                href={`/deliveries?highlight_id=${delivery.delivery_id}`} 
                                                onClick={() => notificationsHighlight(String(delivery.delivery_id), '/deliveries')}
                                                className="font-semibold text-primary hover:underline"
                                            >
                                                {delivery.po_number}
                                            </Link>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <span className="font-medium text-foreground/80">{delivery.supplier?.supplier_name || 'Unknown Supplier'}</span>
                                                {delivery.end_user && (
                                                    <>
                                                        <span className="text-muted-foreground/40">•</span>
                                                        <span>{delivery.end_user}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                                {delivery.status}
                                            </div>
                                            {delivery.due_date && (
                                                <div className="text-xs text-muted-foreground">
                                                    Due: {format(new Date(delivery.due_date), 'MMM d, yyyy')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center text-muted-foreground mt-4">
                                No pending deliveries found.
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isPendingInspectionsModalOpen} onOpenChange={setIsPendingInspectionsModalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
                    <DialogHeader className="p-6 pb-4 border-b border-border/50">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <ClipboardCheck className="size-5 text-amber-500" />
                            Pending Inspections ({pendingInspections ?? 0})
                        </DialogTitle>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 p-6 pt-2">
                        {allPendingInspections && allPendingInspections.length > 0 ? (
                            <div className="grid gap-3 mt-4">
                                {allPendingInspections.map((inspection) => (
                                    <div key={inspection.pir_id} className="flex items-start justify-between rounded-lg border border-border p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                                        <div className="grid gap-1">
                                            <Link 
                                                href={`/iar?highlight_search=${inspection.po_number}`} 
                                                onClick={() => notificationsHighlight(inspection.po_number, '/iar')}
                                                className="font-semibold text-primary hover:underline"
                                            >
                                                {inspection.po_number}
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <span className="font-medium text-foreground/80">{inspection.supplier?.supplier_name || 'Unknown Supplier'}</span>
                                                {(inspection.iar_number || inspection.invoice_number) && (
                                                    <span className="text-muted-foreground/40">•</span>
                                                )}
                                                {inspection.iar_number && (
                                                    <span>IAR: {inspection.iar_number}</span>
                                                )}
                                                {inspection.iar_number && inspection.invoice_number && (
                                                    <span className="text-muted-foreground/40">•</span>
                                                )}
                                                {inspection.invoice_number && (
                                                    <span>Invoice: {inspection.invoice_number}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                                PENDING
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center text-muted-foreground mt-4">
                                No pending inspections found.
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isPendingClearancesModalOpen} onOpenChange={setIsPendingClearancesModalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
                    <DialogHeader className="p-6 pb-4 border-b border-border/50">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <FileText className="size-5 text-rose-500" />
                            Pending Issuances ({pendingClearances ?? 0})
                        </DialogTitle>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 p-6 pt-2">
                        {allPendingClearances && allPendingClearances.length > 0 ? (
                            <div className="grid gap-3 mt-4">
                                {allPendingClearances.map((issuance) => (
                                    <div key={issuance.pir_id} className="flex items-start justify-between rounded-lg border border-border p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                                        <div className="grid gap-1">
                                            <Link 
                                                href={`/iar?highlight_search=${issuance.po_number}`} 
                                                onClick={() => notificationsHighlight(issuance.po_number, '/iar')}
                                                className="font-semibold text-primary hover:underline"
                                            >
                                                {issuance.po_number}
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <span className="font-medium text-foreground/80">{issuance.supplier?.supplier_name || 'Unknown Supplier'}</span>
                                                {(issuance.iar_number || issuance.invoice_number) && (
                                                    <span className="text-muted-foreground/40">•</span>
                                                )}
                                                {issuance.iar_number && (
                                                    <span>IAR: {issuance.iar_number}</span>
                                                )}
                                                {issuance.iar_number && issuance.invoice_number && (
                                                    <span className="text-muted-foreground/40">•</span>
                                                )}
                                                {issuance.invoice_number && (
                                                    <span>Invoice: {issuance.invoice_number}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                                                PENDING
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center text-muted-foreground mt-4">
                                No pending issuances found.
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};