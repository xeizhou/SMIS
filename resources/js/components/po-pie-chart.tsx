import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Info, ShoppingCart, CheckCircle2, Clock, AlertCircle, XCircle, Package, ExternalLink } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

type Props = {
    stats?: {
        COMPLETE: number;
        PARTIAL: number;
        PENDING: number;
        CANCELLED: number;
    };
};

export function PoPieChart({ stats }: Props) {
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [infoTab, setInfoTab] = useState<'definitions' | 'triggers'>('definitions');

    const completeCount = stats?.COMPLETE ?? 0;
    const partialCount = stats?.PARTIAL ?? 0;
    const pendingCount = stats?.PENDING ?? 0;
    const cancelledCount = stats?.CANCELLED ?? 0;

    const total = completeCount + partialCount + pendingCount + cancelledCount;

    const data = [
        { name: 'Completed', value: completeCount, color: '#10b981' },
        { name: 'Partial', value: partialCount, color: '#f59e0b' },
        { name: 'Pending', value: pendingCount, color: '#3b82f6' },
        { name: 'Cancelled', value: cancelledCount, color: '#f43f5e' },
    ];

    const getPct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

    return (
        <div className="relative flex h-full flex-col justify-between rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900 shadow-2xs overflow-hidden">
            {/* Header: Title, Description, and Info Button */}
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                <div>
                    <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            Purchase Orders
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsInfoOpen(true)}
                            className="flex size-5 items-center justify-center rounded-full text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Learn about Purchase Order delivery statuses (ⓘ)"
                            aria-label="Purchase Orders Information"
                        >
                            <Info className="size-3.5" />
                        </button>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Fulfillment status ({total} total)
                    </p>
                </div>

                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {total} POs
                </span>
            </div>

            {/* Body: Donut chart on left, Structured breakdown on right */}
            <div className="flex flex-1 items-center justify-between gap-3 min-h-0 pt-1">
                {/* Donut Chart */}
                <div className="relative h-[125px] w-[120px] shrink-0 flex items-center justify-center">
                    {total > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    innerRadius="56%"
                                    outerRadius="82%"
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                        borderRadius: 8,
                                        border: '1px solid #e5e5e5',
                                        fontSize: 11,
                                        padding: '5px 8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                            No POs
                        </div>
                    )}
                    {/* Center Total Count Label */}
                    {total > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100 leading-none">
                                {total}
                            </span>
                            <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider mt-0.5">
                                Total
                            </span>
                        </div>
                    )}
                </div>

                {/* Structured Breakdown List */}
                <div className="flex-1 space-y-0.5 pl-1 text-[11px] sm:text-xs">
                    <div className="flex items-center justify-between rounded-md px-1.5 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-neutral-600 dark:text-neutral-400 truncate">Completed</span>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100">{completeCount}</span>
                            <span className="text-[10px] text-neutral-400 ml-1">({getPct(completeCount)}%)</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-md px-1.5 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-neutral-600 dark:text-neutral-400 truncate">Partial</span>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100">{partialCount}</span>
                            <span className="text-[10px] text-neutral-400 ml-1">({getPct(partialCount)}%)</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-md px-1.5 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-neutral-600 dark:text-neutral-400 truncate">Pending</span>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100">{pendingCount}</span>
                            <span className="text-[10px] text-neutral-400 ml-1">({getPct(pendingCount)}%)</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-md px-1.5 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-neutral-600 dark:text-neutral-400 truncate">Cancelled</span>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100">{cancelledCount}</span>
                            <span className="text-[10px] text-neutral-400 ml-1">({getPct(cancelledCount)}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Information Dialog (ⓘ) */}
            <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-5 pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
                                <Info className="size-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                                    Purchase Order Fulfillment Reference
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 font-normal mt-0.5">
                                    Fulfillment definitions for procurement tracking
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Page Source Attribution Banner */}
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-indigo-50/80 px-3 py-2 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/60 text-xs">
                            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                                <span className="text-neutral-400 dark:text-neutral-500">Based on Pages:</span>
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">Purchase Orders & Deliveries</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/purchase-orders"
                                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                >
                                    <span>Purchase Orders</span>
                                    <ExternalLink className="size-3" />
                                </Link>
                                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                <Link
                                    href="/deliveries"
                                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                >
                                    <span>Deliveries</span>
                                    <ExternalLink className="size-3" />
                                </Link>
                            </div>
                        </div>

                        {/* Tab Switcher */}
                        <div className="mt-3 flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setInfoTab('definitions')}
                                className={cn(
                                    "flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer",
                                    infoTab === 'definitions'
                                        ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                Categories & Definitions
                            </button>
                            <button
                                type="button"
                                onClick={() => setInfoTab('triggers')}
                                className={cn(
                                    "flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer",
                                    infoTab === 'triggers'
                                        ? "bg-white text-indigo-700 shadow-xs dark:bg-neutral-900 dark:text-indigo-400"
                                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                Triggers & Workflow Examples
                            </button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 p-5 text-xs text-neutral-600 dark:text-neutral-300 overflow-y-auto">
                        {infoTab === 'definitions' ? (
                            <>
                                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                    Purchase Order status reflects real-time procurement fulfillment derived from receiving dock logs and Property Inspection Reports (PIR).
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                                            <CheckCircle2 className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Completed
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                All items, line items, and quantities specified in the purchase order have been received in full and accepted by the inspection committee.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-amber-600 dark:text-amber-400 shrink-0">
                                            <Clock className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Partial
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                One or more delivery batches have been received and inspected; the supplier still owes balance quantities pending subsequent shipments.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-blue-600 dark:text-blue-400 shrink-0">
                                            <Package className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Pending
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Purchase order has been officially released to the supplier, and the initial shipment delivery is awaiting arrival at the receiving section.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-rose-600 dark:text-rose-400 shrink-0">
                                            <XCircle className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Cancelled
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Purchase order was rescinded, voided, or cancelled prior to completion due to supplier default or procurement revision.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3 border border-neutral-200/80 dark:border-neutral-800">
                                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                                        How Data Triggers from Deliveries & Purchase Orders
                                    </h4>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                        The system evaluates all active purchase orders in <code>serve_po</code> and cross-references their linked shipment records in <strong>Deliveries</strong>. The aggregate delivery statuses determine each purchase order&apos;s fulfillment bracket.
                                    </p>
                                </div>

                                <div className="space-y-3.5 pt-1">
                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Pending Example</span>
                                            <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-blue-950/40 dark:text-blue-300">Awaiting First Shipment</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> Purchase order is released and either has 0 delivery shipments logged, or all linked shipments on the Deliveries page are still marked <code>PENDING</code>.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> PO-2026-0410 was issued to the supplier with a 30-day term. No delivery vehicles have arrived at the receiving bay yet. The entire order is classified as <strong>Pending</strong>.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Partial Example</span>
                                            <span className="rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-amber-950/40 dark:text-amber-300">Split Delivery in Progress</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> At least one delivery batch has arrived and is marked <code>COMPLETED</code>, but additional balance shipments remain pending or undelivered.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> PO-2026-0350 ordered 50 office chairs. Batch 1 of 20 chairs arrived and was accepted. The remaining 30 chairs are scheduled for next week. Because fulfillment is incomplete, the PO is classified as <strong>Partial</strong>.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Completed Example</span>
                                            <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-emerald-950/40 dark:text-emerald-300">100% Fulfilled</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> Every scheduled delivery batch linked to the purchase order has arrived, passed inspection, and is marked <code>COMPLETED</code>.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> All 500 boxes of printer paper across 3 shipments have been received and inspected. With all shipments marked completed, the purchase order achieves 100% fulfillment and moves to <strong>Completed</strong>.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Cancelled Example</span>
                                            <span className="rounded bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-rose-950/40 dark:text-rose-300">Rescinded Order</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> All linked delivery records for the purchase order are marked <code>CANCELLED</code>.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> The contract was rescinded due to non-performance, cancelling all associated deliveries.
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
                            onClick={() => setIsInfoOpen(false)}
                            className="cursor-pointer text-xs"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
