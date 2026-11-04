import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { 
    FileText, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    Search, 
    X, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    ExternalLink, 
    Loader2, 
    Building2, 
    Calendar,
    AlertCircle,
    CircleDollarSign,
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
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useColumnVisibility, type ColumnConfig } from '@/hooks/useColumnVisibility';
import { TableColumnsPopover } from '@/components/table/TableColumnsPopover';

export type ReportStatusFilter = 'COMPLETED' | 'ONGOING' | 'CANCELLED';

export interface ReportRecord {
    po_number: string;
    supplier_name: string;
    po_date: string;
    total_amount_po: number;
    total_amount_po_formatted: string;
    po_step: string;
    payment_status: string;
    status: 'COMPLETED' | 'ONGOING' | 'CANCELLED';
    has_cancelled_delivery?: boolean;
    end_user?: string | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    year: number;
    quarter: number;
    initialStatus?: ReportStatusFilter | string;
    stats?: {
        COMPLETED: number;
        CANCELLED: number;
        ONGOING: number;
    };
}

const QUARTERS = [
    { value: 1, label: 'Q1 (Jan-Mar)' },
    { value: 2, label: 'Q2 (Apr-Jun)' },
    { value: 3, label: 'Q3 (Jul-Sep)' },
    { value: 4, label: 'Q4 (Oct-Dec)' },
];

const REPORT_COLUMNS: ColumnConfig[] = [
    { key: 'po_number', label: 'PO Number', locked: true },
    { key: 'supplier', label: 'Supplier' },
    { key: 'date', label: 'PO Date' },
    { key: 'amount', label: 'Amount (₱)' },
    { key: 'step', label: 'Stage / Step' },
    { key: 'status', label: 'Status' },
];

export function ReportsMonitoringModal({
    isOpen,
    onClose,
    year,
    quarter,
    initialStatus = 'COMPLETED',
    stats,
}: Props) {
    const [selectedStatus, setSelectedStatus] = useState<ReportStatusFilter>(() => {
        if (initialStatus === 'ONGOING' || initialStatus === 'CANCELLED') {
            return initialStatus;
        }
        return 'COMPLETED';
    });
    const [records, setRecords] = useState<ReportRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<'po_number' | 'supplier' | 'amount' | 'date'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const columnVisibility = useColumnVisibility({
        storageKey: 'smis_reports_modal_columns',
        columns: REPORT_COLUMNS,
        defaultVisible: {
            po_number: true,
            supplier: true,
            date: true,
            amount: true,
            step: true,
            status: true,
        },
    });
    const { visibleColumns } = columnVisibility;

    // Sync initial status when opened
    useEffect(() => {
        if (isOpen) {
            if (initialStatus === 'ONGOING' || initialStatus === 'CANCELLED') {
                setSelectedStatus(initialStatus);
            } else {
                setSelectedStatus('COMPLETED');
            }
        }
    }, [isOpen, initialStatus]);

    // Fetch records on demand
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                year: String(year),
                quarter: String(quarter),
                status: selectedStatus,
            });
            const res = await fetch(`/dashboard/reports-monitoring-records?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
            }
        } catch (err) {
            console.error('Failed to load reports monitoring records:', err);
        } finally {
            setIsLoading(false);
        }
    }, [year, quarter, selectedStatus]);

    useEffect(() => {
        if (isOpen) {
            fetchRecords();
        }
    }, [isOpen, fetchRecords]);

    const activeQuarterLabel = QUARTERS.find(q => q.value === quarter)?.label ?? `Q${quarter}`;

    const handleSort = (field: 'po_number' | 'supplier' | 'amount' | 'date') => {
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
                const sup = (item.supplier_name || '').toLowerCase();
                const step = (item.po_step || '').toLowerCase();
                const endUser = (item.end_user || '').toLowerCase();
                return po.includes(q) || sup.includes(q) || step.includes(q) || endUser.includes(q);
            });
        }

        result.sort((a, b) => {
            if (sortField === 'po_number') {
                const valA = a.po_number || '';
                const valB = b.po_number || '';
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (sortField === 'supplier') {
                const valA = a.supplier_name || '';
                const valB = b.supplier_name || '';
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (sortField === 'amount') {
                const valA = Number(a.total_amount_po) || 0;
                const valB = Number(b.total_amount_po) || 0;
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            }
            // date
            const dateA = a.po_date && a.po_date !== '—' ? new Date(a.po_date).getTime() : 0;
            const dateB = b.po_date && b.po_date !== '—' ? new Date(b.po_date).getTime() : 0;
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        return result;
    }, [records, search, sortField, sortOrder]);

    const handleNavigate = (item: ReportRecord, e?: React.MouseEvent) => {
        const targetUrl = `/purchase-orders?highlight_id=${encodeURIComponent(item.po_number)}`;

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
        auditLogsHighlight(item.po_number, '/purchase-orders');
        router.visit(targetUrl);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="size-3.5" />
                        <span>Completed</span>
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="size-3.5" />
                        <span>Cancelled</span>
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Clock className="size-3.5" />
                        <span>Ongoing</span>
                    </span>
                );
        }
    };

    const totalStatsCount = (stats?.COMPLETED || 0) + (stats?.ONGOING || 0) + (stats?.CANCELLED || 0);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:max-w-5xl p-0 gap-0 overflow-hidden h-[85vh] max-h-[88vh] flex flex-col bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
                {/* Header */}
                <DialogHeader className="p-5 sm:p-6 pb-4 sm:pb-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0 shadow-2xs">
                                <FileText className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <DialogTitle className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">
                                        Reports Monitoring Records
                                    </DialogTitle>
                                    <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/60 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                        {activeQuarterLabel} {year}
                                    </span>
                                </div>
                                <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                                    Quarterly inspection and payment status records • Click a record to open & highlight in Purchase Orders.
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Status Switcher Tabs: Completed, Ongoing, Cancelled */}
                        <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 text-xs dark:border-neutral-800 dark:bg-neutral-950 self-start sm:self-auto overflow-x-auto max-w-full mr-8 sm:mr-10 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('COMPLETED')}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    selectedStatus === 'COMPLETED'
                                        ? "bg-white text-emerald-700 shadow-2xs dark:bg-neutral-900 dark:text-emerald-400 font-bold"
                                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                <span className="size-2 rounded-full bg-emerald-500" />
                                <span>Completed</span>
                                {stats && <span className="text-[11px] font-bold opacity-80">({stats.COMPLETED})</span>}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('ONGOING')}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    selectedStatus === 'ONGOING'
                                        ? "bg-white text-blue-700 shadow-2xs dark:bg-neutral-900 dark:text-blue-400 font-bold"
                                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                <span className="size-2 rounded-full bg-blue-500" />
                                <span>Ongoing</span>
                                {stats && <span className="text-[11px] font-bold opacity-80">({stats.ONGOING})</span>}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('CANCELLED')}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    selectedStatus === 'CANCELLED'
                                        ? "bg-white text-rose-700 shadow-2xs dark:bg-neutral-900 dark:text-rose-400 font-bold"
                                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                <span className="size-2 rounded-full bg-rose-500" />
                                <span>Cancelled</span>
                                {stats && <span className="text-[11px] font-bold opacity-80">({stats.CANCELLED})</span>}
                            </button>
                        </div>
                    </div>

                    {/* Search Bar, Column Visibility, & Reload Button */}
                    <div className="mt-4 flex items-center gap-2.5">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by PO Number, Supplier Name, or Stage..."
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

                {/* Table Area: Framed card with shadcn ScrollArea */}
                <div className="flex-1 min-h-0 p-4 sm:p-6 pt-3.5 sm:pt-4 flex flex-col">
                    {isLoading && records.length === 0 ? (
                        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 text-neutral-400">
                            <RefreshCw className="size-7 animate-spin text-indigo-600 dark:text-indigo-400" />
                            <p className="text-base font-medium">Loading quarterly report records...</p>
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
                                {search
                                    ? `No records matched your search "${search}". Try clearing the search query.`
                                    : `There are no purchase order records classified under ${selectedStatus} for ${activeQuarterLabel} ${year}.`}
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
                                <table className="w-full min-w-[850px] text-left border-collapse">
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
                                        {visibleColumns.date && (
                                            <th className="py-3.5 px-4 sm:px-5 font-bold text-neutral-700 dark:text-neutral-200 text-xs sm:text-[13px] uppercase tracking-wider whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('date')}
                                                    className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                                >
                                                    <span>PO Date</span>
                                                    {sortField === 'date' ? (
                                                        sortOrder === 'asc' ? <ArrowUp className="size-3.5 text-indigo-600" /> : <ArrowDown className="size-3.5 text-indigo-600" />
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 text-neutral-400" />
                                                    )}
                                                </button>
                                            </th>
                                        )}
                                        {visibleColumns.amount && (
                                            <th className="py-3.5 px-4 sm:px-5 font-bold text-neutral-700 dark:text-neutral-200 text-xs sm:text-[13px] uppercase tracking-wider text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('amount')}
                                                    className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer ml-auto"
                                                >
                                                    <span>Amount (₱)</span>
                                                    {sortField === 'amount' ? (
                                                        sortOrder === 'asc' ? <ArrowUp className="size-3.5 text-indigo-600" /> : <ArrowDown className="size-3.5 text-indigo-600" />
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 text-neutral-400" />
                                                    )}
                                                </button>
                                            </th>
                                        )}
                                        {visibleColumns.step && (
                                            <th className="py-3.5 px-4 sm:px-5 font-bold text-neutral-700 dark:text-neutral-200 text-xs sm:text-[13px] uppercase tracking-wider whitespace-nowrap">
                                                Stage / Step
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
                                    {filteredRecords.map((item) => {
                                        const targetUrl = `/purchase-orders?highlight_id=${encodeURIComponent(item.po_number)}`;

                                        return (
                                            <tr
                                                key={item.po_number}
                                                onClick={(e) => handleNavigate(item, e)}
                                                onAuxClick={(e) => {
                                                    if (e.button === 1) {
                                                        e.preventDefault();
                                                        window.open(targetUrl, '_blank');
                                                    }
                                                }}
                                                className="group transition-colors hover:bg-indigo-50/40 dark:hover:bg-neutral-800/50 cursor-pointer"
                                                title="Click to redirect to this record"
                                            >
                                                {visibleColumns.po_number && (
                                                    <td className="py-3.5 px-4 sm:px-5 font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <a
                                                                href={targetUrl}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                                                                        e.preventDefault();
                                                                        handleNavigate(item, e);
                                                                    }
                                                                }}
                                                                className="group/link inline-flex items-center gap-1.5 text-neutral-900 dark:text-neutral-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                                                                title="Click to redirect to this record"
                                                            >
                                                                <span>{item.po_number}</span>
                                                                <ExternalLink className="size-3.5 opacity-60 group-hover/link:opacity-100 text-indigo-500 transition-opacity shrink-0" />
                                                            </a>
                                                            {item.status === 'ONGOING' && item.has_cancelled_delivery && (
                                                                <span
                                                                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60"
                                                                    title="1 or more partial deliveries were cancelled, while other deliveries remain active"
                                                                >
                                                                    Delivery Cancelled
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                            {visibleColumns.supplier && (
                                                <td className="py-3.5 px-4 sm:px-5 text-sm sm:text-[15px] text-neutral-800 dark:text-neutral-200 max-w-[240px] truncate whitespace-nowrap" title={item.supplier_name}>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="size-4 text-neutral-400 shrink-0" />
                                                        <span className="truncate font-medium">{item.supplier_name}</span>
                                                    </div>
                                                </td>
                                            )}

                                            {visibleColumns.date && (
                                                <td className="py-3.5 px-4 sm:px-5 text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="size-4 text-neutral-400 shrink-0" />
                                                        <span>{item.po_date}</span>
                                                    </div>
                                                </td>
                                            )}

                                            {visibleColumns.amount && (
                                                <td className="py-3.5 px-4 sm:px-5 text-right font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                                                    ₱{item.total_amount_po_formatted}
                                                </td>
                                            )}

                                            {visibleColumns.step && (
                                                <td className="py-3.5 px-4 sm:px-5 text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300 whitespace-nowrap max-w-[180px] truncate" title={item.po_step}>
                                                    <span className="truncate">{item.po_step}</span>
                                                </td>
                                            )}

                                            {visibleColumns.status && (
                                                <td className="py-3.5 px-4 sm:px-5 text-center whitespace-nowrap pr-6">
                                                    {getStatusBadge(item.status)}
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
                        Showing <span className="font-semibold text-neutral-800 dark:text-neutral-200">{filteredRecords.length}</span> of <span className="font-semibold text-neutral-800 dark:text-neutral-200">{records.length}</span> records in {activeQuarterLabel} {year}
                    </p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

