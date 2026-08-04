import { Head, Link, router } from '@inertiajs/react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
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
    due_date: string | null;
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
        due_date: string | null;
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
}

interface Filters {
    search: string | null;
    status: string | null;
    po_number: string | null;
}

interface Props {
    deliveries: PaginatedDeliveries;
    filters: Filters;
    purchaseOrders: PurchaseOrderOption[];
    statuses: string[];
    suppliers: Supplier[];
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

export default function Index({ deliveries, filters, purchaseOrders, statuses, suppliers }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [poNumber, setPoNumber] = useState(filters.po_number ?? 'all');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);
    const [deliveryToDelete, setDeliveryToDelete] = useState<DeliveryRecord | null>(null);
    const [highlightId, setHighlightId] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const highlightSearch = params.get('highlight_search');
        
        if (highlightSearch && deliveries.data) {
            const matched = deliveries.data.find(item => item.po_number === highlightSearch);
            if (matched) {
                setHighlightId(matched.delivery_id);
                setTimeout(() => setHighlightId(null), 3000);
            }
        }
    }, [deliveries.data]);

    const runSearch = (nextStatus?: string, nextPoNumber?: string) => {
        router.get(
            '/deliveries',
            {
                search,
                status: (nextStatus ?? status) === 'all' ? undefined : nextStatus ?? status,
                po_number: (nextPoNumber ?? poNumber) === 'all' ? undefined : nextPoNumber ?? poNumber,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
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

            <div className="p-4 space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Delivery Monitoring</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage and track all deliveries</p>
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

                    <Button type="button" onClick={() => setAddDialogOpen(true)} className="w-full lg:w-auto" style={{ backgroundColor: '#612A35' }}>
                        Add Delivery
                    </Button>
                </form>

                <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden"><table className="w-full text-sm">
                        <thead className="border-b" style={{ backgroundColor: '#370001' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">PO Number</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Supplier</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Date of Delivery</th>
                                
                                <th className="px-4 py-3 text-left font-semibold text-white">Status</th>
                                
                                
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deliveries.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">No delivery records added yet.</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Click <strong>&quot;Add Delivery&quot;</strong> to create your first entry.</p>
                                    </td>
                                </tr>
                            ) : (
                                deliveries.data.map((delivery) => (
                                    <tr 
                                        key={delivery.delivery_id} 
                                        className={`border-b transition-colors duration-1000 hover:bg-muted/40 ${highlightId === delivery.delivery_id ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}
                                    >
                                        <td className="px-4 py-3 font-medium">{delivery.po_number}</td>
                                        <td className="px-4 py-3">{delivery.supplier?.supplier_name ?? '—'}</td>
                                        <td className="px-4 py-3">{formatDate(delivery.delivery_date)}</td>
                                        
                                        <td className="px-4 py-3">{delivery.status ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" onClick={() => handleEdit(delivery)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button type="button" onClick={() => handleDelete(delivery)} className="text-red-600 hover:text-red-800" title="Delete">
                                                    <Trash2 className="size-4" />
                                                </button>
                                                <button type="button" onClick={() => handleView(delivery)} className="text-foreground hover:text-muted-foreground" title="View">
                                                    <Eye className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table><ScrollBar orientation="horizontal" /></ScrollArea>

                {deliveries.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {deliveries.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url ?? '#'}
                                preserveState
                                preserveScroll
                                className={
                                    'rounded-lg border px-4 py-2 text-sm font-medium transition-colors ' +
                                    (link.active
                                        ? 'border-[#612A35] bg-[#612A35] text-white'
                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100') +
                                    (!link.url ? ' pointer-events-none opacity-40' : '')
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
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