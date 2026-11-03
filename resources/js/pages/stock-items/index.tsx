import { Head, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import Pagination from '@/components/Pagination';
import { Search, Pencil, Archive, Eye, ChevronUp, ChevronDown, ChevronsUpDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import TableColumnsPopover from '@/components/table/TableColumnsPopover';
import TableToolbar from '@/components/table/TableToolbar';
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
import { buildFilterUrl } from '@/lib/filterUrl';

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
    is_pending_setup?: boolean;
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
    per_page?: number;
    needs_attention?: boolean;
}

interface Props {
    stockItems: PaginatedStockItems;
    units: Unit[];
    fundClusters: FundCluster[];
    filters: Filters;
}

const STOCK_ITEM_COLUMNS = [
    { key: 'stock_no', label: 'Stock Number', locked: true },
    { key: 'item_name', label: 'Item Name' },
    { key: 'description', label: 'Description' },
    { key: 'units', label: 'Unit(s)' },
    { key: 'actions', label: 'Actions', locked: true },
];

export default function Index({
    stockItems,
    units,
    fundClusters,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [fundClusterFilter, setFundClusterFilter] = useState(filters.fund_cluster_id ?? '');
    const [needsAttention, setNeedsAttention] = useState(filters.needs_attention ?? false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [stockToDelete, setStockToDelete] = useState<string | null>(null);

    const columnVisibility = useColumnVisibility({
        storageKey: 'smis_stock_items_visible_columns',
        columns: STOCK_ITEM_COLUMNS,
    });
    const { visibleColumns } = columnVisibility;

    const handleSort = (field: string) => {
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';

        router.get(
            '/stock-items',
            buildFilterUrl({ search, fund_cluster_id: fundClusterFilter, needs_attention: needsAttention, sort_field: field, sort_direction: direction }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/stock-items',
            buildFilterUrl({ search, fund_cluster_id: fundClusterFilter, needs_attention: needsAttention, page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleClear = () => {
        setSearch('');
        setFundClusterFilter('');
        setNeedsAttention(false);
        router.get(
            '/stock-items',
            buildFilterUrl({ search: '', fund_cluster_id: '', needs_attention: false, page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleToggleNeedsAttention = () => {
        const next = !needsAttention;
        setNeedsAttention(next);
        router.get(
            '/stock-items',
            buildFilterUrl({ search, fund_cluster_id: fundClusterFilter, needs_attention: next, page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
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
            <div className="flex flex-col h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] p-4 sm:p-6 gap-6">
                {/* Sticky Header & Search */}
                <div className="shrink-0 relative z-30 -mx-4 -mt-4 bg-background/95 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-4">
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
                                    const newValue = value === 'all' ? '' : value;
                                    setFundClusterFilter(newValue);

                                    router.get(
                                        '/stock-items',
                                        buildFilterUrl({ search, fund_cluster_id: newValue, needs_attention: needsAttention, page: 1 }),
                                        { preserveState: true, preserveScroll: true, replace: true }
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
                                            {fc.fund_cluster_id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                type="button"
                                variant={needsAttention ? 'default' : 'outline'}
                                onClick={handleToggleNeedsAttention}
                                className={needsAttention ? 'bg-amber-600 hover:bg-amber-600/90 text-white' : ''}
                            >
                                Needs Setup Only
                            </Button>

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
                        <div className="flex flex-col gap-2 w-full lg:w-auto lg:flex-row">
                            <Button
                                type="button"
                                onClick={() => setDialogOpen(true)}
                                className="w-full lg:w-auto bg-[#612A35] hover:bg-[#612A35]/90 text-white shadow-sm"
                            >
                                <Plus className="mr-2 size-4" />
                                Add Stock Item
                            </Button>
                        </div>
                    </form>

                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <TableToolbar
                        currentCount={stockItems.data.length}
                        total={stockItems.total}
                        entityName="stock items"
                    >
                        <TableColumnsPopover visibility={columnVisibility} />
                    </TableToolbar>

                    {/* Table */}
                    <div className="flex-initial min-h-0 overflow-x-auto overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                        <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
                            <colgroup>
                                {visibleColumns.stock_no && <col className="w-[15%]" />}
                                {visibleColumns.item_name && <col className="w-[20%]" />}
                                {visibleColumns.description && <col className="w-[35%]" />}
                                {visibleColumns.units && <col className="w-[20%]" />}
                                {visibleColumns.actions && <col className="w-[10%]" />}
                            </colgroup>
                            <thead className="border-b sticky top-0 z-20">
                            <tr>
                                {visibleColumns.stock_no && (
                                    <th className="p-0 font-semibold text-white bg-[#370001]">
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                            onClick={() => handleSort('stock_no')}
                                        >
                                            Stock Number
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.item_name && (
                                    <th className="p-0 font-semibold text-white bg-[#370001]">
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                            onClick={() => handleSort('item_name')}
                                        >
                                            Item Name
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.description && (
                                    <th className="p-0 font-semibold text-white bg-[#370001]">
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                            onClick={() => handleSort('description')}
                                        >
                                            Description
                                        </button>
                                    </th>
                                )}
                                {visibleColumns.units && (
                                    <th className="px-4 py-3 text-left font-semibold text-white bg-[#370001]">
                                        Unit(s)
                                    </th>
                                )}
                                {visibleColumns.actions && (
                                    <th className="px-4 py-3 text-left font-semibold text-white bg-[#370001]">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {stockItems.data.length === 0 ? (
                                <tr>
                                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No stock items added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>"Add Stock Item"</strong> to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                stockItems.data.map((stock, i) => {
                                    return (
                                        <AnimatedTableRow
                                            key={stock.stock_no}
                                            index={i}
                                            className={`border-b transition-colors hover:bg-muted/40 ${
                                                stock.is_pending_setup ? 'bg-amber-50' : ''
                                            }`}
                                            data-search-0={stock.item_name}
                                            data-record-id={stock.stock_no}
                                        >
                                            {visibleColumns.stock_no && (
                                                <td className="px-4 py-3 font-medium truncate">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate">{stock.stock_no}</span>
                                                        {stock.is_pending_setup && (
                                                            <span
                                                                className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                                                                title="Temporary stock number and/or units still need to be set"
                                                            >
                                                                Needs setup
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.item_name && (
                                                <td className="px-4 py-3 truncate">{stock.item_name}</td>
                                            )}
                                            {visibleColumns.description && (
                                                <td className="px-4 py-3 truncate">
                                                    {stock.description || '—'}
                                                </td>
                                            )}
                                            {visibleColumns.units && (
                                                <td className="px-4 py-3">
                                                    {stock.units && stock.units.length > 0 ? (
                                                        stock.units.map(u => u.unit_short_name).join(', ')
                                                    ) : (
                                                        <span className="text-amber-700 text-xs font-medium">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                            {visibleColumns.actions && (
                                                <td className="px-4 py-3 text-left">
                                                    <div className="flex items-center justify-start gap-3">
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
                                                            title="Archive"
                                                        >
                                                            <Archive className="size-4" />
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
                                            )}
                                        </AnimatedTableRow>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {stockItems.data.length > 0 && (
                    <div className="shrink-0">
                        <Pagination meta={stockItems} />
                    </div>
                )}
            </div>
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