import { Head, Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Pencil, Trash2, Eye } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import RrppeForm from '@/components/rrppe-monitoring/rrppe-form';

export type RRPPEMonitoring = {
    id: number;
    rrppe_no: string;
    date_received: string;
    item_description: string;
    quantity: number;
    property_no: string;
    end_user_name: string | null;
    cost: number | null;
    status: string | null;
    area: string | null;
    remarks: string | null;
    created_at?: string;
    updated_at?: string;
};

const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined || amount === '') return '-';
    const num = Number(amount);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(num);
};

export type PaginatedRRPPE = {
    data: RRPPEMonitoring[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
};

export default function Index({ data, filters = {} }: { data: PaginatedRRPPE, filters?: any }) {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [viewItem, setViewItem] = useState<RRPPEMonitoring | null>(null);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get('/rrppe-monitoring', { search: searchQuery, status: statusFilter }, {
                preserveState: true,
                replace: true,
            });
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, statusFilter]);

    const [selectedItem, setSelectedItem] = useState<RRPPEMonitoring | null>(null);

    const openAddModal = () => {
        setSelectedItem(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (item: RRPPEMonitoring) => {
        setSelectedItem(item);
        setIsFormModalOpen(true);
    };

    const handleClear = () => {
        setSearchQuery('');
        setStatusFilter('all');
        router.get('/rrppe-monitoring', {}, { preserveState: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/rrppe-monitoring', { search: searchQuery, status: statusFilter }, {
            preserveState: true,
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

    const confirmDelete = () => {
        if (itemToDelete) {
            router.delete(`/rrppe-monitoring/${itemToDelete}`, {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                }
            });
        }
    };

    return (
        <>
            <Head title="RRPPE Monitoring" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        RRPPE Monitoring
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Track returned property, plant, and equipment receipts, statuses, and related activities.
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
                        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                            <SelectTrigger className="w-[200px] bg-white dark:bg-gray-900">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="UNSERVICEABLE">UNSERVICEABLE</SelectItem>
                                <SelectItem value="SERVICEABLE">SERVICEABLE</SelectItem>
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
                                <th className="px-4 py-3 font-medium">Date Received</th>
                                <th className="px-4 py-3 font-medium">Item Description</th>
                                <th className="px-4 py-3 font-medium">Qty.</th>
                                <th className="px-4 py-3 font-medium">Property No.</th>
                                <th className="px-4 py-3 font-medium">End User</th>
                                <th className="px-4 py-3 font-medium">Cost</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Area</th>
                                <th className="px-4 py-3 font-medium">Remarks</th>
                                <th className="px-4 py-3 font-medium text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {data.data.length > 0 ? (
                                data.data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3">{item.rrppe_no}</td>
                                        <td className="px-4 py-3">{item.date_received}</td>
                                        <td className="px-4 py-3">{item.item_description}</td>
                                        <td className="px-4 py-3">{item.quantity}</td>
                                        <td className="px-4 py-3">{item.property_no}</td>
                                        <td className="px-4 py-3">{item.end_user_name}</td>
                                        <td className="px-4 py-3">{formatCurrency(item.cost)}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{item.area}</td>
                                        <td className="px-4 py-3">{item.remarks}</td>
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
                                    <td colSpan={11} className="px-6 py-16 text-center">
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

            <RrppeForm
                open={isFormModalOpen}
                onOpenChange={setIsFormModalOpen}
                item={selectedItem}
            />

            {/* View Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>View RRPPE Record</DialogTitle>
                    </DialogHeader>
                    {viewItem && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 py-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500">RRPPE No.</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{viewItem.rrppe_no}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500">Date Received</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{viewItem.date_received}</p>
                            </div>
                            <div className="md:col-span-2">
                                <h4 className="text-sm font-semibold text-gray-500">Item Description</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{viewItem.item_description}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500">Quantity</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{viewItem.quantity}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500">Property No.</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{viewItem.property_no}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500">End User Name</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{viewItem.end_user_name || '-'}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500">Cost</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{formatCurrency(viewItem.cost)}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500">Status</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{viewItem.status || '-'}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500">Area</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{viewItem.area || '-'}</p>
                            </div>
                            <div className="md:col-span-2">
                                <h4 className="text-sm font-semibold text-gray-500">Remarks</h4>
                                <p className="mt-1 text-gray-900 dark:text-gray-100">{viewItem.remarks || '-'}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-gray-700 dark:text-gray-300">
                            Are you sure you want to delete this record? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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