import { Head, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import Pagination from '@/components/Pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import PoLetterAddForm from '@/components/po-letter-monitoring/poletteraddform';
import PoLetterDeleteModal from '@/components/po-letter-monitoring/poletterdeletemodal';
import PoLetterEditForm from '@/components/po-letter-monitoring/polettereditform';
import PoLetterViewForm from '@/components/po-letter-monitoring/poletterviewform';
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

export default function Index({ poLetters, filters, suppliers, poNumbers }: Props) {
        const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [type, setType] = useState(filters.type ?? 'all');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPoLetter, setSelectedPoLetter] = useState<PoLetterRecord | null>(null);
    const [poLetterToDelete, setPoLetterToDelete] = useState<PoLetterRecord | null>(null);

    const runSearch = (nextStatus?: string, nextType?: string) => {
        router.get(
            '/po-letter-monitoring',
            {
                search,
                status: (nextStatus ?? status) === 'all' ? undefined : nextStatus ?? status,
                type: (nextType ?? type) === 'all' ? undefined : nextType ?? type,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
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

            <div className="p-4 space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">PO Letter Monitoring</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage and track all PO letters</p>
                    </div>
                </div>

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

                    <Button type="button" onClick={() => setAddDialogOpen(true)} className="w-full lg:w-auto" style={{ backgroundColor: '#612A35' }}>
                        Add PO Letter
                    </Button>
                </form>

                <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden"><table className="w-full text-sm">
                        <thead className="border-b" style={{ backgroundColor: '#370001' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">Reference No.</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Supplier</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">PO Number</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Type</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Status</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">PO Date</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Due Date</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {poLetters.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
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
                                        <td className="px-4 py-3 font-medium">{record.reference_no ?? '—'}</td>
                                        <td className="px-4 py-3">{record.supplier?.supplier_name ?? '—'}</td>
                                        <td className="px-4 py-3">{record.po_number}</td>
                                        <td className="px-4 py-3">{record.type_of_letter}</td>
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
                                        <td className="px-4 py-3">{formatDate(record.po_date)}</td>
                                        <td className="px-4 py-3">{formatDate(record.due_date)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" onClick={() => handleEdit(record)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button type="button" onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-800" title="Delete">
                                                    <Trash2 className="size-4" />
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
                    </table><ScrollBar orientation="horizontal" /></ScrollArea>

                {poLetters.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={poLetters} />
                    </div>
                )}
            </div>

            <PoLetterAddForm open={addDialogOpen} onOpenChange={setAddDialogOpen} suppliers={suppliers} poNumbers={poNumbers} />
            <PoLetterEditForm open={editDialogOpen} onOpenChange={setEditDialogOpen} poLetter={selectedPoLetter} suppliers={suppliers} poNumbers={poNumbers} />
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