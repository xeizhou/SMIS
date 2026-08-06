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

    let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

    if (normalized === 'UNSERVICEABLE' || normalized === 'CANCELLED' || normalized === 'STOLEN' || normalized === 'LOST') {
        colorStyles = 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/60';
    } else if (normalized === 'SERVICEABLE' || normalized === 'COMPLETE' || normalized === 'APPROVED') {
        colorStyles = 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60';
    } else if (normalized === 'IN USE' || normalized === 'IN-USE' || normalized === 'PENDING') {
        colorStyles = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800/60';
    } else if (normalized === 'FOR REPAIR' || normalized === 'FOR-REPAIR' || normalized === 'PRE-REPAIR' || normalized === 'PARTIAL') {
        colorStyles = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/60';
    } else if (normalized === 'DISPOSED') {
        colorStyles = 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800/60';
    } else if (normalized === 'IDLE') {
        colorStyles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    } else if (normalized === 'TRANSFERRED' || normalized === 'RETURNED') {
        colorStyles = 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800/60';
    }

    return (
        <span
            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase shadow-xs ${colorStyles} ${className}`}
        >
            {status}
        </span>
    );
}
