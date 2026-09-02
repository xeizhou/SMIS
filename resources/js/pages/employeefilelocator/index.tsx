import { Head, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import EmployeeFileAddForm from '@/components/employee-file-locator/employeefileaddform';
import EmployeeFileDeleteModal from '@/components/employee-file-locator/employeefiledeletemodal';
import EmployeeFileEditForm from '@/components/employee-file-locator/employeefileeditform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SortableTable, { ColumnDef } from '@/components/table/SortableTable';
import { buildFilterUrl } from '@/lib/filterUrl';

interface EmployeeFileRecord {
    efr_id: number;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    area: string;
    status: string;
}

interface PaginatedRecords {
    data: EmployeeFileRecord[];
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
    records: PaginatedRecords;
    filters: {
        search: string | null;
        status: string | null;
        // Add the sort variables
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
    statuses: string[];
}

export default function Index({ records, filters, statuses }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<EmployeeFileRecord | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/employee-file-locator',
            buildFilterUrl({ search, status, page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        router.get(
            '/employee-file-locator',
            buildFilterUrl({ search, status: value === 'all' ? '' : value, page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleClear = () => {
        setSearch('');
        setStatus('');
        router.get(
            '/employee-file-locator',
            buildFilterUrl({ search: '', status: '', page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const openEdit = (record: EmployeeFileRecord) => {
        setSelectedRecord(record);
        setIsEditOpen(true);
    };

    const openDelete = (record: EmployeeFileRecord) => {
        setSelectedRecord(record);
        setIsDeleteOpen(true);
    };

    // 2. Define the Columns for SortableTable
    const columns: ColumnDef<EmployeeFileRecord>[] = [
        {
            key: 'last_name', // We use last_name as the sort trigger for the backend
            label: 'Name',
            sortable: true,
            width: 'w-[40%]',
            // Render perfectly formats the name
            render: (record) => `${record.last_name}, ${record.first_name}${record.middle_name ? ` ${record.middle_name}` : ''}`
        },
        { key: 'area', label: 'Area', sortable: true, width: 'w-[30%]' },
        { key: 'status', label: 'Status', sortable: true, width: 'w-[15%]' },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            width: 'w-[15%]',
            render: (record) => (
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => openEdit(record)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                    >
                        <Pencil className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => openDelete(record)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                    >
                        <Trash2 className="size-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <>
            <Head title="Employee File Locator" />

            <div className="p-4 space-y-6 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Employee File Locator
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage employee personnel file locator records.
                        </p>
                    </div>
                </div>

                {/* Filters Section */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or area"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={status} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                {statuses.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {item}
                                    </SelectItem>
                                ))}
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
                        onClick={() => setIsAddOpen(true)}
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add Employee File
                    </Button>
                </form>

                {/* 3. Drop in the new Reusable Table */}
                <SortableTable
                    data={records.data}
                    columns={columns}
                    sortField={filters.sort_field}
                    sortDirection={filters.sort_direction}
                    url="/employee-file-locator"
                    // Pass current search and status so sorting doesn't reset them!
                    currentFilters={{ search, status: status === 'all' ? '' : status }}
                    emptyMessage="No employee file records added yet."
                />

                {records.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={records} />
                    </div>
                )}
            </div>

            <EmployeeFileAddForm open={isAddOpen} onOpenChange={setIsAddOpen} />
            <EmployeeFileEditForm open={isEditOpen} onOpenChange={setIsEditOpen} record={selectedRecord} />
            <EmployeeFileDeleteModal open={isDeleteOpen} onOpenChange={setIsDeleteOpen} record={selectedRecord} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Personnel Files', href: '#' },
        { title: 'Employee File Locator', href: '/employee-file-locator' },
    ],
};