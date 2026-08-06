import { Head, Link, router } from '@inertiajs/react';
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

// Make sure the path matches where you saved the component
import PrintStockCardsButton from '@/components/PrintStockCardsButton';

interface FundClusterRef {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface StockCardItem {
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
    total: number; // Assuming your Laravel pagination resource includes a 'total' property
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

    const applyFilters = (
        overrides: Partial<{ search: string; issued_status: string; fund_cluster_id: string }> = {}
    ) => {
        router.get(
            '/stock-items-list',
            {
                search,
                issued_status: issuedStatus,
                fund_cluster_id: fundClusterId,
                ...overrides,
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
                    
                    {/* Added the Print Button Component Here */}
                    <div>
                        <PrintStockCardsButton 
                            // Note: If `items.total` isn't available, you might need to adjust your backend to send it, 
                            // or fallback to `items.data.length` (though that only counts the current page).
                            totalItems={items.total ?? items.data.length} 
                            filters={{
                                fundCluster: fundClusterId === 'all' ? 'None' : fundClusterId,
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
                                placeholder="Search item name..."
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
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead
                            className="border-b"
                            style={{ backgroundColor: '#370001' }}
                        >
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">Item Description</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Unit</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Fund Cluster</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Balance per Stock Card</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.data.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No items found.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                items.data.map((item, index) => (
                                    <tr
                                        key={`${item.item_name}-${index}`}
                                        className="border-b transition-colors hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3">
                                            {item.item_name}
                                            {item.item_description ? ` - ${item.item_description}` : ''}
                                        </td>
                                        <td className="px-4 py-3">{item.unit_short_name}</td>
                                        <td className="px-4 py-3">
                                            {item.fund_clusters.length > 0
                                                ? item.fund_clusters
                                                      .map((fc) => fc.fund_cluster_id)
                                                      .join(', ')
                                                : '—'}
                                        </td>
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
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {items.links.map((link, i) => (
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