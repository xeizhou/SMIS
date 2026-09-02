import { Head, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { Search, Pencil, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import BonaVidaAddForm from '@/components/bona-vida-monitoring/bonavidaaddform';
import BonaVidaDeleteModal from '@/components/bona-vida-monitoring/bonavidadeletemodal';
import BonaVidaEditForm from '@/components/bona-vida-monitoring/bonavidaeditform';
import BonaVidaSummaryModal from '@/components/bona-vida-monitoring/bonavidasummarymodal';
import BonaVidaViewForm from '@/components/bona-vida-monitoring/bonavidaviewform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SortableTable, { ColumnDef } from '@/components/table/SortableTable';
import { buildFilterUrl } from '@/lib/filterUrl';

interface Office {
    office_code: string;
    office_name: string;
}

interface BonaVidaRecord {
    bvm_id: number;
    date_received: string;
    office_code: string;
    qty: number;
    price: string;
    total_amount: string;
    invoice_no: string;
    invoice_date: string;
    remarks: string | null;
    office?: Office;
}

interface PaginatedRecords {
    data: BonaVidaRecord[];
    links: { url: string | null; label: string; active: boolean; }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Filters {
    search: string | null;
    office_code: string | null;
    // Add sort fields
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
    per_page?: number;
}

interface Props {
    records: PaginatedRecords;
    filters: Filters;
    offices: Office[];
}

export default function Index({ records, filters, offices }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [officeCode, setOfficeCode] = useState(filters.office_code ?? 'all');
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    
    const [selectedRecord, setSelectedRecord] = useState<BonaVidaRecord | null>(null);

    const updateFilters = (newSearch: string, newOfficeCode: string) => {
        router.get(
            '/bona-vida-monitoring',
            buildFilterUrl({
                search: newSearch,
                office_code: newOfficeCode === 'all' ? '' : newOfficeCode,
                sort_field: filters.sort_field,
                sort_direction: filters.sort_direction,
                page: 1,
            }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters(search, officeCode);
    };

    const handleOfficeChange = (value: string) => {
        setOfficeCode(value);
        updateFilters(search, value);
    };

    const handleClear = () => {
        setSearch('');
        setOfficeCode('all');
        router.get(
            '/bona-vida-monitoring',
            buildFilterUrl({ search: '', office_code: '', page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const openView = (record: BonaVidaRecord) => {
        setSelectedRecord(record);
        setIsViewOpen(true);
    };

    const openEdit = (record: BonaVidaRecord) => {
        setSelectedRecord(record);
        setIsEditOpen(true);
    };

    const openDelete = (record: BonaVidaRecord) => {
        setSelectedRecord(record);
        setIsDeleteOpen(true);
    };

    // 2. Define Table Columns
    const columns: ColumnDef<BonaVidaRecord>[] = [
        {
            key: 'date_received',
            label: 'Date Received',
            sortable: true,
            width: 'w-[15%]',
            render: (record) => record.date_received ? new Date(record.date_received).toLocaleDateString() : '—'
        },
        {
            key: 'office_code', // Sorting by the FK string
            label: 'Office',
            sortable: true,
            width: 'w-[30%]',
            render: (record) => record.office?.office_name ?? record.office_code
        },
        {
            key: 'invoice_no',
            label: 'Invoice No',
            sortable: true,
            width: 'w-[20%]'
        },
        {
            key: 'total_amount',
            label: 'Total Amount',
            sortable: true,
            width: 'w-[20%]',
            render: (record) => `₱${record.total_amount}`
        },
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
                    <button
                        type="button"
                        onClick={() => openView(record)}
                        className="text-foreground hover:opacity-75"
                        title="View"
                    >
                        <Eye className="size-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <>
            <Head title="Bona Vida Monitoring" />

            <div className="p-4 space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Bona Vida Monitoring</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage Bona Vida monitoring records.</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by invoice no or remarks"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={officeCode} onValueChange={handleOfficeChange}>
                            <SelectTrigger className={`w-[180px] ${officeCode === 'all' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="All Offices" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Offices</SelectItem>
                                {offices.map((office) => (
                                    <SelectItem key={office.office_code} value={office.office_code}>
                                        {office.office_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="secondary">Search</Button>
                        <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                    </div>

                    <div className="flex flex-col gap-2 w-full lg:w-auto lg:flex-row">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsSummaryOpen(true)}
                            className="w-full lg:w-auto"
                        >
                            Summary
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setIsAddOpen(true)}
                            className="w-full lg:w-auto"
                            style={{ backgroundColor: '#612A35' }}
                        >
                            Add Bona Vida Record
                        </Button>
                    </div>
                </form>

                {/* 3. Reusable Table Component */}
                <SortableTable
                    data={records.data}
                    columns={columns}
                    sortField={filters.sort_field}
                    sortDirection={filters.sort_direction}
                    url="/bona-vida-monitoring"
                    currentFilters={{ search, office_code: officeCode === 'all' ? '' : officeCode }}
                    emptyMessage="No Bona Vida records added yet."
                />

                {records.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={records} />
                    </div>
                )}
            </div>

            <BonaVidaAddForm open={isAddOpen} onOpenChange={setIsAddOpen} offices={offices} />
            <BonaVidaEditForm open={isEditOpen} onOpenChange={setIsEditOpen} record={selectedRecord} offices={offices} />
            <BonaVidaViewForm open={isViewOpen} onOpenChange={setIsViewOpen} record={selectedRecord} />
            <BonaVidaDeleteModal open={isDeleteOpen} onOpenChange={setIsDeleteOpen} record={selectedRecord} />
            <BonaVidaSummaryModal open={isSummaryOpen} onOpenChange={setIsSummaryOpen} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Property', href: '#' },
        { title: 'Bona Vida Monitoring', href: '/bona-vida-monitoring' },
    ],
};