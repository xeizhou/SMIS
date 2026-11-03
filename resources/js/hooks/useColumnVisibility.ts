import { useState, useRef, useMemo, useCallback } from 'react';

export interface ColumnConfig {
    key: string;
    label: string;
    locked?: boolean;
}

export interface UseColumnVisibilityOptions {
    storageKey: string;
    columns: ColumnConfig[];
    defaultVisible?: Record<string, boolean>;
}

export function useColumnVisibility({
    storageKey,
    columns,
    defaultVisible,
}: UseColumnVisibilityOptions) {
    const defaultState = useMemo(() => {
        const state: Record<string, boolean> = {};
        columns.forEach((col) => {
            state[col.key] = defaultVisible?.[col.key] ?? true;
        });
        return state;
    }, [columns, defaultVisible]);

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    const merged: Record<string, boolean> = { ...defaultState, ...parsed };
                    // Ensure locked columns always stay true
                    columns.forEach((col) => {
                        if (col.locked) merged[col.key] = true;
                    });
                    return merged;
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        return defaultState;
    });

    const savedSnapshotRef = useRef<Record<string, boolean>>(visibleColumns);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handlePopoverOpenChange = useCallback((open: boolean) => {
        setIsPopoverOpen(open);
        if (open) {
            savedSnapshotRef.current = { ...visibleColumns };
        } else {
            setVisibleColumns({ ...savedSnapshotRef.current });
        }
    }, [visibleColumns]);

    const toggleColumn = useCallback((key: string) => {
        const target = columns.find((c) => c.key === key);
        if (target?.locked) return;

        setVisibleColumns((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    }, [columns]);

    const selectAllColumns = useCallback(() => {
        const all: Record<string, boolean> = {};
        columns.forEach((c) => {
            all[c.key] = true;
        });
        setVisibleColumns(all);
    }, [columns]);

    const unselectAllColumns = useCallback(() => {
        const none: Record<string, boolean> = {};
        columns.forEach((c) => {
            none[c.key] = !!c.locked;
        });
        setVisibleColumns(none);
    }, [columns]);

    const resetColumns = useCallback(() => {
        const isSameAsSaved = JSON.stringify(visibleColumns) === JSON.stringify(savedSnapshotRef.current);
        const target = isSameAsSaved ? defaultState : savedSnapshotRef.current;
        const result = { ...target };
        columns.forEach((col) => {
            if (col.locked) result[col.key] = true;
        });
        setVisibleColumns(result);
    }, [visibleColumns, defaultState, columns]);

    const handleSaveColumns = useCallback(() => {
        savedSnapshotRef.current = { ...visibleColumns };
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
            } catch (e) {}
        }
        setIsPopoverOpen(false);
    }, [storageKey, visibleColumns]);

    const handleCancelColumns = useCallback(() => {
        setVisibleColumns({ ...savedSnapshotRef.current });
        setIsPopoverOpen(false);
    }, []);

    const activeCount = useMemo(() => {
        return Object.values(visibleColumns).filter(Boolean).length;
    }, [visibleColumns]);

    return {
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
        totalCount: columns.length,
        columns,
    };
}

