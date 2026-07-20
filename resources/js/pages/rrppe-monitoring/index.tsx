import { Head, useForm, router } from '@inertiajs/react';
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
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

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

export default function Index({ data = [], filters = {} }: { data?: RRPPEMonitoring[], filters?: any }) {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [viewItem, setViewItem] = useState<RRPPEMonitoring | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
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

    const { data: formData, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        rrppe_no: '',
        date_received: '',
        item_description: '',
        quantity: 1,
        property_no: '',
        end_user_name: '',
        cost: '',
        status: '',
        area: '',
        remarks: '',
    });

    const openAddModal = () => {
        clearErrors();
        setData({
            rrppe_no: '',
            date_received: '',
            item_description: '',
            quantity: 1,
            property_no: '',
            end_user_name: '',
            cost: '',
            status: '',
            area: '',
            remarks: '',
        });
        setEditingId(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (item: RRPPEMonitoring) => {
        clearErrors();
        setData({
            rrppe_no: item.rrppe_no,
            date_received: item.date_received,
            item_description: item.item_description,
            quantity: item.quantity,
            property_no: item.property_no,
            end_user_name: item.end_user_name || '',
            cost: item.cost ? item.cost.toString() : '',
            status: item.status || '',
            area: item.area || '',
            remarks: item.remarks || '',
        });
        setEditingId(item.id);
        setIsFormModalOpen(true);
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            put(`/rrppe-monitoring/${editingId}`, {
                onSuccess: () => setIsFormModalOpen(false),
            });
        } else {
            post('/rrppe-monitoring', {
                onSuccess: () => setIsFormModalOpen(false),
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

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                type="text"
                                placeholder="Search..."
                                className="pl-9 bg-white dark:bg-gray-900 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                            <SelectTrigger className="w-[180px] bg-white dark:bg-gray-900 hidden sm:flex">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="UNSERVICEABLE">UNSERVICEABLE</SelectItem>
                                <SelectItem value="SERVICEABLE">SERVICEABLE</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="secondary" className="bg-[#f0ece1] text-gray-800 hover:bg-[#e0dccf] border-0 hidden sm:flex">
                            Search
                        </Button>
                    </div>

                    <Button onClick={openAddModal} className="bg-[#5c1c20] hover:bg-[#4a1215] text-white w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Data
                    </Button>
                </div>

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
                            {data.length > 0 ? (
                                data.map((item) => (
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
                                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                                        No data found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit' : 'Add'} RRPPE Record</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="rrppe_no">RRPPE No. *</Label>
                            <Input
                                id="rrppe_no"
                                value={formData.rrppe_no}
                                onChange={(e) => setData('rrppe_no', e.target.value)}
                                required
                            />
                            {errors.rrppe_no && <p className="text-sm text-red-500">{errors.rrppe_no}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_received">Date Received *</Label>
                            <Input
                                id="date_received"
                                type="date"
                                value={formData.date_received}
                                onChange={(e) => setData('date_received', e.target.value)}
                                required
                            />
                            {errors.date_received && <p className="text-sm text-red-500">{errors.date_received}</p>}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="item_description">Item Description *</Label>
                            <Input
                                id="item_description"
                                value={formData.item_description}
                                onChange={(e) => setData('item_description', e.target.value)}
                                required
                            />
                            {errors.item_description && <p className="text-sm text-red-500">{errors.item_description}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={formData.quantity}
                                onChange={(e) => setData('quantity', parseInt(e.target.value))}
                                required
                            />
                            {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="property_no">Property No. *</Label>
                            <Input
                                id="property_no"
                                value={formData.property_no}
                                onChange={(e) => setData('property_no', e.target.value)}
                                required
                            />
                            {errors.property_no && <p className="text-sm text-red-500">{errors.property_no}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end_user_name">End User Name</Label>
                            <Input
                                id="end_user_name"
                                value={formData.end_user_name}
                                onChange={(e) => setData('end_user_name', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cost">Cost</Label>
                            <Input
                                id="cost"
                                type="number"
                                step="0.01"
                                value={formData.cost}
                                onChange={(e) => setData('cost', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(value) => setData('status', value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                    <SelectItem value="UNSERVICEABLE">UNSERVICEABLE</SelectItem>
                                    <SelectItem value="SERVICEABLE">SERVICEABLE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area">Area</Label>
                            <Input
                                id="area"
                                value={formData.area}
                                onChange={(e) => setData('area', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="remarks">Remarks</Label>
                            <Input
                                id="remarks"
                                value={formData.remarks}
                                onChange={(e) => setData('remarks', e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing} className="bg-[#5c1c20] hover:bg-[#4a1215] text-white">
                                {editingId ? 'Update' : 'Save'} Record
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

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