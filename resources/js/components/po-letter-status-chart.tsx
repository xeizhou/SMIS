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
import { ChevronDown } from 'lucide-react';

export type POLetterStatusRow = {
    type: 'Extension' | 'Waiver' | 'Cancellation' | 'Replacement';
    approved: number;
    disapproved: number;
};

type Props = {
    data?: POLetterStatusRow[];
};

// Placeholder data matching your screenshot — swap for a real prop later
const MOCK_DATA: POLetterStatusRow[] = [
    { type: 'Extension', approved: 12, disapproved: 4 },
    { type: 'Waiver', approved: 7, disapproved: 10 },
    { type: 'Cancellation', approved: 3, disapproved: 4 },
    { type: 'Replacement', approved: 6, disapproved: 3 },
];

export function PoLettersStatusChart({ data }: Props) {
    const [period, setPeriod] = useState<'This Week' | 'This Month' | 'This Year'>('This Year');
    const rows = data ?? MOCK_DATA;

    return (
        <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900">
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

                    <div className="relative">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as typeof period)}
                            className="appearance-none rounded-md border border-sidebar-border/70 bg-white py-1 pl-2.5 pr-7 text-xs text-neutral-600 outline-none dark:border-sidebar-border dark:bg-neutral-900 dark:text-neutral-300"
                        >
                            <option value="This Week">This Week</option>
                            <option value="This Month">This Month</option>
                            <option value="This Year">This Year</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-neutral-400" />
                    </div>
                </div>
            </div>

            <div className="mt-4 h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rows} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis
                            dataKey="type"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: '#a3a3a3' }}
                        />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} />
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