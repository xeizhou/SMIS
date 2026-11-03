import React from 'react';

interface TableToolbarProps {
    currentCount: number;
    total: number;
    entityName?: string;
    children?: React.ReactNode;
}

export const TableToolbar: React.FC<TableToolbarProps> = React.memo(({
    currentCount,
    total,
    entityName = 'records',
    children,
}) => {
    return (
        <div className="flex items-center justify-between shrink-0 px-0.5">
            <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{currentCount}</span> of{' '}
                <span className="font-semibold text-foreground">{total}</span> {entityName}
            </p>
            {children && (
                <div className="flex items-center gap-2">
                    {children}
                </div>
            )}
        </div>
    );
});

TableToolbar.displayName = 'TableToolbar';

export default TableToolbar;

