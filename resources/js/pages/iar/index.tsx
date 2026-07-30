import { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Pencil, Trash2, Eye } from 'lucide-react';
import {
    Select,
    SelectTrigger,
    SelectValue,    
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import PirAddForm from '@/components/iar/piraddform';
import PirEditForm from '@/components/iar/pireditform';
import PirDeleteModal from '@/components/iar/pirdeletemodal';
import PirViewForm from '@/components/iar/pirviewform';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface Office {
    office_code: string;
    office_name: string;
    entity_name: string;
}

export interface PurchaseOrder {
    po_number: string;
    po_date: string | null;
    pr_number: string | null;
    pr_date: string | null;
    ors_burs_no: string | null;
    ors_burs_date: string | null;
    total_amount_po: number | string | null;
    fund_cluster_id: string | null;
    supplier_id: number | null;
    end_user: string | null;
    po_received_date: string | null;
    due_date: string | null;
}

export interface Pir {
    pir_id: number;
    supplier_id: number;
    po_number: string;
    unit_office: string;
    po_date: string | null;
    delivery_term: number | null;
    fund_cluster: string | FundCluster;
    fund_cluster_raw: string;
    fund_cluster_detail?: FundCluster;
    pr_number: string | null;
    pr_date: string | null;
    ors_bur_number: string | null;
    ors_bur_date: string | null;
    po_amount: number | null;
    date_forwarded_supplier: string | null;
    forwarded_by_supplier: string | null;
    claimed_by_supplier: string | null;
    supplier_signature_date: string | null;
    date_forwarded_coa: string | null;
    forwarded_by_coa: string | null;
    date_returned_from_coa: string | null;
    coa_date: string | null;
    claim_date: string | null;
    claimed_by_coa: string | null;
    date_received_by_supplier: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    delivery_receipt: string | null;
    date_completed: string | null;
    par_ics_number: string | null;
    ris_number: string | null;
    inspected_by: string | null;
    inspection_date: string | null;
    iar_number: string | null;
    date_forwarded_to_finance: string | null;
    receipt_receiving_date: string | null;
    receipt_claimed_by: string | null;
    items_receiving_date: string | null;
    items_claimed_by: string | null;
    notify_receipt: string | null;
    notify_call: string | null;
    notify_email: string | null;
    status: string;
    remarks: string | null;
    supplier: Supplier | null;
}

interface PaginatedPirs {
    data: Pir[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Filters {
    search: string | null;
    status: string | null;
}

interface Props {
    pirs: PaginatedPirs;
    suppliers: Supplier[];
    fundClusters: FundCluster[];
    offices: Office[];
    purchaseOrders: PurchaseOrder[];
    filters: Filters;
}

const statusColors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
};

function formatCurrency(amount: number | string | null | undefined) {
    if (amount === null || amount === undefined || amount === '') return '—';
    const num = Number(amount);
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(num);
}

export default function Index({
    pirs,
    suppliers,
    fundClusters,
    offices,
    purchaseOrders,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedPir, setSelectedPir] = useState<Pir | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [pirToDelete, setPirToDelete] = useState<number | null>(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [highlightId, setHighlightId] = useState<number | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const highlightSearch = params.get('highlight_search');

        if (highlightSearch && pirs.data) {
            const matched = pirs.data.find(item => item.po_number === highlightSearch || item.pr_number === highlightSearch);
            if (matched) {
                setHighlightId(matched.pir_id);
                const timer = setTimeout(() => setHighlightId(null), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [pirs.data]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/iar',
            { search, status },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleClear = () => {
        setSearch('');
        setStatus('all');
        router.get(
            '/iar',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleEdit = (pir: Pir) => {
        setSelectedPir(pir);
        setEditOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setPirToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleView = (pir: Pir) => {
        setSelectedPir(pir);
        setViewOpen(true);
    };

    return (
        <>
            <Head title="Reports Monitoring" />
            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Reports Monitoring
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Track post-procurement PO, delivery, inspection, and payment status.
                        </p>
                    </div>
                </div>

                {/* Search + Filter */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search PO, invoice, IAR, RIS no..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select
                            value={status}
                            onValueChange={(value) => {
                                setStatus(value);
                                router.get(
                                    '/iar',
                                    { search, status: value },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    }
                                );
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="secondary">
                            Search
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClear}
                        >
                            Clear
                        </Button>
                    </div>
                    <Button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add Report
                    </Button>
                </form>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-border bg-card overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead
                            className="border-b"
                            style={{ backgroundColor: '#370001' }}
                        >
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">PO No.</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Supplier</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Unit/Office</th>
                                <th className="px-4 py-3 text-right font-semibold text-white">PO Amount</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Invoice No.</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">IAR No.</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Status</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pirs.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No reports added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>"Add Report"</strong> to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                pirs.data.map((pir) => (
                                    <tr 
                                        key={pir.pir_id} 
                                        className={`transition-colors duration-1000 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${
                                            highlightId === pir.pir_id 
                                                ? 'bg-yellow-100 dark:bg-yellow-900/40' 
                                                : ''
                                        }`}
                                    >
                                        <td className="px-4 py-3">{pir.po_number}</td>
                                        <td className="px-4 py-3">{pir.supplier?.supplier_name ?? '—'}</td>
                                        <td className="px-4 py-3">{pir.unit_office}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(pir.po_amount)}</td>
                                        <td className="px-4 py-3">{pir.invoice_number ?? '—'}</td>
                                        <td className="px-4 py-3">{pir.iar_number ?? '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={
                                                    'px-2 py-1 rounded-full text-xs font-semibold ' +
                                                    (statusColors[pir.status] ?? 'bg-muted text-muted-foreground')
                                                }
                                            >
                                                {pir.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(pir)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteModal(pir.pir_id)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleView(pir)}
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

                {pirs.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {pirs.links.map((link, i) => (
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

            <PirAddForm
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                suppliers={suppliers}
                fundClusters={fundClusters}
                offices={offices}
                purchaseOrders={purchaseOrders}
            />
            <PirEditForm
                open={editOpen}
                onOpenChange={setEditOpen}
                pir={selectedPir}
                suppliers={suppliers}
                fundClusters={fundClusters}
                offices={offices}
                purchaseOrders={purchaseOrders}
            />
            <PirDeleteModal
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                pirID={pirToDelete}
            />
            <PirViewForm
                open={viewOpen}
                onOpenChange={setViewOpen}
                pir={selectedPir}
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
            title: 'PIR',
            href: '/iar',
        },
    ],
};