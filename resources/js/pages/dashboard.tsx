import { Head, usePage, router, useForm } from '@inertiajs/react';
import { RefreshCw, ClipboardCheck, FileText, Truck, Bell, Tv, ArrowDownWideNarrow, ArrowUpNarrowWide, CheckCircle2, MessageSquarePlus, Phone, Mail, Plus, X } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
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
import { StatusBadge } from '@/components/ui/status-badge';
import { notificationsHighlight } from './notificationsHighlight';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';

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
        has_follow_up?: boolean;
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
    const [pendingDeliveriesSort, setPendingDeliveriesSort] = useState<'desc' | 'asc'>('desc');

    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
    const [isCustomNoticeType, setIsCustomNoticeType] = useState(false);
    const [recentFollowUps, setRecentFollowUps] = useState<any[]>([]);
    const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
    
    const { data: followUpData, setData: setFollowUpData, post: postFollowUp, processing: processingFollowUp, reset: resetFollowUp } = useForm({
        delivery_id: '',
        notice_type: 'Phone',
        follow_up_date: '',
        remarks: '',
        custom_message: '',
    });

    const openFollowUpModal = async (deliveryId: string) => {
        setFollowUpData({
            delivery_id: deliveryId,
            notice_type: 'Phone',
            follow_up_date: '',
            remarks: '',
            custom_message: '',
        });
        
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
        setFollowUpData('follow_up_date', localISOTime);
        setIsCustomNoticeType(false);
        setFollowUpModalOpen(true);
        
        // Fetch recent follow-ups
        setIsLoadingFollowUps(true);
        try {
            const response = await fetch(`/deliveries/${deliveryId}/recent-follow-ups`);
            const data = await response.json();
            setRecentFollowUps(data);
        } catch (error) {
            console.error('Failed to fetch recent follow-ups', error);
        } finally {
            setIsLoadingFollowUps(false);
        }
    };

    const submitFollowUp = (e: React.FormEvent) => {
        e.preventDefault();
        const url = followUpData.notice_type === 'Email' 
            ? `/deliveries/${followUpData.delivery_id}/send-follow-up` 
            : '/delivery-follow-ups';
            
        postFollowUp(url, {
            preserveScroll: true,
            onSuccess: () => {
                setFollowUpModalOpen(false);
                resetFollowUp();
            },
        });
    };

    const sortedPendingDeliveries = useMemo(() => {
        if (!allPendingDeliveries) return [];
        return [...allPendingDeliveries].sort((a, b) => {
            const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
            const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
            return pendingDeliveriesSort === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [allPendingDeliveries, pendingDeliveriesSort]);

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
                <DialogContent className="sm:max-w-3xl w-full max-h-[85vh] flex flex-col gap-0 p-0">
                    <DialogHeader className="p-6 pb-4 border-b border-border/50 flex flex-row items-center justify-between pr-10">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Truck className="size-5 text-blue-500" />
                            Pending Deliveries ({pendingDeliveries ?? 0})
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm" className="h-8 shadow-sm">
                                <Link href="/delivery-follow-ups">
                                    View Follow-ups
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 shadow-sm"
                                onClick={() => setPendingDeliveriesSort(prev => prev === 'desc' ? 'asc' : 'desc')}
                                title={`Sort ${pendingDeliveriesSort === 'desc' ? 'Ascending' : 'Descending'}`}
                            >
                                {pendingDeliveriesSort === 'desc' ? (
                                    <>
                                        <ArrowDownWideNarrow className="size-4" />
                                        Sort: Descending
                                    </>
                                ) : (
                                    <>
                                        <ArrowUpNarrowWide className="size-4" />
                                        Sort: Ascending
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-6 pt-2">
                        {sortedPendingDeliveries && sortedPendingDeliveries.length > 0 ? (
                            <div className="grid gap-3 mt-4">
                                {sortedPendingDeliveries.map((delivery) => (
                                    <div key={delivery.delivery_id} className="flex items-center rounded-lg border border-l-4 border-l-blue-400 bg-white p-4 gap-4 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:border-l-blue-500 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold text-neutral-800 dark:text-neutral-100 text-base">
                                                <Link 
                                                    href={`/deliveries?highlight_id=${delivery.delivery_id}`} 
                                                    onClick={() => notificationsHighlight(String(delivery.delivery_id), '/deliveries')}
                                                    className="hover:underline"
                                                >
                                                    {delivery.po_number}
                                                </Link>
                                            </p>
                                            <p className="truncate text-neutral-500 text-sm mt-0.5">
                                                {delivery.supplier?.supplier_name || 'Unknown Supplier'}
                                                {delivery.end_user && <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">•</span>}
                                                {delivery.end_user && <span>{delivery.end_user}</span>}
                                            </p>
                                            
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                                    {delivery.status}
                                                </span>
                                                {delivery.due_date && (
                                                    <span className="text-sm font-bold text-neutral-500">
                                                        Due: {format(new Date(delivery.due_date), 'MMM d, yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="shrink-0 ml-4">
                                            <Button 
                                                variant="outline" 
                                                size="default"
                                                className={`gap-2 text-sm px-4 border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800 ${delivery.has_follow_up ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 cursor-default opacity-80' : ''}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!delivery.has_follow_up) {
                                                        openFollowUpModal(delivery.delivery_id);
                                                    }
                                                }}
                                            >
                                                {delivery.has_follow_up ? (
                                                    <CheckCircle2 className="size-4" />
                                                ) : (
                                                    <MessageSquarePlus className="size-4" />
                                                )}
                                                <span className="hidden sm:inline">{delivery.has_follow_up ? 'Followed up' : 'Follow Up Supplier'}</span>
                                                <span className="sm:hidden">{delivery.has_follow_up ? 'Logged' : 'Log'}</span>
                                            </Button>
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
                <DialogContent className="sm:max-w-3xl w-full max-h-[85vh] flex flex-col gap-0 p-0">
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
                                    <div key={inspection.pir_id} className="flex items-center rounded-lg border border-l-4 border-l-amber-400 bg-white p-4 gap-4 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:border-l-amber-500 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold text-neutral-800 dark:text-neutral-100 text-base">
                                                <Link 
                                                    href={`/iar?highlight_search=${inspection.po_number}`} 
                                                    onClick={() => notificationsHighlight(inspection.po_number, '/iar')}
                                                    className="hover:underline"
                                                >
                                                    {inspection.po_number}
                                                </Link>
                                            </p>
                                            <p className="truncate text-neutral-500 text-sm mt-0.5">
                                                <span>{inspection.supplier?.supplier_name || 'Unknown Supplier'}</span>
                                                {(inspection.iar_number || inspection.invoice_number) && (
                                                    <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">•</span>
                                                )}
                                                {inspection.iar_number && (
                                                    <span>IAR: {inspection.iar_number}</span>
                                                )}
                                                {inspection.iar_number && inspection.invoice_number && (
                                                    <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">•</span>
                                                )}
                                                {inspection.invoice_number && (
                                                    <span>Invoice: {inspection.invoice_number}</span>
                                                )}
                                            </p>
                                            
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                                    PENDING
                                                </span>
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
                <DialogContent className="sm:max-w-3xl w-full max-h-[85vh] flex flex-col gap-0 p-0">
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
                                    <div key={issuance.pir_id} className="flex items-center rounded-lg border border-l-4 border-l-rose-400 bg-white p-4 gap-4 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:border-l-rose-500 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold text-neutral-800 dark:text-neutral-100 text-base">
                                                <Link 
                                                    href={`/iar?highlight_search=${issuance.po_number}`} 
                                                    onClick={() => notificationsHighlight(issuance.po_number, '/iar')}
                                                    className="hover:underline"
                                                >
                                                    {issuance.po_number}
                                                </Link>
                                            </p>
                                            <p className="truncate text-neutral-500 text-sm mt-0.5">
                                                <span>{issuance.supplier?.supplier_name || 'Unknown Supplier'}</span>
                                                {(issuance.iar_number || issuance.invoice_number) && (
                                                    <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">•</span>
                                                )}
                                                {issuance.iar_number && (
                                                    <span>IAR: {issuance.iar_number}</span>
                                                )}
                                                {issuance.iar_number && issuance.invoice_number && (
                                                    <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">•</span>
                                                )}
                                                {issuance.invoice_number && (
                                                    <span>Invoice: {issuance.invoice_number}</span>
                                                )}
                                            </p>
                                            
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                                                    PENDING
                                                </span>
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

            <Dialog open={followUpModalOpen} onOpenChange={setFollowUpModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Log Supplier Follow-up</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitFollowUp} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="notice_type">Communication Method</Label>
                            <div className="flex items-center gap-2">
                                {isCustomNoticeType ? (
                                    <div className="flex flex-1 items-center gap-2">
                                        <Input
                                            id="notice_type"
                                            type="text"
                                            placeholder="Enter custom method..."
                                            value={followUpData.notice_type}
                                            onChange={(e) => setFollowUpData('notice_type', e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 rounded-md w-10 h-10 border border-neutral-200 dark:border-neutral-800"
                                            onClick={() => {
                                                setIsCustomNoticeType(false);
                                                setFollowUpData('notice_type', 'Phone');
                                            }}
                                            aria-label="Back to predefined choices"
                                        >
                                            <X className="w-4 h-4 text-neutral-500" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-1 items-center gap-2">
                                        <Select 
                                            value={followUpData.notice_type} 
                                            onValueChange={(value) => setFollowUpData('notice_type', value)}
                                        >
                                            <SelectTrigger id="notice_type" className="flex-1">
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Phone">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-blue-500" />
                                                        Phone Call
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="Email">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-4 h-4 text-emerald-500" />
                                                        Email Notice
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0 w-10 h-10 border-neutral-200 dark:border-neutral-800 border"
                                            onClick={() => {
                                                setIsCustomNoticeType(true);
                                                setFollowUpData('notice_type', '');
                                            }}
                                            aria-label="Add custom method"
                                        >
                                            <Plus className="w-4 h-4 text-neutral-500" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="follow_up_date">Date & Time</Label>
                            <Input
                                id="follow_up_date"
                                type="datetime-local"
                                value={followUpData.follow_up_date}
                                onChange={(e) => setFollowUpData('follow_up_date', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="remarks">Remarks (Optional)</Label>
                            <Input
                                id="remarks"
                                type="text"
                                placeholder={followUpData.notice_type === 'Email' ? "Internal notes..." : "Any additional notes..."}
                                value={followUpData.remarks}
                                onChange={(e) => setFollowUpData('remarks', e.target.value)}
                            />
                        </div>
                        
                        {followUpData.notice_type === 'Email' && (
                            <div className="grid gap-2 border-t pt-4 mt-2 border-neutral-100 dark:border-neutral-800">
                                <Label htmlFor="custom_message" className="text-blue-600 dark:text-blue-400">Custom Email Message (Optional)</Label>
                                <p className="text-xs text-neutral-500">This will be injected into the automated email sent to the supplier.</p>
                                <textarea
                                    id="custom_message"
                                    className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300"
                                    placeholder="e.g. Please call me back at 555-1234..."
                                    value={followUpData.custom_message}
                                    onChange={(e) => setFollowUpData('custom_message', e.target.value)}
                                />
                            </div>
                        )}
                        
                        {recentFollowUps.length > 0 && (
                            <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                                <h4 className="text-xs font-semibold uppercase text-neutral-500 mb-3">Recent Follow-ups</h4>
                                <div className="space-y-3 max-h-32 overflow-y-auto pr-2 text-sm">
                                    {recentFollowUps.map((log) => (
                                        <div key={log.id} className="flex gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 mt-1.5 shrink-0" />
                                            <div>
                                                <p className="text-neutral-900 dark:text-neutral-100 font-medium text-xs">
                                                    {log.notice_type} <span className="text-neutral-500 font-normal">by {log.user_name} on {format(new Date(log.follow_up_date), 'MMM d, h:mm a')}</span>
                                                </p>
                                                {log.remarks && <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-0.5">{log.remarks}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setFollowUpModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processingFollowUp} className={followUpData.notice_type === 'Email' ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-red-700 hover:bg-red-800 text-white"}>
                                {followUpData.notice_type === 'Email' ? 'Send Email & Save' : 'Save Follow-up'}
                            </Button>
                        </DialogFooter>
                    </form>
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