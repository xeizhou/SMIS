import { Head, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import ClearanceAddForm from '@/components/clearance/clearanceaddform';
import ClearanceDeleteModal from '@/components/clearance/clearancedeletemodal';
import ClearanceEditForm from '@/components/clearance/clearanceeditform';
import ClearanceProcessModal from '@/components/clearance/clearanceprocessmodal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { ClipboardCheck } from 'lucide-react';

interface OfficeOption {
    office_code: string;
    office_name: string;
}

interface UserOption {
    id: number;
    name: string;
}

interface ClearanceRecord {
    clearance_id: number;
    name: string;
    office: string | OfficeOption;
    claim_date: string;
    received_by: string;
    status: string;
    cleared: boolean | string;
    pending: boolean | string;
    remarks: string | null;
    office_data?: OfficeOption | null;
    checker?: UserOption | null;
    checked_by_id?: number | null;
    form_attribute?: string | null;
    end_user_claim?: string | null;
}

interface PaginatedRecords {
    data: ClearanceRecord[];
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
        form_attribute: string | null;
    };
    statuses: string[];
    forms: string[];
    offices: OfficeOption[];
}

export default function Index({ records, filters, statuses, forms, offices }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [categoryFilter, setCategoryFilter] = useState(() => {
        if (filters.status) return `status:${filters.status}`;
        if (filters.form_attribute) return `type:${filters.form_attribute}`;
        return 'all';
    });
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isProcessOpen, setIsProcessOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<ClearanceRecord | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        let newStatus = '';
        let newForm = '';
        if (categoryFilter.startsWith('status:')) {
            newStatus = categoryFilter.replace('status:', '');
        } else if (categoryFilter.startsWith('type:')) {
            newForm = categoryFilter.replace('type:', '');
        }

        router.get('/clearance', { search, status: newStatus, form_attribute: newForm }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleCategoryChange = (value: string) => {
        setCategoryFilter(value);

        let newStatus = '';
        let newForm = '';
        if (value.startsWith('status:')) {
            newStatus = value.replace('status:', '');
        } else if (value.startsWith('type:')) {
            newForm = value.replace('type:', '');
        }

        router.get('/clearance', { search, status: newStatus, form_attribute: newForm }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleClear = () => {
        setSearch('');
        setCategoryFilter('all');

        router.get('/clearance', {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
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

    return (
        <>
            <Head title="Clearance" />

            <div className="p-4 space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Clearance</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage clearance records.</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Search by name or received by" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                        </div>

                        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {statuses.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Status</SelectLabel>
                                        {statuses.map((item) => (
                                            <SelectItem key={`status:${item}`} value={`status:${item}`}>{item}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                                {forms.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Type</SelectLabel>
                                        {forms.map((item) => (
                                            <SelectItem key={`type:${item}`} value={`type:${item}`}>{item}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="secondary">Search</Button>
                        <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                    </div>

                    <Button type="button" onClick={() => setIsAddOpen(true)} className="w-full lg:w-auto" style={{ backgroundColor: '#612A35' }}>
                        Add Clearance
                    </Button>
                </form>

                <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden"><table className="w-full text-sm">
                        <thead className="border-b" style={{ backgroundColor: '#370001' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Office</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Type</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Released By</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Claimed By</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Claim Date</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Status</th>
                                <th className="w-[180px] px-4 py-3 text-left font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">No clearance records added yet.</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Click <strong>"Add Clearance"</strong> to create your first record.</p>
                                    </td>
                                </tr>
                            ) : (
                                records.data.map((record) => (
                                    <tr key={record.clearance_id} className={'border-b transition-colors hover:bg-muted/40'} data-search-0={record.name} data-record-id={record.clearance_id}>
                                        <td className="px-4 py-3">{record.name}</td>
                                        <td className="px-4 py-3">
                                            {typeof record.office === 'string'
                                                ? record.office
                                                : record.office?.office_name ?? record.office_data?.office_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">{record.form_attribute ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            {record.checker?.name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.end_user_claim ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.claim_date ? new Date(record.claim_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-start gap-4">
                                                <button type="button" onClick={() => openEdit(record)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button type="button" onClick={() => openDelete(record)} className="text-red-600 hover:text-red-800" title="Delete">
                                                    <Trash2 className="size-4" />
                                                </button>
                                                {record.status !== 'Completed' && (
                                                    <button type="button" onClick={() => openProcess(record)} className="text-green-600 hover:text-green-800" title="Process Clearance">
                                                        <ClipboardCheck className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table><ScrollBar orientation="horizontal" /></ScrollArea>

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
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Personnel Files',
            href: '#',
        },
        {
            title: 'Clearance',
            href: '/clearance',
        },
    ],
};