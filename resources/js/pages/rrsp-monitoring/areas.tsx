import { Head, Link, router, useForm } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Trash2 } from 'lucide-react';
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

interface Area {
    id: number;
    name: string;
}

interface PaginatedAreas {
    data: Area[];
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
    areas: PaginatedAreas;
    filters: {
        search: string | null;
    };
}

export default function Areas({ areas, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    
    // Modal state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);

    const addForm = useForm({
        name: '',
    });

    const editForm = useForm({
        name: '',
    });

    const runSearch = () => {
        router.get(
            '/rrsp-monitoring/areas',
            { search },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch();
    };

    const openAddModal = () => {
        addForm.reset();
        addForm.clearErrors();
        setIsAddOpen(true);
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/rrsp-monitoring/areas', {
            onSuccess: () => setIsAddOpen(false),
        });
    };

    const openEditModal = (area: Area) => {
        setSelectedArea(area);
        editForm.setData('name', area.name);
        editForm.clearErrors();
        setIsEditOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedArea) return;
        editForm.put(`/rrsp-monitoring/areas/${selectedArea.id}`, {
            onSuccess: () => setIsEditOpen(false),
        });
    };

    const openDeleteModal = (area: Area) => {
        setSelectedArea(area);
        setIsDeleteOpen(true);
    };

    const handleDelete = () => {
        if (!selectedArea) return;
        router.delete(`/rrsp-monitoring/areas/${selectedArea.id}`, {
            onSuccess: () => setIsDeleteOpen(false),
        });
    };

    return (
        <>
            <Head title="RRSP Area Records" />

            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="relative sticky top-16 group-has-data-[collapsible=icon]/sidebar-wrapper:top-12 transition-[all] ease-linear z-30 -mx-4 -mt-4 mb-6 bg-background/95 backdrop-blur px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Area Settings
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage the list of areas available for RRSP Records.
                        </p>
                    </div>
                    <div className="bg-muted/50 text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-lg p-1">
                        <Link
                            href="/rrsp-monitoring"
                            className="text-muted-foreground hover:text-foreground inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            RRSP Records
                        </Link>
                        <Link
                            href="/rrsp-monitoring/areas"
                            preserveState
                            className="bg-background text-foreground shadow-sm inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            Area Settings
                        </Link>
                    </div>
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                {/* Search & Actions */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search Area"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary">Search</Button>
                        {search && (
                            <Button type="button" variant="ghost" onClick={() => { setSearch(''); router.get('/rrsp-monitoring/areas'); }}>
                                Clear
                            </Button>
                        )}
                    </form>
                    <Button onClick={openAddModal} style={{ backgroundColor: '#612A35' }}>
                        + Add Area
                    </Button>
                </div>

                {/* Table */}
                <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b" style={{ backgroundColor: '#370001' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">ID</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Area Name</th>
                                <th className="px-4 py-3 text-center font-semibold text-white w-32">Actions</th>
                            </tr>
                        </thead>
                        {areas.data.length === 0 ? (
                            <tbody>
                                <tr>
                                    <td colSpan={3} className="px-6 py-16 text-center text-muted-foreground">
                                        No area records found.
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            <tbody>
                                {areas.data.map((area) => (
                                    <tr key={area.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                                        <td className="px-4 py-3">{area.id}</td>
                                        <td className="px-4 py-3 font-medium">{area.name}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button onClick={() => openEditModal(area)} className="text-blue-600 hover:text-blue-800">
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button onClick={() => openDeleteModal(area)} className="text-red-600 hover:text-red-800">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {areas.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={areas} />
                    </div>
                )}
            </div>

            {/* Add Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <form onSubmit={handleAddSubmit}>
                        <DialogHeader>
                            <DialogTitle>Add New Area</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="add-name">Area Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="add-name"
                                    value={addForm.data.name}
                                    onChange={(e) => addForm.setData('name', e.target.value)}
                                    required
                                />
                                {addForm.errors.name && <p className="text-sm text-destructive">{addForm.errors.name}</p>}
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
                            <DialogTitle>Edit Area</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-name">Area Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    required
                                />
                                {editForm.errors.name && <p className="text-sm text-destructive">{editForm.errors.name}</p>}
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
                        <p>Are you sure you want to delete the area <strong>{selectedArea?.name}</strong>?</p>
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

Areas.layout = {
    breadcrumbs: [
        { title: 'Property', href: '#' },
        { title: 'RRSP Monitoring', href: '/rrsp-monitoring' },
        { title: 'Area Settings', href: '/rrsp-monitoring/areas' },
    ],
};
