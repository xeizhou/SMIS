import { Head, Link, router } from '@inertiajs/react';
import { Search, Pencil, Trash2 } from 'lucide-react';
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
}

interface Filters {
    search: string | null;
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/units',
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
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add Unit
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
                                <th className="px-4 py-3 text-left font-semibold text-white">Unit Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Short Name</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
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
                                        className="border-b transition-colors hover:bg-muted/40"
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
                </div>

                {units.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {units.links.map((link, i) => (
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
            title: 'Supply Management',
            href: '#',
        },
        {
            title: 'Units',
            href: '/units',
        },
    ],
};