import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { CheckCircle2, Clock, XCircle, ChevronDown, Info, Calendar, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

interface ReportsStats {
    COMPLETED: number;
    CANCELLED: number;
    ONGOING: number;
}

interface Props {
    stats: ReportsStats;
    year: number;
    quarter: number;
}

const QUARTERS = [
    { value: 1, label: 'Q1 (Jan-Mar)' },
    { value: 2, label: 'Q2 (Apr-Jun)' },
    { value: 3, label: 'Q3 (Jul-Sep)' },
    { value: 4, label: 'Q4 (Oct-Dec)' },
];

export function ReportsMonitoringWidget({ stats, year, quarter }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [infoTab, setInfoTab] = useState<'definitions' | 'triggers'>('definitions');

    const handleFilterChange = (type: 'year' | 'quarter', value: number) => {
        setIsLoading(true);
        const newYear = type === 'year' ? value : year;
        const newQuarter = type === 'quarter' ? value : quarter;

        router.get(
            '/dashboard',
            { reports_year: newYear, reports_quarter: newQuarter },
            {
                only: ['reportsStats', 'reportsYear', 'reportsQuarter'],
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setIsLoading(false),
            }
        );
    };

    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    const activeQuarterLabel = QUARTERS.find((q) => q.value === quarter)?.label ?? `Q${quarter}`;

    const totalRecords = (stats.COMPLETED || 0) + (stats.ONGOING || 0) + (stats.CANCELLED || 0);
    const completedPct = totalRecords > 0 ? Math.round(((stats.COMPLETED || 0) / totalRecords) * 100) : 0;
    const ongoingPct = totalRecords > 0 ? Math.round(((stats.ONGOING || 0) / totalRecords) * 100) : 0;
    const cancelledPct = totalRecords > 0 ? Math.round(((stats.CANCELLED || 0) / totalRecords) * 100) : 0;

    return (
        <div className="relative flex flex-col justify-between rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900 shadow-2xs h-full overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-xs">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
            )}
            
            {/* Header: Title, Description, Info Icon, Quarter & Year filters */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                <div>
                    <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            Reports Monitoring
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsInfoOpen(true)}
                            className="flex size-5 items-center justify-center rounded-full text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Learn about quarterly reports classification (ⓘ)"
                            aria-label="Reports Monitoring Information"
                        >
                            <Info className="size-3.5" />
                        </button>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {totalRecords} records in {activeQuarterLabel} {year}
                    </p>
                </div>

                <div className="flex items-center gap-1.5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 rounded-md py-0 pl-2.5 pr-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer shadow-2xs"
                            >
                                <span>{activeQuarterLabel.split(' ')[0]}</span>
                                <ChevronDown className="size-3 text-neutral-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {QUARTERS.map((q) => (
                                <DropdownMenuItem
                                    key={q.value}
                                    onClick={() => handleFilterChange('quarter', q.value)}
                                    className="text-xs cursor-pointer"
                                >
                                    {q.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 rounded-md py-0 pl-2.5 pr-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer shadow-2xs"
                            >
                                <span>{year}</span>
                                <ChevronDown className="size-3 text-neutral-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {years.map((y) => (
                                <DropdownMenuItem
                                    key={y}
                                    onClick={() => handleFilterChange('year', y)}
                                    className="text-xs cursor-pointer"
                                >
                                    {y}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Status Metric Breakdown Cards */}
            <div className="mt-3 flex-1 min-h-0 grid grid-cols-3 gap-2.5">
                {/* Completed */}
                <div className="flex flex-col justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 sm:p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="truncate">Completed</span>
                        </span>
                        <span className="rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            {completedPct}%
                        </span>
                    </div>
                    <div className="my-1 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                        {stats.COMPLETED || 0}
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                        <div 
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500" 
                            style={{ width: `${completedPct}%` }}
                        />
                    </div>
                </div>

                {/* Ongoing */}
                <div className="flex flex-col justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 sm:p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                            <Clock className="size-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="truncate">Ongoing</span>
                        </span>
                        <span className="rounded-full bg-blue-100/80 dark:bg-blue-950/60 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            {ongoingPct}%
                        </span>
                    </div>
                    <div className="my-1 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                        {stats.ONGOING || 0}
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                        <div 
                            className="h-full rounded-full bg-blue-500 transition-all duration-500" 
                            style={{ width: `${ongoingPct}%` }}
                        />
                    </div>
                </div>

                {/* Cancelled */}
                <div className="flex flex-col justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 sm:p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                            <XCircle className="size-3.5 text-rose-600 dark:text-rose-400" />
                            <span className="truncate">Cancelled</span>
                        </span>
                        <span className="rounded-full bg-rose-100/80 dark:bg-rose-950/60 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                            {cancelledPct}%
                        </span>
                    </div>
                    <div className="my-1 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                        {stats.CANCELLED || 0}
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                        <div 
                            className="h-full rounded-full bg-rose-500 transition-all duration-500" 
                            style={{ width: `${cancelledPct}%` }}
                        />
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
                                    Reports Monitoring Reference
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 font-normal mt-0.5">
                                    Quarterly inspection and clearance status guidelines
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Page Source Attribution Banner */}
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-indigo-50/80 px-3 py-2 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/60 text-xs">
                            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                                <span className="text-neutral-400 dark:text-neutral-500">Based on Pages:</span>
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">Purchase Orders & Delivery Monitoring</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/purchase-orders"
                                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                >
                                    <span>POs</span>
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
                                    Reports Monitoring aggregates purchase order lifecycles and delivery fulfillment records across quarterly audit cycles to evaluate total completion, ongoing operations, and contract cancellations.
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                                            <CheckCircle2 className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Completed Records
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Purchase orders where all three conditions are fulfilled: (1) payment is fully settled, (2) all administrative workflow steps are completed, and (3) all shipments are marked completed in Delivery Monitoring.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-blue-600 dark:text-blue-400 shrink-0">
                                            <Clock className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Ongoing Records
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Active purchase orders created within the selected quarter where payment is pending or processing, workflow steps remain in progress, or physical deliveries have not fully completed.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-rose-600 dark:text-rose-400 shrink-0">
                                            <XCircle className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Cancelled Records
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Purchase orders terminated or revoked before completion during the fiscal period due to supplier default or administrative rescission.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <Calendar className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Quarterly Cycles
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Data is segmented into four standard reporting quarters (Q1: Jan–Mar, Q2: Apr–Jun, Q3: Jul–Sep, Q4: Oct–Dec) across calendar years to align with annual government audit timelines.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3 border border-neutral-200/80 dark:border-neutral-800">
                                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                                        How Data Triggers from Purchase Orders & Delivery Monitoring
                                    </h4>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                        The widget queries all <strong>Purchase Orders</strong> created in the selected Year and Quarter, cross-referencing fulfillment in <strong>Delivery Monitoring</strong>. For an order to transition into Completed, it must satisfy all 3 operational prerequisites: full payment settlement, completed workflow routing steps, and verified delivery completion.
                                    </p>
                                </div>

                                <div className="space-y-3.5 pt-1">
                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Ongoing Example</span>
                                            <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-blue-950/40 dark:text-blue-300">Active Workflow</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> Any purchase order in the quarter where payment is not yet fully paid, workflow steps are still underway, or deliveries are still pending.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> PO-2026-1142 has arrived at the dock, but the supplier invoice has not been fully processed by finance or some items are still pending delivery. Because all 3 conditions have not yet cleared, it remains under <strong>Ongoing</strong>.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Completed Example</span>
                                            <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-emerald-950/40 dark:text-emerald-300">Fully Cleared</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> When a purchase order meets all 3 criteria: (1) Payment status is Paid, (2) Workflow steps are complete (Forwarded to Finance / Completed), and (3) Associated deliveries in Delivery Monitoring are marked Completed.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> PO-2026-1015 has all items delivered and marked Completed in Delivery Monitoring, its workflow steps reached final sign-off, and the payment voucher is marked Paid. The order is automatically tallied under <strong>Completed</strong>.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Cancelled Example</span>
                                            <span className="rounded bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-rose-950/40 dark:text-rose-300">Contract Terminated</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Trigger:</strong> When a purchase order created in the quarter is officially revoked, rescinded, or voided before completion (<code>po_step = CANCELLED</code>).
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <strong>Scenario:</strong> A supplier was unable to source contracted equipment and defaulted. The contract was formally terminated by the supply office, moving the record to <strong>Cancelled</strong>.
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
