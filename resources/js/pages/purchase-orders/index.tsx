import { Head, Link, router } from '@inertiajs/react';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import PurchaseOrderAddForm from '@/components/purchase-order/poaddform';
import PurchaseOrderDeleteModal from '@/components/purchase-order/podeletemodal';
import PurchaseOrderEditForm from '@/components/purchase-order/poeditform';
import PurchaseOrderViewForm from '@/components/purchase-order/poviewform';
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
}

interface PaginatedPurchaseOrders {
    data: PurchaseOrder[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Filters {
    search: string | null;
    fund_cluster: string | null;
}

interface Props {
    purchaseOrders: PaginatedPurchaseOrders;
    filters: Filters;
    suppliers: Supplier[];
    fundClusters: FundCluster[];
    offices: Office[];
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

export default function Index({
    purchaseOrders,
    filters,
    suppliers,
    fundClusters,
    offices,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [fundCluster, setFundCluster] = useState(filters.fund_cluster ?? 'all');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);

    const runSearch = (nextFundCluster?: string) => {
        router.get(
            '/purchase-orders',
            {
                search,
                fund_cluster:
                    (nextFundCluster ?? fundCluster) === 'all'
                        ? undefined
                        : nextFundCluster ?? fundCluster,
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

    const handleFundClusterChange = (value: string) => {
        setFundCluster(value);
        runSearch(value);
    };

    const handleClear = () => {
        setSearch('');
        setFundCluster('all');

        router.get(
            '/purchase-orders',
            {},
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

    const handleDelete = (po: PurchaseOrder) => {
        setPoToDelete(po);
        setDeleteDialogOpen(true);
    };

    return (
        <>
            <Head title="Purchase Order Monitoring" />

            <div className="p-4 space-y-6 sm:p-6">
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
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
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
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All Fund Clusters" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">All Fund Clusters</SelectItem>
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

                        <Button type="submit" variant="secondary">
                            Search
                        </Button>

                        <Button type="button" variant="ghost" onClick={handleClear}>
                            Clear
                        </Button>
                    </div>

                    <Button
                        type="button"
                        onClick={() => setAddDialogOpen(true)}
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add Purchase Order
                    </Button>
                </form>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <table className="w-full text-sm">
                        <thead
                            className="border-b"
                            style={{ backgroundColor: '#370001' }}
                        >
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    PO Number
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Supplier
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    End User
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Fund Cluster
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Mode of Procurement
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    PO Date
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Due Date
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-white">
                                    PO Amount
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-white">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {purchaseOrders.data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-16 text-center">
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
                                purchaseOrders.data.map((po) => (
                                    <tr
                                        key={po.po_number}
                                        className="border-b transition-colors hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {po.po_number}
                                        </td>
                                        <td className="px-4 py-3">
                                            {po.supplier?.supplier_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {po.office?.office_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {po.fund_cluster?.fund_cluster_id ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {po.mode_of_procurement ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatDate(po.po_date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatDate(po.due_date)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {formatCurrency(po.total_amount_po)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
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
                                                    onClick={() => handleDelete(po)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {purchaseOrders.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {purchaseOrders.links.map((link, i) => (
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

            <PurchaseOrderAddForm
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                suppliers={suppliers}
                fundClusters={fundClusters}
                offices={offices}
            />

            <PurchaseOrderEditForm
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                purchaseOrder={selectedPO}
                suppliers={suppliers}
                fundClusters={fundClusters}
                offices={offices}
            />

            <PurchaseOrderViewForm
                open={viewDialogOpen}
                onOpenChange={setViewDialogOpen}
                purchaseOrder={selectedPO}
            />

            <PurchaseOrderDeleteModal
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                poNumber={poToDelete?.po_number ?? null}
            />
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