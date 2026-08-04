import { Head, Link, router } from '@inertiajs/react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Trash2, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import ItrPtrAddForm from '@/components/itr-ptr-monitoring/itr-ptr-add-form';
import ItrPtrDeleteModal from '@/components/itr-ptr-monitoring/itr-ptr-delete-modal';
import ItrPtrEditForm from '@/components/itr-ptr-monitoring/itr-ptr-edit-form';
import ItrPtrViewModal from '@/components/itr-ptr-monitoring/itr-ptr-view-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type ITRPTRMonitoring = {
    id: number;
    transaction_no: string;
    date_release: string;
    claimed_by: string;
    from_accountable_officer: string;
    to_accountable_officer: string;
    property_no: string;
    description: string;
    amount: number;
    condition_of_ppe: string;
    location: string;
    date_received: string;
    created_at?: string;
    updated_at?: string;
};

export type PaginatedITRPTR = {
    data: ITRPTRMonitoring[];
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

export default function Index({ data = { data: [], links: [] }, filters = {} }: { data?: PaginatedITRPTR, filters?: any }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [viewItem, setViewItem] = useState<ITRPTRMonitoring | null>(null);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [conditionFilter, setConditionFilter] = useState(filters.condition_of_ppe || 'all');

    const [selectedItem, setSelectedItem] = useState<ITRPTRMonitoring | null>(null);

    const [highlightId, setHighlightId] = useState<number | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const highlight = params.get('highlight_id');
        const highlightSearch = params.get('highlight_search');

        if (highlight) {
            setHighlightId(Number(highlight));
            setTimeout(() => setHighlightId(null), 3000);
        } else if (highlightSearch && data.data) {
            const matched = data.data.find(item => item.transaction_no === highlightSearch);
            if (matched) {
                setHighlightId(matched.id);
                setTimeout(() => setHighlightId(null), 3000);
            }
        }
    }, [data.data]);

    const openAddModal = () => {
        setSelectedItem(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (item: ITRPTRMonitoring) => {
        setSelectedItem(item);
        setIsEditModalOpen(true);
    };

    const handleClear = () => {
        setSearchQuery('');
        setConditionFilter('all');
        router.get('/itr-ptr-monitoring', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/itr-ptr-monitoring', { search: searchQuery, condition_of_ppe: conditionFilter === 'all' ? undefined : conditionFilter }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const openViewModal = (item: ITRPTRMonitoring) => {
        setViewItem(item);
        setIsViewModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <>
            <Head title="ITR/PTR Monitoring" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        ITR/PTR Monitoring
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Track and manage ITR and PTR records and transactions.
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
                        <Select value={conditionFilter} onValueChange={(val) => {
                            setConditionFilter(val);
                            router.get(
                                window.location.pathname,
                                { search: searchQuery, condition_of_ppe: val === 'all' ? undefined : val },
                                { preserveState: true, preserveScroll: true, replace: true }
                            );
                        }}>
                            <SelectTrigger className={`w-full sm:w-[200px] ${conditionFilter === 'all' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="Filter by Condition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Filter by Condition</SelectItem>
                                <SelectItem value="Serviceable">Serviceable</SelectItem>
                                <SelectItem value="Unserviceable">Unserviceable</SelectItem>
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
                        Add ITR/PTR
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#3e0b0e] text-white/90">
                            <tr>
                                <th className="px-4 py-3 font-medium">Transaction No.</th>
                                
                                <th className="px-4 py-3 font-medium">Description</th>
                                <th className="px-4 py-3 font-medium">Claimed By</th>
                                
                                
                                
                                
                                
                                
                                
                                <th className="px-4 py-3 font-medium text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {data.data.length > 0 ? (
                                data.data.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        className={`transition-colors duration-1000 ${
                                            highlightId === item.id 
                                                ? 'bg-yellow-100 dark:bg-yellow-900/40' 
                                                : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                                        }`}
                                    >
                                        <td className="px-4 py-3 font-medium">{item.transaction_no}</td>
                                        
                                        <td className="px-4 py-3">{item.description}</td>
                                        <td className="px-4 py-3">{item.claimed_by}</td>
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
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No ITR/PTR added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>&quot;Add ITR/PTR&quot;</strong>{' '}
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

            <ItrPtrAddForm
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
            />

            <ItrPtrEditForm
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                item={selectedItem}
            />

            <ItrPtrViewModal
                open={isViewModalOpen}
                onOpenChange={setIsViewModalOpen}
                item={viewItem}
            />

            <ItrPtrDeleteModal 
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
            title: 'ITR/PTR Monitoring',
            href: '/itr-ptr-monitoring',
        },
    ],
};