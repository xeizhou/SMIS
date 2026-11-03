import { Head, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import Pagination from '@/components/Pagination';
import { Search, Pencil, Archive, ChevronUp, ChevronDown, ChevronsUpDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import TableColumnsPopover from '@/components/table/TableColumnsPopover';
import TableToolbar from '@/components/table/TableToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UnitAddForm from '@/components/units/unitaddform';
import UnitDeleteModal from '@/components/units/unitdeletemodal';
import UnitEditForm from '@/components/units/uniteditform';
import { buildFilterUrl } from '@/lib/filterUrl';

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
    per_page?: number;
}

interface Props {
    units: PaginatedUnits;
    filters: Filters;
}

const UNIT_COLUMNS = [
    { key: 'unit_name', label: 'Unit Name', locked: true },
    { key: 'unit_short_name', label: 'Short Name' },
    { key: 'actions', label: 'Actions', locked: true },
];

export default function Index({ units, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState<number | null>(null);

    const columnVisibility = useColumnVisibility({
        storageKey: 'smis_units_visible_columns',
        columns: UNIT_COLUMNS,
    });
    const { visibleColumns } = columnVisibility;

    const handleSort = (field: string) => {
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';

        router.get(
            '/units',
            buildFilterUrl({ search, sort_field: field, sort_direction: direction }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/units',
            buildFilterUrl({ search, page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleClear = () => {
        setSearch('');
        router.get(
            '/units',
            buildFilterUrl({ search: '', page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
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
            <div className="flex flex-col h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] p-4 sm:p-6 gap-6">
                {/* Sticky Header & Search */}
                <div className="shrink-0 relative z-30 -mx-4 -mt-4 bg-background/95 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-4">
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
                        <div className="flex flex-col gap-2 w-full lg:w-auto lg:flex-row">
                            <Button
                                type="button"
                                onClick={() => setDialogOpen(true)}
                                className="w-full lg:w-auto bg-[#612A35] hover:bg-[#612A35]/90 text-white shadow-sm"
                            >
                                <Plus className="mr-2 size-4" />
                                Add Unit
                            </Button>
                        </div>
                    </form>

                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <TableToolbar
                        currentCount={units.data.length}
                        total={units.total}
                        entityName="units"
                    >
                        <TableColumnsPopover visibility={columnVisibility} />
                    </TableToolbar>

                    {/* Table */}
                    <div className="flex-initial min-h-0 overflow-x-auto overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="border-b sticky top-0 z-20">
                            <tr>
                                {visibleColumns.unit_name && (
                                    <th className="p-0 font-semibold text-white bg-[#370001]">
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                            onClick={() => handleSort('unit_name')}
                                        >
                                            Unit Name
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.unit_short_name && (
                                    <th className="p-0 font-semibold text-white bg-[#370001]">
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                            onClick={() => handleSort('unit_short_name')}
                                        >
                                            Short Name
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.actions && (
                                    <th className="px-4 py-3 text-left font-semibold text-white bg-[#370001]">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {units.data.length === 0 ? (
                                <tr>
                                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No units added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>"Add Unit"</strong> to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                units.data.map((unit, index) => (
                                    <AnimatedTableRow
                                        key={unit.unitID}
                                        index={index}
                                        className="border-b transition-colors hover:bg-muted/40"
                                        data-search-0={unit.unit_name}
                                        data-record-id={unit.unitID}
                                    >
                                        {visibleColumns.unit_name && <td className="px-4 py-3">{unit.unit_name}</td>}
                                        {visibleColumns.unit_short_name && <td className="px-4 py-3">{unit.unit_short_name}</td>}
                                        {visibleColumns.actions && (
                                            <td className="px-4 py-3 text-left">
                                                <div className="flex items-center justify-start gap-3">
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
                                                        title="Archive"
                                                    >
                                                        <Archive className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </AnimatedTableRow>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {units.data.length > 0 && (
                    <div className="shrink-0">
                        <Pagination meta={units} />
                    </div>
                )}
            </div>
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