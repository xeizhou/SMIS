import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    status: string | null | undefined;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
    if (!status) return <span className="text-gray-500">-</span>;

    const normalizedStatus = status.trim().toUpperCase();

    let colorClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

    switch (normalizedStatus) {
        // Green
        case 'COMPLETE':
        case 'SERVICEABLE':
        case 'IN USE':
            colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400';
            break;
        // Red
        case 'CANCELLED':
        case 'UNSERVICEABLE':
        case 'DISPOSED':
            colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400';
            break;
        // Yellow/Orange
        case 'PARTIAL':
        case 'FOR REPAIR':
            colorClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400';
            break;
        // Blue/Gray
        case 'PENDING':
        case 'IDLE':
            colorClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            break;
        default:
            break;
    }

    return (
        <span
            className={cn(
                'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                colorClass,
                className
            )}
            {...props}
        >
            {status}
        </span>
    );
}
