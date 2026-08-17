import { router, Link } from '@inertiajs/react';
import { RefreshCw, User, CalendarDays, ClipboardList, Package, ArrowRight } from 'lucide-react';
import { dueDeliveriesHighlight } from './dueDeliveriesHighlight';
import { useState } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export type DueDelivery = {
    delivery_id: string;
    po_number: string;
    due_date: string; // ISO date string, e.g. "2026-07-23"
    due_date_formatted?: string | null;
    is_overdue?: boolean;
    days_overdue?: number;
    diff_days?: number;
    status?: string | null;
    end_user?: string | null;
    supplier?: { supplier_name: string } | null;
};

type Props = {
    deliveries?: DueDelivery[];
};

// Fallback mock data — shown only if no real `deliveries` prop is passed yet
const MOCK_DELIVERIES: DueDelivery[] = [
    { delivery_id: '1', po_number: 'PO-2026-0317', due_date: '2026-07-20', supplier: { supplier_name: 'Fine Dining Davao Food Services' } },
    { delivery_id: '2', po_number: 'PO-2026-0318', due_date: '2026-07-23', supplier: { supplier_name: 'Fine Dining Davao Food Services' } },
    { delivery_id: '3', po_number: 'PO-2026-0319', due_date: '2026-07-25', supplier: { supplier_name: 'Fine Dining Davao Food Services' } },
    { delivery_id: '4', po_number: 'PO-2026-0320', due_date: '2026-07-29', supplier: { supplier_name: 'Fine Dining Davao Food Services' } },
];

function formatDayMonth(dateStr: string) {
    const date = new Date(dateStr);

    return {
        day: date.getDate().toString().padStart(2, '0'),
        month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    };
}

function daysUntil(dateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

    if (diff < 0) {
        return { 
            text: `${Math.abs(diff)}d overdue`, 
            cardStyle: 'border-l-red-500 bg-red-50/70 dark:bg-red-950/30',
            textStyle: 'text-red-600 dark:text-red-400 font-medium'
        };
    }

    if (diff === 0) {
        return { 
            text: 'Due today', 
            cardStyle: 'border-l-orange-500 bg-orange-50/70 dark:bg-orange-950/30',
            textStyle: 'text-orange-600 dark:text-orange-400 font-medium'
        };
    }

    if (diff === 1) {
        return { 
            text: 'Due tomorrow', 
            cardStyle: 'border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/30',
            textStyle: 'text-amber-600 dark:text-amber-400 font-medium'
        };
    }

    // Due within 7 days
    if (diff <= 7) {
        return { 
            text: `Due in ${diff} days`, 
            cardStyle: 'border-l-yellow-500 bg-yellow-50/70 dark:bg-yellow-950/30',
            textStyle: 'text-yellow-600 dark:text-yellow-400 font-medium'
        };
    }

    // Due within 14 days
    if (diff <= 14) {
        return {
            text: `Due in ${diff} days`,
            cardStyle: 'border-l-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30',
            textStyle: 'text-emerald-600 dark:text-emerald-400 font-medium'
        };
    }

    // More than 14 days away
    return null;
}

export function DueDeliveries({ deliveries }: Props) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const data = deliveries ?? MOCK_DELIVERIES;

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['deliveries'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const renderList = () => (
        <div className="space-y-2 pb-2">
            {data.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-400">
                    No upcoming deliveries.
                </p>
            )}

            <TooltipProvider delayDuration={200}>
                {data.map((item) => {
                    const status = daysUntil(item.due_date);
                    if (!status) return null;

                    const { text, cardStyle, textStyle } = status;
                    const { day, month } = formatDayMonth(item.due_date);

                    return (
                        <Tooltip key={item.delivery_id}>
                            <TooltipTrigger asChild>
                                <div
                                    className={`flex items-center gap-3 rounded-lg border-l-4 p-2.5 cursor-pointer transition-colors ${cardStyle}`}
                                >
                                    <div className="flex w-10 shrink-0 flex-col items-center leading-none">
                                        <span className="text-[10px] font-medium text-neutral-500">{month}</span>
                                        <span className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                                            {day}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">
                                            {item.po_number}
                                        </p>
                                        {(item.supplier?.supplier_name || item.end_user) && (
                                            <p className="truncate text-xs text-neutral-500">
                                                {item.supplier?.supplier_name ?? item.end_user}
                                            </p>
                                        )}
                                        <p className={`text-xs mt-0.5 ${textStyle}`}>{text}</p>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent 
                                side="left" 
                                sideOffset={15}
                                className="w-84 p-5 shadow-xl rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="border-b border-neutral-100 pb-3 dark:border-neutral-800">
                                        <h4 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{item.po_number}</h4>
                                        <p className="text-xs text-neutral-500 font-medium">View delivery details</p>
                                    </div>

                                    <div className="grid gap-3 text-sm">
                                        <div className="flex gap-3 items-start">
                                            <User className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Supplier</p>
                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.supplier?.supplier_name ?? '—'}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 items-start">
                                            <CalendarDays className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Due Date</p>
                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.due_date} ({text})</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 items-start">
                                            <ClipboardList className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Status</p>
                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.status ?? '—'}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-3 items-start">
                                            <Package className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">End User</p>
                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.end_user ?? '—'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Link 
                                            href={`/deliveries?highlight_id=${item.delivery_id}`}
                                            onClick={() => dueDeliveriesHighlight(item.delivery_id.toString(), '/deliveries')}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus-visible:outline-none"
                                        >
                                            Go to <ArrowRight className="size-4" />
                                        </Link>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </TooltipProvider>
        </div>
    );

    return (
        <Dialog>
            <div className="relative flex h-full flex-col rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900 overflow-hidden">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        Due Deliveries
                    </h3>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        aria-label="Refresh due deliveries"
                    >
                        <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <ScrollArea className="flex-1 pr-3">
                    {renderList()}
                </ScrollArea>

                <div className="relative mt-2 border-t border-neutral-200 dark:border-neutral-800 pt-3 text-center">
                    <div className="pointer-events-none absolute bottom-[100%] left-[-16px] right-[-16px] h-8 z-10 bg-gradient-to-t from-white to-white/0 dark:from-neutral-900 dark:to-neutral-900/0" />
                    <DialogTrigger className="text-sm font-semibold text-red-700 dark:text-red-500 hover:underline focus:outline-none">
                        View all due deliveries
                    </DialogTrigger>
                </div>
            </div>

            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>All Due Deliveries</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] -mx-6 px-6 mt-2">
                    <div className="pb-4">
                        {renderList()}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}