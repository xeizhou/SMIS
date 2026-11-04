import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { router, Link } from '@inertiajs/react';
import { 
    Truck, 
    ClipboardCheck, 
    FileText, 
    Search, 
    X, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    ExternalLink, 
    CheckCircle2, 
    Loader2, 
    Building2, 
    Calendar,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';
import { format } from 'date-fns';
import { useColumnVisibility, type ColumnConfig } from '@/hooks/useColumnVisibility';
import { TableColumnsPopover } from '@/components/table/TableColumnsPopover';

export type OperationalType = 'deliveries' | 'inspections' | 'clearances';

export interface OperationalDeliveryRecord {
    delivery_id: string;
    po_number: string;
    due_date?: string | null;
    due_date_formatted?: string | null;
    status: string;
    end_user?: string | null;
    has_follow_up?: boolean;
    supplier?: { supplier_name: string } | null;
}

export interface OperationalInspectionRecord {
    po_number: string;
    iar_number?: string | null;
    invoice_number?: string | null;
    created_at?: string | null;
    supplier?: { supplier_name: string } | null;
}

export interface OperationalClearanceRecord {
    po_number: string;
    iar_number?: string | null;
    invoice_number?: string | null;
    created_at?: string | null;
    supplier?: { supplier_name: string } | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    type: OperationalType;
    totalCount: number;
    initialRecords?: any[];
    onOpenFollowUp?: (deliveryId: string) => void;
}

export function OperationalRecordsModal({
    isOpen,
    onClose,
    type,
    totalCount,
    initialRecords = [],
    onOpenFollowUp,
}: Props) {
    const [records, setRecords] = useState<any[]>(initialRecords);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<'po_number' | 'supplier' | 'date'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const config = useMemo(() => {
        switch (type) {
            case 'deliveries':
                return {
                    title: 'Pending Deliveries',
                    description: 'Approved purchase orders awaiting supplier delivery or dock receiving.',
                    icon: Truck,
                    badgeBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
                    headerBg: 'bg-[#1e3a8a] text-white',
                    targetModule: '/deliveries',
                    dateLabel: 'Due Date',
                };
            case 'inspections':
                return {
                    title: 'Pending Inspections',
                    description: 'Shipments delivered to the facility awaiting technical examination and acceptance.',
                    icon: ClipboardCheck,
                    badgeBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
                    headerBg: 'bg-[#92400e] text-white',
                    targetModule: '/purchase-orders',
                    dateLabel: 'Date Recorded',
                };
            case 'clearances':
                return {
                    title: 'Pending Issuances',
                    description: 'Purchase orders awaiting final issuance endorsement and receiving date sign-off.',
                    icon: FileText,
                    badgeBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
                    headerBg: 'bg-[#065f46] text-white',
                    targetModule: '/purchase-orders',
                    dateLabel: 'Date Recorded',
                };
        }
    }, [type]);

    const columns = useMemo<ColumnConfig[]>(() => [
        { key: 'po_number', label: 'PO Number', locked: true },
        { key: 'supplier', label: 'Supplier' },
        { key: 'end_user_or_iar', label: type === 'deliveries' ? 'End User' : 'IAR / Invoice' },
        { key: 'date', label: config.dateLabel },
        { key: 'status', label: 'Status' },
    ], [type, config.dateLabel]);

    const columnVisibility = useColumnVisibility({
        storageKey: `smis_operational_modal_columns_${type}`,
        columns,
        defaultVisible: {
            po_number: true,
            supplier: true,
            end_user_or_iar: true,
            date: true,
            status: true,
        },
    });
    const { visibleColumns } = columnVisibility;

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/dashboard/operational-records?type=${type}`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
            }
        } catch (err) {
            console.error('Failed to load operational records:', err);
        } finally {
            setIsLoading(false);
        }
    }, [type]);

    useEffect(() => {
        if (isOpen) {
            if (initialRecords && initialRecords.length > 0) {
                setRecords(initialRecords);
            } else {
                fetchRecords();
            }
        }
    }, [isOpen, initialRecords, fetchRecords]);

    const handleSort = (field: 'po_number' | 'supplier' | 'date') => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredRecords = useMemo(() => {
        let result = [...records];

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter(item => {
                const po = (item.po_number || '').toLowerCase();
                const sup = (item.supplier?.supplier_name || '').toLowerCase();
                const endUser = (item.end_user || '').toLowerCase();
                const iar = (item.iar_number || '').toLowerCase();
                const inv = (item.invoice_number || '').toLowerCase();
                return po.includes(q) || sup.includes(q) || endUser.includes(q) || iar.includes(q) || inv.includes(q);
            });
        }

        result.sort((a, b) => {
            let valA = '';
            let valB = '';

            if (sortField === 'po_number') {
                valA = a.po_number || '';
                valB = b.po_number || '';
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            if (sortField === 'supplier') {
                valA = a.supplier?.supplier_name || '';
                valB = b.supplier?.supplier_name || '';
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            // sort by date
            const dateA = a.due_date ? new Date(a.due_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
            const dateB = b.due_date ? new Date(b.due_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        return result;
    }, [records, search, sortField, sortOrder]);

    const handleNavigate = (item: any, e?: React.MouseEvent) => {
        const targetUrl = type === 'deliveries'
            ? `/deliveries?highlight_id=${encodeURIComponent(item.delivery_id)}`
            : `/purchase-orders?highlight_id=${encodeURIComponent(item.po_number)}`;

        // If user Ctrl-clicks or Cmd-clicks, open in new tab
        if (e && (e.ctrlKey || e.metaKey || e.button === 1)) {
            e.preventDefault();
            window.open(targetUrl, '_blank');
            return;
        }

        if (e) {
            e.preventDefault();
        }
        onClose();

        if (type === 'deliveries') {
            auditLogsHighlight(String(item.delivery_id), '/deliveries');
        } else {
            auditLogsHighlight(item.po_number, '/purchase-orders');
        }
        router.visit(targetUrl);
    };

    const Icon = config.icon;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:max-w-5xl p-0 gap-0 overflow-hidden h-[85vh] max-h-[88vh] flex flex-col bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
                {/* Header */}
                <DialogHeader className="p-5 sm:p-6 pb-4 sm:pb-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("flex size-11 items-center justify-center rounded-xl shrink-0 shadow-2xs", config.badgeBg)}>
                                <Icon className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <DialogTitle className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">
                                        {config.title}
                                    </DialogTitle>
                                    <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                                        {totalCount}
                                    </span>
                                </div>
                                <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                                    {config.description}
                                </DialogDescription>
                            </div>
                        </div>

                        {type === 'deliveries' && (
                            <Button asChild variant="outline" size="sm" className="h-8.5 text-xs font-medium gap-1.5 self-start sm:self-auto shadow-2xs mr-8 sm:mr-10 cursor-pointer">
                                <Link href="/delivery-follow-ups">
                                    <span>Follow-ups Log</span>
                                    <ExternalLink className="size-3.5" />
                                </Link>
                            </Button>
                        )}
                    </div>

                    {/* Search and Quick Filters */}
                    <div className="mt-4 flex items-center gap-2.5">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by PO Number, Supplier, End User, or IAR/Invoice..."
                                className="h-9.5 pl-9.5 pr-8 text-sm sm:text-[15px] bg-neutral-50/70 border-neutral-200 dark:bg-neutral-800/50 dark:border-neutral-700 w-full"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-0.5"
                                    aria-label="Clear search"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>

                        <TableColumnsPopover
                            visibility={columnVisibility}
                            triggerClassName="h-9.5 text-xs font-semibold shadow-2xs shrink-0"
                        />

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={fetchRecords}
                            disabled={isLoading}
                            className="size-9.5 shrink-0 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white cursor-pointer shadow-2xs"
                            title="Reload latest records"
                            aria-label="Reload records"
                        >
                            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Table Area: Framed inside a bordered card with generous paddings so it does not touch edges */}
                <div className="flex-1 min-h-0 p-4 sm:p-6 pt-3.5 sm:pt-4 flex flex-col">
                    {isLoading && records.length === 0 ? (
                        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 text-neutral-400">
                            <RefreshCw className="size-7 animate-spin text-neutral-600 dark:text-neutral-300" />
                            <p className="text-base font-medium">Loading operational records...</p>
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="flex flex-1 min-h-0 flex-col items-center justify-center text-center p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                            <div className="flex size-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-2.5">
                                <AlertCircle className="size-5" />
                            </div>
                            <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                                No records found
                            </p>
                            <p className="text-sm text-neutral-500 mt-1 max-w-sm">
                                {search ? `No items matched your search "${search}". Try clearing the search query.` : 'There are currently no items under this operational status.'}
                            </p>
                            {search && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSearch('')}
                                    className="mt-3.5 h-8 text-xs font-medium cursor-pointer"
                                >
                                    Clear search filter
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs overflow-hidden flex flex-col">
                            <ScrollArea orientation="both" className="h-full w-full">
                                <table className="w-full min-w-[780px] text-left border-collapse">
                                    <thead className="sticky top-0 z-20 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 shadow-2xs">
                                        <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800">
                                        {visibleColumns.po_number && (
                                            <th className="py-3.5 px-4 sm:px-5 font-bold text-neutral-700 dark:text-neutral-200 text-xs sm:text-[13px] uppercase tracking-wider whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('po_number')}
                                                    className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                                >
                                                    <span>PO Number</span>
                                                    {sortField === 'po_number' ? (
                                                        sortOrder === 'asc' ? <ArrowUp className="size-3.5 text-indigo-600" /> : <ArrowDown className="size-3.5 text-indigo-600" />
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 text-neutral-400" />
                                                    )}
                                                </button>
                                            </th>
                                        )}
                                        {visibleColumns.supplier && (
                                            <th className="py-3.5 px-4 sm:px-5 font-bold text-neutral-700 dark:text-neutral-200 text-xs sm:text-[13px] uppercase tracking-wider whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('supplier')}
                                                    className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                                >
                                                    <span>Supplier</span>
                                                    {sortField === 'supplier' ? (
                                                        sortOrder === 'asc' ? <ArrowUp className="size-3.5 text-indigo-600" /> : <ArrowDown className="size-3.5 text-indigo-600" />
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 text-neutral-400" />
                                                    )}
                                                </button>
                                            </th>
                                        )}
                                        {visibleColumns.end_user_or_iar && (
                                            <th className="py-3.5 px-4 sm:px-5 font-bold text-neutral-700 dark:text-neutral-200 text-xs sm:text-[13px] uppercase tracking-wider whitespace-nowrap">
                                                {type === 'deliveries' ? 'End User' : 'IAR / Invoice'}
                                            </th>
                                        )}
                                        {visibleColumns.date && (
                                            <th className="py-3.5 px-4 sm:px-5 font-bold text-neutral-700 dark:text-neutral-200 text-xs sm:text-[13px] uppercase tracking-wider whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('date')}
                                                    className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                                >
                                                    <span>{config.dateLabel}</span>
                                                    {sortField === 'date' ? (
                                                        sortOrder === 'asc' ? <ArrowUp className="size-3.5 text-indigo-600" /> : <ArrowDown className="size-3.5 text-indigo-600" />
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 text-neutral-400" />
                                                    )}
                                                </button>
                                            </th>
                                        )}
                                        {visibleColumns.status && (
                                            <th className="py-3.5 px-4 sm:px-5 font-bold text-neutral-700 dark:text-neutral-200 text-xs sm:text-[13px] uppercase tracking-wider text-center whitespace-nowrap pr-6">
                                                Status
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                                    {filteredRecords.map((item, idx) => {
                                        const supplierName = item.supplier?.supplier_name || 'Unknown Supplier';
                                        const dateDisplay = item.due_date 
                                            ? format(new Date(item.due_date), 'MMM d, yyyy')
                                            : (item.created_at || '—');
                                        const targetUrl = type === 'deliveries'
                                            ? `/deliveries?highlight_id=${encodeURIComponent(item.delivery_id)}`
                                            : `/purchase-orders?highlight_id=${encodeURIComponent(item.po_number)}`;

                                        return (
                                            <tr
                                                key={item.delivery_id || item.po_number + '-' + idx}
                                                onClick={(e) => handleNavigate(item, e)}
                                                onAuxClick={(e) => {
                                                    if (e.button === 1) {
                                                        e.preventDefault();
                                                        window.open(targetUrl, '_blank');
                                                    }
                                                }}
                                                className="group transition-colors hover:bg-indigo-50/40 dark:hover:bg-neutral-800/50 cursor-pointer"
                                                title="Click to redirect, middle-click or right-click to open in new tab"
                                            >
                                                {visibleColumns.po_number && (
                                                    <td className="py-3.5 px-4 sm:px-5 font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                                                        <a
                                                            href={targetUrl}
                                                            onClick={(e) => {
                                                                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                                                                    e.preventDefault();
                                                                    handleNavigate(item);
                                                                }
                                                            }}
                                                            className="group/link inline-flex items-center gap-1.5 text-neutral-900 dark:text-neutral-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                                                            title="Click to redirect, middle-click or right-click to open in new tab"
                                                        >
                                                            <span>{item.po_number}</span>
                                                            <ExternalLink className="size-3.5 opacity-60 group-hover/link:opacity-100 text-indigo-500 transition-opacity shrink-0" />
                                                        </a>
                                                    </td>
                                                )}

                                                {visibleColumns.supplier && (
                                                    <td className="py-3.5 px-4 sm:px-5 text-sm sm:text-[15px] text-neutral-800 dark:text-neutral-200 max-w-[240px] truncate whitespace-nowrap" title={supplierName}>
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="size-4 text-neutral-400 shrink-0" />
                                                            <span className="truncate font-medium">{supplierName}</span>
                                                        </div>
                                                    </td>
                                                )}

                                                {visibleColumns.end_user_or_iar && (
                                                    <td className="py-3.5 px-4 sm:px-5 text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                                                        {type === 'deliveries' ? (
                                                            item.end_user || <span className="text-neutral-400">—</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                {item.iar_number && (
                                                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                                                        IAR: {item.iar_number}
                                                                    </span>
                                                                )}
                                                                {item.iar_number && item.invoice_number && (
                                                                    <span className="text-neutral-300 dark:text-neutral-600">•</span>
                                                                )}
                                                                {item.invoice_number && (
                                                                    <span className="text-neutral-600 dark:text-neutral-400">
                                                                        Inv: {item.invoice_number}
                                                                    </span>
                                                                )}
                                                                {!item.iar_number && !item.invoice_number && (
                                                                    <span className="text-neutral-400">—</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleColumns.date && (
                                                    <td className="py-3.5 px-4 sm:px-5 text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="size-4 text-neutral-400 shrink-0" />
                                                            <span>{dateDisplay}</span>
                                                        </div>
                                                    </td>
                                                )}

                                                {visibleColumns.status && (
                                                    <td className="py-3.5 px-4 sm:px-5 text-center whitespace-nowrap pr-6">
                                                        {type === 'deliveries' ? (
                                                            <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                                                                {item.status || 'PENDING'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                                                                PENDING
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                {/* Footer: Record count summary with subtle border and padding, no close button */}
                <DialogFooter className="px-5 sm:px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 flex flex-row items-center justify-between shrink-0">
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                        Showing <span className="font-semibold text-neutral-800 dark:text-neutral-200">{filteredRecords.length}</span> of <span className="font-semibold text-neutral-800 dark:text-neutral-200">{records.length}</span> records
                    </p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

