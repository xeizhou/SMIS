import { Head, Link, router } from '@inertiajs/react';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ClearanceAddForm from '@/components/clearance/clearanceaddform';
import ClearanceDeleteModal from '@/components/clearance/clearancedeletemodal';
import ClearanceEditForm from '@/components/clearance/clearanceeditform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OfficeOption {
    office_code: string;
    office_name: string;
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
}

interface PaginatedRecords {
    data: ClearanceRecord[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Props {
    records: PaginatedRecords;
    filters: {
        search: string | null;
        status: string | null;
    };
    statuses: string[];
    offices: OfficeOption[];
}

export default function Index({ records, filters, statuses, offices }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<ClearanceRecord | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        router.get('/clearance', { search, status }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);

        router.get('/clearance', { search, status: value }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleClear = () => {
        setSearch('');
        setStatus('');

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

                        <Select value={status} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Status</SelectItem>
                                {statuses.map((item) => (
                                    <SelectItem key={item} value={item}>{item}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="secondary">Search</Button>
                        <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                    </div>

                    <Button type="button" onClick={() => setIsAddOpen(true)} className="w-full lg:w-auto" style={{ backgroundColor: '#612A35' }}>
                        Add Clearance
                    </Button>
                </form>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <table className="w-full text-sm">
                        <thead className="border-b" style={{ backgroundColor: '#370001' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Office</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Claim Date</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Status</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">No clearance records added yet.</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Click <strong>"Add Clearance"</strong> to create your first record.</p>
                                    </td>
                                </tr>
                            ) : (
                                records.data.map((record) => (
                                    <tr key={record.clearance_id} className="border-b transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-3">{record.name}</td>
                                        <td className="px-4 py-3">
                                            {typeof record.office === 'string'
                                                ? record.office
                                                : record.office?.office_name ?? record.office_data?.office_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">{new Date(record.claim_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                        <td className="px-4 py-3">{record.status}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" onClick={() => openEdit(record)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button type="button" onClick={() => openDelete(record)} className="text-red-600 hover:text-red-800" title="Delete">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {records.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {records.links.map((link, index) => (
                            <Link
                                key={index}
                                href={link.url ?? '#'}
                                preserveState
                                preserveScroll
                                className={
                                    'rounded-lg border px-4 py-2 text-sm font-medium transition-colors ' +
                                    (link.active
                                        ? 'border-[#612A35] bg-[#612A35] text-white'
                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100') +
                                    (!link.url ? ' pointer-events-none opacity-40' : '')
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ClearanceAddForm open={isAddOpen} onOpenChange={setIsAddOpen} offices={offices} />
            <ClearanceEditForm open={isEditOpen} onOpenChange={setIsEditOpen} record={selectedRecord} offices={offices} />
            <ClearanceDeleteModal open={isDeleteOpen} onOpenChange={setIsDeleteOpen} record={selectedRecord} />
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