import type { LucideIcon } from 'lucide-react';

type Props = {
    label: string;
    value: number | string;
    change?: string; // e.g. "+ 5 last week"
    icon: LucideIcon;
    iconClassName?: string; // controls the icon's tinted background
    onClick?: () => void; // Optional click handler
};

export function StatCard({ label, value, change, icon: Icon, iconClassName, onClick }: Props) {
    return (
        <div 
            onClick={onClick}
            className={`relative flex flex-col justify-between rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900 ${
                onClick ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors' : ''
            }`}
        >
            <div className="flex items-start justify-between">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
                <div className={`flex size-8 items-center justify-center rounded-lg ${iconClassName ?? 'bg-neutral-100 dark:bg-neutral-800'}`}>
                    <Icon className="size-4" />
                </div>
            </div>
            <div className="mt-2">
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
                {change && (
                    <p className="mt-1 text-xs font-medium text-emerald-500">{change}</p>
                )}
            </div>
        </div>
    );
}