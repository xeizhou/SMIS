import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { useColumnVisibility } from '@/hooks/useColumnVisibility';

interface TableColumnsPopoverProps {
    visibility: ReturnType<typeof useColumnVisibility>;
    align?: 'start' | 'center' | 'end';
    triggerClassName?: string;
}

export const TableColumnsPopover: React.FC<TableColumnsPopoverProps> = React.memo(({
    visibility,
    align = 'end',
    triggerClassName,
}) => {
    const {
        visibleColumns,
        isPopoverOpen,
        handlePopoverOpenChange,
        toggleColumn,
        selectAllColumns,
        unselectAllColumns,
        resetColumns,
        handleSaveColumns,
        handleCancelColumns,
        activeCount,
        totalCount,
        columns,
    } = visibility;

    return (
        <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-8 bg-card border-border hover:bg-muted text-foreground flex items-center gap-1.5 shadow-xs cursor-pointer text-xs font-medium",
                        triggerClassName
                    )}
                >
                    <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                    <span>Columns ({activeCount}/{totalCount})</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align={align} className="w-72 p-3 shadow-lg z-50">
                <div className="flex items-center justify-between pb-2.5 border-b border-border mb-2.5">
                    <span className="text-xs font-semibold text-foreground">
                        Table Columns ({activeCount}/{totalCount})
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pb-2.5 border-b border-border/60 mb-2">
                    <button
                        type="button"
                        onClick={selectAllColumns}
                        className="px-1.5 py-1 text-center text-[11px] font-medium bg-muted/70 hover:bg-muted text-foreground rounded border border-border/50 transition-colors cursor-pointer"
                    >
                        Select All
                    </button>
                    <button
                        type="button"
                        onClick={unselectAllColumns}
                        className="px-1.5 py-1 text-center text-[11px] font-medium bg-muted/70 hover:bg-muted text-foreground rounded border border-border/50 transition-colors cursor-pointer"
                    >
                        Unselect All
                    </button>
                    <button
                        type="button"
                        onClick={resetColumns}
                        className="px-1.5 py-1 text-center text-[11px] font-medium bg-muted/70 hover:bg-muted text-foreground rounded border border-border/50 transition-colors cursor-pointer"
                        title="Revert to your saved selection"
                    >
                        Reset
                    </button>
                </div>
                <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                    {columns.map((col) => {
                        const isChecked = !!visibleColumns[col.key];
                        return (
                            <label
                                key={col.key}
                                className={cn(
                                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-foreground select-none transition-colors",
                                    col.locked
                                        ? "opacity-60 cursor-not-allowed bg-muted/30"
                                        : "hover:bg-muted/70 cursor-pointer"
                                )}
                            >
                                <Checkbox
                                    checked={isChecked}
                                    disabled={col.locked}
                                    onCheckedChange={() => !col.locked && toggleColumn(col.key)}
                                />
                                <span className="flex-1 truncate">{col.label}</span>
                                {col.locked && (
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                        Locked
                                    </span>
                                )}
                            </label>
                        );
                    })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-border mt-2.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelColumns}
                        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveColumns}
                        className="h-7 px-3 text-xs text-white shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
});

TableColumnsPopover.displayName = 'TableColumnsPopover';

export default TableColumnsPopover;

