// resources/js/pages/Dashboard.tsx
import { Head, usePage, router, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RefreshCw, ClipboardCheck, FileText, Truck, Bell, Tv, ArrowDownWideNarrow, ArrowUpNarrowWide, CheckCircle2, MessageSquarePlus, Phone, Mail, Plus, X, Loader2, ListTodo, Info, ExternalLink } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { AnimatedKpiCard } from '@/components/animated-kpi-card';
import { AnimatedChart } from '@/components/animated-chart';
import { CalendarButton } from '@/calendar/components/calendar-button';
import { DueDeliveries  } from '@/components/due-deliveries';
import type {DueDelivery} from '@/components/due-deliveries';
import { PoLettersStatusChart  } from '@/components/po-letter-status-chart';
import type {POLetterStatusRow} from '@/components/po-letter-status-chart';
import { StatCard } from '@/components/stat-card';
import { ReportsMonitoringWidget } from '@/components/reports-monitoring-widget';
import { PoPieChart } from '@/components/po-pie-chart';
import { AssignedTasks } from '@/components/assigned-tasks';
import type { AssignedTask } from '@/components/assigned-tasks';
import { ActionCenterCard } from '@/components/action-center-card';
import { dashboard } from '@/routes';
import { Link } from '@inertiajs/react';
import { NotificationPanel } from '@/components/notification-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
        po_number: string;
        iar_number?: string | null;
        invoice_number?: string | null;
        supplier?: { supplier_name: string } | null;
    }[];
    allPendingClearances?: {
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
    assignedTasks?: AssignedTask[];
    usersList?: Array<{ id: number; name: string; role: string }>;
    poNumbers?: string[];
    // recentActivity?: RecentActivityRow[];
};

export default function Dashboard() {
    const {
        deliveries = [],
        poLettersStatus = { 'This Week': [], 'This Month': [], 'This Year': [] },
        pendingInspections = 0,
        inspectionsLastWeek = 0,
        pendingClearances = 0,
        clearancesLastWeek = 0,
        pendingDeliveries = 0,
        deliveriesLastWeek = 0,
        allPendingDeliveries = [],
        allPendingInspections = [],
        allPendingClearances = [],
        recentActivity = [],
        recentDeliveries = [],
        reportsStats = { COMPLETED: 0, ONGOING: 0, CANCELLED: 0 },
        reportsYear = new Date().getFullYear(),
        reportsQuarter = Math.floor((new Date().getMonth() + 3) / 3),
        poStats = { COMPLETE: 0, PARTIAL: 0, PENDING: 0, CANCELLED: 0 },
        userNotifications = [],
        assignedTasks = [],
        usersList = [],
        poNumbers = [],
    } = usePage<DashboardPageProps>().props;

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [activeActionTab, setActiveActionTab] = useState<'tasks' | 'deliveries'>('tasks');
    const [isPendingInspectionsModalOpen, setIsPendingInspectionsModalOpen] = useState(false);
    const [isPendingClearancesModalOpen, setIsPendingClearancesModalOpen] = useState(false);
    const [pendingDeliveriesSort, setPendingDeliveriesSort] = useState<'desc' | 'asc'>('desc');
    const [isKpiInfoOpen, setIsKpiInfoOpen] = useState(false);
    const [kpiInfoTab, setKpiInfoTab] = useState<'definitions' | 'triggers'>('definitions');

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
        let pollInterval: ReturnType<typeof setInterval> | undefined;

        const refreshData = () => {
            if (document.hidden) return; // skip while tab isn't visible, same as OnlineUsersBar
            router.reload({
                only: [
                    'assignedTasks',
                    'pendingDeliveries', 'allPendingDeliveries',
                    'pendingInspections', 'allPendingInspections',
                    'pendingClearances', 'allPendingClearances',
                    'deliveries', 'deliveriesLastWeek',
                    'poLettersStatus', 'recentDeliveries'
                ],
            });
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                refreshData();
                if (!pollInterval) pollInterval = setInterval(refreshData, 15000);
            } else if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = undefined;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        if (!document.hidden) {
            pollInterval = setInterval(refreshData, 15000);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onSuccess: () => {
                toast.success('Dashboard refreshed.', { id: 'dashboard-refresh' });
            },
            onFinish: () => setIsRefreshing(false),
        });
    };

    const { auth } = usePage().props as any;
    const currentUserId = auth?.user?.id;
    const assignedTasksCount = assignedTasks?.filter(t => t.assigned_to?.id === currentUserId && t.status !== 'completed').length ?? 0;

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-5 pb-6 overflow-x-hidden">
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-neutral-200/80 dark:border-neutral-800">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                        Welcome to Dashboard, <span className="text-indigo-600 dark:text-indigo-400">{auth?.user?.name || 'User'}</span>!
                    </h1>

                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs"
                            title="Refresh dashboard data"
                        >
                            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                        <CalendarButton deliveries={deliveries} />
                        
                        <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5 hidden sm:block" />
                        
                        <Button asChild size="sm" variant="default" className="h-8 gap-1.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-2xs cursor-pointer">
                            <Link href="/notice-of-delivery">
                                <Truck className="size-3.5" />
                                <span className="hidden sm:inline">Notice of Delivery</span>
                            </Link>
                        </Button>
                        <NotificationPanel 
                            userNotifications={userNotifications} 
                            deliveries={deliveries} 
                            recentDeliveries={recentDeliveries} 
                            assignedTasks={assignedTasks}
                        />
                    </div>
                </div>

                {/* Main Content Grid: Left Column (8 cols) + Right Column (4 cols) */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0 items-stretch">
                    {/* Left Column (8 of 12 columns) - Expanded so KPI cards are not squished */}
                    <div className="lg:col-span-8 flex flex-col gap-3.5 min-h-0">
                        {/* Section 1: Operational Status KPIs */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                            <div className="flex items-center justify-between h-[18px]">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                                        Operational Status
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsKpiInfoOpen(true)}
                                        className="flex size-4.5 items-center justify-center rounded-full text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                        title="About operational workflow metrics (ⓘ)"
                                        aria-label="Operational Status Information"
                                    >
                                        <Info className="size-3" />
                                    </button>
                                </div>
                                <span className="text-[11px] text-neutral-400">
                                    Click card for details
                                </span>
                            </div>

                            <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
                                <AnimatedKpiCard
                                    icon={<ListTodo className="size-4" />}
                                    label="My Active Tasks"
                                    value={assignedTasksCount}
                                    change="Assigned to me"
                                    onClick={() => setActiveActionTab('tasks')}
                                    index={0}
                                    brandColor="#6366f1"
                                />
                                <AnimatedKpiCard
                                    icon={<Truck className="size-4" />}
                                    label="Pending Deliveries"
                                    value={pendingDeliveries ?? 0}
                                    change={deliveriesLastWeek !== undefined ? `+ ${deliveriesLastWeek} this week` : "Awaiting arrival"}
                                    onClick={() => setIsPendingModalOpen(true)}
                                    index={1}
                                    brandColor="#3b82f6"
                                />
                                <AnimatedKpiCard
                                    icon={<ClipboardCheck className="size-4" />}
                                    label="Pending Inspection"
                                    value={pendingInspections ?? 0}
                                    change={inspectionsLastWeek !== undefined ? `+ ${inspectionsLastWeek} this week` : "Awaiting PIR / IAR"}
                                    onClick={() => setIsPendingInspectionsModalOpen(true)}
                                    index={2}
                                    brandColor="#d97706"
                                />
                                <AnimatedKpiCard
                                    icon={<FileText className="size-4" />}
                                    label="Pending Issuance"
                                    value={pendingClearances ?? 0}
                                    change={clearancesLastWeek !== undefined ? `+ ${clearancesLastWeek} this week` : "Awaiting issuance"}
                                    onClick={() => setIsPendingClearancesModalOpen(true)}
                                    index={3}
                                    brandColor="#10b981"
                                />
                            </div>
                        </div>

                        {/* Section 2: P.O Letters Status Bar Chart */}
                        <div className="h-[370px] shrink-0 flex flex-col">
                            <AnimatedChart className="w-full h-full flex flex-col">
                                <PoLettersStatusChart data={poLettersStatus} />
                            </AnimatedChart>
                        </div>

                        {/* Section 3: Reports Monitoring (Equal height h-[240px] - matches Purchase Orders) */}
                        <div className="h-[240px] shrink-0 flex flex-col">
                            {reportsStats && reportsYear && reportsQuarter && (
                                <ReportsMonitoringWidget 
                                    stats={reportsStats}
                                    year={reportsYear}
                                    quarter={reportsQuarter}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right Column: Real-Time Operational Action Center + Purchase Orders (4 of 12 columns) */}
                    <div className="lg:col-span-4 flex flex-col gap-3.5 min-h-0">
                        {/* Action Center Wrapper: Aligned at top with the KPI boxes */}
                        <div className="flex-1 min-h-[340px] flex flex-col gap-1.5">
                            {/* Matching header spacer on desktop so the top panel is aligned with the KPI boxes */}
                            <div className="hidden lg:flex items-center justify-between h-[18px] select-none" aria-hidden="true" />

                            <ActionCenterCard
                                deliveries={deliveries}
                                assignedTasks={assignedTasks}
                                usersList={usersList}
                                poNumbers={poNumbers}
                                onOpenFollowUp={openFollowUpModal}
                                activeTab={activeActionTab}
                                onTabChange={setActiveActionTab}
                            />
                        </div>

                        {/* Purchase Orders Status (Equal height h-[240px] - matches Reports Monitoring) */}
                        {poStats && (
                            <div className="h-[240px] shrink-0 flex flex-col">
                                <AnimatedChart className="w-full h-full flex flex-col">
                                    <PoPieChart stats={poStats} />
                                </AnimatedChart>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Operational Status KPI Reference Dialog (ⓘ) */}
            <Dialog open={isKpiInfoOpen} onOpenChange={setIsKpiInfoOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-5 pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
                                <Info className="size-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                                    Operational Status Reference
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 font-normal mt-0.5">
                                    Real-time procurement and inspection stage metrics
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Page Source Attribution Banner */}
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-indigo-50/80 px-3 py-2 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/60 text-xs">
                            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                                <span className="text-neutral-400 dark:text-neutral-500">Based on Pages:</span>
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">Tasks, Deliveries & Purchase Orders</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/deliveries"
                                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                >
                                    <span>Deliveries</span>
                                    <ExternalLink className="size-3" />
                                </Link>
                                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                <Link
                                    href="/purchase-orders"
                                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                >
                                    <span>Purchase Orders</span>
                                    <ExternalLink className="size-3" />
                                </Link>
                            </div>
                        </div>

                        {/* Tab Switcher */}
                        <div className="mt-3 flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setKpiInfoTab('definitions')}
                                className={cn(
                                    "flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer",
                                    kpiInfoTab === 'definitions'
                                        ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                Metric Definitions
                            </button>
                            <button
                                type="button"
                                onClick={() => setKpiInfoTab('triggers')}
                                className={cn(
                                    "flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer",
                                    kpiInfoTab === 'triggers'
                                        ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                Triggers & Workflow Examples
                            </button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 p-5 text-xs text-neutral-600 dark:text-neutral-300 overflow-y-auto">
                        {kpiInfoTab === 'definitions' ? (
                            <>
                                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                    Operational Status tracks active responsibilities and the lifecycle of procurement orders from initial team delegation through physical dock receiving, quality inspection, and inventory clearance.
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <ListTodo className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                My Active Tasks
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Displays pending action items assigned directly to your user account. Selecting this card filters the Action Center to your assigned checklist for quick completion and note updates.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-blue-600 dark:text-blue-400 shrink-0">
                                            <Truck className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Pending Deliveries
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Tracks approved purchase orders awaiting supplier delivery or dock receiving. Selecting this card opens the complete directory to review delivery deadlines and log supplier follow-ups.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-amber-600 dark:text-amber-400 shrink-0">
                                            <ClipboardCheck className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Pending Inspection
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Shipments delivered to the facility awaiting technical examination, count verification, and inspection acceptance in Purchase Orders.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                                            <FileText className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Pending Issuance
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Based on receipt claimed by and receipt receiving date. Tracks purchase orders awaiting final issuance endorsement where receipt claimed by or receipt receiving date is still pending completion.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3 border border-neutral-200/80 dark:border-neutral-800">
                                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                                        How Operational Status Metrics Trigger Across Modules
                                    </h4>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                        Each KPI corresponds to a distinct phase in the institutional procurement pipeline, automatically triggering as records advance from assignment through delivery, inspection, and release.
                                    </p>
                                </div>

                                <div className="space-y-3.5 pt-1">
                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">My Active Tasks</span>
                                            <span className="rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-indigo-950/40 dark:text-indigo-300">Based on Tasks</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> Increments whenever an administrator or colleague assigns a task to your account, or when you assign an item to yourself with status <code>pending</code>.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> You receive an assigned task &quot;Verify COA stamp requirements for PO-4641-8347&quot;. It reflects in your active count until marked completed.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Pending Deliveries</span>
                                            <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-blue-950/40 dark:text-blue-300">Based on Deliveries</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> Any delivery schedule record in the <strong>Deliveries</strong> module where <code>status = PENDING</code> (supplier has not yet delivered items to the dock).
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> PO-2026-0317 is scheduled for delivery today. It remains in Pending Deliveries until dock staff records physical arrival.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Pending Inspection</span>
                                            <span className="rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-amber-950/40 dark:text-amber-300">Based on Purchase Orders</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> Purchase order deliveries arrived at the facility, but inspection acceptance entries have not yet been completed.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> 34 computer units arrived at the warehouse. They count as Pending Inspection until the inspection sign-off is recorded on the Purchase Order record.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Pending Issuance</span>
                                            <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-emerald-950/40 dark:text-emerald-300">Based on Purchase Orders</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> Purchase order records that have completed inspection, but the <strong>Receipt Claimed By</strong> and <strong>Receipt Receiving Date</strong> have not yet been recorded.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> Goods for PO-2026-1015 arrived and passed inspection. The order remains under <strong>Pending Issuance</strong> until the requisitioning officer records both the receipt claimed by and receipt receiving date, finalizing property release.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsKpiInfoOpen(false)}
                            className="cursor-pointer text-xs"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                    <div key={delivery.delivery_id} className="relative group flex items-center rounded-lg border border-l-4 border-l-blue-400 bg-white p-4 gap-4 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:border-l-blue-500 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold text-neutral-800 dark:text-neutral-100 text-base">
                                                <Link 
                                                    href={`/deliveries?highlight_id=${delivery.delivery_id}`} 
                                                    onClick={() => auditLogsHighlight(String(delivery.delivery_id), '/deliveries')}
                                                    className="before:absolute before:inset-0 hover:underline"
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
                                        
                                        <div className="shrink-0 ml-4 relative z-10">
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
                                    <div key={inspection.po_number} className="relative group flex items-center rounded-lg border border-l-4 border-l-amber-400 bg-white p-4 gap-4 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:border-l-amber-500 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold text-neutral-800 dark:text-neutral-100 text-base">
                                                <Link 
                                                    href={`/purchase-orders?search=${encodeURIComponent(inspection.po_number)}`}
                                                    onClick={() => auditLogsHighlight(inspection.po_number, '/purchase-orders')}
                                                    className="before:absolute before:inset-0 hover:underline"
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
                                    <div key={issuance.po_number} className="relative group flex items-center rounded-lg border border-l-4 border-l-rose-400 bg-white p-4 gap-4 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:border-l-rose-500 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold text-neutral-800 dark:text-neutral-100 text-base">
                                                <Link 
                                                    href={`/purchase-orders?search=${encodeURIComponent(issuance.po_number)}`}
                                                    onClick={() => auditLogsHighlight(issuance.po_number, '/purchase-orders')}
                                                    className="before:absolute before:inset-0 hover:underline"
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
                            <Button type="submit" disabled={processingFollowUp || !followUpData.notice_type || !followUpData.follow_up_date} className={followUpData.notice_type === 'Email' ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-red-700 hover:bg-red-800 text-white"}>
                                {processingFollowUp ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    followUpData.notice_type === 'Email' ? 'Send Email & Save' : 'Save Follow-up'
                                )}
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