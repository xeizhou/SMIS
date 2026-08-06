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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

// Remove MOCK_NOTIFICATIONS

type DashboardPageProps = {
    deliveries?: DueDelivery[];
    poLettersStatus?: POLetterStatusRow[];
    pendingInspections?: number;
    pendingClearances?: number;
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
    // recentActivity?: RecentActivityRow[];
};

export default function Dashboard() {
    const {
        deliveries,
        poLettersStatus,
        pendingInspections,
        pendingClearances,
        pendingDeliveries,
        deliveriesLastWeek,
        allPendingDeliveries,
        allPendingInspections,
        recentActivity,
        recentDeliveries,
    } = usePage<DashboardPageProps>().props;

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [readIds, setReadIds] = useState<string[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [isPendingInspectionsModalOpen, setIsPendingInspectionsModalOpen] = useState(false);

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

    // Sync notifications when recentDeliveries updates (e.g. on Inertia reload)
    useEffect(() => {
        if (!isLoaded || !recentDeliveries) return;
        setNotifications(prev => {
            // Keep existing ones to preserve createdAt, add new ones
            const existingIds = new Set(prev.map(n => String(n.id)));
            const newNotifs = recentDeliveries
                .filter(d => !existingIds.has(String(d.delivery_id)))
                .map(d => ({
                    id: d.delivery_id,
                    text: d.is_overdue 
                        ? `Delivery ${d.po_number} is OVERDUE (${d.days_overdue}d)`
                        : `Incoming Delivery ${d.po_number}`,
                    target_url: `/deliveries?highlight_search=${d.po_number}`,
                    time: d.time_ago,
                    isOverdue: d.is_overdue,
                    daysOverdue: d.days_overdue,
                    dueDate: d.due_date,
                    isRead: readIds.includes(String(d.delivery_id)),
                    createdAt: Date.now()
                }));
            
            // Update time for existing ones, leave createdAt alone
            const updatedExisting = prev.map(n => {
                const updatedData = recentDeliveries.find(d => String(d.delivery_id) === String(n.id));
                if (updatedData) {
                    return { 
                        ...n, 
                        text: updatedData.is_overdue 
                            ? `Delivery ${updatedData.po_number} is OVERDUE (${updatedData.days_overdue}d)`
                            : `Incoming Delivery ${updatedData.po_number}`,
                        time: updatedData.time_ago, 
                        isOverdue: updatedData.is_overdue,
                        daysOverdue: updatedData.days_overdue,
                        dueDate: updatedData.due_date,
                        isRead: readIds.includes(String(updatedData.delivery_id)) || n.isRead 
                    };
                }
                return n;
            });

            return [...newNotifs, ...updatedExisting];
        });
    }, [recentDeliveries, isLoaded]); // intentionally left readIds out so we don't reset createdAt on every read

    useEffect(() => {
        // Auto-delete notifications older than 2 minutes (120,000 ms)
        const interval = setInterval(() => {
            const now = Date.now();
            setNotifications(prev => prev.filter(n => (now - n.createdAt) < 120000));
        }, 5000);

        return () => clearInterval(interval);
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
                                    <button
                                        className="flex items-center justify-center size-8 rounded-md border border-sidebar-border/70 text-neutral-600 transition hover:bg-neutral-100 dark:border-sidebar-border dark:text-neutral-300 dark:hover:bg-neutral-800"
                                        aria-label="Notifications"
                                        title="Incoming Deliveries"
                                    >
                                        <Bell className="size-4" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white ring-2 ring-white dark:ring-neutral-900">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>
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
                                                <Link href={notif.target_url} onClick={() => markAsRead(notif.id)} className="flex gap-2 w-full">
                                                    {!notif.isRead && (
                                                        <span className={`mt-1.5 flex h-2 w-2 shrink-0 rounded-full ${notif.isOverdue ? 'bg-rose-600' : 'bg-blue-600'}`} />
                                                    )}
                                                    <div className="flex flex-col gap-1 w-full">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className={`text-sm ${!notif.isRead ? 'font-semibold' : 'font-medium'} ${notif.isOverdue ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                                                                {notif.text}
                                                            </span>
                                                            {notif.isOverdue && (
                                                                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                                                                    Overdue
                                                                </span>
                                                            )}
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
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-1.5 rounded-md border border-sidebar-border/70 px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-sidebar-border dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <CalendarButton deliveries={deliveries} />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <div className="flex flex-col gap-4 md:col-span-3">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <StatCard
                                label="Pending Deliveries"
                                value={pendingDeliveries ?? 0}
                                change={deliveriesLastWeek !== undefined ? `+ ${deliveriesLastWeek} last week` : ""}
                                icon={Truck}
                                iconClassName="bg-blue-100 text-blue-500"
                                onClick={() => setIsPendingModalOpen(true)}
                            />
                            <StatCard
                                label="Pending Inspection"
                                value={pendingInspections ?? 0}
                                icon={ClipboardCheck}
                                iconClassName="bg-amber-100 text-amber-600"
                                onClick={() => setIsPendingInspectionsModalOpen(true)}
                            />
                            <StatCard
                                label="Pending Issuance"
                                value={pendingClearances ?? 18}
                                change="+ 5 last week"
                                icon={FileText}
                                iconClassName="bg-rose-100 text-rose-500"
                            />
                        </div>
                        
                        <div className="flex-1">
                            <PoLettersStatusChart data={poLettersStatus} />
                        </div>
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
                                            <Link href={`/deliveries?highlight_search=${delivery.po_number}`} className="font-semibold text-primary hover:underline">
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
                                            <Link href={`/iar?highlight_search=${inspection.po_number}`} className="font-semibold text-primary hover:underline">
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