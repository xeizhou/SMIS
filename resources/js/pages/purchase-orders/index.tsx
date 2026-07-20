import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import PurchaseOrderAddForm from '@/components/purchase-order/poaddform';

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
    due_date: string | null;
    mode_of_procurement: string | null;
    total_amount_po: string | number;
    fund_cluster_id: string | null;
    supplier_id: number | null;
    end_user: string | null;
    supplier: Supplier | null;
    fundCluster: FundCluster | null;
    office: Office | null;
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
    if (value === null) return '—';

    const numeric = typeof value === 'string' ? parseFloat(value) : value;

    if (Number.isNaN(numeric)) return '—';

    return numeric.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });
}

function formatDate(value: string | null) {
    if (!value) return '—';

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
    const [dialogOpen, setDialogOpen] = useState(false);

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

    // Stubs — wire these up once the view/edit/delete flows exist.
    const handleView = (po: PurchaseOrder) => {
        console.log('view', po.po_number);
    };

    const handleEdit = (po: PurchaseOrder) => {
        console.log('edit', po.po_number);
    };

    const handleDelete = (po: PurchaseOrder) => {
        console.log('delete', po.po_number);
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
                                placeholder="Search PO #, PR #, PhilGEPS ref, supplier..."
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
                        onClick={() => setDialogOpen(true)}
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
                                            {po.fundCluster?.fund_cluster_id ?? '—'}
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
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    onClick={() => handleView(po)}
                                                >
                                                    <Eye className="size-4" />
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    onClick={() => handleEdit(po)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-red-500 hover:text-red-600"
                                                    onClick={() => handleDelete(po)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
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
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                suppliers={suppliers}
                fundClusters={fundClusters}
                offices={offices}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Property',
            href: '#',
        },
        {
            title: 'Purchase Order Monitoring',
            href: '/purchase-orders',
        },
    ],
};