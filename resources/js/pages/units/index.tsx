import { Head, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UnitAddForm from '@/components/units/unitaddform';
import UnitDeleteModal from '@/components/units/unitdeletemodal';
import UnitEditForm from '@/components/units/uniteditform';

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
}

interface PaginatedUnits {
    data: Unit[];
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
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
}

interface Props {
    units: PaginatedUnits;
    filters: Filters;
}

export default function Index({ units, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState<number | null>(null);

    const handleSort = (field: string) => {
        // Toggle direction if clicking the same field, otherwise default to ascending
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            '/units',
            { search, sort_field: field, sort_direction: direction },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/units',
            { search, sort_field: filters.sort_field, sort_direction: filters.sort_direction },
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
            '/units',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleEdit = (unit: Unit) => {
        setSelectedUnit(unit);
        setEditOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setUnitToDelete(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <>
            <Head title="Units" />
            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Units
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage unit of measure records.
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
                                placeholder="Search units..."
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
                        className="w-full lg:w-auto bg-[#612A35] hover:bg-[#612A35]/90 text-white"
                    >
                        Add Unit
                    </Button>
                </form>

                {/* Table */}
                <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b">
                            <tr>
                                <th className="p-0 font-semibold text-white bg-[#370001]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                        onClick={() => handleSort('unit_name')}
                                    >
                                        Unit Name
                                    </button>
                                </th>
                                <th className="p-0 font-semibold text-white bg-[#370001]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                        onClick={() => handleSort('unit_short_name')}
                                    >
                                        Short Name
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-white bg-[#370001]">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {units.data.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No units added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>"Add Unit"</strong> to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                units.data.map((unit) => (
                                    <tr
                                        key={unit.unitID}
                                        className={'border-b transition-colors hover:bg-muted/40'} 
                                        data-search-0={unit.unit_name} 
                                        data-record-id={unit.unitID}
                                    >
                                        <td className="px-4 py-3">{unit.unit_name}</td>
                                        <td className="px-4 py-3">{unit.unit_short_name}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(unit)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteModal(unit.unitID)}
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
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {units.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={units} />
                    </div>
                )}
            </div>

            <UnitAddForm
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
            <UnitEditForm
                open={editOpen}
                onOpenChange={setEditOpen}
                unit={selectedUnit}
            />
            <UnitDeleteModal
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                unitID={unitToDelete}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {   
            title: 'Stock Cards',
            href: '#',
        },
        {
            title: 'Units',
            href: '/units',
        },
    ],
};