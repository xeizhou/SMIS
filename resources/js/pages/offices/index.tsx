import { Head, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { Search, Pencil, Archive, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import TableColumnsPopover from '@/components/table/TableColumnsPopover';
import TableToolbar from '@/components/table/TableToolbar';
import OfficeAddForm from '@/components/offices/officeaddform';
import OfficeDeleteModal from '@/components/offices/officedeletemodal';
import OfficeEditForm from '@/components/offices/officeeditform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SortableTable, { ColumnDef } from '@/components/table/SortableTable'; 
import { buildFilterUrl } from '@/lib/filterUrl';

interface Office {
    office_code: string;
    office_name: string;
    entity_name: string;
    office_head: string;
    email: string | null;
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

interface Filters {
    search: string | null;
    // Added these so the table can track sorting state
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
    per_page?: number;
}

interface Props {
    offices: PaginatedOffices;
    filters: Filters;
}

const OFFICE_COLUMNS = [
    { key: 'office_code', label: 'Office Code', locked: true },
    { key: 'office_name', label: 'Office Name' },
    { key: 'entity_name', label: 'Entity Name' },
    { key: 'office_head', label: 'Office Head' },
    { key: 'email', label: 'Email' },
    { key: 'actions', label: 'Actions', locked: true },
];

export default function Index({ offices, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
    const [selectedOfficeCode, setSelectedOfficeCode] = useState<string | null>(null);

    const columnVisibility = useColumnVisibility({
        storageKey: 'smis_offices_visible_columns',
        columns: OFFICE_COLUMNS,
    });
    const { visibleColumns } = columnVisibility;

    const handleDelete = (office: Office) => {
        setSelectedOfficeCode(office.office_code);
        setDeleteOpen(true);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/offices',
            buildFilterUrl({ search, page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleClear = () => {
        setSearch('');
        router.get(
            '/offices',
            buildFilterUrl({ search: '', page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    // 2. Define your columns here instead of writing raw HTML
    const columns: ColumnDef<Office>[] = [
        { key: 'office_code', label: 'Office Code', sortable: true, width: 'w-[10%]' },
        { key: 'office_name', label: 'Office Name', sortable: true, width: 'w-[25%]' },
        { key: 'entity_name', label: 'Entity Name', sortable: true, width: 'w-[20%]' },
        { key: 'office_head', label: 'Office Head', sortable: true, width: 'w-[15%]' },
        {
            key: 'email',
            label: 'Email',
            sortable: true,
            width: 'w-[20%]',
            // Use render to handle null checks
            render: (office) => office.email ?? '—', 
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            width: 'w-[10%]',
            // Use render to inject your custom action buttons
            render: (office) => (
                <div className="flex items-center justify-start gap-3">
                    <button
                        onClick={() => {
                            setSelectedOffice(office);
                            setEditOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Edit"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(office)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Archive"
                    >
                        <Archive className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="Offices" />

            <div className="flex flex-col h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] p-4 sm:p-6 gap-6">
                {/* Sticky Header & Search */}
                <div className="shrink-0 relative z-30 -mx-4 -mt-4 bg-background/95 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Offices</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Manage university offices.</p>
                        </div>
                    </div>

                    {/* Search Form */}
                    <form
                        onSubmit={handleSearch}
                        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                    >
                        <div className="flex flex-wrap gap-2 flex-1">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search offices..."
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
                            className="w-full lg:w-auto text-white shadow-sm"
                            style={{ backgroundColor: '#612A35' }}
                        >
                            <Plus className="mr-2 size-4" />
                            Add Office
                        </Button>
                    </form>

                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <TableToolbar
                        currentCount={offices.data.length}
                        total={offices.total}
                        entityName="offices"
                    >
                        <TableColumnsPopover visibility={columnVisibility} />
                    </TableToolbar>

                    {/* 3. Drop in the reusable table! */}
                    <SortableTable
                        data={offices.data}
                        columns={columns}
                        visibleColumns={visibleColumns}
                        sortField={filters.sort_field}
                        sortDirection={filters.sort_direction}
                        url="/offices"
                        currentFilters={{ search, per_page: filters.per_page }}
                        emptyMessage="No offices added yet."
                        getRowId={(office) => office.office_code}
                    />

                    {/* Pagination */}
                    {offices.data.length > 0 && (
                        <div className="shrink-0">
                            <Pagination meta={offices} />
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <OfficeAddForm open={dialogOpen} onOpenChange={setDialogOpen} />
            <OfficeEditForm open={editOpen} onOpenChange={setEditOpen} office={selectedOffice} />
            <OfficeDeleteModal open={deleteOpen} onOpenChange={setDeleteOpen} officeCode={selectedOfficeCode} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Personnel Files', href: '#' },
        { title: 'Offices', href: '/office' },
    ],
};