import { Head, router } from '@inertiajs/react';
import Pagination from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { useState } from 'react';
import PrintStockCardsButton from '@/components/PrintStockCardsButton';
import PdfPreviewModal from '@/components/stock-items-list/PdfPreviewModal';

interface FundClusterRef {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface StockCardItem {
    stock_no: string;
    item_name: string;
    item_description: string | null;
    unitID: number;
    unit_name: string;
    unit_short_name: string;
    balance_per_stock_card: number;
    fund_clusters: FundClusterRef[];
}

interface PaginatedItems {
    data: StockCardItem[];
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface Filters {
    search: string | null;
    issued_status: string | null;
    fund_cluster_id: string | null;
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
}

interface Props {
    items: PaginatedItems;
    fundClusters: FundCluster[];
    filters: Filters;
}

export default function Index({ items, fundClusters, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [issuedStatus, setIssuedStatus] = useState(filters.issued_status ?? 'all');
    const [fundClusterId, setFundClusterId] = useState(filters.fund_cluster_id ?? 'all');

    const [itemToPrint, setItemToPrint] = useState<StockCardItem | null>(null);

    const applyFilters = (
        overrides: Partial<{ search: string; issued_status: string; fund_cluster_id: string; sort_field: string; sort_direction: string }> = {}
    ) => {
        router.get(
            '/stock-items-list',
            {
                search,
                issued_status: issuedStatus,
                fund_cluster_id: fundClusterId,
                sort_field: filters.sort_field,
                sort_direction: filters.sort_direction,
                ...overrides,
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
        applyFilters({ sort_field: field, sort_direction: direction });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleClear = () => {
        setSearch('');
        setIssuedStatus('all');
        setFundClusterId('all');
        router.get(
            '/stock-items-list',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    return (
        <>
            <Head title="Stock Items List" />
            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Stock Items List
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Stock card balances computed from receive/issue transactions.
                        </p>
                    </div>

                    <div>
                        <PrintStockCardsButton
                            totalItems={items.total ?? items.data.length}
                            filters={{
                                fundCluster: fundClusterId === 'all' ? 'All' : fundClusterId,
                                unissuedOnly: issuedStatus === 'unissued',
                                searchQuery: search.trim() === '' ? 'None' : search,
                            }}
                        />
                    </div>
                </div>

                {/* Search + Filters */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search item..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select
                            value={issuedStatus}
                            onValueChange={(value) => {
                                setIssuedStatus(value);
                                applyFilters({ issued_status: value });
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Items" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Items</SelectItem>
                                <SelectItem value="issued">Issued</SelectItem>
                                <SelectItem value="unissued">Unissued</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={fundClusterId}
                            onValueChange={(value) => {
                                setFundClusterId(value);
                                applyFilters({ fund_cluster_id: value });
                            }}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All Fund Clusters" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Fund Clusters</SelectItem>
                                {fundClusters.map((fc) => (
                                    <SelectItem key={fc.fund_cluster_id} value={fc.fund_cluster_id}>
                                        {fc.fund_cluster_id}
                                        {fc.fund_description ? ` - ${fc.fund_description}` : ''}
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
                </form>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-border bg-card overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                        <colgroup>
                            <col className="w-[65%]" />  {/* Item Description */}
                            <col className="w-[15%]" />  {/* Unit */}
                            <col className="w-[20%]" />  {/* Balance per Stock Card */}
                        </colgroup>
                        <thead className="border-b">
                            <tr>
                                <th className="p-0 font-semibold text-white bg-[#370001]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                        onClick={() => handleSort('item_description')}
                                    >
                                        Item Description
                                    </button>
                                </th>
                                <th className="p-0 font-semibold text-white bg-[#370001]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                        onClick={() => handleSort('unit')}
                                    >
                                        Unit
                                    </button>
                                </th>
                                <th className="p-0 font-semibold text-white bg-[#370001]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-center gap-2 px-4 py-3 outline-none transition-colors hover:bg-[#4C0002] focus:bg-[#4C0002] active:bg-[#4C0002]"
                                        onClick={() => handleSort('balance_per_stock_card')}
                                    >
                                        Balance per Stock Card
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.data.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No items found.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                items.data.map((item, index) => (
                                    <tr
                                        key={item.stock_no ?? `${item.item_name}-${index}`}
                                        className="border-b transition-colors hover:bg-muted/60 cursor-pointer"
                                        onClick={() => setItemToPrint(item)}
                                        data-search-0={item.item_name}
                                        data-record-id={item.stock_no}
                                    >
                                        <td
                                            className="px-4 py-3 truncate"
                                            title={`${item.item_name}${item.item_description ? ` - ${item.item_description}` : ''}`}
                                        >
                                            {item.item_name}
                                            {item.item_description ? ` - ${item.item_description}` : ''}
                                        </td>
                                        <td className="px-4 py-3 truncate">{item.unit_short_name}</td>
                                        <td className="px-4 py-3 text-center font-medium">
                                            {item.balance_per_stock_card}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {items.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={items} />
                    </div>
                )}
            </div>

            {/* The newly separated PDF Preview Modal */}
            <PdfPreviewModal
                isOpen={!!itemToPrint}
                onClose={() => setItemToPrint(null)}
                title={
                    itemToPrint
                        ? `${itemToPrint.item_name}${itemToPrint.item_description ? ` - ${itemToPrint.item_description}` : ''}`
                        : ''
                }
                pdfUrl={
                    itemToPrint
                        ? `/stock-items/print-cards?search=${encodeURIComponent(itemToPrint.stock_no)}`
                        : ''
                }
                filename={
                    itemToPrint
                        ? `Stock_Card_${itemToPrint.stock_no.replace(/\s+/g, '_')}.pdf`
                        : ''
                }
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
            title: 'Stock Items List',
            href: '/stock-items-list',
        },
    ],
};