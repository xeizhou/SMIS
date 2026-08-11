import { Head, Link, router } from '@inertiajs/react';
import { usePoll } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    ClipboardList,
    Clock,
    Download,
    Inbox,
    Maximize2,
    Minimize2,
    Package,
    Printer,
    RefreshCw,
    Tv,
    User,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import { dueDeliveriesHighlight } from '@/components/dueDeliveriesHighlight';

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
    const [currentTime, setCurrentTime] = useState<string>('');
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
    const prevStatuses = useRef<Map<string, string>>(
        new Map([...todayDeliveries, ...yesterdayDeliveries].map((d) => [d.delivery_id, d.status]))
    );

    // Live poll — re-fetches props every 5s without a full page reload
    usePoll(
        5000,
        {
            only: ['todayDeliveries', 'yesterdayDeliveries', 'todayStats', 'yesterdayStats'],
            onStart: () => setIsRefreshing(true),
            onSuccess: () => {
                setIsRefreshing(false);
                setLastUpdated(new Date());
            },
        }
    );

    // "Updated Xs ago" ticker
    useEffect(() => {
        const id = setInterval(() => {
            setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [lastUpdated]);

    // Flash rows whose status changed since last poll
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
            const t = setTimeout(() => setFlashedIds(new Set()), 1500);
            return () => clearTimeout(t);
        }
    }, [todayDeliveries, yesterdayDeliveries]);

    // Update real-time clock
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString('en-US', {
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

    // Handle date changes
    const handleFilterChange = (newToday?: string, newYesterday?: string) => {
        const tDate = newToday !== undefined ? newToday : selectedTodayDate;
        const yDate = newYesterday !== undefined ? newYesterday : selectedYesterdayDate;

        router.get(
            '/notice-of-delivery',
            { today_date: tDate, yesterday_date: yDate },
            { preserveState: true, preserveScroll: true }
        );
    };

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
            containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    const getStatusBadge = (status: string) => {
        const normalized = (status || '').toUpperCase();
        const badgeSize = isFullscreen ? 'px-3.5 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';
        switch (normalized) {
            case 'COMPLETE':
            case 'COMPLETED':
                return `inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20 border border-emerald-500/30 font-bold ${badgeSize} rounded-full tracking-wide shadow-sm`;
            default:
                return `inline-flex items-center gap-1 bg-neutral-500/15 text-neutral-700 dark:text-neutral-300 dark:bg-neutral-500/20 border border-neutral-500/30 font-bold ${badgeSize} rounded-full tracking-wide shadow-sm`;
        }
    };

    const renderTable = (
        titleLabel: string,
        dateFormatted: string,
        deliveries: DeliveryItem[],
        stats: Stats,
        headerBgClass: string
    ) => (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all">
            {/* Table Header Bar */}
            <div className={`flex items-center justify-between px-5 text-white ${headerBgClass} ${isFullscreen ? 'py-4' : 'py-3.5'}`}>
                <div className="flex items-center gap-3">
                    <div className="bg-white/15 p-1.5 rounded-lg shadow-inner">
                        <Calendar className={isFullscreen ? 'size-6' : 'size-5'} />
                    </div>
                    <h2 className={`font-black tracking-[0.03em] uppercase ${isFullscreen ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'}`}>
                        {titleLabel} <span className={`font-semibold text-white/70 tracking-normal ml-1.5 ${isFullscreen ? 'text-base md:text-lg' : 'text-sm'}`}>({dateFormatted})</span>
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`rounded-full bg-white px-3.5 py-1 font-black tracking-wider uppercase text-red-900 shadow-sm ${isFullscreen ? 'text-sm md:text-base' : 'text-xs'}`}>
                        COUNT: {stats.total_count}
                    </span>
                </div>
            </div>


            {/* Table Content */}
            <div className="flex-1 overflow-auto">
                <table className={`w-full table-fixed text-left ${isFullscreen ? 'text-base md:text-lg lg:text-xl' : 'text-xs md:text-sm'}`}>
                    <thead className="sticky top-0 z-10 bg-neutral-100/95 font-black uppercase tracking-wider text-black backdrop-blur-md dark:bg-neutral-800/95 dark:text-neutral-100 border-b-2 border-neutral-300 dark:border-neutral-600">
                        <tr>
                            <th className={`pl-8 pr-4 w-[30%] whitespace-nowrap ${isFullscreen ? 'py-4' : 'py-3.5'}`}>P.O. NUMBER</th>
                            <th className={`px-4 w-[50%] whitespace-nowrap ${isFullscreen ? 'py-4' : 'py-3.5'}`}>SUPPLIER'S NAME</th>
                            <th className={`pl-4 pr-8 w-[20%] text-center whitespace-nowrap ${isFullscreen ? 'py-4' : 'py-3.5'}`}>STATUS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800/60">
                        {deliveries.length > 0 ? (
                            deliveries.map((item, idx) => (
                                <tr
                                    key={item.delivery_id || idx}
                                    className={`transition-colors hover:bg-red-50/40 dark:hover:bg-red-950/20 group ${
                                        flashedIds.has(item.delivery_id) ? 'bg-amber-100/70 dark:bg-amber-900/30' : ''
                                    }`}
                                >
                                    <td className={`pl-8 pr-4 font-medium tracking-tight text-neutral-900 truncate dark:text-neutral-100 align-middle ${isFullscreen ? 'py-4' : 'py-3'}`}>
                                        <HoverCard openDelay={200} closeDelay={100}>
                                            <HoverCardTrigger asChild>
                                                <Link
                                                    href={`/deliveries?highlight_id=${item.delivery_id}`}
                                                    onClick={() => dueDeliveriesHighlight(item.delivery_id.toString(), '/deliveries')}
                                                    className="-ml-2 inline-flex items-center gap-1.5 max-w-full truncate rounded-md px-2 py-0.5 text-neutral-900 dark:text-neutral-100 font-medium hover:text-red-700 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                                                >
                                                    {item.po_number}
                                                </Link>
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-84 p-5 shadow-xl rounded-2xl border-neutral-200 dark:border-neutral-800" align="start">
                                                <div className="flex flex-col gap-4">
                                                    <div className="border-b border-neutral-100 pb-3 dark:border-neutral-800">
                                                        <h4 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{item.po_number}</h4>
                                                        <p className="text-xs text-neutral-500 font-medium">Notice of Delivery Record</p>
                                                    </div>
                                                    
                                                    <div className="grid gap-3 text-sm">
                                                        <div className="flex gap-3 items-start">
                                                            <User className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                                            <div>
                                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Supplier</p>
                                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.supplier_name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3 items-start">
                                                            <Calendar className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                                            <div>
                                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Delivery Date</p>
                                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.delivery_date}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3 items-start">
                                                            <ClipboardList className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                                            <div>
                                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Status</p>
                                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.status}</p>
                                                            </div>
                                                        </div>
                                                        {item.end_user && (
                                                            <div className="flex gap-3 items-start">
                                                                <Package className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                                                <div>
                                                                    <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">End User</p>
                                                                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.end_user}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex justify-end pt-2">
                                                        <Button variant="default" size="sm" asChild className="gap-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-medium shadow-sm">
                                                            <Link 
                                                                href={`/deliveries?highlight_id=${item.delivery_id}`}
                                                                onClick={() => dueDeliveriesHighlight(item.delivery_id.toString(), '/deliveries')}
                                                            >
                                                                Go to <ArrowRight className="size-4" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </HoverCardContent>
                                        </HoverCard>
                                    </td>
                                    <td className={`px-4 font-medium text-neutral-800 uppercase dark:text-neutral-200 align-middle ${isFullscreen ? 'py-4' : 'py-3'}`}>
                                        <div className="truncate font-medium">{item.supplier_name}</div>
                                        {item.end_user && (
                                            <div className={`font-medium text-neutral-500 dark:text-neutral-400 truncate ${isFullscreen ? 'text-sm mt-0.5' : 'text-xs'}`}>
                                                End-user: <span className="text-neutral-700 dark:text-neutral-300">{item.end_user}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className={`pl-4 pr-8 text-center align-middle ${isFullscreen ? 'py-4' : 'py-3'}`}>
                                        <span className={getStatusBadge(item.status)}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className={`text-center ${isFullscreen ? 'py-24' : 'py-16'}`}>
                                    <div className="flex flex-col items-center justify-center gap-3 text-red-700/60 dark:text-red-400/60">
                                        <div className={`flex items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 ${isFullscreen ? 'p-6' : 'p-4'}`}>
                                            <Inbox className={isFullscreen ? 'size-12' : 'size-8'} />
                                        </div>
                                        <p className={`font-semibold ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
                                            No delivery records found for this date.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Table Footer */}
            <div className="px-5 py-3 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400 flex items-center">
                <span className={`font-medium tracking-wide ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                    Showing {stats.total_count} of {stats.total_count} record{stats.total_count !== 1 ? 's' : ''} for {titleLabel.toLowerCase().includes('today') ? 'today' : 'yesterday'}.
                </span>
            </div>
        </div>
    );

    return (
        <>
            <Head title="Notice of Delivery Report" />
            <div ref={containerRef} className={`flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-2xl p-4 transition-all bg-neutral-100 dark:bg-neutral-950 ${isFullscreen ? 'p-6' : ''}`}>
                {/* Header Navigation & TV Controls */}
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 relative backdrop-blur-md">
                    {!isFullscreen && (
                        <div className="absolute left-5 top-5">
                            <Button variant="outline" size="icon" asChild title="Back to Dashboard" className="rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <Link href="/dashboard">
                                    <ArrowLeft className="size-4" />
                                </Link>
                            </Button>
                        </div>
                    )}

                    {/* Live indicator, top right */}
                    <div className="absolute right-5 top-5 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                            Updated {secondsAgo <= 1 ? 'just now' : `${secondsAgo}s ago`}
                        </span>
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            Live
                        </div>
                    </div>

                    {/* Centered Title */}
                    <div className="text-center px-12 pt-1">
                        <h1 className={`font-black uppercase tracking-tight text-red-700 dark:text-red-600 ${isFullscreen ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-2xl md:text-3xl lg:text-4xl'}`}>
                            NOTICE OF DELIVERY REPORT
                        </h1>
                    </div>

                    {/* Filter Controls & Screencast Tools */}
                    <div className="flex w-full flex-wrap items-center justify-center gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                        {/* Live Clock */}
                        <div className={`flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-3.5 py-1.5 font-bold text-red-700 dark:text-red-300 border border-red-200/80 dark:border-red-900/60 shadow-2xs ${isFullscreen ? 'text-base md:text-lg' : 'text-xs'}`}>
                            <Clock className={isFullscreen ? 'size-5' : 'size-4'} />
                            <span className="font-mono tracking-wide">{currentTime || '00:00:00 AM'}</span>
                        </div>

                        <div className="hidden h-5 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />

                        {/* Date Filters Group */}
                        <div className="flex items-center gap-3 bg-neutral-50/80 px-3 py-1.5 rounded-xl border border-neutral-200/80 dark:bg-neutral-800/50 dark:border-neutral-700/80">
                            <div className="flex items-center gap-1.5">
                                <span className={`font-extrabold text-neutral-500 uppercase tracking-wider dark:text-neutral-400 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>Today:</span>
                                <input
                                    type="date"
                                    value={selectedTodayDate}
                                    onChange={(e) => {
                                        setSelectedTodayDate(e.target.value);
                                        handleFilterChange(e.target.value, undefined);
                                    }}
                                    className={`rounded-lg border border-neutral-300/80 bg-white px-2.5 font-semibold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 shadow-2xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all ${isFullscreen ? 'h-9 w-38 text-sm' : 'h-8 w-34 text-xs'}`}
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={`font-extrabold text-neutral-500 uppercase tracking-wider dark:text-neutral-400 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>Prev:</span>
                                <input
                                    type="date"
                                    value={selectedYesterdayDate}
                                    onChange={(e) => {
                                        setSelectedYesterdayDate(e.target.value);
                                        handleFilterChange(undefined, e.target.value);
                                    }}
                                    className={`rounded-lg border border-neutral-300/80 bg-white px-2.5 font-semibold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 shadow-2xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all ${isFullscreen ? 'h-9 w-38 text-sm' : 'h-8 w-34 text-xs'}`}
                                />
                            </div>
                        </div>

                        <div className="hidden h-5 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />

                        {/* Tools Group */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size={isFullscreen ? "default" : "sm"}
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                className="rounded-xl border-neutral-200 dark:border-neutral-700 shadow-2xs"
                                title="Refresh Data"
                            >
                                <RefreshCw className={`${isFullscreen ? 'size-5' : 'size-4'} ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>

                            <Button
                                variant={isFullscreen ? "secondary" : "default"}
                                size={isFullscreen ? "default" : "sm"}
                                onClick={toggleFullscreen}
                                className={!isFullscreen ? "bg-red-700 hover:bg-red-800 text-white gap-2 rounded-xl shadow-xs" : "gap-2 rounded-xl shadow-xs"}
                                title="Toggle Fullscreen"
                            >
                                {isFullscreen ? <Minimize2 className={isFullscreen ? 'size-5' : 'size-4'} /> : <Maximize2 className="size-4" />}
                                <span className="font-semibold">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Dual-Column Tables (Today vs Yesterday) */}
                <div className="grid flex-1 gap-5 md:grid-cols-2">
                    {/* TODAY'S DELIVERY */}
                    {renderTable(
                        "TODAY'S DELIVERY",
                        todayDateFormatted,
                        todayDeliveries,
                        todayStats,
                        'bg-gradient-to-r from-red-600 via-red-700 to-rose-800 shadow-[0_4px_12px_rgba(220,38,38,0.25)] relative z-10'
                    )}

                    {/* YESTERDAY DELIVERY */}
                    {renderTable(
                        "YESTERDAY DELIVERY",
                        yesterdayDateFormatted,
                        yesterdayDeliveries,
                        yesterdayStats,
                        'bg-gradient-to-r from-neutral-700 via-neutral-800 to-neutral-900 shadow-[0_4px_12px_rgba(0,0,0,0.15)] relative z-10'
                    )}
                </div>
            </div>
        </>
    );
}