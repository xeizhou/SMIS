import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShoppingCart } from 'lucide-react';

type Props = {
    stats?: {
        COMPLETE: number;
        PARTIAL: number;
        PENDING: number;
        CANCELLED: number;
    };
};

export function PoPieChart({ stats }: Props) {
    const data = [
        { name: 'Completed', value: stats?.COMPLETE ?? 0, color: '#34d399' },
        { name: 'Partial', value: stats?.PARTIAL ?? 0, color: '#fbbf24' },
        { name: 'Pending', value: stats?.PENDING ?? 0, color: '#3b82f6' },
        { name: 'Cancelled', value: stats?.CANCELLED ?? 0, color: '#f87171' },
    ];

    const hasData = data.length > 0;

    return (
        <div className="relative flex flex-col rounded-xl border border-sidebar-border/70 bg-white p-6 dark:border-sidebar-border dark:bg-neutral-900 h-full">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                        <ShoppingCart className="size-5" />
                        Purchase Orders
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Status based on deliveries
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '12px', padding: '8px 12px' }}
                                itemStyle={{ color: '#171717', fontWeight: 500 }}
                                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="circle"
                                wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
                                iconSize={10}
                                formatter={(value) => <span className="text-neutral-600 dark:text-neutral-300">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center text-sm text-neutral-400">
                        No purchase orders available
                    </div>
                )}
            </div>
        </div>
    );
}
