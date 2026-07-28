import { router } from '@inertiajs/react';
import { RefreshCw, User, CalendarDays, ClipboardList, Package, MoveRight } from 'lucide-react';
import { useState } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

export type DueDelivery = {
    delivery_id: string;
    po_number: string;
    due_date: string; // ISO date string, e.g. "2026-07-23"
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
            cardStyle: 'border-l-rose-500 bg-rose-50/70 dark:bg-rose-950/30',
            textStyle: 'text-rose-600 dark:text-rose-400 font-medium'
        };
    }

    if (diff === 0) {
        return { 
            text: 'Due today', 
            cardStyle: 'border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/30',
            textStyle: 'text-amber-600 dark:text-amber-400 font-medium'
        };
    }

    if (diff === 1) {
        return { 
            text: 'Due tomorrow', 
            cardStyle: 'border-l-sky-500 bg-sky-50/70 dark:bg-sky-950/30',
            textStyle: 'text-sky-600 dark:text-sky-400 font-medium'
        };
    }

    if (diff <= 7) {
        return { 
            text: `Due in ${diff} days`, 
            cardStyle: 'border-l-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30',
            textStyle: 'text-indigo-600 dark:text-indigo-400 font-medium'
        };
    }

    return { 
        text: `Due in ${diff} days`, 
        cardStyle: 'border-l-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30',
        textStyle: 'text-emerald-600 dark:text-emerald-400 font-medium'
    };
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

    return (
        <div className="flex h-full flex-col rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900">
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
                <div className="space-y-2 pb-2">
                    {data.length === 0 && (
                        <p className="py-6 text-center text-sm text-neutral-400">
                            No upcoming deliveries.
                        </p>
                    )}

                    <TooltipProvider delayDuration={200}>
                        {data.map((item) => {
                            const { day, month } = formatDayMonth(item.due_date);
                            const { text, cardStyle, textStyle } = daysUntil(item.due_date);

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
                                        className="flex w-[320px] flex-col gap-4 p-5 shadow-xl border-border rounded-xl bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-none">{item.po_number}</h4>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">View delivery details</p>
                                        </div>

                                        <div className="flex flex-col gap-4 text-sm">
                                            <div className="flex gap-3">
                                                <User className="size-5 shrink-0 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-neutral-900 dark:text-neutral-100">Supplier</span>
                                                    <span className="text-neutral-600 dark:text-neutral-400">{item.supplier?.supplier_name ?? '—'}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <CalendarDays className="size-5 shrink-0 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-neutral-900 dark:text-neutral-100">Due Date</span>
                                                    <span className="text-neutral-600 dark:text-neutral-400">{item.due_date} ({text})</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <ClipboardList className="size-5 shrink-0 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-neutral-900 dark:text-neutral-100">Status</span>
                                                    <span className="text-neutral-600 dark:text-neutral-400">{item.status ?? '—'}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-3">
                                                <Package className="size-5 shrink-0 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-neutral-900 dark:text-neutral-100">End User</span>
                                                    <span className="text-neutral-600 dark:text-neutral-400">{item.end_user ?? '—'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex justify-end">
                                            <a 
                                                href={`/deliveries?highlight_search=${item.po_number}`}
                                                className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 shadow-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none"
                                            >
                                                Go to <MoveRight className="size-4" />
                                            </a>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </TooltipProvider>
                </div>
            </ScrollArea>
        </div>
    );
}