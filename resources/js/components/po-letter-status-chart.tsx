import { useState } from 'react';
import { ChevronDown, Info, Calendar, ShieldCheck, XCircle, RotateCcw, CheckCircle2, ExternalLink, HelpCircle, BookOpen, Layers } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
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

export type POLetterStatusRow = {
    type: string;
    approved: number;
    disapproved: number;
};

type Props = {
    data?: Record<string, POLetterStatusRow[]>;
};

const PERIOD_OPTIONS = ['This Week', 'This Month', 'This Year'] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

export function PoLettersStatusChart({ data }: Props) {
    const [period, setPeriod] = useState<Period>('This Year');
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [infoTab, setInfoTab] = useState<'definitions' | 'triggers'>('definitions');
    const rows = data?.[period] ?? [];

    const maxDataVal = rows.length > 0 
        ? Math.max(...rows.map(r => Math.max(r.approved, r.disapproved))) 
        : 0;
    const domainMax = Math.max(15, Math.ceil(maxDataVal / 5) * 5);
    const calculatedTickCount = (domainMax / 5) + 1;

    // Total counts for summary badge
    const totalApproved = rows.reduce((acc, r) => acc + (r.approved || 0), 0);
    const totalDisapproved = rows.reduce((acc, r) => acc + (r.disapproved || 0), 0);
    const totalLetters = totalApproved + totalDisapproved;

    return (
        <div className="flex h-full flex-col rounded-xl border border-sidebar-border/70 bg-white p-3.5 sm:p-4 dark:border-sidebar-border dark:bg-neutral-900 shadow-2xs overflow-hidden">
            {/* Header: Title, Description, Info Icon, Legend, and Period Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                <div className="flex items-center gap-2">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                P.O Letters Status
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsInfoOpen(true)}
                                className="flex size-4.5 items-center justify-center rounded-full text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="Learn about P.O. Letter types and approval criteria (ⓘ)"
                                aria-label="P.O Letters Information"
                            >
                                <Info className="size-3" />
                            </button>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Approved vs Disapproved supplier requests ({totalLetters} total)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                    {/* Legend */}
                    <div className="flex items-center gap-2.5 font-medium text-neutral-600 dark:text-neutral-400">
                        <div className="flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            <span>Approved ({totalApproved})</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-rose-500" />
                            <span>Disapproved ({totalDisapproved})</span>
                        </div>
                    </div>

                    {/* Period Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6.5 gap-1 rounded-md py-0 pl-2 pr-1.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer shadow-2xs"
                            >
                                <span>{period}</span>
                                <ChevronDown className="size-3 text-neutral-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {PERIOD_OPTIONS.map((opt) => (
                                <DropdownMenuItem
                                    key={opt}
                                    onClick={() => setPeriod(opt)}
                                    className="text-xs cursor-pointer"
                                >
                                    {opt}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Chart Area */}
            <div className="mt-2 flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={130}>
                    <BarChart data={rows} barGap={5} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" opacity={0.6} />
                        <XAxis
                            dataKey="type"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: '#737373', fontWeight: 500 }}
                        />
                        <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontSize: 11, fill: '#a3a3a3' }} 
                            allowDecimals={false}
                            domain={[0, domainMax]}
                            tickCount={calculatedTickCount}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                            contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                                borderRadius: 8, 
                                border: '1px solid #e5e5e5', 
                                fontSize: 11,
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Bar dataKey="approved" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={48} name="Approved" />
                        <Bar dataKey="disapproved" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={48} name="Disapproved" />
                    </BarChart>
                </ResponsiveContainer>
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
                                    P.O Letters Status Reference
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 font-normal mt-0.5">
                                    Approved vs Disapproved supplier communication requests
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Page Source Attribution Banner */}
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-indigo-50/80 px-3 py-2 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/60 text-xs">
                            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                                <span className="text-neutral-400 dark:text-neutral-500">Based on Page:</span>
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">PO Letter Monitoring</span>
                            </div>
                            <Link
                                href="/po-letter-monitoring"
                                className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                            >
                                <span>Go to Page</span>
                                <ExternalLink className="size-3" />
                            </Link>
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
                                    P.O Letters monitor formal requests submitted by suppliers or procurement officers to adjust contract terms, delivery schedules, or item specifications during purchase order fulfillment.
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <Calendar className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Extension
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Requests submitted by suppliers to extend the contractual delivery date due to justifiable factory production lead times, shipping interruptions, or customs clearance delays.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-amber-600 dark:text-amber-400 shrink-0">
                                            <ShieldCheck className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Waiver
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Formal petitions requesting the waiver of liquidated damages or late delivery deduction penalties under authorized institutional guidelines and verifiable force majeure.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-rose-600 dark:text-rose-400 shrink-0">
                                            <XCircle className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Cancellation
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Determinations or supplier notices to void an entire purchase order or specific line item batches due to non-availability, default, or budget reallocation.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-blue-600 dark:text-blue-400 shrink-0">
                                            <RotateCcw className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Replacement
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Requests to replace non-compliant, damaged, or defective goods discovered and rejected during receiving inspection and laboratory testing.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                                            <CheckCircle2 className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                                                Approval Outcomes
                                            </h4>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                                Categorized into Approved (request officially granted and delivery dates adjusted) and Disapproved (supplier must deliver under original contract conditions).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3 border border-neutral-200/80 dark:border-neutral-800">
                                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                                        How Data Triggers from PO Letter Monitoring
                                    </h4>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                        Whenever an officer logs or updates a communication record on the <strong>PO Letter Monitoring</strong> page, the system checks the letter&apos;s request type and whether the letter decision is marked <strong>Approved</strong> or <strong>Disapproved</strong>.
                                    </p>
                                </div>

                                <div className="space-y-3.5 pt-1">
                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Extension Example</span>
                                            <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-emerald-950/40 dark:text-emerald-300">Approved vs Disapproved</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Scenario:</strong> A supplier with a purchase order due on Oct 30 submits an Extension Letter requesting delivery by Nov 15 due to shipping container delays.
                                        </p>
                                        <ul className="mt-2 list-disc pl-4 space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <li>If management approves the request in PO Letter Monitoring, it counts under <strong>Approved (Green)</strong> and adjusts the expected delivery date.</li>
                                            <li>If rejected, it counts under <strong>Disapproved (Red)</strong> and the supplier remains obligated to deliver on time or incur penalties.</li>
                                        </ul>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Waiver Example</span>
                                            <span className="rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-amber-950/40 dark:text-amber-300">Penalty Relief</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Scenario:</strong> Delivery arrived 6 days late due to severe weather. The supplier files a Waiver Letter seeking relief from liquidated damage deductions.
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            Recording the evaluation on the monitoring page registers either an Approved waiver (penalties waived) or Disapproved (deductions enforced on invoice payment).
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Replacement Example</span>
                                            <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-blue-950/40 dark:text-blue-300">Defect Rectification</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Scenario:</strong> Receiving inspection found 10 damaged items during inspection. The supplier files a letter offering immediate replacement with compliant units within 5 working days.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">Cancellation Example</span>
                                            <span className="rounded bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[10px] font-bold dark:bg-rose-950/40 dark:text-rose-300">Contract Rescission</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                            <strong>Scenario:</strong> A manufacturer discontinues a specialty part. The supplier submits a formal notice to cancel that line item, updating the status accordingly once endorsed.
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
