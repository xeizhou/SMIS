import React from 'react';

interface StatusBadgeProps {
    status: string | null | undefined;
    className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    if (!status) {
        return <span className="text-muted-foreground">—</span>;
    }

    const normalized = status.trim().toUpperCase();

    let colorStyles = 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';

    if (normalized === 'UNSERVICEABLE') {
        colorStyles = 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/60';
    } else if (normalized === 'SERVICEABLE') {
        colorStyles = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800/60';
    }

    return (
        <span
            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase shadow-xs ${colorStyles} ${className}`}
        >
            {status}
        </span>
    );
}
