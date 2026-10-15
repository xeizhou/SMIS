import React from 'react';
import { cn } from '@/lib/utils';

export const DEFAULT_ITEM_DESCRIPTIONS = [
    'ICT/EQUIPMENT',
    'OFFICE SUPPLIES',
    'OFFICE EQUIPMENT',
    'LABORATORY',
    'CONSTRUCTION SUPPLIES',
    'SERVICES',
    'TOKEN & SOUVENIRS',
] as const;

export const OPERATIONAL_IMPACT_OPTIONS = [
    { value: 'HIGH', label: 'HIGH', bg: 'bg-[#A00000]', text: 'text-white' },
    { value: 'MEDIUM', label: 'MEDIUM', bg: 'bg-[#1565C0]', text: 'text-white' },
    { value: 'LOW', label: 'LOW', bg: 'bg-[#6A1B9A]', text: 'text-white' },
] as const;

export const ITEM_DESCRIPTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'ICT/EQUIPMENT': {
        bg: 'bg-[#FEE2E2]',
        text: 'text-[#991B1B]',
        border: 'border-[#FECACA]',
    },
    'OFFICE SUPPLIES': {
        bg: 'bg-[#E0F2FE]',
        text: 'text-[#0369A1]',
        border: 'border-[#BAE6FD]',
    },
    'OFFICE EQUIPMENT': {
        bg: 'bg-[#F3E8FF]',
        text: 'text-[#7E22CE]',
        border: 'border-[#E9D5FF]',
    },
    'LABORATORY': {
        bg: 'bg-[#FEF3C7]',
        text: 'text-[#B45309]',
        border: 'border-[#FDE68A]',
    },
    'CONSTRUCTION SUPPLIES': {
        bg: 'bg-[#CCFBF1]',
        text: 'text-[#0F766E]',
        border: 'border-[#99F6E4]',
    },
    'SERVICES': {
        bg: 'bg-[#FFEDD5]',
        text: 'text-[#C2410C]',
        border: 'border-[#FED7AA]',
    },
    'TOKEN & SOUVENIRS': {
        bg: 'bg-[#F3F4F6]',
        text: 'text-[#4B5563]',
        border: 'border-[#E5E7EB]',
    },
};

export function ItemDescriptionBadge({
    value,
    description,
    className,
}: {
    value?: string | null | undefined;
    description?: string | null | undefined;
    className?: string;
}) {
    const raw = value ?? description;
    if (!raw || raw.includes('\n') || raw.length > 50) return <span className="text-muted-foreground">—</span>;

    const normalized = raw.trim().toUpperCase();
    const style = ITEM_DESCRIPTION_STYLES[normalized] ?? {
        bg: 'bg-[#F1F5F9]',
        text: 'text-[#334155]',
        border: 'border-[#CBD5E1]',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center justify-center w-fit max-w-fit whitespace-nowrap px-3 py-0.5 rounded-full text-xs font-semibold tracking-wide border transition-colors shadow-2xs shrink-0',
                style.bg,
                style.text,
                style.border,
                className
            )}
        >
            {raw}
        </span>
    );
}

export function OperationalImpactBadge({
    value,
    impact,
    className,
}: {
    value?: string | null | undefined;
    impact?: string | null | undefined;
    className?: string;
}) {
    const raw = value ?? impact;
    if (!raw) return <span className="text-muted-foreground">—</span>;

    const normalized = raw.trim().toUpperCase();
    let bg = 'bg-gray-500';
    let text = 'text-white';

    if (normalized === 'HIGH') {
        bg = 'bg-[#A00000]';
        text = 'text-white';
    } else if (normalized === 'MEDIUM') {
        bg = 'bg-[#1565C0]';
        text = 'text-white';
    } else if (normalized === 'LOW') {
        bg = 'bg-[#6A1B9A]';
        text = 'text-white';
    }

    return (
        <span
            className={cn(
                'inline-flex items-center justify-center w-fit max-w-fit whitespace-nowrap px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase text-white shadow-sm min-w-[70px] shrink-0',
                bg,
                text,
                className
            )}
        >
            {normalized}
        </span>
    );
}
