import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface StockCardItem {
    stock_no: string;
    item_name: string;
    item_description: string | null;
    unitID: number;
    unit_name: string;
    unit_short_name: string;
    balance_per_stock_card: number;
    fund_cluster: string;
    status: 'issued' | 'unissued';
}

interface PaginatedItems {
    data: StockCardItem[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Filters {
    search: string | null;
    fund_cluster: string | null;
    status: string | null;
}

interface Props {
    items: PaginatedItems;
    filters: Filters;
    fund_clusters: string[];
}

export default function Index({ items, filters, fund_clusters = [] }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [fundCluster, setFundCluster] = useState(filters.fund_cluster ?? 'all');
    const [status, setStatus] = useState(filters.status ?? 'all');

    const applyFilters = (overrides: Partial<{ search: string; fund_cluster: string; status: string }> = {}) => {
        const query: Record<string, string> = {};

        const nextSearch = overrides.search ?? search;
        const nextFundCluster = overrides.fund_cluster ?? fundCluster;
        const nextStatus = overrides.status ?? status;

        if (nextSearch) query.search = nextSearch;
        if (nextFundCluster && nextFundCluster !== 'all') query.fund_cluster = nextFundCluster;
        if (nextStatus && nextStatus !== 'all') query.status = nextStatus;

        router.get('/stock-items-list', query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleFundClusterChange = (value: string) => {
        setFundCluster(value);
        applyFilters({ fund_cluster: value });
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        applyFilters({ status: value });
    };

    const handleClear = () => {
        setSearch('');
        setFundCluster('all');
        setStatus('all');
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

                        <Select value={fundCluster} onValueChange={handleFundClusterChange}>
                            <SelectTrigger className="w-full max-w-[200px]">
                                <SelectValue placeholder="Fund Cluster" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Fund Clusters</SelectItem>
                                {fund_clusters.map((fc) => (
                                    <SelectItem key={fc} value={fc}>
                                        {fc}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={status} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-full max-w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="issued">Issued</SelectItem>
                                <SelectItem value="unissued">Unissued</SelectItem>
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
                                <th className="px-4 py-3 text-left font-semibold text-white">Item Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Description</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Unit</th>
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
                                items.data.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        className="border-b transition-colors hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3">{item.item_name}</td>
                                        <td className="px-4 py-3">{item.item_description ?? '—'}</td>
                                        <td className="px-4 py-3">{item.unit_short_name}</td>
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