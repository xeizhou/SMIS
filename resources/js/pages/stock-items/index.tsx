import { Head, Link, router } from '@inertiajs/react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import StockItemAddForm from '@/components/stock-items/stockitemaddform';
import StockItemDeleteModal from '@/components/stock-items/stockitemdeletemodal';
import StockItemEditForm from '@/components/stock-items/stockitemeditform';
import StockItemViewForm from '@/components/stock-items/stockitemviewform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
    pivot?: {
        is_default: boolean;
    };
}

interface StockItem {
    stock_no: string;
    item_name: string;
    description: string | null;
    remarks: string | null;
    units?: Unit[];
}

interface PaginatedStockItems {
    data: StockItem[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Filters {
    search: string | null;
}

interface Props {
    stockItems: PaginatedStockItems;
    units: Unit[];
    filters: Filters;
}

export default function Index({
    stockItems,
    units,
    filters,
}: Props) {
        const [search, setSearch] = useState(filters.search ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [stockToDelete, setStockToDelete] = useState<string | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/stock-items',
            { search },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleClear = () => {
        setSearch('');
        router.get(
            '/stock-items',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleView = (stock: StockItem) => {
        setSelectedStock(stock);
        setViewOpen(true);
    };

    const handleEdit = (stock: StockItem) => {
        setSelectedStock(stock);
        setEditOpen(true);
    };

    const openDeleteModal = (stockNo: string) => {
        setStockToDelete(stockNo);
        setIsDeleteModalOpen(true);
    };

    return (
        <>
            <Head title="Stock Items" />
            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Stock Items
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage stock item inventory records.
                        </p>
                    </div>
                </div>

                {/* Search */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search stock items..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

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
                        Add Stock Item
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
                                <th className="px-4 py-3 text-left font-semibold text-white">Stock No.</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Item Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Description</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Unit(s)</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stockItems.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No stock items added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>"Add Stock Item"</strong> to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                stockItems.data.map((stock) => {
                                    return (
                                        <tr
                                            key={stock.stock_no}
                                            className={'border-b transition-colors hover:bg-muted/40'} data-search-0={stock.item_name} data-record-id={stock.stock_no}
                                        >
                                            <td className="px-4 py-3 font-medium">{stock.stock_no}</td>
                                            <td className="px-4 py-3">{stock.item_name}</td>
                                            <td className="px-4 py-3">
                                                {stock.description || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {stock.units && stock.units.length > 0 
                                                    ? stock.units.map(u => u.unit_short_name).join(', ') 
                                                    : '—'
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(stock)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="size-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteModal(stock.stock_no)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(stock)}
                                                        className="text-foreground hover:text-muted-foreground"
                                                        title="View"
                                                    >
                                                        <Eye className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {stockItems.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {stockItems.links.map((link, i) => (
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

            <StockItemAddForm
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                units={units}
            />
            <StockItemViewForm
                open={viewOpen}
                onOpenChange={setViewOpen}
                stock={selectedStock}
            />
            <StockItemEditForm
                open={editOpen}
                onOpenChange={setEditOpen}
                stock={selectedStock}
                units={units}
            />
            <StockItemDeleteModal
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                stockNo={stockToDelete}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Stock Cards',
            href: '#',
        },
        {
            title: 'Stock Items',
            href: '/stock-items',
        },
    ],
};