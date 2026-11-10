import { Head, Link, router, usePage } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import { Eye, Pencil, Plus, Search, Trash2, Archive, AlertTriangle, ExternalLink, Truck, FileText, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import TableColumnsPopover from '@/components/table/TableColumnsPopover';
import TableToolbar from '@/components/table/TableToolbar';
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import PurchaseOrderAddForm from '@/components/purchase-order/poaddform';
import type { StockItemOption } from '@/components/purchase-order/item-multi-select';
import PurchaseOrderDeleteModal from '@/components/purchase-order/podeletemodal';
import PurchaseOrderEditForm from '@/components/purchase-order/poeditform';
import PurchaseOrderViewForm from '@/components/purchase-order/poviewform';
import PoWorkflowModal from '@/components/purchase-order/PoWorkflowModal';
import { ItemDescriptionBadge, OperationalImpactBadge } from '@/components/purchase-order/po-badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import Pagination from '@/components/Pagination';
import { preservePerPage } from '@/lib/filterUrl';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface Office {
    office_code: string;
    office_name: string;
}

interface PurchaseOrder {
    po_number: string;
    po_date: string | null;
    po_received_date: string | null;
    inclusive_date: string | null;
    due_date: string | null;
    pr_number: string | null;
    pr_date: string | null;
    philgeps_reference_no: string | null;
    procurement_type: string | null;
    mode_of_procurement: string | null;
    total_amount_abc: string | number | null;
    total_amount_po: string | number;
    total_amount_diff: string | number | null;
    fund_cluster_id: string | null;
    ors_burs_no: string | null;
    ors_burs_date: string | null;
    responsibility_center: string | null;
    uacs_object_code: string | null;
    fund_cluster: FundCluster | null;
    supplier_id: number | null;
    end_user: string | null;
    date_forwarded_to_smu: string | null;
    coa_processed_date: string | null;
    date_forwarded_frontdesk: string | null;
    supplier: Supplier | null;
    fundCluster: FundCluster | null;
    office: Office | null;
    item_description: string | null;
    operational_impact: string | null;
    has_delivery_record?: boolean;
    has_cancelled_delivery?: boolean;
    has_po_letter_record?: boolean;
    delivery_term?: number | string | null;
    po_step?: string | null;
    locked_steps?: Record<string, string> | null;
}

interface PaginatedPurchaseOrders {
    data: PurchaseOrder[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Filters {
    search: string | null;
    fund_cluster: string | null;
    office: string | null;
    item_description?: string | null;
    operational_impact?: string | null;
    sort_field?: string | null;
    sort_direction?: 'asc' | 'desc' | null;
}

interface Props {
    purchaseOrders: PaginatedPurchaseOrders;
    filters: Filters;
    suppliers: Supplier[];
    fundClusters: FundCluster[];
    offices: Office[];
    stockItems: StockItemOption[];
    itemDescriptions?: string[];
    operationalImpacts?: string[];
}

function formatCurrency(value: string | number | null) {
    if (value === null) {
return '—';
}

    const numeric = typeof value === 'string' ? parseFloat(value) : value;

    if (Number.isNaN(numeric)) {
return '—';
}

    return numeric.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });
}

function formatDate(value: string | null) {
    if (!value) {
return '—';
}

    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
    po_number: true,
    supplier: true,
    office: true,
    fund_cluster: true,
    item_description: true,
    operational_impact: true,
    mode_of_procurement: true,
    po_date: true,
    due_date: true,
    total_amount_po: true,
    pr_number: false,
    philgeps_reference_no: false,
    po_received_date: false,
};

const AVAILABLE_COLUMNS = [
    { key: 'po_number', label: 'PO Number', locked: true },
    { key: 'supplier', label: 'Supplier' },
    { key: 'office', label: 'End User' },
    { key: 'fund_cluster', label: 'Fund Cluster' },
    { key: 'item_description', label: 'Item Description' },
    { key: 'operational_impact', label: 'Operational Impact' },
    { key: 'mode_of_procurement', label: 'Mode of Procurement' },
    { key: 'po_date', label: 'PO Date' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'total_amount_po', label: 'PO Amount' },
    { key: 'pr_number', label: 'PR Number' },
    { key: 'philgeps_reference_no', label: 'PhilGEPS Ref No' },
    { key: 'po_received_date', label: 'PO Received Date' },
];

export default function Index({
    purchaseOrders,
    filters,
    suppliers,
    fundClusters,
    offices,
    stockItems,
    itemDescriptions = [],
    operationalImpacts = ['HIGH', 'MEDIUM', 'LOW'],
}: Props) {
    const { auth } = usePage().props as any;
    const isStaff = auth?.user?.role === 'staff';

    const columnVisibility = useColumnVisibility({
        storageKey: 'smis_po_visible_columns',
        columns: AVAILABLE_COLUMNS,
        defaultVisible: DEFAULT_VISIBLE_COLUMNS,
    });
    const { visibleColumns } = columnVisibility;

    const [search, setSearch] = useState(filters.search ?? '');
    const [fundCluster, setFundCluster] = useState(filters.fund_cluster ?? 'all');
    const [officeFilter, setOfficeFilter] = useState(filters.office ?? 'all');
    const [itemDescFilter, setItemDescFilter] = useState(filters.item_description ?? 'all');
    const [opImpactFilter, setOpImpactFilter] = useState(filters.operational_impact ?? 'all');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);
    const [noLinkedRecordModal, setNoLinkedRecordModal] = useState<{
        open: boolean;
        poNumber: string;
        targetModule: string;
    } | null>(null);

    const handleNavigateLinkedRecord = (po: PurchaseOrder, target: 'delivery' | 'po_letter') => {
        if (target === 'delivery') {
            if (!po.has_delivery_record) {
                setNoLinkedRecordModal({
                    open: true,
                    poNumber: po.po_number,
                    targetModule: 'Delivery Monitoring',
                });
                return;
            }
            auditLogsHighlight(po.po_number, '/deliveries');
            router.get(`/deliveries?highlight_search=${encodeURIComponent(po.po_number)}&highlight_column=po_number`);
        } else {
            if (!po.has_po_letter_record) {
                setNoLinkedRecordModal({
                    open: true,
                    poNumber: po.po_number,
                    targetModule: 'PO Letter Monitoring',
                });
                return;
            }
            auditLogsHighlight(po.po_number, '/po-letter-monitoring');
            router.get(`/po-letter-monitoring?highlight_search=${encodeURIComponent(po.po_number)}&highlight_column=po_number`);
        }
    };

    const runSearch = (
        nextFundCluster?: string,
        nextOffice?: string,
        nextItemDesc?: string,
        nextOpImpact?: string,
        sortField = filters.sort_field,
        sortDirection = filters.sort_direction,
    ) => {
        router.get(
            '/purchase-orders',
            preservePerPage({
                search,
                fund_cluster: (nextFundCluster ?? fundCluster) === 'all' ? undefined : nextFundCluster ?? fundCluster,
                office: (nextOffice ?? officeFilter) === 'all' ? undefined : nextOffice ?? officeFilter,
                item_description: (nextItemDesc ?? itemDescFilter) === 'all' ? undefined : nextItemDesc ?? itemDescFilter,
                operational_impact: (nextOpImpact ?? opImpactFilter) === 'all' ? undefined : nextOpImpact ?? opImpactFilter,
                sort_field: sortField || undefined,
                sort_direction: sortDirection || undefined,
            }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleSort = (field: string) => {
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';
        runSearch(undefined, undefined, undefined, undefined, field, direction);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch();
    };

    const handleOfficeChange = (value: string) => {
        setOfficeFilter(value);
        runSearch(undefined, value);
    };

    const handleFundClusterChange = (value: string) => {
        setFundCluster(value);
        runSearch(value);
    };

    const handleItemDescChange = (value: string) => {
        setItemDescFilter(value);
        runSearch(undefined, undefined, value);
    };

    const handleOpImpactChange = (value: string) => {
        setOpImpactFilter(value);
        runSearch(undefined, undefined, undefined, value);
    };

    const handleClear = () => {
        setSearch('');
        setFundCluster('all');
        setOfficeFilter('all');
        setItemDescFilter('all');
        setOpImpactFilter('all');

        router.get(
            '/purchase-orders',
            preservePerPage({}),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleEdit = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setEditDialogOpen(true);
    };

    const handleView = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setViewDialogOpen(true);
    };

    const handleWorkflow = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setWorkflowDialogOpen(true);
    };

    const handleDelete = (po: PurchaseOrder) => {
        setPoToDelete(po);
        setDeleteDialogOpen(true);
    };

    return (
        <>
            <Head title="Purchase Order Monitoring" />

            <div className="flex flex-col h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] p-4 sm:p-6 gap-6">
                {/* Sticky Header & Search */}
                <div className="shrink-0 relative z-30 -mx-4 -mt-4 bg-background/95 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Purchase Order Monitoring
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Manage and track all purchase orders
                            </p>
                        </div>
                    </div>

                    {/* Search & Actions */}
                    <form
                        onSubmit={handleSearch}
                        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                    >
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                            <div className="relative w-full sm:w-44 md:w-48">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search PO"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <Select
                                value={fundCluster}
                                onValueChange={handleFundClusterChange}
                            >
                                <SelectTrigger className={`w-full sm:w-[160px] ${fundCluster === 'all' ? 'text-muted-foreground' : ''}`}>
                                    <SelectValue placeholder="Filter by Fund Cluster" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="all">Filter by Fund Cluster</SelectItem>
                                    {fundClusters.map((fc) => (
                                        <SelectItem
                                            key={fc.fund_cluster_id}
                                            value={fc.fund_cluster_id}
                                        >
                                            {fc.fund_cluster_id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={officeFilter} onValueChange={handleOfficeChange}>
                                <SelectTrigger className={`w-full sm:w-[150px] ${officeFilter === 'all' ? 'text-muted-foreground' : ''}`}>
                                    <SelectValue placeholder="Filter by End User" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Filter by End User</SelectItem>
                                    {offices.map((o) => (
                                        <SelectItem key={o.office_code} value={o.office_code}>
                                            {o.office_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={itemDescFilter} onValueChange={handleItemDescChange}>
                                <SelectTrigger className={`w-full sm:w-[175px] ${itemDescFilter === 'all' ? 'text-muted-foreground' : ''}`}>
                                    <SelectValue placeholder="Filter by Item Description" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Filter by Item Description</SelectItem>
                                    {itemDescriptions.map((desc) => (
                                        <SelectItem key={desc} value={desc}>
                                            {desc}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={opImpactFilter} onValueChange={handleOpImpactChange}>
                                <SelectTrigger className={`w-full sm:w-[185px] ${opImpactFilter === 'all' ? 'text-muted-foreground' : ''}`}>
                                    <SelectValue placeholder="Filter by Operational Impact" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Filter by Operational Impact</SelectItem>
                                    {operationalImpacts.map((impact) => (
                                        <SelectItem key={impact} value={impact}>
                                            {impact}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button type="submit" variant="secondary" className="cursor-pointer">
                                Search
                            </Button>

                            <Button type="button" variant="ghost" onClick={handleClear} className="cursor-pointer">
                                Clear
                            </Button>
                        </div>

                        <Button
                            type="button"
                            onClick={() => setAddDialogOpen(true)}
                            className="w-full lg:w-auto text-white shadow-sm shrink-0 cursor-pointer"
                            style={{ backgroundColor: '#612A35' }}
                        >
                            <Plus className="mr-2 size-4" />
                            Add Purchase Order
                        </Button>
                    </form>

                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                <div className="flex-1 min-h-0 flex flex-col gap-3">
                    {/* Table View Toolbar */}
                    <TableToolbar
                        currentCount={purchaseOrders.data.length}
                        total={purchaseOrders.total}
                        entityName="purchase orders"
                    >
                        <TableColumnsPopover visibility={columnVisibility} />
                    </TableToolbar>
                    <div className="flex-initial min-h-0 overflow-x-auto overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                        <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
                            <thead
                                className="sticky top-0 z-20 border-b"
                                style={{ backgroundColor: '#370001' }}
                            >
                            <tr>
                                {visibleColumns.po_number && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('po_number')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            PO Number
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.supplier && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('supplier')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            Supplier
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.office && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('office')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            End User
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.fund_cluster && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('fund_cluster')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            Fund Cluster
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.item_description && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('item_description')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            Item Description
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.operational_impact && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('operational_impact')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            Operational Impact
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.mode_of_procurement && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('mode_of_procurement')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            Mode of Procurement
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.po_date && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('po_date')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            PO Date
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.due_date && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('due_date')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            Due Date
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.total_amount_po && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('total_amount_po')} className="flex w-full items-center justify-end gap-1.5 px-3 py-2.5 text-right hover:bg-[#4C0002]">
                                            PO Amount
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.pr_number && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('pr_number')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            PR Number
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.philgeps_reference_no && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('philgeps_reference_no')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            PhilGEPS Ref No
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.po_received_date && (
                                    <th className="p-0 font-semibold text-white">
                                        <button type="button" onClick={() => handleSort('po_received_date')} className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left hover:bg-[#4C0002]">
                                            PO Received Date
                                        </button>
                                    </th>
                                )}
                                <th className="sticky right-0 z-30 bg-[#370001] px-3 py-2.5 text-center font-semibold text-white shadow-[-3px_0_6px_-1px_rgba(0,0,0,0.35)]">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {purchaseOrders.data.length === 0 ? (
                                <tr>
                                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No purchase orders added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>&quot;Add Purchase Order&quot;</strong>{' '}
                                            to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                purchaseOrders.data.map((po, i) => (
                                   <AnimatedTableRow
                                        key={po.po_number}
                                        index={i}
                                        className="group/row border-b transition-colors hover:bg-muted/40"
                                        data-search-0={po.po_number}
                                        data-record-id={po.po_number}
                                    >
                                        {visibleColumns.po_number && (
                                            <td className="px-3 py-2 font-medium">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{po.po_number}</span>
                                                    {po.has_cancelled_delivery && (
                                                        <span
                                                            className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60"
                                                            title="Delivery cancelled in Delivery Monitoring"
                                                        >                                                       
                                                            <span>Delivery Cancelled</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.supplier && (
                                            <td className="px-3 py-2" title={po.supplier?.supplier_name ?? undefined}>
                                                {po.supplier?.supplier_name ?? '—'}
                                            </td>
                                        )}
                                        {visibleColumns.office && (
                                            <td className="px-3 py-2" title={po.office?.office_name ?? undefined}>
                                                {po.office?.office_name ?? '—'}
                                            </td>
                                        )}
                                        {visibleColumns.fund_cluster && (
                                            <td className="px-3 py-2">
                                                {po.fund_cluster?.fund_cluster_id ?? '—'}
                                            </td>
                                        )}
                                        {visibleColumns.item_description && (
                                            <td className="px-3 py-2">
                                                <ItemDescriptionBadge value={po.item_description} />
                                            </td>
                                        )}
                                        {visibleColumns.operational_impact && (
                                            <td className="px-3 py-2">
                                                <OperationalImpactBadge value={po.operational_impact} />
                                            </td>
                                        )}
                                        {visibleColumns.mode_of_procurement && (
                                            <td className="px-3 py-2" title={po.mode_of_procurement ?? undefined}>
                                                {po.mode_of_procurement ?? '—'}
                                            </td>
                                        )}
                                        {visibleColumns.po_date && (
                                            <td className="px-3 py-2">
                                                {formatDate(po.po_date)}
                                            </td>
                                        )}
                                        {visibleColumns.due_date && (
                                            <td className="px-3 py-2">
                                                {formatDate(po.due_date)}
                                            </td>
                                        )}
                                        {visibleColumns.total_amount_po && (
                                            <td className="px-3 py-2 text-right font-medium">
                                                {formatCurrency(po.total_amount_po)}
                                            </td>
                                        )}
                                        {visibleColumns.pr_number && (
                                            <td className="px-3 py-2">
                                                {po.pr_number ?? '—'}
                                            </td>
                                        )}
                                        {visibleColumns.philgeps_reference_no && (
                                            <td className="px-3 py-2">
                                                {po.philgeps_reference_no ?? '—'}
                                            </td>
                                        )}
                                        {visibleColumns.po_received_date && (
                                            <td className="px-3 py-2">
                                                {formatDate(po.po_received_date)}
                                            </td>
                                        )}
                                        <td className="sticky right-0 z-10 bg-white dark:bg-gray-900 group-hover/row:bg-slate-50 dark:group-hover/row:bg-gray-800/90 px-3 py-2 shadow-[-3px_0_6px_-1px_rgba(0,0,0,0.08)]">
                                            <div className="flex items-center justify-center gap-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                                            title="View linked records"
                                                        >
                                                            <ExternalLink className="size-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 text-xs">
                                                        <DropdownMenuItem
                                                            onClick={() => handleNavigateLinkedRecord(po, 'delivery')}
                                                            className="cursor-pointer gap-2 py-2"
                                                        >
                                                            <Truck className="size-3.5 text-blue-500" />
                                                            <span>View this in Delivery Monitoring</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleNavigateLinkedRecord(po, 'po_letter')}
                                                            className="cursor-pointer gap-2 py-2"
                                                        >
                                                            <FileText className="size-3.5 text-amber-500" />
                                                            <span>View in PO Letter Monitoring</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(po)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleWorkflow(po)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Workflow Steps"
                                                >
                                                    <Plus className="size-4" />
                                                </button>
                                                {!isStaff && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(po)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Archive"
                                                    >
                                                        <Archive className="size-4" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleView(po)}
                                                    className="text-foreground hover:text-muted-foreground"
                                                    title="View"
                                                >
                                                    <Eye className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </AnimatedTableRow>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {purchaseOrders.data.length > 0 && (
                    <div className="shrink-0">
                        <Pagination meta={purchaseOrders} />
                    </div>
                )}
            </div>
        </div>

            <PurchaseOrderAddForm
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                suppliers={suppliers}
                fundClusters={fundClusters}
                offices={offices}
                stockItems={stockItems}
            />

            <PurchaseOrderEditForm
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                purchaseOrder={selectedPO as any}
                suppliers={suppliers}
                fundClusters={fundClusters}
                offices={offices}
                stockItems={stockItems}
            />

            <PurchaseOrderViewForm
                open={viewDialogOpen}
                onOpenChange={setViewDialogOpen}
                purchaseOrder={selectedPO as any}
            />

            <PoWorkflowModal
                open={workflowDialogOpen}
                onOpenChange={setWorkflowDialogOpen}
                purchaseOrder={selectedPO as any}
                itemDescriptions={itemDescriptions}
                operationalImpacts={operationalImpacts}
            />

            <PurchaseOrderDeleteModal
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                poNumber={poToDelete?.po_number ?? null}
            />

            <Dialog open={noLinkedRecordModal?.open ?? false} onOpenChange={(o) => !o && setNoLinkedRecordModal(null)}>
                <DialogContent className="sm:max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                            <AlertCircle className="size-5 text-amber-500 shrink-0" />
                            <span>No Linked Record</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-3 text-sm text-neutral-600 dark:text-neutral-400">
                        Purchase Order <strong className="text-neutral-900 dark:text-neutral-100">{noLinkedRecordModal?.poNumber}</strong> has no linked existing record in <strong className="text-neutral-900 dark:text-neutral-100">{noLinkedRecordModal?.targetModule}</strong>.
                    </div>
                    <DialogFooter className="flex justify-end gap-2 mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNoLinkedRecordModal(null)}
                            className="cursor-pointer text-xs"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Procurement',
            href: '#',
        },
        {
            title: 'Purchase Order Monitoring',
            href: '/purchase-orders',
        },
    ],
};