import { useState } from 'react';
import { router } from '@inertiajs/react';
import { FileText, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react';

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

export function ReportsMonitoringWidget({ stats, year, quarter }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    const handleFilterChange = (type: 'year' | 'quarter', value: string) => {
        setIsLoading(true);
        const newYear = type === 'year' ? parseInt(value) : year;
        const newQuarter = type === 'quarter' ? parseInt(value) : quarter;

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

    return (
        <div className="relative rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900">
            {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-sm">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            )}
            
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                        <FileText className="size-5 text-primary" />
                        Reports Monitoring
                    </h3>
                    <p className="text-xs text-neutral-400">
                        Record statuses by quarter and year
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select
                            value={quarter}
                            onChange={(e) => handleFilterChange('quarter', e.target.value)}
                            className="appearance-none rounded-md border border-sidebar-border/70 bg-white py-1 pl-2.5 pr-7 text-xs text-neutral-600 outline-none dark:border-sidebar-border dark:bg-neutral-900 dark:text-neutral-300"
                        >
                            <option value="1">Q1 (Jan-Mar)</option>
                            <option value="2">Q2 (Apr-Jun)</option>
                            <option value="3">Q3 (Jul-Sep)</option>
                            <option value="4">Q4 (Oct-Dec)</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-neutral-400" />
                    </div>
                    
                    <div className="relative">
                        <select
                            value={year}
                            onChange={(e) => handleFilterChange('year', e.target.value)}
                            className="appearance-none rounded-md border border-sidebar-border/70 bg-white py-1 pl-2.5 pr-7 text-xs text-neutral-600 outline-none dark:border-sidebar-border dark:bg-neutral-900 dark:text-neutral-300"
                        >
                            {years.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-neutral-400" />
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center justify-center rounded-lg border border-sidebar-border/40 bg-neutral-50/50 py-8 px-4 transition-colors dark:border-sidebar-border/40 dark:bg-neutral-800/20">
                    <CheckCircle2 className="mb-2 size-6 text-[#34d399]" />
                    <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{stats.COMPLETED}</span>
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Completed</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border border-sidebar-border/40 bg-neutral-50/50 py-8 px-4 transition-colors dark:border-sidebar-border/40 dark:bg-neutral-800/20">
                    <Clock className="mb-2 size-6 text-[#3b82f6]" />
                    <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{stats.ONGOING}</span>
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Ongoing</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border border-sidebar-border/40 bg-neutral-50/50 py-8 px-4 transition-colors dark:border-sidebar-border/40 dark:bg-neutral-800/20">
                    <XCircle className="mb-2 size-6 text-[#f87171]" />
                    <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{stats.CANCELLED}</span>
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Cancelled</span>
                </div>
            </div>
        </div>
    );
}
