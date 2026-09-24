import { Head, Link, router, useForm } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { Search, Pencil, Archive } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import SortableTable, { ColumnDef } from '@/components/table/SortableTable';

interface Office {
    id: number;
    clearance_office_name: string;
}

interface PaginatedOffices {
    data: Office[];
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

interface Props {
    offices: PaginatedOffices;
    filters: {
        search: string | null;
    };
}

export default function ClearanceOffices({ offices, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);

    const addForm = useForm({ clearance_office_name: '' });
    const editForm = useForm({ clearance_office_name: '' });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/clearance/offices',
            { search },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleClear = () => {
        setSearch('');
        router.get('/clearance/offices', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const openAddModal = () => {
        addForm.reset();
        addForm.clearErrors();
        setIsAddOpen(true);
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/clearance/offices', {
            onSuccess: () => setIsAddOpen(false),
        });
    };

    const openEditModal = (office: Office) => {
        setSelectedOffice(office);
        editForm.setData('clearance_office_name', office.clearance_office_name);
        editForm.clearErrors();
        setIsEditOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOffice) return;
        editForm.put(`/clearance/offices/${selectedOffice.id}`, {
            onSuccess: () => setIsEditOpen(false),
        });
    };

    const openDeleteModal = (office: Office) => {
        setSelectedOffice(office);
        setIsDeleteOpen(true);
    };

    const handleDelete = () => {
        if (!selectedOffice) return;
        router.delete(`/clearance/offices/${selectedOffice.id}`, {
            onSuccess: () => setIsDeleteOpen(false),
        });
    };

    const columns: ColumnDef<Office>[] = [
        {
            key: 'clearance_office_name',
            label: 'Office Name',
            sortable: false,
            width: 'w-[85%]',
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            width: 'w-[15%]',
            render: (office) => (
                <div className="flex items-center justify-start gap-4">
                    <button type="button" onClick={() => openEditModal(office)} className="text-blue-600 hover:text-blue-800" title="Edit">
                        <Pencil className="size-4" />
                    </button>
                    <button type="button" onClick={() => openDeleteModal(office)} className="text-red-600 hover:text-red-800" title="Delete">
                        <Archive className="size-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="Clearance Office Settings" />

            <div className="p-4 space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Office Settings</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage the list of offices available for Clearance records.
                        </p>
                    </div>
                    <div className="bg-muted/50 text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-lg p-1">
                        <Link
                            href="/clearance"
                            className="text-muted-foreground hover:text-foreground inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            Clearance Records
                        </Link>
                        <Link
                            href="/clearance/offices"
                            preserveState
                            className="bg-background text-foreground shadow-sm inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            Office Settings
                        </Link>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search Office"
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
                        onClick={openAddModal}
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add Office
                    </Button>
                </form>

                <SortableTable
                    data={offices.data}
                    columns={columns}
                    url="/clearance/offices"
                    currentFilters={{ search }}
                    emptyMessage="No offices added yet."
                    getRowId={(office) => office.id}
                />

                {offices.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={offices} />
                    </div>
                )}
            </div>

            {/* Add Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <form onSubmit={handleAddSubmit}>
                        <DialogHeader>
                            <DialogTitle>Add New Office</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="add-name">Office Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="add-name"
                                    value={addForm.data.clearance_office_name}
                                    onChange={(e) => addForm.setData('clearance_office_name', e.target.value)}
                                    required
                                />
                                {addForm.errors.clearance_office_name && (
                                    <p className="text-sm text-destructive">{addForm.errors.clearance_office_name}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={addForm.processing}>Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader>
                            <DialogTitle>Edit Office</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-name">Office Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.data.clearance_office_name}
                                    onChange={(e) => editForm.setData('clearance_office_name', e.target.value)}
                                    required
                                />
                                {editForm.errors.clearance_office_name && (
                                    <p className="text-sm text-destructive">{editForm.errors.clearance_office_name}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={editForm.processing}>Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>Are you sure you want to delete the office <strong>{selectedOffice?.clearance_office_name}</strong>?</p>
                        <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button type="button" variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ClearanceOffices.layout = {
    breadcrumbs: [
        { title: 'Personnel Files', href: '#' },
        { title: 'Clearance', href: '/clearance' },
        { title: 'Office Settings', href: '/clearance/offices' },
    ],
};