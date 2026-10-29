import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

interface Props {
    icon: React.ReactNode;
    label: string;
    value: number;
    change?: string;
    tone?: 'default' | 'warn' | 'danger';
    onClick?: () => void;
    index?: number;
    brandColor?: string;
}

export function AnimatedKpiCard({
    icon,
    label,
    value,
    change,
    tone = 'default',
    onClick,
    index = 0,
    brandColor = '#612A35',
}: Props) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (value === 0) {
            setDisplayValue(0);
            return;
        }

        let animationId: number;
        let start: number;

        const animate = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / 600, 1);
            setDisplayValue(Math.floor(value * progress));

            if (progress < 1) {
                animationId = requestAnimationFrame(animate);
            } else {
                setDisplayValue(value);
            }
        };

        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [value]);

    // Color theme mapping for institutional iconography
    const getThemeConfig = (lbl: string) => {
        const lower = lbl.toLowerCase();
        if (lower.includes('task')) {
            return {
                bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
                indicator: 'border-l-indigo-500',
            };
        }
        if (lower.includes('deliveries')) {
            return {
                bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
                indicator: 'border-l-blue-500',
            };
        }
        if (lower.includes('inspection')) {
            return {
                bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
                indicator: 'border-l-amber-500',
            };
        }
        return {
            bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
            indicator: 'border-l-emerald-500',
        };
    };

    const theme = getThemeConfig(label);

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group relative flex flex-col justify-between rounded-xl border border-neutral-200/90 bg-white p-3.5 text-left transition-all cursor-pointer shadow-2xs hover:border-neutral-300 hover:shadow-xs dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-400',
            )}
            style={{
                animationDelay: `${index * 40}ms`,
            }}
        >
            {/* Top row: Icon container and subtle jump hint */}
            <div className="flex items-center justify-between w-full">
                <div className={cn('flex size-8 items-center justify-center rounded-lg shadow-2xs', theme.bg)}>
                    {icon}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
                    <ArrowUpRight className="size-3.5" />
                </div>
            </div>

            {/* Middle: Count and Label */}
            <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                    {displayValue.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">
                    {label}
                </div>
            </div>

            {/* Bottom: Context / Change text */}
            {change && (
                <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span className="truncate">{change}</span>
                </div>
            )}
        </button>
    );
}
