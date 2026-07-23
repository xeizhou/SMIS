import { Head, Link, router } from '@inertiajs/react';
import { Search, Pencil, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import PreRepairAddForm from '@/components/pre-repair-monitoring/pre-repair-add-form';
import PreRepairDeleteModal from '@/components/pre-repair-monitoring/pre-repair-delete-modal';
import PreRepairEditForm from '@/components/pre-repair-monitoring/pre-repair-edit-form';
import PreRepairViewModal from '@/components/pre-repair-monitoring/pre-repair-view-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ITRPTRMonitoring } from '@/pages/itr-ptr-monitoring/index';

export type PreRepairMonitoring = {
    id: number;
    transaction_no: string;
    pre_repair_no: string;
    from_accountable_officer: string;
    to_accountable_officer: string;
    property_no: string;
    description: string;
    amount: number;
    condition_of_ppe: string;
    location: string;
    created_at?: string;
    updated_at?: string;
};

export type PaginatedPreRepair = {
    data: PreRepairMonitoring[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
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

export default function Index({ data = { data: [], links: [] }, filters = {}, itrPtrs = [] }: { data?: PaginatedPreRepair, filters?: any, itrPtrs?: ITRPTRMonitoring[] }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [viewItem, setViewItem] = useState<PreRepairMonitoring | null>(null);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const [selectedItem, setSelectedItem] = useState<PreRepairMonitoring | null>(null);

    const openAddModal = () => {
        setSelectedItem(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (item: PreRepairMonitoring) => {
        setSelectedItem(item);
        setIsEditModalOpen(true);
    };

    const handleClear = () => {
        setSearchQuery('');
        router.get('/pre-repair-monitoring', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/pre-repair-monitoring', { search: searchQuery }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const openViewModal = (item: PreRepairMonitoring) => {
        setViewItem(item);
        setIsViewModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <>
            <Head title="Pre-Repair Monitoring" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        Pre-Repair Monitoring
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Track and manage pre-repair records and transactions.
                    </p>
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
                        Add Pre-Repair
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#3e0b0e] text-white/90">
                            <tr>
                                <th className="px-4 py-3 font-medium">Transaction No.</th>
                                <th className="px-4 py-3 font-medium">Pre-Repair No.</th>
                                <th className="px-4 py-3 font-medium">Property No.</th>
                                <th className="px-4 py-3 font-medium">Description</th>
                                <th className="px-4 py-3 font-medium">From</th>
                                <th className="px-4 py-3 font-medium">To</th>
                                <th className="px-4 py-3 font-medium">Condition</th>
                                <th className="px-4 py-3 font-medium">Location</th>
                                <th className="px-4 py-3 font-medium">Amount</th>
                                <th className="px-4 py-3 font-medium text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {data.data.length > 0 ? (
                                data.data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 font-medium">{item.transaction_no}</td>
                                        <td className="px-4 py-3">{item.pre_repair_no}</td>
                                        <td className="px-4 py-3">{item.property_no}</td>
                                        <td className="px-4 py-3">{item.description}</td>
                                        <td className="px-4 py-3">{item.from_accountable_officer}</td>
                                        <td className="px-4 py-3">{item.to_accountable_officer}</td>
                                        <td className="px-4 py-3">{item.condition_of_ppe}</td>
                                        <td className="px-4 py-3">{item.location}</td>
                                        <td className="px-4 py-3">{formatCurrency(item.amount)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => openDeleteModal(item.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => openViewModal(item)} className="text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No Pre-Repair added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>&quot;Add Pre-Repair&quot;</strong>{' '}
                                            to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {data.data.length > 0 && (
                    <div className="flex items-center justify-center gap-1 flex-wrap mt-4">
                        {data.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url ?? '#'}
                                preserveScroll
                                preserveState
                                className={
                                    'px-3 py-1.5 rounded-md text-sm border transition-colors ' +
                                    (link.active
                                        ? 'bg-[#612A35] text-white border-[#612A35]'
                                        : 'bg-card text-foreground border-border hover:bg-muted/50') +
                                    (!link.url
                                        ? ' opacity-40 pointer-events-none'
                                        : '')
                                }
                                dangerouslySetInnerHTML={{
                                    __html: link.label,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <PreRepairAddForm
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                itrPtrs={itrPtrs}
            />

            <PreRepairEditForm
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                item={selectedItem}
                itrPtrs={itrPtrs}
            />

            <PreRepairViewModal
                open={isViewModalOpen}
                onOpenChange={setIsViewModalOpen}
                item={viewItem}
            />

            {/* Delete Modal */}
            <PreRepairDeleteModal 
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
            title: 'Pre-Repair Monitoring',
            href: '/pre-repair-monitoring',
        },
    ],
};