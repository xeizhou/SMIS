// resources/js/components/animated-table-row.tsx
import { TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ComponentProps } from 'react';

interface Props extends ComponentProps<typeof TableRow> {
    index?: number; // for staggering
}

export function AnimatedTableRow({ index = 0, className, style, ...props }: Props) {
    return (
        <TableRow
            className={cn('animate-row-in', className)}
            style={{ animationDelay: `${index * 30}ms`, ...style }}
            {...props}
        />
    );
}