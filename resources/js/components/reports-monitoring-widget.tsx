import { useState } from 'react';
import { router } from '@inertiajs/react';
import { FileText, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

    return (
        <div className="relative flex flex-col rounded-xl border border-sidebar-border/70 bg-white p-6 dark:border-sidebar-border dark:bg-neutral-900 h-full">
            {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-sm">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            )}
            
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                        Reports Monitoring
                    </h3>
                    <p className="text-xs text-neutral-400">
                        Record statuses by quarter and year
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-auto gap-1 rounded-md py-1 pl-2.5 pr-2 text-xs font-normal text-neutral-600 dark:text-neutral-300"
                            >
                                {activeQuarterLabel}
                                <ChevronDown className="size-3 text-neutral-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {QUARTERS.map((q) => (
                                <DropdownMenuItem
                                    key={q.value}
                                    onClick={() => handleFilterChange('quarter', q.value)}
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
                                className="h-auto gap-1 rounded-md py-1 pl-2.5 pr-2 text-xs font-normal text-neutral-600 dark:text-neutral-300"
                            >
                                {year}
                                <ChevronDown className="size-3 text-neutral-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {years.map((y) => (
                                <DropdownMenuItem
                                    key={y}
                                    onClick={() => handleFilterChange('year', y)}
                                >
                                    {y}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="flex flex-col items-center justify-center rounded-xl border border-sidebar-border/40 bg-neutral-100 py-6 px-4 transition-colors dark:border-sidebar-border/40 dark:bg-neutral-800/60 flex-1 min-h-0">
                    <CheckCircle2 className="mb-3 size-8 text-[#34d399]" />
                    <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">{stats.COMPLETED}</span>
                    <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Completed</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-sidebar-border/40 bg-neutral-100 py-6 px-4 transition-colors dark:border-sidebar-border/40 dark:bg-neutral-800/60 flex-1 min-h-0">
                    <Clock className="mb-3 size-8 text-[#3b82f6]" />
                    <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">{stats.ONGOING}</span>
                    <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Ongoing</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-sidebar-border/40 bg-neutral-100 py-6 px-4 transition-colors dark:border-sidebar-border/40 dark:bg-neutral-800/60 flex-1 min-h-0">
                    <XCircle className="mb-3 size-8 text-[#f87171]" />
                    <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">{stats.CANCELLED}</span>
                    <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Cancelled</span>
                </div>
            </div>
        </div>
    );
}