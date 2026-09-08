import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { router } from '@inertiajs/react';
import { buildFilterUrl } from '@/lib/filterUrl';
import { cn } from '@/lib/utils';

export interface ColumnDef<T> {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    render?: (item: T) => React.ReactNode;
}

interface SortableTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    url: string;
    currentFilters?: Record<string, any>;
    emptyMessage?: string;
    /**
     * Return a stable, unique string/number ID for a row.
     * When provided, the rendered <tr> gets a `data-record-id` attribute so
     * auditLogsHighlight can find and yellow-flash it after navigation.
     */
    getRowId?: (item: T) => string | number;
}

export default function SortableTable<T>({
    data,
    columns,
    sortField,
    sortDirection,
    url,
    currentFilters = {},
    emptyMessage = 'No records found.',
    getRowId,
}: SortableTableProps<T>) {

    const handleSort = (field: string) => {
        const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        router.get(
            url,
            buildFilterUrl({ ...currentFilters, sort_field: field, sort_direction: direction }),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden">
            <table className="w-full text-sm table-fixed">
                <colgroup>
                    {columns.map((col, idx) => (
                        <col key={idx} className={col.width} />
                    ))}
                </colgroup>
                <thead className="border-b">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className="p-0 font-semibold text-white bg-[#370001]">
                                {col.sortable ? (
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002]"
                                        onClick={() => handleSort(col.key)}
                                    >
                                        {col.label}
                                    </button>
                                ) : (
                                    <div className="px-4 py-3 text-left">{col.label}</div>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-16 text-center text-muted-foreground">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((item, rowIndex) => (
                            <tr
                                key={`${sortField ?? 'default'}-${sortDirection ?? 'default'}-${rowIndex}`}
                                className={cn('border-b transition-colors hover:bg-muted/40 animate-row-in')}
                                style={{ animationDelay: `${rowIndex * 30}ms` }}
                                {...(getRowId ? { 'data-record-id': String(getRowId(item)) } : {})}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-3 truncate">
                                        {col.render ? col.render(item) : (item as any)[col.key] || '—'}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
}