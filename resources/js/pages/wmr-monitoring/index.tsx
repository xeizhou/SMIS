import { Head, router } from '@inertiajs/react';
import { Archive, Eye, Pencil, Search, Upload } from 'lucide-react';
import { useState } from 'react';
import Pagination from '@/components/Pagination';
import SortableTable from '@/components/table/SortableTable';
import type { ColumnDef } from '@/components/table/SortableTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import WmrAddForm from '@/components/wmr-monitoring/wmraddform';
import WmrDeleteModal from '@/components/wmr-monitoring/wmrdeletemodal';
import WmrEditForm from '@/components/wmr-monitoring/wmreditform';
import WmrViewForm from '@/components/wmr-monitoring/wmrviewform';
import WmrImportDialog from '@/components/wmr-monitoring/wmrimportdialog';
import { buildFilterUrl } from '@/lib/filterUrl';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface Office {
    office_code: string;
    office_name: string | null;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface WmrRecord {
    id: number;
    wmr_no: string;
    wmr_date: string;
    supplier_id: number;
    iar_no: string | null;
    iar_date: string | null;
    item_vehicle: string;
    job_order_no: string | null;
    job_order_date: string | null;
    fund_cluster_id: string | null;
    vehicle_type: string | null;
    brand_name: string | null;
    model: string | null;
    plate_no: string | null;
    serial_engine_no: string | null;
    acquisition_date: string | null;
    property_no: string | null;
    inspector_name: string | null;
    inspection_date: string | null;
    invoice_no: string | null;
    invoice_date: string | null;
    defects_complaints: string | null;
    materials: string | null;
    labor_cost: string | null;
    office_code: string | null;
    requested_by: string | null;
    received_by: string | null;
    received_date: string | null;
    remarks: string | null;
    supplier?: Supplier | null;
    office?: Office | null;
    fund_cluster?: FundCluster | null;
}

// 'YYYY-MM-DD' -> local date string without the timezone shift new Date('YYYY-MM-DD') causes
function fmtDate(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const [year, month, day] = value.slice(0, 10).split('-').map(Number);

    if (!year || !month || !day) {
        return value;
    }

    return new Date(year, month - 1, day).toLocaleDateString();
}

function fmtMoney(value: string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PaginatedRecords {
    data: WmrRecord[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Filters {
    search: string | null;
    supplier_id: string | null;
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
    per_page?: number;
}

interface Props {
    records: PaginatedRecords;
    filters: Filters;
    suppliers: Supplier[];
    offices: Office[];
    fundClusters: FundCluster[];
}

export default function Index({
    records,
    filters,
    suppliers,
    offices,
    fundClusters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [supplierId, setSupplierId] = useState(filters.supplier_id ?? 'all');
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const [selectedRecord, setSelectedRecord] = useState<WmrRecord | null>(
        null,
    );

    const updateFilters = (newSearch: string, newSupplierId: string) => {
        router.get(
            '/wmr-monitoring',
            buildFilterUrl({
                search: newSearch,
                supplier_id: newSupplierId === 'all' ? '' : newSupplierId,
                sort_field: filters.sort_field,
                sort_direction: filters.sort_direction,
                page: 1,
            }),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters(search, supplierId);
    };

    const handleSupplierChange = (value: string) => {
        setSupplierId(value);
        updateFilters(search, value);
    };

    const handleClear = () => {
        setSearch('');
        setSupplierId('all');
        router.get(
            '/wmr-monitoring',
            buildFilterUrl({ search: '', supplier_id: '', page: 1 }),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const openView = (record: WmrRecord) => {
        setSelectedRecord(record);
        setIsViewOpen(true);
    };

    const openEdit = (record: WmrRecord) => {
        setSelectedRecord(record);
        setIsEditOpen(true);
    };

    const openDelete = (record: WmrRecord) => {
        setSelectedRecord(record);
        setIsDeleteOpen(true);
    };

    const columns: ColumnDef<WmrRecord>[] = [
        {
            key: 'wmr_no',
            label: 'WMR No.',
            sortable: true,
            width: 'w-[13%]',
        },
        {
            key: 'wmr_date',
            label: 'WMR Date',
            sortable: true,
            width: 'w-[11%]',
            render: (record) => fmtDate(record.wmr_date),
        },
        {
            key: 'supplier',
            label: 'Supplier',
            sortable: false,
            width: 'w-[20%]',
            render: (record) => record.supplier?.supplier_name ?? '—',
        },
        {
            key: 'item_vehicle',
            label: 'Item / Vehicle',
            sortable: true,
            width: 'w-[22%]',
        },
        {
            key: 'job_order_no',
            label: 'Job Order No.',
            sortable: true,
            width: 'w-[13%]',
            render: (record) => record.job_order_no ?? '—',
        },
        {
            key: 'labor_cost',
            label: 'Labor Cost',
            sortable: true,
            width: 'w-[12%]',
            render: (record) => fmtMoney(record.labor_cost),
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            width: 'w-[9%]',
            render: (record) => (
                <div className="flex items-center justify-start gap-3">
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
                        title="Archive"
                    >
                        <Archive className="size-4" />
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
            ),
        },
    ];

    return (
        <>
            <Head title="WMR Monitoring" />

            <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 p-4 group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] sm:p-6">
                {/* Header & Search */}
                <div className="relative z-30 -mx-4 -mt-4 flex shrink-0 flex-col gap-4 bg-background/95 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Waste Material Reports Monitoring
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Manage WMR records.
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={handleSearch}
                        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                    >
                        <div className="flex flex-1 flex-wrap gap-2">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search WMR no, vehicle, plate, job order, invoice..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <Select
                                value={supplierId}
                                onValueChange={handleSupplierChange}
                            >
                                <SelectTrigger
                                    className={`w-[220px] ${supplierId === 'all' ? 'text-muted-foreground' : ''}`}
                                >
                                    <SelectValue placeholder="All Suppliers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Suppliers
                                    </SelectItem>
                                    {suppliers.map((supplier) => (
                                        <SelectItem
                                            key={supplier.supplier_id}
                                            value={String(supplier.supplier_id)}
                                        >
                                            {supplier.supplier_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

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

                        <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row">

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsImportOpen(true)}
                                className="w-full lg:w-auto"
                            >
                                <Upload className="mr-2 size-4" />
                                Import CSV
                            </Button>

                            <Button
                                type="button"
                                onClick={() => setIsAddOpen(true)}
                                className="w-full lg:w-auto"
                                style={{ backgroundColor: '#612A35' }}
                            >
                                Add WMR Record
                            </Button>
                        </div>
                    </form>

                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-6">
                    <SortableTable
                        data={records.data}
                        columns={columns}
                        sortField={filters.sort_field}
                        sortDirection={filters.sort_direction}
                        url="/wmr-monitoring"
                        currentFilters={{
                            search,
                            supplier_id: supplierId === 'all' ? '' : supplierId,
                        }}
                        emptyMessage="No WMR records added yet."
                        getRowId={(record) => record.id}
                    />

                    {records.data.length > 0 && (
                        <div className="shrink-0">
                            <Pagination meta={records} />
                        </div>
                    )}
                </div>
            </div>

            <WmrAddForm
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                suppliers={suppliers}
                offices={offices}
                fundClusters={fundClusters}
            />
            <WmrEditForm
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                record={selectedRecord}
                suppliers={suppliers}
                offices={offices}
                fundClusters={fundClusters}
            />
            <WmrViewForm
                open={isViewOpen}
                onOpenChange={setIsViewOpen}
                record={selectedRecord}
            />
            <WmrDeleteModal
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                record={selectedRecord}
            />

            <WmrImportDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Assets', href: '#' },
        { title: 'WMR Monitoring', href: '/wmr-monitoring' },
    ],
};