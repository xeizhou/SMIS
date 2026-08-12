import { Head, usePage, router } from '@inertiajs/react';
import { RefreshCw, ClipboardCheck, FileText, Truck, Bell, Tv } from 'lucide-react';
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
import { PoPieChart } from '@/components/po-pie-chart';
import { dashboard } from '@/routes';
import { Link } from '@inertiajs/react';
import { NotificationPanel } from '@/components/notification-panel';
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
    poStats?: {
        COMPLETE: number;
        PARTIAL: number;
        PENDING: number;
        CANCELLED: number;
    };
    userNotifications?: any[];
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
        poStats,
        userNotifications,
    } = usePage<DashboardPageProps>().props;

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [isPendingInspectionsModalOpen, setIsPendingInspectionsModalOpen] = useState(false);
    const [isPendingClearancesModalOpen, setIsPendingClearancesModalOpen] = useState(false);

    // Initialize from localStorage on mount
    useEffect(() => {
        setIsLoaded(true);
    }, []);

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
                    <h1 className="text-3xl font-bold tracking-tight">Welcome to Dashboard, {auth?.user?.name || 'User'}!</h1>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                        <CalendarButton deliveries={deliveries} />
                        
                        <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>
                        
                        <Button asChild variant="default" className="gap-2 bg-red-700 text-white hover:bg-red-800 shadow-sm dark:bg-red-800 dark:hover:bg-red-900">
                            <Link href="/notice-of-delivery">
                                <Truck className="size-4" />
                                <span className="hidden sm:inline">Notice of Delivery</span>
                            </Link>
                        </Button>
                        <NotificationPanel 
                            userNotifications={userNotifications} 
                            deliveries={deliveries} 
                            recentDeliveries={recentDeliveries} 
                        />
                    </div>
                </div>

                <div className="flex-1 grid gap-6 md:grid-cols-4 md:grid-rows-[auto_1fr_1fr] min-h-0">
                    <div className="md:col-span-3 grid gap-4 sm:grid-cols-3 md:row-start-1">
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

                    <div className="md:col-span-3 md:row-start-2 min-h-0 flex flex-col">
                        <PoLettersStatusChart data={poLettersStatus} />
                    </div>

                    <div className="md:col-span-1 md:row-span-2 md:row-start-1 h-full min-h-0 flex flex-col">
                        <DueDeliveries deliveries={deliveries} />
                    </div>

                    <div className="md:col-span-3 md:row-start-3 h-full flex flex-col">
                        {reportsStats && reportsYear && reportsQuarter && (
                            <ReportsMonitoringWidget 
                                stats={reportsStats}
                                year={reportsYear}
                                quarter={reportsQuarter}
                            />
                        )}
                    </div>
                    
                    <div className="md:col-span-1 md:row-start-3 h-full flex flex-col">
                        {poStats && (
                            <div className="w-full h-full flex flex-col">
                                <PoPieChart stats={poStats} />
                            </div>
                        )}
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
                    
                    <div className="flex-1 overflow-y-auto p-6 pt-2">
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
                    </div>
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
                    
                    <div className="flex-1 overflow-y-auto p-6 pt-2">
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
                    </div>
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
                    
                    <div className="flex-1 overflow-y-auto p-6 pt-2">
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
                    </div>
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