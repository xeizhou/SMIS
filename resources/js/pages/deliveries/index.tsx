import { Head, Link, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import Pagination from '@/components/Pagination';
import { Eye, Pencil, Search, Archive, ExternalLink, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import TableColumnsPopover from '@/components/table/TableColumnsPopover';
import TableToolbar from '@/components/table/TableToolbar';
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';
import DeliveryAddForm from '@/components/deliveries/deliveryaddform';
import DeliveryDeleteModal from '@/components/deliveries/deliverydeletemodal';
import DeliveryEditForm from '@/components/deliveries/deliveryeditform';
import DeliveryViewForm from '@/components/deliveries/deliveryviewform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface PurchaseOrderOption {
    po_number: string;
    supplier_id: number | null;
    supplier: Supplier | null;
    total_amount_po: string | number | null;
    end_user: string | null;
    delivery_term: number | string | null;
    po_received_date: string | null;
}

interface DeliveryRecord {
    delivery_id: string;
    po_number: string;
    supplier_id: number | null;
    supplier: Supplier | null;
    delivery_date: string | null;
    po_date_received: string | null;
    delivery_term: string | null;
    due_date: string | null;
    no_of_days_ld: number | string | null;
    received_by_1: string | null;
    received_by_2: string | null;
    end_user: string | null;
    place_of_delivery: string | null;
    status: string | null;
    remarks: string | null;
    data_entry_timestamp: string | null;
    total_amount_delivered: string | number | null;
    po_total_amount: string | number | null;
    folder_link: string | null;
    serve_po?: {
        po_number: string;
        total_amount_po: string | number | null;
        end_user: string | null;
        delivery_term: number | string | null;
        po_received_date: string | null;
        item_description: string | null;
    } | null;
}

interface PaginatedDeliveries {
    data: DeliveryRecord[];
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
    status: string | null;
    po_number: string | null;
    sort_field?: string | null;
    sort_direction?: 'asc' | 'desc' | null;
}

interface Props {
    deliveries: PaginatedDeliveries;
    filters: Filters;
    purchaseOrders: PurchaseOrderOption[];
    statuses: string[];
    suppliers: Supplier[];
}

const statusColors: Record<string, string> = {
    COMPLETE: 'bg-green-100 text-green-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    PENDING: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-red-100 text-red-700',
};

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

const DELIVERY_COLUMNS = [
    { key: 'po_number', label: 'PO Number', locked: true },
    { key: 'supplier', label: 'Supplier' },
    { key: 'delivery_date', label: 'Date of Delivery' },
    { key: 'status', label: 'Status' },
];

export default function Index({ deliveries, filters, purchaseOrders, statuses, suppliers }: Props) {
    const columnVisibility = useColumnVisibility({
        storageKey: 'smis_deliveries_visible_columns',
        columns: DELIVERY_COLUMNS,
    });
    const { visibleColumns } = columnVisibility;

    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [poNumber, setPoNumber] = useState(filters.po_number ?? 'all');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);
    const [deliveryToDelete, setDeliveryToDelete] = useState<DeliveryRecord | null>(null);

    

    const runSearch = (nextStatus?: string, nextPoNumber?: string, sortField = filters.sort_field, sortDirection = filters.sort_direction) => {
        router.get(
            '/deliveries',
            {
                search,
                status: (nextStatus ?? status) === 'all' ? undefined : nextStatus ?? status,
                po_number: (nextPoNumber ?? poNumber) === 'all' ? undefined : nextPoNumber ?? poNumber,
                sort_field: sortField || undefined,
                sort_direction: sortDirection || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSort = (field: string) => {
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';
        runSearch(undefined, undefined, field, direction);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch();
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        runSearch(value, poNumber);
    };

    const handlePoNumberChange = (value: string) => {
        setPoNumber(value);
        runSearch(status, value);
    };

    const handleClear = () => {
        setSearch('');
        setStatus('all');
        setPoNumber('all');

        router.get('/deliveries', {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleEdit = (delivery: DeliveryRecord) => {
        setSelectedDelivery(delivery);
        setEditDialogOpen(true);
    };

    const handleView = (delivery: DeliveryRecord) => {
        setSelectedDelivery(delivery);
        setViewDialogOpen(true);
    };

    const handleDelete = (delivery: DeliveryRecord) => {
        setDeliveryToDelete(delivery);
        setDeleteDialogOpen(true);
    };

    return (
        <>
            <Head title="Delivery Monitoring" />

            <div className="flex flex-col h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] p-4 sm:p-6 gap-6">
                {/* Sticky Header & Search */}
                <div className="shrink-0 relative z-30 -mx-4 -mt-4 bg-background/95 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Delivery Monitoring</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Manage and track all deliveries</p>
                        </div>
                        <div className="bg-muted/50 text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-lg p-1">
                            <Link
                                href="/deliveries"
                                preserveState
                                className="bg-background text-foreground shadow-sm inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                            >
                                Deliveries
                            </Link>
                            <Link
                                href="/delivery-follow-ups"
                                className="text-muted-foreground hover:text-foreground inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                            >
                                Follow-ups
                            </Link>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2 flex-1">
                            <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search delivery"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <Select value={status} onValueChange={handleStatusChange}>
                                <SelectTrigger className={`w-[180px] ${status === 'all' ? 'text-muted-foreground' : ''}`}>
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Filter by Status</SelectItem>
                                    {statuses.map((statusOption) => (
                                        <SelectItem key={statusOption} value={statusOption}>
                                            {statusOption}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button type="submit" variant="secondary">Search</Button>
                            <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                        </div>

                        <Button type="button" onClick={() => setAddDialogOpen(true)} className="w-full lg:w-auto text-white shadow-sm" style={{ backgroundColor: '#612A35' }}>
                            <Plus className="mr-2 size-4" />
                            Add Delivery
                        </Button>
                    </form>

                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <TableToolbar
                        currentCount={deliveries.data.length}
                        total={deliveries.total}
                        entityName="delivery records"
                    >
                        <TableColumnsPopover visibility={columnVisibility} />
                    </TableToolbar>

                    <div className="flex-initial min-h-0 overflow-x-auto overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="sticky top-0 z-20 border-b" style={{ backgroundColor: '#370001' }}>
                                <tr>
                                    {visibleColumns.po_number && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('po_number')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">PO Number</button>
                                        </th>
                                    )}
                                    {visibleColumns.supplier && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('supplier')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">Supplier</button>
                                        </th>
                                    )}
                                    {visibleColumns.delivery_date && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('delivery_date')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">Date of Delivery</button>
                                        </th>
                                    )}
                                    {visibleColumns.status && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('status')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">Status</button>
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-left font-semibold text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveries.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={columnVisibility.activeCount + 1} className="px-6 py-16 text-center">
                                            <p className="text-base font-medium text-muted-foreground">No delivery records added yet.</p>
                                            <p className="mt-1 text-sm text-muted-foreground">Click <strong>&quot;Add Delivery&quot;</strong> to create your first entry.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    deliveries.data.map((delivery, index) => (
                                        <AnimatedTableRow
                                            key={delivery.delivery_id}
                                            index={index}
                                            className="border-b transition-colors hover:bg-muted/40"
                                            data-search-0={delivery.delivery_id}
                                            data-search-1={delivery.po_number}
                                            data-record-id={delivery.delivery_id}
                                        >
                                            {visibleColumns.po_number && (
                                                <td className="px-4 py-3 font-medium">
                                                    <span>{delivery.po_number}</span>
                                                </td>
                                            )}
                                            {visibleColumns.supplier && (
                                                <td className="px-4 py-3">{delivery.supplier?.supplier_name ?? '—'}</td>
                                            )}
                                            {visibleColumns.delivery_date && (
                                                <td className="px-4 py-3">{formatDate(delivery.delivery_date)}</td>
                                            )}
                                            {visibleColumns.status && (
                                                <td className="px-4 py-3 text-left">
                                                    <span
                                                        className={
                                                            'px-2 py-1 rounded-full text-xs font-semibold ' +
                                                            (statusColors[delivery.status ?? ''] ?? 'bg-muted text-muted-foreground')
                                                        }
                                                    >
                                                        {delivery.status ?? '—'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-start gap-3">
                                                    {delivery.po_number && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                auditLogsHighlight(delivery.po_number, '/purchase-orders');
                                                                router.get(`/purchase-orders?highlight_search=${encodeURIComponent(delivery.po_number)}&highlight_column=po_number`);
                                                            }}
                                                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                                            title="View this in Purchase Orders"
                                                        >
                                                            <ExternalLink className="size-4" />
                                                        </button>
                                                    )}
                                                    <button type="button" onClick={() => handleEdit(delivery)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                                        <Pencil className="size-4" />
                                                    </button>
                                                    <button type="button" onClick={() => handleDelete(delivery)} className="text-red-600 hover:text-red-800" title="Archive">
                                                        <Archive className="size-4" />
                                                    </button>
                                                    <button type="button" onClick={() => handleView(delivery)} className="text-foreground hover:text-muted-foreground" title="View">
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

                    {deliveries.data.length > 0 && (
                        <div className="shrink-0">
                            <Pagination meta={deliveries} />
                        </div>
                    )}
                </div>
            </div>

            <DeliveryAddForm open={addDialogOpen} onOpenChange={setAddDialogOpen} purchaseOrders={purchaseOrders} statuses={statuses} />
            <DeliveryEditForm open={editDialogOpen} onOpenChange={setEditDialogOpen} delivery={selectedDelivery} purchaseOrders={purchaseOrders} statuses={statuses} />
            <DeliveryViewForm open={viewDialogOpen} onOpenChange={setViewDialogOpen} delivery={selectedDelivery} />
            <DeliveryDeleteModal open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} deliveryId={deliveryToDelete?.delivery_id ?? null} poNumber={deliveryToDelete?.po_number ?? null} />
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
            title: 'Deliveries',
            href: '/deliveries',
        },
    ],
};