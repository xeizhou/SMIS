import { Head, Link, router } from '@inertiajs/react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Trash, Eye } from 'lucide-react';
import { useState } from 'react';
import BonaVidaAddForm from '@/components/bona-vida-monitoring/bonavidaaddform';
import BonaVidaDeleteModal from '@/components/bona-vida-monitoring/bonavidadeletemodal';
import BonaVidaEditForm from '@/components/bona-vida-monitoring/bonavidaeditform';
import BonaVidaSummaryModal from '@/components/bona-vida-monitoring/bonavidasummarymodal';
import BonaVidaViewForm from '@/components/bona-vida-monitoring/bonavidaviewform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    invoice_no: number;
    invoice_date: string;
    remarks: string | null;
    office?: Office;
}

interface PaginatedRecords {
    data: BonaVidaRecord[];
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
        office_code: string | null;
    };
    offices: Office[];
}

export default function Index({ records, filters, offices }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [officeCode, setOfficeCode] = useState(filters.office_code ?? '');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<BonaVidaRecord | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        router.get(
            '/bona-vida-monitoring',
            { search, office_code: officeCode },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleOfficeChange = (value: string) => {
        setOfficeCode(value);

        router.get(
            '/bona-vida-monitoring',
            { search, office_code: value },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleClear = () => {
        setSearch('');
        setOfficeCode('');

        router.get(
            '/bona-vida-monitoring',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
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

    return (
        <>
            <Head title="Bona Vida Monitoring" />

            <div className="p-4 space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Bona Vida Monitoring
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage Bona Vida monitoring records.
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
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
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Offices" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Offices</SelectItem>
                                {offices.map((office) => (
                                    <SelectItem key={office.office_code} value={office.office_code}>
                                        {office.office_name}
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

                <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden"><table className="w-full text-sm">
                        <thead className="border-b" style={{ backgroundColor: '#370001' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">Date Received</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Office</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Invoice No</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Total Amount</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No Bona Vida records added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>"Add Bona Vida Record"</strong> to create your first record.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                records.data.map((record) => (
                                    <tr key={record.bvm_id} className="border-b transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-3">{record.date_received ? new Date(record.date_received).toLocaleDateString() : '—'}</td>
                                        <td className="px-4 py-3">{record.office?.office_name ?? record.office_code}</td>
                                        <td className="px-4 py-3">{record.invoice_no}</td>
                                        <td className="px-4 py-3">₱{record.total_amount}</td>
                                        <td className="px-4 py-3">
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
                                                    <Trash className="size-4" />
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table><ScrollBar orientation="horizontal" /></ScrollArea>

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
        {
            title: 'Property',
            href: '#',
        },
        {
            title: 'Bona Vida Monitoring',
            href: '/bona-vida-monitoring',
        },
    ],
};