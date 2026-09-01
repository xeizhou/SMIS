import { Head, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import OfficeAddForm from '@/components/offices/officeaddform';
import OfficeDeleteModal from '@/components/offices/officedeletemodal';
import OfficeEditForm from '@/components/offices/officeeditform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SortableTable, { ColumnDef } from '@/components/table/SortableTable'; 

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
}

interface Props {
    offices: PaginatedOffices;
    filters: Filters;
}

export default function Index({ offices, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
    const [selectedOfficeCode, setSelectedOfficeCode] = useState<string | null>(null);

    const handleDelete = (office: Office) => {
        setSelectedOfficeCode(office.office_code);
        setDeleteOpen(true);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/offices',
            { search, sort_field: filters.sort_field, sort_direction: filters.sort_direction },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleClear = () => {
        setSearch('');
        router.get(
            '/offices',
            {},
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    // 2. Define your columns here instead of writing raw HTML
    const columns: ColumnDef<Office>[] = [
        { key: 'office_code', label: 'Office Code', sortable: true, width: 'w-[15%]' },
        { key: 'office_name', label: 'Office Name', sortable: true, width: 'w-[25%]' },
        { key: 'entity_name', label: 'Entity Name', sortable: true, width: 'w-[20%]' },
        { key: 'office_head', label: 'Office Head', sortable: true, width: 'w-[20%]' },
        {
            key: 'email',
            label: 'Email',
            sortable: true,
            width: 'w-[10%]',
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
                <div className="flex items-center justify-center gap-3">
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
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="Offices" />

            <div className="p-4 space-y-6 sm:p-6">
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
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add Office
                    </Button>
                </form>

                {/* 3. Drop in the reusable table! */}
                <SortableTable
                    data={offices.data}
                    columns={columns}
                    sortField={filters.sort_field}
                    sortDirection={filters.sort_direction}
                    url="/offices"
                    currentFilters={{ search }}
                    emptyMessage="No offices added yet."
                />

                {/* Pagination */}
                {offices.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={offices} />
                    </div>
                )}
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