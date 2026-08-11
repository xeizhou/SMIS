import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { Printer, FileText, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface ReportItem {
    stock_no: string;
    item_name: string;
    item_description: string | null;
    unit_short_name: string;
    balance_per_stock_card: number;
}

interface PaginatedItems {
    data: ReportItem[];
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Filters {
    cutoff_date: string | null;
    fund_cluster_id: string | null;
}

interface Props {
    items: PaginatedItems;
    fundClusters: FundCluster[];
    filters: Filters;
}

export default function Index({ items, fundClusters, filters }: Props) {
    const [cutoffDate, setCutoffDate] = useState(filters.cutoff_date ?? '');
    const [fundClusterId, setFundClusterId] = useState(filters.fund_cluster_id ?? 'all');

    const applyFilters = (
        overrides: Partial<{ cutoff_date: string; fund_cluster_id: string }> = {}
    ) => {
        router.get(
            '/stock-reports',
            {
                cutoff_date: cutoffDate,
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

    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleClear = () => {
        setCutoffDate('');
        setFundClusterId('all');
        router.get(
            '/stock-reports',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const buildExportUrl = (path: string, extra: Record<string, string> = {}) => {
        const params = new URLSearchParams({
            cutoff_date: cutoffDate,
            fund_cluster_id: fundClusterId,
            ...extra,
        });
        return `${path}?${params.toString()}`;
    };

    const handlePrint = () => {
        window.open(buildExportUrl('/stock-reports/print'), '_blank');
    };

    const handleExportPdf = () => {
        window.location.href = buildExportUrl('/stock-reports/print', { download: '1' });
    };

    const handleExportExcel = () => {
        window.location.href = buildExportUrl('/stock-reports/export-excel');
    };

    const fundClusterLabel =
        fundClusterId === 'all'
            ? 'ALL'
            : fundClusters.find((fc) => fc.fund_cluster_id === fundClusterId)?.fund_cluster_id ?? fundClusterId;

    return (
        <>
            <Head title="Inventory Report" />
            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Inventory Report
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            View and export physical count inventory.
                        </p>
                    </div>  

                    <div className="flex gap-2">
                        <Button 
                            className="bg-[#612A35] text-white hover:bg-[#612A35]/90" 
                            onClick={handlePrint}
                        >
                            <Printer className="size-4" />
                            Print
                        </Button>
                        <Button 
                            className="bg-[#612A35] text-white hover:bg-[#612A35]/90" 
                            onClick={handleExportPdf}
                        >
                            <FileText className="size-4" />
                            Export PDF
                        </Button>
                        <Button 
                            className="bg-[#612A35] text-white hover:bg-[#612A35]/90" 
                            onClick={handleExportExcel}
                        >
                            <FileSpreadsheet className="size-4" />
                            Export Excel
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <form
                    onSubmit={handleApply}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm font-medium text-foreground">
                            Cut-off Date:
                        </label>
                        <Input
                            type="date"
                            value={cutoffDate}
                            onChange={(e) => setCutoffDate(e.target.value)}
                            className="w-[180px]"
                        />

                        <Select
                            value={fundClusterId}
                            onValueChange={(value) => setFundClusterId(value)}
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
                            Apply
                        </Button>
                        <Button type="button" variant="ghost" onClick={handleClear}>
                            Clear
                        </Button>
                    </div>
                </form>

                {/* Report Body */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="text-center text-lg font-bold uppercase text-foreground">
                        Stock Card Summary Report
                    </h2>

                    <div className="mt-4 space-y-1 text-sm font-semibold text-foreground">
                        <p>FUND CLUSTER: {fundClusterLabel}</p>
                        <p>
                            AS OF:{' '}
                            <span className="inline-block min-w-[160px] border-b border-foreground">
                                {cutoffDate || '\u00A0'}
                            </span>
                        </p>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-border overflow-x-auto">
                        <table className="w-full text-sm whitespace-nowrap">
                            <thead className="border-b bg-muted">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Item Description</th>
                                    <th className="px-4 py-3 text-left font-semibold">Unit</th>
                                    <th className="px-4 py-3 text-center font-semibold">Balance per Stock Card</th>
                                    <th className="px-4 py-3 text-center font-semibold">Quantity per Physical Count</th>
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
                                            key={item.stock_no ?? `${item.item_name}-${index}`}
                                            className="border-b"
                                        >
                                            <td className="px-4 py-3">
                                                {item.item_name}
                                                {item.item_description ? ` - ${item.item_description}` : ''}
                                            </td>
                                            <td className="px-4 py-3">{item.unit_short_name}</td>
                                            <td className="px-4 py-3 text-center font-medium">
                                                {item.balance_per_stock_card}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block w-24 border-b border-foreground">
                                                    &nbsp;
                                                </span>
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
            title: 'Inventory Report',
            href: '/stock-reports',
        },
    ],
};