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

    if (normalized === 'UNSERVICEABLE' || normalized === 'CANCELLED' || normalized === 'STOLEN' || normalized === 'LOST' || normalized === 'DISPOSED' || normalized === 'DISAPPROVED') {
        colorStyles = 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/60';
    } else if (normalized === 'SERVICEABLE' || normalized === 'ACTIVE' || normalized === 'COMPLETE' || normalized === 'COMPLETED' || normalized === 'APPROVED' || normalized === 'IN USE' || normalized === 'IN-USE' || normalized === 'RECEIVE' || normalized === 'OK') {
        colorStyles = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800/60';
    } else if (normalized === 'INACTIVE' || normalized === 'FOR REPAIR' || normalized === 'FOR-REPAIR' || normalized === 'PRE-REPAIR' || normalized === 'PARTIAL' || normalized === 'ISSUE' || normalized === 'LOW') {
        colorStyles = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800/60';
    } else if (normalized === 'PENDING' || normalized === 'IDLE' || normalized === 'TRANSFERRED' || normalized === 'RETURNED') {
        colorStyles = 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }

    return (
        <span
            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase shadow-xs ${colorStyles} ${className}`}
        >
            {status}
        </span>
    );
}
