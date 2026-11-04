import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Calendar,
    Clock,
    Inbox,
    Maximize2,
    Minimize2,
    Package,
    RefreshCw,
    User,
    ExternalLink,
    FileText,
    Info,
    CheckCircle2,
    Tv,
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import DatePicker from '@/components/date-picker';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';
import { cn } from '@/lib/utils';

interface DeliveryItem {
    delivery_id: string;
    po_number: string;
    supplier_name: string;
    status: string;
    delivery_date: string;
    end_user: string;
    total_amount_delivered: number;
    po_total_amount: number;
    remarks?: string | null;
    item_description?: string;
}

interface Stats {
    total_count: number;
    complete_count?: number;
    partial_count?: number;
    total_delivered_amount: number;
}

interface Props {
    todayDate: string;
    todayDateFormatted: string;
    yesterdayDate: string;
    yesterdayDateFormatted: string;
    todayDeliveries: DeliveryItem[];
    yesterdayDeliveries: DeliveryItem[];
    todayStats: Stats;
    yesterdayStats: Stats;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(amount);
};

// ---------------------------------------------------------------------------
// Isolated "Updated Xs ago" ticker to prevent full-page re-renders.
// ---------------------------------------------------------------------------
function LastUpdated({ lastUpdated }: { lastUpdated: Date }) {
    const [secondsAgo, setSecondsAgo] = useState(0);

    useEffect(() => {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
        const id = setInterval(() => {
            setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [lastUpdated]);

    return (
        <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline select-none">
            Updated {secondsAgo <= 1 ? 'just now' : `${secondsAgo}s ago`}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Isolated live clock to prevent whole-page ticks.
// ---------------------------------------------------------------------------
function LiveClock({ isFullscreen }: { isFullscreen: boolean }) {
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateClock = () => {
            setCurrentTime(
                new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                })
            );
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div
            className={cn(
                'flex items-center gap-1.5 rounded-lg border font-mono font-bold tracking-tight shadow-2xs select-none transition-all bg-neutral-50 dark:bg-neutral-800/80 border-neutral-200/80 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200',
                isFullscreen ? 'px-3 py-1 text-xs sm:text-sm' : 'px-2.5 py-1 text-xs'
            )}
        >
            <Clock className={cn('text-[#612A35] dark:text-[#E89BA8]', isFullscreen ? 'size-4' : 'size-3.5')} />
            <span>{currentTime || '00:00:00 AM'}</span>
        </div>
    );
}

export default function NoticeOfDeliveryReport({
    todayDate,
    todayDateFormatted,
    yesterdayDate,
    yesterdayDateFormatted,
    todayDeliveries = [],
    yesterdayDeliveries = [],
    todayStats = {
        total_count: 0,
        total_delivered_amount: 0,
    },
    yesterdayStats = {
        total_count: 0,
        total_delivered_amount: 0,
    },
}: Props) {
    const [selectedTodayDate, setSelectedTodayDate] = useState(todayDate);
    const [selectedYesterdayDate, setSelectedYesterdayDate] = useState(yesterdayDate);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    // Instant client-side sorting: zero latency, zero SQL errors, clean URL
    const [activeSortField, setActiveSortField] = useState<'po_number' | 'supplier' | 'status'>('po_number');
    const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');

    const containerRef = useRef<HTMLDivElement>(null);
    const prevStatuses = useRef<Map<string, string>>(
        new Map([...todayDeliveries, ...yesterdayDeliveries].map((d) => [d.delivery_id, d.status]))
    );

    // Keep internal selection synced when server props change
    useEffect(() => {
        setSelectedTodayDate(todayDate);
    }, [todayDate]);

    useEffect(() => {
        setSelectedYesterdayDate(yesterdayDate);
    }, [yesterdayDate]);

    // Smart 10s polling: Pauses automatically when tab is hidden
    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval> | undefined;

        const refreshData = () => {
            if (document.hidden) return;
            router.reload({
                only: ['todayDeliveries', 'yesterdayDeliveries', 'todayStats', 'yesterdayStats'],
                onStart: () => setIsRefreshing(true),
                onFinish: () => {
                    setIsRefreshing(false);
                    setLastUpdated(new Date());
                },
            });
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                refreshData();
                if (!pollInterval) pollInterval = setInterval(refreshData, 10000);
            } else if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = undefined;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        if (!document.hidden) {
            pollInterval = setInterval(refreshData, 10000);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, []);

    // Flash rows whose status changed since last update
    useEffect(() => {
        const all = [...todayDeliveries, ...yesterdayDeliveries];
        const changed = new Set<string>();
        for (const item of all) {
            const prev = prevStatuses.current.get(item.delivery_id);
            if (prev !== undefined && prev !== item.status) {
                changed.add(item.delivery_id);
            }
            prevStatuses.current.set(item.delivery_id, item.status);
        }
        if (changed.size > 0) {
            setFlashedIds(changed);
            const t = setTimeout(() => setFlashedIds(new Set()), 2000);
            return () => clearTimeout(t);
        }
    }, [todayDeliveries, yesterdayDeliveries]);

    // Clean URL Date Navigation: Only adds query params if the dates diverge from default today / yesterday
    const navigateWithDates = useCallback((newToday: string, newYesterday: string) => {
        const now = new Date();
        const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

        const params = new URLSearchParams();
        if (newToday && newToday !== nowStr) {
            params.set('today_date', newToday);
        }
        if (newYesterday && newYesterday !== yestStr) {
            params.set('yesterday_date', newYesterday);
        }

        const queryStr = params.toString();
        const targetUrl = queryStr ? `/notice-of-delivery?${queryStr}` : '/notice-of-delivery';

        router.get(targetUrl, {}, { preserveState: true, preserveScroll: true, replace: true });
    }, []);

    const handleTodayChange = (newDate: string) => {
        setSelectedTodayDate(newDate);
        navigateWithDates(newDate, selectedYesterdayDate);
    };

    const handleYesterdayChange = (newDate: string) => {
        setSelectedYesterdayDate(newDate);
        navigateWithDates(selectedTodayDate, newDate);
    };

    // Client-side instant sort toggle (keeps URL completely clean)
    const handleSort = (field: 'po_number' | 'supplier' | 'status') => {
        if (activeSortField === field) {
            setActiveSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setActiveSortField(field);
            setActiveSortDirection('asc');
        }
    };

    // Sort deliveries in-memory
    const sortDeliveries = useCallback((items: DeliveryItem[]) => {
        return [...items].sort((a, b) => {
            let valA = '';
            let valB = '';

            if (activeSortField === 'po_number') {
                valA = a.po_number || '';
                valB = b.po_number || '';
            } else if (activeSortField === 'supplier') {
                valA = a.supplier_name || '';
                valB = b.supplier_name || '';
            } else if (activeSortField === 'status') {
                valA = a.status || '';
                valB = b.status || '';
            }

            const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
            return activeSortDirection === 'asc' ? cmp : -cmp;
        });
    }, [activeSortField, activeSortDirection]);

    const sortedTodayDeliveries = useMemo(() => sortDeliveries(todayDeliveries), [todayDeliveries, sortDeliveries]);
    const sortedYesterdayDeliveries = useMemo(() => sortDeliveries(yesterdayDeliveries), [yesterdayDeliveries, sortDeliveries]);

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => {
                setIsRefreshing(false);
                setLastUpdated(new Date());
            },
        });
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
        }
    };

    const handleNavigateToDelivery = useCallback((deliveryId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey || e.button === 1) {
            // New tab natively opens the href
            return;
        }
        e.preventDefault();
        auditLogsHighlight(deliveryId, '/deliveries');
        router.visit(`/deliveries?highlight_id=${encodeURIComponent(deliveryId)}`);
    }, []);

    const getStatusBadge = (status: string) => {
        const normalized = (status || '').toUpperCase();
        const baseClass = isFullscreen
            ? 'px-3 py-1 text-xs font-bold rounded-full tracking-wide shadow-2xs uppercase whitespace-nowrap'
            : 'px-2.5 py-0.5 text-[11px] font-bold rounded-full tracking-wide shadow-2xs uppercase whitespace-nowrap';

        switch (normalized) {
            case 'COMPLETE':
            case 'COMPLETED':
                return (
                    <span className={cn('bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60', baseClass)}>
                        Complete
                    </span>
                );
            case 'PARTIAL':
                return (
                    <span className={cn('bg-amber-50 text-amber-700 border border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60', baseClass)}>
                        Partial
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className={cn('bg-red-50 text-red-700 border border-red-200/90 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60', baseClass)}>
                        Cancelled
                    </span>
                );
            default:
                return (
                    <span className={cn('bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700', baseClass)}>
                        {status || 'Unknown'}
                    </span>
                );
        }
    };

    const renderSortChevron = (field: 'po_number' | 'supplier' | 'status') => {
        if (activeSortField !== field) {
            return <ArrowUpDown className="size-3 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors" />;
        }
        return activeSortDirection === 'asc' ? (
            <ArrowUp className="size-3 text-[#612A35] dark:text-[#E89BA8]" />
        ) : (
            <ArrowDown className="size-3 text-[#612A35] dark:text-[#E89BA8]" />
        );
    };

    const renderTableBoard = (
        titleLabel: string,
        dateFormatted: string,
        deliveries: DeliveryItem[],
        stats: Stats,
        isTodayBoard: boolean
    ) => (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs min-h-0 transition-all">
            {/* Board Header Bar */}
            <div
                className={cn(
                    'flex items-center justify-between px-4 sm:px-5 shrink-0 select-none border-b transition-colors',
                    isTodayBoard
                        ? 'bg-[#370001] dark:bg-[#250001] text-white border-[#4C0002]'
                        : 'bg-neutral-800 dark:bg-neutral-900 text-white border-neutral-700 dark:border-neutral-800',
                    isFullscreen ? 'py-3.5' : 'py-3'
                )}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-white/10 shrink-0 shadow-inner">
                        <Calendar className={isFullscreen ? 'size-4' : 'size-3.5 text-white/90'} />
                    </div>
                    <div className="flex items-center gap-2 truncate">
                        <h2 className={cn('font-bold tracking-tight uppercase truncate', isFullscreen ? 'text-base md:text-lg' : 'text-sm sm:text-base')}>
                            {titleLabel}
                        </h2>
                        <span className={cn('font-normal text-white/70 truncate', isFullscreen ? 'text-sm' : 'text-xs')}>
                            ({dateFormatted})
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('rounded-full bg-white/15 px-2.5 py-0.5 font-bold tracking-wider text-white border border-white/20 shadow-2xs', isFullscreen ? 'text-xs' : 'text-[11px]')}>
                        COUNT: {stats.total_count}
                    </span>
                </div>
            </div>

            {/* Board Table Area */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <ScrollArea orientation="both" className="h-full w-full">
                    <table className={cn('w-full min-w-[540px] text-left border-collapse', isFullscreen ? 'text-sm md:text-base' : 'text-xs sm:text-sm')}>
                        <thead className="sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/90 shadow-2xs backdrop-blur-xs">
                            <tr className="border-b border-neutral-200 dark:border-neutral-800">
                                <th className={cn('pl-4 sm:pl-5 pr-3 w-[32%] font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider whitespace-nowrap', isFullscreen ? 'py-3.5' : 'py-2.5')}>
                                    <button
                                        type="button"
                                        onClick={() => handleSort('po_number')}
                                        className="group flex items-center gap-1.5 hover:text-[#612A35] dark:hover:text-[#E89BA8] transition-colors cursor-pointer"
                                    >
                                        <span>P.O. Number</span>
                                        {renderSortChevron('po_number')}
                                    </button>
                                </th>
                                <th className={cn('px-3 w-[46%] font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider whitespace-nowrap', isFullscreen ? 'py-3.5' : 'py-2.5')}>
                                    <button
                                        type="button"
                                        onClick={() => handleSort('supplier')}
                                        className="group flex items-center gap-1.5 hover:text-[#612A35] dark:hover:text-[#E89BA8] transition-colors cursor-pointer"
                                    >
                                        <span>Supplier&apos;s Name</span>
                                        {renderSortChevron('supplier')}
                                    </button>
                                </th>
                                <th className={cn('pl-3 pr-4 sm:pr-5 w-[22%] font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider text-center whitespace-nowrap', isFullscreen ? 'py-3.5' : 'py-2.5')}>
                                    <button
                                        type="button"
                                        onClick={() => handleSort('status')}
                                        className="group inline-flex items-center gap-1.5 hover:text-[#612A35] dark:hover:text-[#E89BA8] transition-colors cursor-pointer"
                                    >
                                        <span>Status</span>
                                        {renderSortChevron('status')}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                            {deliveries.length > 0 ? (
                                deliveries.map((item, idx) => {
                                    const targetUrl = `/deliveries?highlight_id=${encodeURIComponent(item.delivery_id)}`;
                                    const isFlashed = flashedIds.has(item.delivery_id);

                                    return (
                                        <tr
                                            key={item.delivery_id || `${item.po_number}-${idx}`}
                                            data-record-id={item.delivery_id}
                                            data-search-0={item.po_number}
                                            className={cn(
                                                'transition-colors group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50',
                                                isFlashed && '!bg-amber-100/70 dark:!bg-amber-900/40'
                                            )}
                                        >
                                            {/* Column 1: PO Number with HoverCard & Deep Link */}
                                            <td className={cn('pl-4 sm:pl-5 pr-3 align-middle font-medium', isFullscreen ? 'py-3.5' : 'py-2.5')}>
                                                <HoverCard openDelay={180} closeDelay={120}>
                                                    <HoverCardTrigger asChild>
                                                        <a
                                                            href={targetUrl}
                                                            onClick={(e) => handleNavigateToDelivery(item.delivery_id, e)}
                                                            className="inline-flex items-center gap-1 font-semibold text-[#612A35] hover:text-[#4C0002] dark:text-[#E89BA8] dark:hover:text-[#f3b6c1] hover:underline cursor-pointer group/link max-w-full truncate"
                                                            title="View delivery details"
                                                        >
                                                            <span className="truncate">{item.po_number}</span>
                                                            <ExternalLink className="size-3 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0 text-neutral-400" />
                                                        </a>
                                                    </HoverCardTrigger>
                                                    <HoverCardContent
                                                        className="w-80 p-4 shadow-lg rounded-xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                                                        align="start"
                                                        side="right"
                                                        sideOffset={8}
                                                    >
                                                        <div className="flex flex-col gap-3">
                                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2.5 flex items-center justify-between">
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                                                        {item.po_number}
                                                                    </h4>
                                                                    <p className="text-[11px] text-neutral-500 font-medium">
                                                                        Delivery Dispatch Record
                                                                    </p>
                                                                </div>
                                                                {getStatusBadge(item.status)}
                                                            </div>

                                                            <div className="grid gap-2 text-xs">
                                                                <div className="flex gap-2 items-start">
                                                                    <User className="size-3.5 text-neutral-400 mt-0.5 shrink-0" />
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Supplier</p>
                                                                        <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">{item.supplier_name}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-2 items-start">
                                                                    <Calendar className="size-3.5 text-neutral-400 mt-0.5 shrink-0" />
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Delivery Date</p>
                                                                        <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.delivery_date}</p>
                                                                    </div>
                                                                </div>

                                                                {item.end_user && (
                                                                    <div className="flex gap-2 items-start">
                                                                        <Package className="size-3.5 text-neutral-400 mt-0.5 shrink-0" />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">End-User / Office</p>
                                                                            <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate">{item.end_user}</p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {item.total_amount_delivered > 0 && (
                                                                    <div className="flex gap-2 items-start pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                                                        <FileText className="size-3.5 text-neutral-400 mt-0.5 shrink-0" />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Amount Delivered</p>
                                                                            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                                                {formatCurrency(item.total_amount_delivered)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                                                                <a
                                                                    href={targetUrl}
                                                                    onClick={(e) => handleNavigateToDelivery(item.delivery_id, e)}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#612A35] hover:bg-[#4C0002] text-white shadow-2xs transition-colors cursor-pointer"
                                                                >
                                                                    <span>Go to Delivery</span>
                                                                    <ArrowRight className="size-3" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </HoverCardContent>
                                                </HoverCard>
                                            </td>

                                            {/* Column 2: Supplier Name & End-User Subtitle */}
                                            <td className={cn('px-3 align-middle text-neutral-800 dark:text-neutral-200', isFullscreen ? 'py-3.5' : 'py-2.5')}>
                                                <div className="font-medium truncate max-w-[280px] sm:max-w-[340px]" title={item.supplier_name}>
                                                    {item.supplier_name}
                                                </div>
                                                {item.end_user && (
                                                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[280px] sm:max-w-[340px]">
                                                        End-user: <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.end_user}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Column 3: Institutional Status Badge */}
                                            <td className={cn('pl-3 pr-4 sm:pr-5 align-middle text-center', isFullscreen ? 'py-3.5' : 'py-2.5')}>
                                                {getStatusBadge(item.status)}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={3} className={cn('text-center', isFullscreen ? 'py-24' : 'py-16')}>
                                        <div className="flex flex-col items-center justify-center gap-2.5 text-neutral-400">
                                            <div className="flex size-11 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shadow-inner">
                                                <Inbox className="size-5" />
                                            </div>
                                            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                                No delivery records found for this date
                                            </p>
                                            <p className="text-xs text-neutral-400 max-w-xs">
                                                Deliveries logged with Complete or Partial status will appear here in real-time.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            </div>

            {/* Board Footer Bar */}
            <div className="px-4 sm:px-5 py-2.5 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400 flex items-center justify-between text-xs shrink-0 select-none">
                <span className="font-medium truncate">
                    Showing <strong className="text-neutral-700 dark:text-neutral-300">{deliveries.length}</strong> record{deliveries.length !== 1 ? 's' : ''}
                </span>
                {stats.total_delivered_amount > 0 && (
                    <span className="font-medium text-neutral-600 dark:text-neutral-400 hidden sm:inline">
                        Delivered: <strong className="text-neutral-900 dark:text-neutral-100">{formatCurrency(stats.total_delivered_amount)}</strong>
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <>
            <Head title="Notice of Delivery" />

            <div
                ref={containerRef}
                className={cn(
                    'flex flex-col transition-all',
                    isFullscreen
                        ? 'fixed inset-0 z-50 bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 gap-4 overflow-hidden'
                        : 'flex-1 min-h-0 p-4 sm:p-6 gap-4 pb-6 overflow-x-hidden w-full max-w-full'
                )}
            >
                {/* Centered Institutional Header Card */}
                <div
                    className={cn(
                        'relative flex flex-col items-center justify-center gap-3.5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs backdrop-blur-md shrink-0 transition-all',
                        isFullscreen ? 'p-5 md:p-6' : 'p-4 sm:p-5'
                    )}
                >
                    {/* Top-Left: Back to Dashboard */}
                    {!isFullscreen && (
                        <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
                            <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className="size-8 rounded-lg shrink-0 cursor-pointer shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                title="Back to Dashboard"
                            >
                                <Link href="/dashboard">
                                    <ArrowLeft className="size-4" />
                                </Link>
                            </Button>
                        </div>
                    )}

                    {/* Top-Right: Live Status & Last Updated */}
                    <div className="absolute right-4 top-4 sm:right-5 sm:top-5 flex items-center gap-2 select-none">
                        <LastUpdated lastUpdated={lastUpdated} />
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                            </span>
                            <span>Live</span>
                        </div>
                    </div>

                    {/* Centered Title & Reference Modal Trigger */}
                    <div className="text-center px-12 pt-1 sm:pt-0">
                        <div className="inline-flex items-center justify-center gap-2.5">
                            <h1
                                className={cn(
                                    'font-black uppercase tracking-tight text-[#612A35] dark:text-[#E89BA8] leading-none select-none',
                                    isFullscreen
                                        ? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight'
                                        : 'text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem]'
                                )}
                            >
                                NOTICE OF DELIVERY
                            </h1>
                            <button
                                type="button"
                                onClick={() => setIsInfoOpen(true)}
                                className={cn(
                                    'flex items-center justify-center rounded-full text-neutral-400 hover:text-[#612A35] dark:hover:text-[#E89BA8] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer',
                                    isFullscreen ? 'size-8' : 'size-7'
                                )}
                                title="About Notice of Delivery (ⓘ)"
                                aria-label="Notice of Delivery Reference"
                            >
                                <Info className={isFullscreen ? 'size-5' : 'size-4.5'} />
                            </button>
                        </div>
                        <p className={cn('text-neutral-500 dark:text-neutral-400 mt-1.5 font-medium tracking-normal', isFullscreen ? 'text-sm md:text-base' : 'text-xs sm:text-sm')}>
                            Real-time incoming delivery dispatch &amp; status monitor
                        </p>
                    </div>

                    {/* Centered Bottom Controls Toolbar */}
                    <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                        {/* Live Clock */}
                        <LiveClock isFullscreen={isFullscreen} />

                        <div className="hidden sm:block h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

                        {/* Date Selectors */}
                        <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800/60 px-2 py-1 rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
                            <div className="flex items-center gap-1.5">
                                <label htmlFor="today-date-picker" className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider select-none">
                                    Today:
                                </label>
                                <DatePicker
                                    id="today-date-picker"
                                    value={selectedTodayDate}
                                    onChange={handleTodayChange}
                                    className="w-[7.5rem] sm:w-[8rem]"
                                    ariaLabel="Select Today's Date"
                                />
                            </div>

                            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5" />

                            <div className="flex items-center gap-1.5">
                                <label htmlFor="yesterday-date-picker" className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider select-none">
                                    Prev:
                                </label>
                                <DatePicker
                                    id="yesterday-date-picker"
                                    value={selectedYesterdayDate}
                                    onChange={handleYesterdayChange}
                                    className="w-[7.5rem] sm:w-[8rem]"
                                    ariaLabel="Select Previous Date"
                                />
                            </div>
                        </div>

                        <div className="hidden sm:block h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

                        {/* Manual Refresh Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Refresh delivery records"
                        >
                            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
                            <span>Refresh</span>
                        </Button>

                        {/* Fullscreen / TV Mode Button */}
                        <Button
                            variant={isFullscreen ? 'outline' : 'default'}
                            size="sm"
                            onClick={toggleFullscreen}
                            className={cn(
                                'h-8 gap-1.5 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer transition-colors',
                                !isFullscreen
                                    ? 'bg-[#612A35] hover:bg-[#4C0002] text-white border-transparent'
                                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            )}
                            title={isFullscreen ? 'Exit Fullscreen TV Mode' : 'Enter Fullscreen TV Mode'}
                        >
                            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                        </Button>
                    </div>
                </div>

                {/* Main Content Area: Side-by-Side Dual Boards */}
                <div className="grid flex-1 grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                    {/* Today's Delivery Board */}
                    {renderTableBoard(
                        "Today's Delivery",
                        todayDateFormatted,
                        sortedTodayDeliveries,
                        todayStats,
                        true
                    )}

                    {/* Previous Delivery Board */}
                    {renderTableBoard(
                        'Previous Delivery',
                        yesterdayDateFormatted,
                        sortedYesterdayDeliveries,
                        yesterdayStats,
                        false
                    )}
                </div>
            </div>

            {/* Notice of Delivery Reference Dialog (ⓘ) */}
            <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-5 pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
                                <Info className="size-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                                    Notice of Delivery Reference
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 font-normal mt-0.5">
                                    Daily incoming delivery dispatch and screencast specifications
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Page Source Attribution Banner */}
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-100/80 px-3 py-2 border border-neutral-200 dark:bg-neutral-800/60 dark:border-neutral-700 text-xs">
                            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                                <span className="text-neutral-400 dark:text-neutral-500">Based on Page:</span>
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">Deliveries Module</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/deliveries"
                                    className="inline-flex items-center gap-1 font-semibold text-[#612A35] hover:text-[#4C0002] dark:text-[#E89BA8] dark:hover:text-[#f3b6c1] hover:underline"
                                >
                                    <span>Deliveries</span>
                                    <ExternalLink className="size-3" />
                                </Link>
                                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                <Link
                                    href="/purchase-orders"
                                    className="inline-flex items-center gap-1 font-semibold text-[#612A35] hover:text-[#4C0002] dark:text-[#E89BA8] dark:hover:text-[#f3b6c1] hover:underline"
                                >
                                    <span>Purchase Orders</span>
                                    <ExternalLink className="size-3" />
                                </Link>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 p-5 text-xs text-neutral-600 dark:text-neutral-300 overflow-y-auto space-y-4">
                        {/* 1. Date of Delivery Basis */}
                        <div className="flex items-start gap-3">
                            <div className="pt-0.5 text-[#612A35] dark:text-[#E89BA8] shrink-0">
                                <Calendar className="size-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                    Date of Delivery Basis
                                </h4>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                                    Sourced from the <strong>Deliveries Module</strong>. Deliveries appear on the active board strictly when their actual <strong>Date of Delivery</strong> (<span className="font-mono">delivery_date</span>) matches the selected date.
                                </p>
                            </div>
                        </div>

                        {/* 2. Eligible Statuses */}
                        <div className="flex items-start gap-3">
                            <div className="pt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <CheckCircle2 className="size-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                    Eligible Statuses
                                </h4>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                                    Only shipments logged as <strong>Complete</strong> (all items received) or <strong>Partial</strong> (staggered delivery) appear on the board. Draft, pending, or cancelled orders will not show.
                                </p>
                            </div>
                        </div>

                        {/* 3. Live Sync & Amber Flashing */}
                        <div className="flex items-start gap-3">
                            <div className="pt-0.5 text-blue-600 dark:text-blue-400 shrink-0">
                                <Clock className="size-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                    Live Sync &amp; Flashing
                                </h4>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                                    The board polls updates every 10 seconds. Newly recorded or updated deliveries immediately flash amber for 2 seconds to alert dock staff.
                                </p>
                            </div>
                        </div>

                        {/* 4. TV Screencast Mode */}
                        <div className="flex items-start gap-3">
                            <div className="pt-0.5 text-purple-600 dark:text-purple-400 shrink-0">
                                <Tv className="size-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                    TV &amp; Screencast Mode
                                </h4>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                                    Click <strong>Fullscreen</strong> to expand typography and table row heights for wall monitors and receiving dock displays.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-3.5 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsInfoOpen(false)}
                            className="w-full sm:w-auto h-8 text-xs cursor-pointer ml-auto"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

NoticeOfDeliveryReport.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Notice of Delivery',
            href: '/notice-of-delivery',
        },
    ],
};
