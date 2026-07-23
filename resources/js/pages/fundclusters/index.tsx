    import { Head, Link, router } from '@inertiajs/react';
    import { Search, Pencil, Trash2} from 'lucide-react';
    import { useState } from 'react';
    import FundClusterAddForm from '@/components/fundclusters/fundclusteraddform';
    import FundClusterDeleteModal from '@/components/fundclusters/fundclusterdeletemodal';
    import FundClusterEditForm from '@/components/fundclusters/fundclustereditform';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';

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
    }

    interface Filters {
        search: string | null;
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
                { search },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        };

        const handleClear = () => {
            setSearch('');
            router.get(
                '/fund-clusters',
                {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
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

        return (
            <>
                <Head title="Fund Clusters" />
                <div className="p-4 space-y-6 sm:p-6">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Fund Clusters
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Manage fund cluster records.
                            </p>
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
                            Add Fund Cluster
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
                                    <th className="px-4 py-3 text-left font-semibold text-white">Fund Cluster ID</th>
                                    <th className="px-4 py-3 text-left font-semibold text-white">Fund Description</th>
                                    <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fundClusters.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-16 text-center">
                                            <p className="text-base font-medium text-muted-foreground">
                                                No fund clusters added yet.
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Click <strong>"Add Fund Cluster"</strong> to create your first entry.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    fundClusters.data.map((fc) => (
                                        <tr
                                            key={fc.fund_cluster_id}
                                            className="border-b transition-colors hover:bg-muted/40"
                                        >
                                            <td className="px-4 py-3">{fc.fund_cluster_id}</td>
                                            <td className="px-4 py-3">{fc.fund_description}</td>
                                            <td className="px-4 py-3 text-center">
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
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {fundClusters.data.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 p-4">
                            {fundClusters.links.map((link, i) => (
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

                <FundClusterAddForm
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                />

                <FundClusterEditForm
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    fundCluster={selectedFundCluster}
                />

                <FundClusterDeleteModal
                    open={isDeleteModalOpen}
                    onOpenChange={setIsDeleteModalOpen}
                    fundClusterId={fundClusterToDelete}
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
                title: 'Fund Clusters',
                href: '/fund-clusters',
            },
        ],
    };
