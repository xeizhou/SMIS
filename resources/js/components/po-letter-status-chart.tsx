import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
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
    const rows = data?.[period] ?? [];

    const maxDataVal = rows.length > 0 
        ? Math.max(...rows.map(r => Math.max(r.approved, r.disapproved))) 
        : 0;
    const domainMax = Math.max(15, Math.ceil(maxDataVal / 5) * 5);
    const calculatedTickCount = (domainMax / 5) + 1;

    return (
        <div className="flex h-full flex-col rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                        P.O Letters Status
                    </h3>
                    <p className="text-xs text-neutral-400">
                        Approved vs Disapproved by Letter Type
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        <div className="flex items-center gap-1.5">
                            <div className="size-2 rounded-full bg-[#34d399]" />
                            Approved
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="size-2 rounded-full bg-[#f87171]" />
                            Disapproved
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-auto gap-1 rounded-md py-1 pl-2.5 pr-2 text-xs font-normal text-neutral-600 dark:text-neutral-300"
                            >
                                {period}
                                <ChevronDown className="size-3 text-neutral-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {PERIOD_OPTIONS.map((opt) => (
                                <DropdownMenuItem
                                    key={opt}
                                    onClick={() => setPeriod(opt)}
                                >
                                    {opt}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="mt-4 flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rows} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis
                            dataKey="type"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: '#a3a3a3' }}
                        />
                        <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontSize: 12, fill: '#a3a3a3' }} 
                            allowDecimals={false}
                            domain={[0, domainMax]}
                            tickCount={calculatedTickCount}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                            contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 12 }}
                        />
                        <Bar dataKey="approved" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={100} />
                        <Bar dataKey="disapproved" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={100} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}