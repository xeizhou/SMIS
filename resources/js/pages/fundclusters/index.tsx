import { Head, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import FundClusterAddForm from '@/components/fundclusters/fundclusteraddform';
import FundClusterDeleteModal from '@/components/fundclusters/fundclusterdeletemodal';
import FundClusterEditForm from '@/components/fundclusters/fundclustereditform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SortableTable, { ColumnDef } from '@/components/table/SortableTable';

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface PaginatedFundClusters {
    data: FundCluster[];
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
    // Add sorting types
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
}

interface Props {
    fundClusters: PaginatedFundClusters;
    filters: Filters;
}

export default function Index({ fundClusters, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedFundCluster, setSelectedFundCluster] = useState<FundCluster | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [fundClusterToDelete, setFundClusterToDelete] = useState<string | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/fund-clusters',
            { search, sort_field: filters.sort_field, sort_direction: filters.sort_direction },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleClear = () => {
        setSearch('');
        router.get(
            '/fund-clusters',
            {},
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleEdit = (fundCluster: FundCluster) => {
        setSelectedFundCluster(fundCluster);
        setEditOpen(true);
    };

    const openDeleteModal = (id: string) => {
        setFundClusterToDelete(id);
        setIsDeleteModalOpen(true);
    };

    // 2. Define the Columns for SortableTable
    const columns: ColumnDef<FundCluster>[] = [
        { key: 'fund_cluster_id', label: 'Fund Cluster ID', sortable: true, width: 'w-[25%]' },
        { key: 'fund_description', label: 'Fund Description', sortable: true, width: 'w-[55%]' },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            width: 'w-[20%]',
            render: (fc) => (
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleEdit(fc)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                    >
                        <Pencil className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => openDeleteModal(fc.fund_cluster_id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                    >
                        <Trash2 className="size-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <>
            <Head title="Fund Clusters" />
            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Fund Clusters</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage fund cluster records.</p>
                    </div>
                </div>

                {/* Search */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search fund clusters..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary">Search</Button>
                        <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                    </div>
                    <Button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add Fund Cluster
                    </Button>
                </form>

                {/* 3. Drop in the new Reusable Table */}
                <SortableTable
                    data={fundClusters.data}
                    columns={columns}
                    sortField={filters.sort_field}
                    sortDirection={filters.sort_direction}
                    url="/fund-clusters"
                    currentFilters={{ search }}
                    emptyMessage="No fund clusters added yet."
                />

                {fundClusters.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={fundClusters} />
                    </div>
                )}
            </div>

            <FundClusterAddForm open={dialogOpen} onOpenChange={setDialogOpen} />
            <FundClusterEditForm open={editOpen} onOpenChange={setEditOpen} fundCluster={selectedFundCluster} />
            <FundClusterDeleteModal open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} fundClusterId={fundClusterToDelete} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Procurement', href: '#' },
        { title: 'Fund Clusters', href: '/fund-clusters' },
    ],
};