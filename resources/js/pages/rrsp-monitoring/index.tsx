import { Head, Link, router } from '@inertiajs/react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import RrspAddForm from '@/components/rrsp-monitoring/rrspaddform';
import RrspDeleteModal from '@/components/rrsp-monitoring/rrspdeletemodal';
import RrspEditForm from '@/components/rrsp-monitoring/rrspeditform';
import RrspViewForm from '@/components/rrsp-monitoring/rrspviewform';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface RrspItem {
    id: number;
    itemDescription: string;
    quantity: number;
    propertyNo: string | null;
    cost: number | null;
    kindOfSemiExpendable: string | null;
    status: string | null;
    area: string | null;
}

interface RrspMonitoring {
    id: string;
    rrspNo: string;
    dateReceived: string;
    itemDescription: string;
    quantity: number;
    propertyNo: string | null;
    endUserName: string | null;
    cost: number | null;
    kindOfSemiExpendable: string | null;
    status: string | null;
    area: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    items?: RrspItem[];
}

interface PaginatedRrspMonitoring {
    data: RrspMonitoring[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Filters {
    search: string | null;
    status: string | null;
}

interface Props {
    rrspMonitorings: PaginatedRrspMonitoring;
    filters: Filters;
}

const STATUS_OPTIONS = ['SERVICEABLE', 'UNSERVICEABLE'];

function formatCurrency(value: number | null) {
    if (value === null) {
return '—';
}

    if (Number.isNaN(value)) {
return '—';
}

    return value.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });
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

export default function Index({ rrspMonitorings, filters }: Props) {
        const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRrsp, setSelectedRrsp] = useState<RrspMonitoring | null>(
        null
    );
    const [rrspToDelete, setRrspToDelete] = useState<RrspMonitoring | null>(
        null
    );

    const runSearch = (nextStatus?: string) => {
        router.get(
            '/rrsp-monitoring',
            {
                search,
                status:
                    (nextStatus ?? status) === 'all'
                        ? undefined
                        : nextStatus ?? status,
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
        runSearch(value);
    };

    const handleClear = () => {
        setSearch('');
        setStatus('all');

        router.get(
            '/rrsp-monitoring',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleEdit = (rrsp: RrspMonitoring) => {
        setSelectedRrsp(rrsp);
        setEditDialogOpen(true);
    };

    const handleView = (rrsp: RrspMonitoring) => {
        setSelectedRrsp(rrsp);
        setViewDialogOpen(true);
    };

    const handleDelete = (rrsp: RrspMonitoring) => {
        setRrspToDelete(rrsp);
        setDeleteDialogOpen(true);
    };

    return (
        <>
            <Head title="RRSP Monitoring" />

            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="relative sticky top-16 group-has-data-[collapsible=icon]/sidebar-wrapper:top-12 transition-[all] ease-linear z-30 -mx-4 -mt-4 mb-6 bg-background/95 backdrop-blur px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            RRSP Monitoring
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage and track all Report of Receipts of Semi-Expendable Property
                        </p>
                    </div>
                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                {/* Search & Actions */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search RRSP No, item, property no"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={status} onValueChange={handleStatusChange}>
                            <SelectTrigger className={`w-[200px] ${status === 'all' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="Filter by Statuses" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">Filter by Statuses</SelectItem>
                                {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
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
                        onClick={() => setAddDialogOpen(true)}
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add RRSP
                    </Button>
                </form>

                    {/* Table */}
                    <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead
                                className="border-b"
                                style={{ backgroundColor: '#370001' }}
                            >
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-white">
                                        RRSP No
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-white">
                                        Item Description
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-white">
                                        Property No
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-white">
                                        End User
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-white">
                                        Area
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-white">
                                        Date Received
                                    </th>
                                    <th className="px-4 py-3 text-center font-semibold text-white">
                                        Qty
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-white">
                                        Cost
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-white">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-center font-semibold text-white">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
    
                            {rrspMonitorings.data.length === 0 ? (
                                <tbody>
                                    <tr>
                                        <td colSpan={10} className="px-6 py-16 text-center">
                                            <p className="text-base font-medium text-muted-foreground">
                                                No RRSP records added yet.
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Click <strong>&quot;Add RRSP&quot;</strong> to create
                                                your first entry.
                                            </p>
                                        </td>
                                    </tr>
                                </tbody>
                                ) : (
                                    rrspMonitorings.data.map((rrsp) => {
                                        const itemsCount = rrsp.items?.length || 1;
                                        const firstItem = rrsp.items && rrsp.items.length > 0 ? rrsp.items[0] : null;
                                        
                                        return (
                                            <tbody key={rrsp.id} className="group border-b border-border">
                                                <tr className={'border-b border-border/50 transition-colors duration-1000 hover:bg-muted/40'} data-search-0={rrsp.propertyNo} data-search-1={rrsp.rrspNo} data-record-id={rrsp.id}>
                                                    <td className="px-4 py-3 font-medium" rowSpan={itemsCount}>
                                                        {rrsp.rrspNo}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {firstItem?.itemDescription ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {firstItem?.propertyNo ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3" rowSpan={itemsCount}>
                                                        {rrsp.endUserName ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {firstItem?.area ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3" rowSpan={itemsCount}>
                                                        {formatDate(rrsp.dateReceived)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {firstItem?.quantity ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {formatCurrency(firstItem?.cost ?? null)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {firstItem?.status ? <StatusBadge status={firstItem.status} /> : '—'}
                                                    </td>
                                                    <td className="px-4 py-3" rowSpan={itemsCount}>
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(rrsp)}
                                                                className="text-blue-600 hover:text-blue-800"
                                                                title="Edit"
                                                            >
                                                                <Pencil className="size-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(rrsp)}
                                                                className="text-red-600 hover:text-red-800"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleView(rrsp)}
                                                                className="text-foreground hover:text-muted-foreground"
                                                                title="View"
                                                            >
                                                                <Eye className="size-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {rrsp.items && rrsp.items.length > 1 && rrsp.items.slice(1).map((item) => (
                                                    <tr key={item.id} className={'border-b border-border/50 transition-colors duration-1000 hover:bg-muted/40'} data-search-0={rrsp.propertyNo} data-search-1={rrsp.rrspNo} data-record-id={rrsp.id}>
                                                        <td className="px-4 py-3">
                                                            {item.itemDescription ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {item.propertyNo ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {item.area ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {item.quantity ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {formatCurrency(item.cost ?? null)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {item.status ? <StatusBadge status={item.status} /> : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        );
                                    })
                                )}
                        </table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>

                {rrspMonitorings.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {rrspMonitorings.links.map((link, i) => (
                            <Link
                                key={i}
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

            <RrspAddForm
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
            />

            <RrspEditForm
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                rrsp={selectedRrsp}
            />

            <RrspViewForm
                open={viewDialogOpen}
                onOpenChange={setViewDialogOpen}
                rrsp={selectedRrsp}
            />

            <RrspDeleteModal
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                rrspNo={rrspToDelete?.rrspNo ?? null}
            />
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
            title: 'RRSP Monitoring',
            href: '/rrsp-monitoring',
        },
    ],
};