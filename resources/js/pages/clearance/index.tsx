import { Head, Link, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { Search, Pencil, Archive, ClipboardCheck, Upload, Eye } from 'lucide-react';
import { useState } from 'react';
import ClearanceAddForm from '@/components/clearance/clearanceaddform';
import ClearanceDeleteModal from '@/components/clearance/clearancedeletemodal';
import ClearanceEditForm from '@/components/clearance/clearanceeditform';
import ClearanceImportDialog from '@/components/clearance/clearance-import-dialog';
import ClearanceProcessModal from '@/components/clearance/clearanceprocessmodal';
import ClearanceViewForm from '@/components/clearance/clearanceviewform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import SortableTable, { ColumnDef } from '@/components/table/SortableTable';

interface UserOption {
    id: number;
    name: string;
}

interface OfficeOption {
    id: number;
    clearance_office_name: string;
}

interface ClearanceRecord {
    clearance_id: number;
    name: string;
    offices: OfficeOption[];
    claim_date: string;
    received_by: string;
    status: string;
    cleared: boolean | string;
    pending: boolean | string;
    remarks: string | null;
    checker?: UserOption | null;
    checked_by_id?: number | null;
    form_attribute?: string | null;
    end_user_claim?: string | null;
}

interface PaginatedRecords {
    data: ClearanceRecord[];
    links: { url: string | null; label: string; active: boolean; }[];
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
        form_attribute: string | null;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
    statuses: string[];
    forms: string[];
    offices: OfficeOption[];
}

export default function Index({ records, filters, statuses, forms, offices }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [typeFilter, setTypeFilter] = useState(filters.form_attribute ?? 'all');
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isProcessOpen, setIsProcessOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<ClearanceRecord | null>(null);

    const updateFilters = (newSearch: string, newStatus: string, newType: string) => {
        router.get(
            '/clearance',
            {
                search: newSearch,
                status: newStatus === 'all' ? '' : newStatus,
                form_attribute: newType === 'all' ? '' : newType,
                sort_field: filters.sort_field,
                sort_direction: filters.sort_direction,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters(search, statusFilter, typeFilter);
    };

    const handleStatusChange = (value: string) => {
        setStatusFilter(value);
        updateFilters(search, value, typeFilter);
    };

    const handleTypeChange = (value: string) => {
        setTypeFilter(value);
        updateFilters(search, statusFilter, value);
    };

    const handleClear = () => {
        setSearch('');
        setStatusFilter('all');
        setTypeFilter('all');
        router.get('/clearance', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const openEdit = (record: ClearanceRecord) => {
        setSelectedRecord(record);
        setIsEditOpen(true);
    };

    const openDelete = (record: ClearanceRecord) => {
        setSelectedRecord(record);
        setIsDeleteOpen(true);
    };

    const openProcess = (record: ClearanceRecord) => {
        setSelectedRecord(record);
        setIsProcessOpen(true);
    };

    const openView = (record: ClearanceRecord) => {
        setSelectedRecord(record);
        setIsViewOpen(true);
    };

    const columns: ColumnDef<ClearanceRecord>[] = [
        { key: 'name', label: 'Name', sortable: true, width: 'w-[15%]' },
        {
            key: 'offices',
            label: 'Offices',
            sortable: false,
            width: 'w-[15%]',
            render: (record) => record.offices?.length
                ? record.offices.map((o) => o.clearance_office_name).join(', ')
                : '—'
        },
        {
            key: 'form_attribute',
            label: 'Type',
            sortable: true,
            width: 'w-[10%]',
            render: (record) => record.form_attribute ?? '—'
        },
        {
            key: 'checker', // Relation column - sorting disabled to prevent SQL errors
            label: 'Released By',
            sortable: false, 
            width: 'w-[12%]',
            render: (record) => record.checker?.name ?? '—'
        },
        {
            key: 'end_user_claim',
            label: 'Claimed By',
            sortable: true,
            width: 'w-[12%]',
            render: (record) => record.end_user_claim ?? '—'
        },
        {
            key: 'claim_date',
            label: 'Claim Date',
            sortable: true,
            width: 'w-[13%]',
            render: (record) => record.claim_date
                ? new Date(record.claim_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                : '—'
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[10%]',
            render: (record) => <StatusBadge status={record.status} />
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            width: 'w-[13%]',
            render: (record) => (
                <div className="flex items-center justify-start gap-4">
                    <button type="button" onClick={() => openEdit(record)} className="text-blue-600 hover:text-blue-800" title="Edit">
                        <Pencil className="size-4" />
                    </button>
                    {record.status !== 'Completed' && (
                        <button type="button" onClick={() => openProcess(record)} className="text-green-600 hover:text-green-800" title="Process Clearance">
                            <ClipboardCheck className="size-4" />
                        </button>
                    )}
                    <button type="button" onClick={() => openDelete(record)} className="text-red-600 hover:text-red-800" title="Archive">
                        <Archive className="size-4" />
                    </button>
                    <button type="button" onClick={() => openView(record)} className="text-muted-foreground hover:text-foreground" title="View">
                        <Eye className="size-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <>
            <Head title="Clearance" />

            <div className="p-4 space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Clearance</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage clearance records.</p>
                    </div>
                    <div className="bg-muted/50 text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-lg p-1">
                        <Link
                            href="/clearance"
                            preserveState
                            className="bg-background text-foreground shadow-sm inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            Clearance Records
                        </Link>
                        <Link
                            href="/clearance/offices"
                            className="text-muted-foreground hover:text-foreground inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            Office Settings
                        </Link>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Search by name or received by" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                        </div>

                        <Select value={statusFilter} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                {statuses.map((item) => (
                                    <SelectItem key={item} value={item}>{item}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={typeFilter} onValueChange={handleTypeChange}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {forms.map((item) => (
                                    <SelectItem key={item} value={item}>{item}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="secondary">Search</Button>
                        <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                    </div>

                    <div className="flex flex-col gap-2 w-full lg:w-auto lg:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsImportOpen(true)}
                            className="w-full lg:w-auto"
                        >
                            <Upload className="mr-2 size-4" />
                            Import
                        </Button>
                        <Button type="button" onClick={() => setIsAddOpen(true)} className="w-full lg:w-auto" style={{ backgroundColor: '#612A35' }}>
                            Add Clearance
                        </Button>
                    </div>
                </form>

                <SortableTable
                    data={records.data}
                    columns={columns}
                    sortField={filters.sort_field}
                    sortDirection={filters.sort_direction}
                    url="/clearance"
                    currentFilters={{
                        search,
                        status: statusFilter === 'all' ? '' : statusFilter,
                        form_attribute: typeFilter === 'all' ? '' : typeFilter
                    }}
                    emptyMessage="No clearance records added yet."
                    getRowId={(record) => record.clearance_id}
                />

                {records.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={records} />
                    </div>
                )}
            </div>

            <ClearanceAddForm open={isAddOpen} onOpenChange={setIsAddOpen} offices={offices} />
            <ClearanceEditForm open={isEditOpen} onOpenChange={setIsEditOpen} record={selectedRecord} offices={offices} />
            <ClearanceDeleteModal open={isDeleteOpen} onOpenChange={setIsDeleteOpen} record={selectedRecord} />
            <ClearanceProcessModal open={isProcessOpen} onOpenChange={setIsProcessOpen} record={selectedRecord} />
            <ClearanceImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
            {/* ClearanceViewForm's own record type still models a single `office`
                field, while this page's ClearanceRecord has `offices` (array) —
                see note below. Casting here until that type is reconciled. */}
            <ClearanceViewForm open={isViewOpen} onOpenChange={setIsViewOpen} record={selectedRecord as any} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Personnel Files', href: '#' },
        { title: 'Clearance', href: '/clearance' },
    ],
};