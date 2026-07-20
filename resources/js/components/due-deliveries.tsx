import { useState } from 'react';
import { router } from '@inertiajs/react';
import { RefreshCw } from 'lucide-react';

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

    if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, urgent: true };
    if (diff === 0) return { text: 'Due today', urgent: true };
    if (diff === 1) return { text: 'Due tomorrow', urgent: true };
    return { text: `Due in ${diff} days`, urgent: diff <= 3 };
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

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {data.length === 0 && (
                    <p className="py-6 text-center text-sm text-neutral-400">
                        No upcoming deliveries.
                    </p>
                )}

                {data.map((item) => {
                    const { day, month } = formatDayMonth(item.due_date);
                    const { text, urgent } = daysUntil(item.due_date);

                    return (
                        <div
                            key={item.delivery_id}
                            className={`flex items-center gap-3 rounded-lg border-l-4 p-2.5 ${
                                urgent
                                    ? 'border-l-rose-400 bg-rose-50 dark:bg-rose-950/30'
                                    : 'border-l-neutral-300 bg-neutral-50 dark:bg-neutral-800/50'
                            }`}
                        >
                            <div className="flex w-10 shrink-0 flex-col items-center leading-none">
                                <span className="text-[10px] font-medium text-neutral-500">{month}</span>
                                <span className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                                    {day}
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                    {item.supplier?.supplier_name ?? item.end_user ?? item.po_number}
                                </p>
                                <p className="text-xs text-neutral-500">{text}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}