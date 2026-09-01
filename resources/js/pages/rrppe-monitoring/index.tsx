import { Head, Link, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Trash2, Eye } from 'lucide-react';
import React, { useState } from 'react';
import RrppeAddForm from '@/components/rrppe-monitoring/rrppe-add-form';
import RrppeDeleteModal from '@/components/rrppe-monitoring/rrppe-delete-modal';
import RrppeEditForm from '@/components/rrppe-monitoring/rrppe-edit-form';
import RrppeViewModal from '@/components/rrppe-monitoring/rrppe-view-modal';
import RrppePrintTemplate from '@/components/rrppe-monitoring/rrppeprinttemplate';
import { printComponent } from '@/lib/print-utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type RrppeItem = {
    id: number;
    itemName: string;
    itemDescription: string;
    quantity: number;
    propertyNo: string;
    cost: number | null;
    status: string | null;
    area: string | null;
    remarks: string | null;
};

export type RRPPEMonitoring = {
    id: number;
    rrppeNo: string;
    dateReceived: string;
    endUserName: string | null;
    returnBy: string | null;
    createdAt?: string;
    updatedAt?: string;
    items?: RrppeItem[];
};

export type PaginatedRRPPE = {
    data: RRPPEMonitoring[];
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
};

const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined || amount === '') {
        return '-';
    }
    const num = Number(amount);
    if (isNaN(num)) {
        return '-';
    }
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(num);
};

function formatDate(value: string | null | undefined) {
    if (!value) {
        return '—';
    }
    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function Index({ data, filters = {}, statuses, areas }: { data: PaginatedRRPPE, filters?: any, statuses: string[], areas: string[] }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [viewItem, setViewItem] = useState<RRPPEMonitoring | null>(null);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [selectedItem, setSelectedItem] = useState<RRPPEMonitoring | null>(null);

    const openAddModal = () => {
        setSelectedItem(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (item: RRPPEMonitoring) => {
        setSelectedItem(item);
        setIsEditModalOpen(true);
    };

    const handleClear = () => {
        setSearchQuery('');
        setStatusFilter('all');
        router.get('/rrppe-monitoring', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/rrppe-monitoring', { search: searchQuery, status: statusFilter }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const openViewModal = (item: RRPPEMonitoring) => {
        setViewItem(item);
        setIsViewModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handlePrint = (item: RRPPEMonitoring) => {
        printComponent(<RrppePrintTemplate rrppe={item} />);
    };

    return (
        <>
            <Head title="RRPPE Monitoring" />

            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="relative sticky top-16 group-has-data-[collapsible=icon]/sidebar-wrapper:top-12 transition-[all] ease-linear z-30 -mx-4 -mt-4 mb-6 bg-background/95 backdrop-blur px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            RRPPE Monitoring
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Track returned property, plant, and equipment receipts, statuses, and related activities.
                        </p>
                    </div>
                    <div className="bg-muted/50 text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-lg p-1">
                        <Link
                            href="/rrppe-monitoring"
                            preserveState
                            className="bg-background text-foreground shadow-sm inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            RRPPE Records
                        </Link>
                        <Link
                            href="/rrppe-monitoring/areas"
                            className="text-muted-foreground hover:text-foreground inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            Area Records
                        </Link>
                    </div>
                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search..."
                                className="pl-9 bg-white dark:bg-gray-900 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(val) => {
                            setStatusFilter(val);
                            router.get('/rrppe-monitoring', { search: searchQuery, status: val }, {
                                preserveState: true,
                                preserveScroll: true,
                                replace: true,
                            });
                        }}>
                            <SelectTrigger className={`w-[200px] bg-white dark:bg-gray-900 ${statusFilter === 'all' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="Filter by Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Filter by Statuses</SelectItem>
                                {statuses.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
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
                        onClick={openAddModal}
                        className="w-full lg:w-auto text-white"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add RRPPE
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#3e0b0e] text-white/90">
                            <tr>
                                <th className="px-4 py-3 font-medium">RRPPE No.</th>
                                <th className="px-4 py-3 font-medium">Item Name</th>
                                <th className="px-4 py-3 font-medium">Property No.</th>
                                <th className="px-4 py-3 font-medium">End User</th>
                                <th className="px-4 py-3 font-medium">Return By</th>
                                <th className="px-4 py-3 font-medium">Area</th>
                                <th className="px-4 py-3 font-medium">Date Received</th>
                                <th className="px-4 py-3 font-medium text-center">Qty</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {data.data.length > 0 ? (
                                data.data.map((item) => {
                                    const itemsCount = item.items?.length || 1;
                                    const firstItem = item.items && item.items.length > 0 ? item.items[0] : null;

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className={'transition-colors duration-1000 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'} data-search-0={firstItem?.propertyNo} data-search-1={item.rrppeNo} data-record-id={item.id}>
                                                <td className="px-4 py-3 font-medium border-b border-gray-200 dark:border-gray-800" rowSpan={itemsCount}>{item.rrppeNo}</td>
                                                <td className="px-4 py-3">{firstItem?.itemName ?? '—'}</td>
                                                <td className="px-4 py-3">{firstItem?.propertyNo ?? '—'}</td>
                                                <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-800" rowSpan={itemsCount}>{item.endUserName ?? '—'}</td>
                                                <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-800" rowSpan={itemsCount}>{item.returnBy ?? '—'}</td>
                                                <td className="px-4 py-3">{firstItem?.area ?? '—'}</td>
                                                <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-800" rowSpan={itemsCount}>{formatDate(item.dateReceived)}</td>
                                                <td className="px-4 py-3 text-center">{firstItem?.quantity ?? '—'}</td>
                                                <td className="px-4 py-3">
                                                    {firstItem?.status ? <StatusBadge status={firstItem.status} /> : '—'}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-800" rowSpan={itemsCount}>
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => openDeleteModal(item.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePrint(item)}
                                                            className="text-gray-600 hover:text-gray-800"
                                                            title="Print"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-printer"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                                                        </button>
                                                        <button onClick={() => openViewModal(item)} className="text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {item.items && item.items.length > 1 && item.items.slice(1).map((subItem) => (
                                                <tr key={subItem.id} className={'transition-colors duration-1000 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'} data-search-0={subItem.propertyNo} data-search-1={item.rrppeNo} data-record-id={item.id}>
                                                    <td className="px-4 py-3">{subItem.itemName ?? '—'}</td>
                                                    <td className="px-4 py-3">{subItem.propertyNo ?? '—'}</td>
                                                    <td className="px-4 py-3">{subItem.area ?? '—'}</td>
                                                    <td className="px-4 py-3 text-center">{subItem.quantity ?? '—'}</td>
                                                    <td className="px-4 py-3">
                                                        {subItem.status ? <StatusBadge status={subItem.status} /> : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={10} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No RRPPE added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>&quot;Add RRPPE&quot;</strong>{' '}
                                            to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {data.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={data} />
                    </div>
                )}
            </div>

            <RrppeAddForm
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                areas={areas}
            />

            <RrppeEditForm
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                item={selectedItem}
                areas={areas}
            />

            <RrppeViewModal
                open={isViewModalOpen}
                onOpenChange={setIsViewModalOpen}
                item={viewItem}
            />

            <RrppeDeleteModal 
                open={isDeleteModalOpen} 
                onOpenChange={setIsDeleteModalOpen} 
                itemId={itemToDelete} 
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Assets',
            href: '#',
        },
        {
            title: 'RRPPE Monitoring',
            href: '/rrppe-monitoring',
        },
    ],
};