import { Head, Link, router } from '@inertiajs/react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import SupplierAddForm from '@/components/suppliers/supplieraddform';
import SupplierDeleteModal from '@/components/suppliers/supplierdeletemodal';
import SupplierEditForm from '@/components/suppliers/suppliereditform';
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
    contact_number: string | null;
    email_address: string | null;
    status: 'active' | 'inactive';
}

interface PaginatedSuppliers {
    data: Supplier[];
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
    suppliers: PaginatedSuppliers;
    filters: Filters;
}

export default function Index({
    suppliers,
    filters,
}: Props) {
        const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] =
        useState<Supplier | null>(null);

    const handleDelete = (supplier: Supplier) => {
        setSelectedSupplierId(supplier.supplier_id);
        setDeleteOpen(true);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        router.get(
            '/supplier',
            {
                search,
                status,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleClear = () => {
        setSearch('');
        setStatus('all');

        router.get(
            '/supplier',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

    return (
        <>
            <Head title="Supplier List" />

            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Supplier List
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage and monitor all suppliers
                        </p>
                    </div>
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
                                placeholder="Search suppliers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                                <Select
                                        value={status}
                                        onValueChange={(value) => {
                                            setStatus(value);

                                            router.get(
                                                '/supplier',
                                                {
                                                    search,
                                                    status: value,
                                                },
                                                {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                    replace: true,
                                                }
                                            );
                                        }}
                                    >
                                    <SelectTrigger className={`w-[180px] ${status === 'all' ? 'text-muted-foreground' : ''}`}>
                                        <SelectValue placeholder="Filter by Status" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="all">
                                            Filter by Status
                                        </SelectItem>
                                        <SelectItem value="active">
                                            Active
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            Inactive
                                        </SelectItem>
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

                    <Button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add Supplier
                    </Button>
                </form>

                {/* Supplier Table */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead
                            className="border-b"
                            style={{ backgroundColor: '#370001' }}
                        >
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    ID
                                </th>

                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Supplier Name
                                </th>

                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Contact Number
                                </th>

                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Email Address
                                </th>

                                <th className="px-4 py-3 text-center font-semibold text-white">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-white">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {suppliers.data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-16 text-center"
                                    >
                                        <p className="text-base font-medium text-muted-foreground">
                                            No suppliers added yet.
                                        </p>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click{' '}
                                            <strong>
                                                "Add Supplier"
                                            </strong>{' '}
                                            to create your first supplier.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                suppliers.data.map((supplier) => (
                                    <tr
                                        key={supplier.supplier_id}
                                        className={'border-b hover:bg-muted/40 transition-colors'} data-search-0={supplier.supplier_name} data-record-id={supplier.supplier_id}
                                    >
                                        <td className="px-4 py-3">
                                            {supplier.supplier_id}
                                        </td>

                                        <td className="px-4 py-3 font-medium">
                                            {supplier.supplier_name}
                                        </td>

                                        <td className="px-4 py-3">
                                            {supplier.contact_number ?? '—'}
                                        </td>

                                        <td className="px-4 py-3">
                                            {supplier.email_address ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={
                                                    supplier.status === 'active'
                                                        ? 'inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }
                                            >
                                                {supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSupplier(supplier);
                                                        setEditOpen(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(supplier)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {suppliers.data.length > 0 && (
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                        {suppliers.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url ?? '#'}
                                preserveScroll
                                preserveState
                                className={
                                    'px-3 py-1.5 rounded-md text-sm border transition-colors ' +
                                    (link.active
                                        ? 'bg-[#612A35] text-white border-[#612A35]'
                                        : 'bg-card text-foreground border-border hover:bg-muted/50') +
                                    (!link.url
                                        ? ' opacity-40 pointer-events-none'
                                        : '')
                                }
                                dangerouslySetInnerHTML={{
                                    __html: link.label,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <SupplierAddForm
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />

            <SupplierEditForm
                open={editOpen}
                onOpenChange={setEditOpen}
                supplier={selectedSupplier}
            />
            <SupplierDeleteModal
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                supplierId={selectedSupplierId}
            />
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
            title: 'Supplier Management',
            href: '/supplier',
        },
    ],
};