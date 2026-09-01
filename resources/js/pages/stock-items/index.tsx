import { Head, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Trash2, Eye, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import StockItemAddForm from '@/components/stock-items/stockitemaddform';
import StockItemDeleteModal from '@/components/stock-items/stockitemdeletemodal';
import StockItemEditForm from '@/components/stock-items/stockitemeditform';
import StockItemViewForm from '@/components/stock-items/stockitemviewform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
    pivot?: {
        is_default: boolean;
    };
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface StockItem {
    stock_no: string;
    item_name: string;
    description: string | null;
    remarks: string | null;
    fund_cluster_id?: string | null;
    fund_cluster?: FundCluster; 
    units?: Unit[];
}

interface PaginatedStockItems {
    data: StockItem[];
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
    fund_cluster_id?: string | null;
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
}

interface Props {
    stockItems: PaginatedStockItems;
    units: Unit[];
    fundClusters: FundCluster[];
    filters: Filters;
}

export default function Index({
    stockItems,
    units,
    fundClusters,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [fundClusterFilter, setFundClusterFilter] = useState(filters.fund_cluster_id ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [stockToDelete, setStockToDelete] = useState<string | null>(null);

    const handleSort = (field: string) => {
        // Toggle direction if clicking the same field, otherwise default to ascending
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            '/stock-items',
            { search, fund_cluster_id: fundClusterFilter, sort_field: field, sort_direction: direction },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/stock-items',
            { search, fund_cluster_id: fundClusterFilter, sort_field: filters.sort_field, sort_direction: filters.sort_direction },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleClear = () => {
        setSearch('');
        setFundClusterFilter('');
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

                        <Select
                            value={fundClusterFilter || 'all'}
                            onValueChange={(value) => {
                                // Convert 'all' back to an empty string so the backend clears the filter
                                const newValue = value === 'all' ? '' : value;
                                
                                setFundClusterFilter(newValue);

                                router.get(
                                    '/stock-items',
                                    {
                                        search,
                                        fund_cluster_id: newValue,
                                        sort_field: filters.sort_field,
                                        sort_direction: filters.sort_direction,
                                    },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    }
                                );
                            }}
                        >
                            <SelectTrigger className="w-[220px] text-black">
                                <SelectValue placeholder="All Fund Clusters" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">
                                    All Fund Clusters
                                </SelectItem>
                                {fundClusters.map((fc) => (
                                    <SelectItem key={fc.fund_cluster_id} value={fc.fund_cluster_id}>
                                        {fc.fund_cluster_id} - {fc.fund_description}
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
                    <Button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="w-full lg:w-auto bg-[#612A35] hover:bg-[#612A35]/90 text-white"
                    >
                        Add Stock Item
                    </Button>
                </form>

                {/* Table */}
                <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm table-fixed">
                        <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[20%]" />
                            <col className="w-[30%]" />
                            <col className="w-[20%]" />
                            <col className="w-[15%]" />
                        </colgroup>
                        <thead className="border-b">
                            <tr>
                                <th className="p-0 font-semibold text-white bg-[#370001]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                        onClick={() => handleSort('stock_no')}
                                    >
                                        Stock Number
                                    </button>
                                </th>
                                <th className="p-0 font-semibold text-white bg-[#370001]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                        onClick={() => handleSort('item_name')}
                                    >
                                        Item Name
                                    </button>
                                </th>
                                <th className="p-0 font-semibold text-white bg-[#370001]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                        onClick={() => handleSort('description')}
                                    >
                                        Description
                                    </button>
                                </th>
                                {/* Non-clickable headers still get the explicit bg-[#370001] class */}
                                <th className="px-4 py-3 text-left font-semibold text-white bg-[#370001]">
                                    Unit(s)
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-white bg-[#370001]">
                                    Actions
                                </th>
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
                                            className={'border-b transition-colors hover:bg-muted/40'} 
                                            data-search-0={stock.item_name} 
                                            data-record-id={stock.stock_no}
                                        >
                                            <td className="px-4 py-3 font-medium truncate">{stock.stock_no}</td>
                                            <td className="px-4 py-3 truncate">{stock.item_name}</td>
                                            <td className="px-4 py-3 truncate">
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
                    <div className="p-4">
                        <Pagination meta={stockItems} />
                    </div>
                )}
            </div>

            <StockItemAddForm
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                units={units}
                fundClusters={fundClusters}
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
                fundClusters={fundClusters}
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