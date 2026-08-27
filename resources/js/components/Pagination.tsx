// resources/js/components/Pagination.tsx
import { Link, router } from '@inertiajs/react';
import {
    Pagination as ShadPagination,
    PaginationContent,
    PaginationItem,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedData = {
    data: unknown[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

interface PaginationProps {
    meta: PaginatedData;
    perPageOptions?: number[];
    preserveScroll?: boolean;
}

const MAROON = '#612A35';
const MAROON_DARK = '#370001';

export default function Pagination({
    meta,
    perPageOptions = [10, 25, 50, 100],
    preserveScroll = true,
}: PaginationProps) {
    const handlePerPageChange = (value: string) => {
        router.get(
            window.location.pathname,
            {
                ...Object.fromEntries(new URLSearchParams(window.location.search)),
                per_page: value,
                page: 1, // reset to first page when page size changes
            },
            { preserveState: true, preserveScroll, replace: true }
        );
    };

    if (meta.last_page <= 1 && perPageOptions.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                    Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total}
                </span>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Rows per page
                        </p>
                        <Select
                            value={String(meta.per_page)}
                            onValueChange={handlePerPageChange}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {perPageOptions.map((opt) => (
                                    <SelectItem key={opt} value={String(opt)}>
                                        {opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
            </div>

            <ShadPagination className="mx-0 w-auto">
                <PaginationContent>
                    {meta.links.map((link, i) => (
                        <PaginationItem key={i}>
                            <Link
                                href={link.url ?? '#'}
                                preserveScroll={preserveScroll}
                                preserveState
                                aria-disabled={!link.url}
                                className={cn(
                                    'flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors',
                                    link.active
                                        ? 'text-white'
                                        : link.url
                                        ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                                        : 'pointer-events-none border-gray-200 bg-white text-gray-400 opacity-40'
                                )}
                                style={
                                    link.active
                                        ? { backgroundColor: MAROON, borderColor: MAROON }
                                        : undefined
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        </PaginationItem>
                    ))}
                </PaginationContent>
            </ShadPagination>
        </div>
    );
}