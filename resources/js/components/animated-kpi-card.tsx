import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

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

    const toneStyles = {
        default: 'text-foreground',
        warn: 'text-amber-600',
        danger: 'text-red-600',
    }[tone];

    useEffect(() => {
        if (value === 0) {
            setDisplayValue(0);
            return;
        }

        let animationId: number;
        let start: number;

        const animate = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / 800, 1);
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

    return (
        <button
            onClick={onClick}
            className={cn(
                'group relative w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40 animate-kpi-in',
            )}
            style={{
                animationDelay: `${index * 50}ms`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${brandColor}80`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
        >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {icon}
                {label}
            </div>
            <p className={`mt-2 text-2xl font-bold ${toneStyles}`}>{displayValue.toLocaleString()}</p>
            {change && <p className="mt-1 text-xs text-muted-foreground">{change}</p>}
        </button>
    );
}