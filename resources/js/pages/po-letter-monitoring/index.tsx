import { Head, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import Pagination from '@/components/Pagination';
import { Eye, Pencil, Search, Archive, ExternalLink, Plus } from 'lucide-react';
import { useState } from 'react';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import TableColumnsPopover from '@/components/table/TableColumnsPopover';
import TableToolbar from '@/components/table/TableToolbar';
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';
import PoLetterAddForm from '@/components/po-letter-monitoring/poletteraddform';
import PoLetterDeleteModal from '@/components/po-letter-monitoring/poletterdeletemodal';
import PoLetterEditForm from '@/components/po-letter-monitoring/polettereditform';
import PoLetterViewForm from '@/components/po-letter-monitoring/poletterviewform';
import PoLetterWorkflowModal from '@/components/po-letter-monitoring/PoLetterWorkflowModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface PoNumberOption {
    po_number: string;
    po_date?: string | null;
    supplier_id?: number | string | null;
    po_received_date?: string | null;
    due_date?: string | null;
    end_user?: string | null;
    item_description?: string | null;
}

interface PoLetterRecord {
    id: number;
    reference_no: string | null;
    supplier_id: number | null;
    po_number: string;
    po_date: string | null;
    date_received_by_supplier: string | null;
    delivery_term: string | null;
    due_date: string | null;
    office_end_user: string;
    type_of_letter: string;
    date_received_by_smu: string | null;
    date_forwarded_to_ovpad: string | null;
    received_by: string | null;
    status_of_the_letter: string;
    document_link: string | null;
    date_forwarded_to_end_user: string | null;
    remarks: string | null;
    supplier?: {
        supplier_name?: string | null;
    } | null;
    serve_po?: {
        item_description?: string | null;
    } | null;
}

interface PaginatedPoLetters {
    data: PoLetterRecord[];
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
    status: string | null;
    type: string | null;
    sort_field?: string | null;
    sort_direction?: 'asc' | 'desc' | null;
}

interface Props {
    poLetters: PaginatedPoLetters;
    filters: Filters;
    suppliers: Supplier[];
    poNumbers: PoNumberOption[];
}

function formatDate(value: string | null) {
    if (!value) {
return '—';
}

    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

const statusColors: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700',
    DISAPPROVED: 'bg-red-100 text-red-700',
};

const PO_LETTER_COLUMNS = [
    { key: 'reference_no', label: 'Reference No.', locked: true },
    { key: 'supplier', label: 'Supplier' },
    { key: 'po_number', label: 'PO Number' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'po_date', label: 'PO Date' },
    { key: 'due_date', label: 'Due Date' },
];

export default function Index({ poLetters, filters, suppliers, poNumbers }: Props) {
    const columnVisibility = useColumnVisibility({
        storageKey: 'smis_po_letter_visible_columns',
        columns: PO_LETTER_COLUMNS,
    });
    const { visibleColumns } = columnVisibility;

    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [type, setType] = useState(filters.type ?? 'all');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPoLetter, setSelectedPoLetter] = useState<PoLetterRecord | null>(null);
    const [poLetterToDelete, setPoLetterToDelete] = useState<PoLetterRecord | null>(null);

    const runSearch = (nextStatus?: string, nextType?: string, sortField = filters.sort_field, sortDirection = filters.sort_direction) => {
        router.get(
            '/po-letter-monitoring',
            {
                search,
                status: (nextStatus ?? status) === 'all' ? undefined : nextStatus ?? status,
                type: (nextType ?? type) === 'all' ? undefined : nextType ?? type,
                sort_field: sortField || undefined,
                sort_direction: sortDirection || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSort = (field: string) => {
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';
        runSearch(undefined, undefined, field, direction);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch();
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        runSearch(value, type);
    };

    const handleTypeChange = (value: string) => {
        setType(value);
        runSearch(status, value);
    };

    const handleClear = () => {
        setSearch('');
        setStatus('all');
        setType('all');

        router.get(
            '/po-letter-monitoring',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleEdit = (record: PoLetterRecord) => {
        setSelectedPoLetter(record);
        setEditDialogOpen(true);
    };

    const handleWorkflow = (record: PoLetterRecord) => {
        setSelectedPoLetter(record);
        setWorkflowDialogOpen(true);
    };

    const handleView = (record: PoLetterRecord) => {
        setSelectedPoLetter(record);
        setViewDialogOpen(true);
    };

    const handleDelete = (record: PoLetterRecord) => {
        setPoLetterToDelete(record);
        setDeleteDialogOpen(true);
    };

    return (
        <>
            <Head title="PO Letter Monitoring" />

            <div className="flex flex-col h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] p-4 sm:p-6 gap-6">
                {/* Sticky Header & Search */}
                <div className="shrink-0 relative z-30 -mx-4 -mt-4 bg-background/95 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">PO Letter Monitoring</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Manage and track all PO letters</p>
                        </div>
                    </div>

                    {/* Search & Actions */}
                    <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2 flex-1">
                            <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search PO letters"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <Select value={status} onValueChange={handleStatusChange}>
                                <SelectTrigger className={`w-[200px] ${status === 'all' ? 'text-muted-foreground' : ''}`}>
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Filter by Status</SelectItem>
                                    <SelectItem value="APPROVED">APPROVED</SelectItem>
                                    <SelectItem value="DISAPPROVED">DISAPPROVED</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={type} onValueChange={handleTypeChange}>
                                <SelectTrigger className={`w-[220px] ${type === 'all' ? 'text-muted-foreground' : ''}`}>
                                    <SelectValue placeholder="Filter by Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Filter by Type</SelectItem>
                                    <SelectItem value="EXTENSION">EXTENSION</SelectItem>
                                    <SelectItem value="WAIVER">WAIVER</SelectItem>
                                    <SelectItem value="CANCELLATION">CANCELLATION</SelectItem>
                                    <SelectItem value="REPLACEMENT/ALTERNATIVE OFFER">REPLACEMENT/ALTERNATIVE OFFER</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button type="submit" variant="secondary">Search</Button>
                            <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                        </div>

                        <Button type="button" onClick={() => setAddDialogOpen(true)} className="w-full lg:w-auto text-white shadow-sm" style={{ backgroundColor: '#612A35' }}>
                            <Plus className="mr-2 size-4" />
                            Add PO Letter
                        </Button>
                    </form>

                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <TableToolbar
                        currentCount={poLetters.data.length}
                        total={poLetters.total}
                        entityName="PO letter records"
                    >
                        <TableColumnsPopover visibility={columnVisibility} />
                    </TableToolbar>

                    <div className="flex-initial min-h-0 overflow-x-auto overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#3e0b0e] text-white/90 sticky top-0 z-20">
                                <tr>
                                    {visibleColumns.reference_no && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('reference_no')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">Reference No.</button>
                                        </th>
                                    )}
                                    {visibleColumns.supplier && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('supplier')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">Supplier</button>
                                        </th>
                                    )}
                                    {visibleColumns.po_number && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('po_number')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">PO Number</button>
                                        </th>
                                    )}
                                    {visibleColumns.type && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('type')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">Type</button>
                                        </th>
                                    )}
                                    {visibleColumns.status && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('status')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">Status</button>
                                        </th>
                                    )}
                                    {visibleColumns.po_date && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('po_date')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">PO Date</button>
                                        </th>
                                    )}
                                    {visibleColumns.due_date && (
                                        <th className="p-0 text-left font-semibold text-white">
                                            <button type="button" onClick={() => handleSort('due_date')} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">Due Date</button>
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-left font-semibold text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {poLetters.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={columnVisibility.activeCount + 1} className="px-6 py-16 text-center">
                                            <p className="text-base font-medium text-muted-foreground">No PO letters added yet.</p>
                                            <p className="mt-1 text-sm text-muted-foreground">Click <strong>&quot;Add PO Letter&quot;</strong> to create your first entry.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    poLetters.data.map((record, index) => (
                                        <AnimatedTableRow
                                            key={record.id}
                                            index={index}
                                            className="border-b transition-colors hover:bg-muted/40"
                                            data-search-0={record.reference_no}
                                            data-search-1={record.po_number}
                                            data-record-id={record.id}
                                        >
                                            {visibleColumns.reference_no && (
                                                <td className="px-4 py-3 font-medium">{record.reference_no ?? '—'}</td>
                                            )}
                                            {visibleColumns.supplier && (
                                                <td className="px-4 py-3">{record.supplier?.supplier_name ?? '—'}</td>
                                            )}
                                            {visibleColumns.po_number && (
                                                <td className="px-4 py-3">{record.po_number}</td>
                                            )}
                                            {visibleColumns.type && (
                                                <td className="px-4 py-3">{record.type_of_letter}</td>
                                            )}
                                            {visibleColumns.status && (
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={
                                                            'px-2 py-1 rounded-full text-xs font-semibold ' +
                                                            (statusColors[record.status_of_the_letter] ?? 'bg-muted text-muted-foreground')
                                                        }
                                                    >
                                                        {record.status_of_the_letter}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleColumns.po_date && (
                                                <td className="px-4 py-3">{formatDate(record.po_date)}</td>
                                            )}
                                            {visibleColumns.due_date && (
                                                <td className="px-4 py-3">{formatDate(record.due_date)}</td>
                                            )}
                                            <td className="px-4 py-3">
                                                    <div className="flex items-center justify-start gap-3">
                                                        {record.po_number && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    auditLogsHighlight(record.po_number, '/purchase-orders');
                                                                    router.get(`/purchase-orders?highlight_search=${encodeURIComponent(record.po_number)}&highlight_column=po_number`);
                                                                }}
                                                                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                                                title="View this in Purchase Orders"
                                                            >
                                                                <ExternalLink className="size-4" />
                                                            </button>
                                                        )}
                                                        <button type="button" onClick={() => handleEdit(record)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                                            <Pencil className="size-4" />
                                                        </button>
                                                        <button type="button" onClick={() => handleWorkflow(record)} className="text-blue-600 hover:text-blue-800" title="Workflow Steps">
                                                            <Plus className="size-4" />
                                                        </button>
                                                        <button type="button" onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-800" title="Archive">
                                                            <Archive className="size-4" />
                                                        </button>
                                                        <button type="button" onClick={() => handleView(record)} className="text-foreground hover:text-muted-foreground" title="View">
                                                            <Eye className="size-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </AnimatedTableRow>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                    {poLetters.data.length > 0 && (
                        <div className="shrink-0">
                            <Pagination meta={poLetters} />
                        </div>
                    )}
                </div>
            </div>

            <PoLetterAddForm open={addDialogOpen} onOpenChange={setAddDialogOpen} suppliers={suppliers} poNumbers={poNumbers} />
            <PoLetterEditForm open={editDialogOpen} onOpenChange={setEditDialogOpen} poLetter={selectedPoLetter} suppliers={suppliers} poNumbers={poNumbers} />
            <PoLetterWorkflowModal open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen} poLetter={selectedPoLetter} />
            <PoLetterViewForm open={viewDialogOpen} onOpenChange={setViewDialogOpen} poLetter={selectedPoLetter} />
            <PoLetterDeleteModal open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} poLetterId={poLetterToDelete?.id ?? null} referenceNo={poLetterToDelete?.reference_no ?? null} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Procurement',
            href: '#',
        },
        {
            title: 'PO Letter Monitoring',
            href: '/po-letter-monitoring',
        },
    ],
};