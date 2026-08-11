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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
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

type ConfirmAction = 'print' | 'pdf' | 'excel' | null;

export default function Index({ items, fundClusters, filters }: Props) {
    const [cutoffDate, setCutoffDate] = useState(filters.cutoff_date ?? '');
    const [fundClusterId, setFundClusterId] = useState(filters.fund_cluster_id ?? 'all');
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

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

    const requestConfirm = (action: Exclude<ConfirmAction, null>) => {
        setConfirmAction(action);
    };

    const executeConfirmedAction = () => {
        if (confirmAction === 'print') {
            window.open(buildExportUrl('/stock-reports/print'), '_blank');
        } else if (confirmAction === 'pdf') {
            window.location.href = buildExportUrl('/stock-reports/print', { download: '1' });
        } else if (confirmAction === 'excel') {
            window.location.href = buildExportUrl('/stock-reports/export-excel');
        }
        setConfirmAction(null);
    };

    const confirmLabels: Record<Exclude<ConfirmAction, null>, { title: string; description: string; icon: React.ReactNode }> = {
        print: {
            title: 'Print Report',
            description: 'Open the Report of Physical Count Inventories for printing?',
            icon: <Printer className="size-5 text-[#612A35]" />,
        },
        pdf: {
            title: 'Export as PDF',
            description: 'Download the Report of Physical Count Inventories as a PDF file?',
            icon: <FileText className="size-5 text-[#612A35]" />,
        },
        excel: {
            title: 'Export as Excel',
            description: 'Download the Report of Physical Count Inventories as an Excel file?',
            icon: <FileSpreadsheet className="size-5 text-[#612A35]" />,
        },
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
                <div className="relative sticky top-16 group-has-data-[collapsible=icon]/sidebar-wrapper:top-12 transition-[all] ease-linear z-30 -mx-4 -mt-4 mb-6 bg-background/95 backdrop-blur px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                            onClick={() => requestConfirm('print')}
                        >
                            <Printer className="size-4" />
                            Print
                        </Button>
                        <Button
                            className="bg-[#612A35] text-white hover:bg-[#612A35]/90"
                            onClick={() => requestConfirm('pdf')}
                        >
                            <FileText className="size-4" />
                            Export PDF
                        </Button>
                        <Button
                            className="bg-[#612A35] text-white hover:bg-[#612A35]/90"
                            onClick={() => requestConfirm('excel')}
                        >
                            <FileSpreadsheet className="size-4" />
                            Export Excel
                        </Button>
                    </div>
                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
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

            {/* Print / Export confirmation dialog */}
            <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {confirmAction && confirmLabels[confirmAction].icon}
                            {confirmAction && confirmLabels[confirmAction].title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-2">
                        <p className="text-sm text-muted-foreground">
                            {confirmAction && confirmLabels[confirmAction].description}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmAction(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={executeConfirmedAction}
                            className="bg-[#612A35] text-white hover:bg-[#612A35]/90"
                        >
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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