import { Head, Link, router } from '@inertiajs/react';
import { usePoll } from '@inertiajs/react';
import { AlertTriangle, PackageX, Boxes, Activity, X, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ArrowDownToLine, ArrowUpFromLine, PackageMinus, PackagePlus, ReceiptText } from 'lucide-react';



type Unit = {
    unit_name: string;
    unit_short_name: string;
    is_default: boolean;
};

type StockItem = {
    stock_no: string;
    item_name: string;
    description: string | null;
    reorder_point: number;
    units: Unit[];
    balance: number;
    last_transaction_date: string | null;
    status: 'ok' | 'low' | 'out';
};

type Transaction = {
    transactionID: number;
    transaction_type: 'IN' | 'OUT' | 'ISSUE' | 'RECEIVE';
    transaction_date: string;
    item_name: string;
    reference: string;
    quantity: number;
    unit_short_name: string;
    office_code: string;
    fund_cluster: string;
    description: string | null;
};

type TransactionPage = {
    data: Transaction[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
};

type Kpis = {
    total_items: number;
    total_stock_on_hand: number;
    low_stock_count: number;
    out_of_stock_count: number;
    transactions_today: number;
    transactions_this_week: number;
};

type FilterOptions = {
    offices: { office_code: string; office_name: string }[];
    fundClusters: { fund_cluster_id: string; fund_description: string }[];
};

type Props = {
    kpis: Kpis;
    stockItems: StockItem[];
    transactions: TransactionPage;
    filters: FilterOptions;
};

const STATUS_STYLES: Record<StockItem['status'], string> = {
    ok: 'bg-emerald-100 text-emerald-700',
    low: 'bg-amber-100 text-amber-700',
    out: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<StockItem['status'], string> = {
    ok: 'In Stock',
    low: 'Low Stock',
    out: 'Out of Stock',
};

const STATUS_FILTERS: { key: 'all' | StockItem['status']; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'ok', label: 'OK' },
    { key: 'low', label: 'Low' },
    { key: 'out', label: 'Out' },
];

// NOTE: adjust to your actual stock items index route.
const STOCK_ITEMS_PAGE = '/stock-items';

export default function Index({ kpis, stockItems, transactions, filters }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | StockItem['status']>('all');
    const [officeFilter, setOfficeFilter] = useState('');
    const [fundClusterFilter, setFundClusterFilter] = useState('');
    const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [flashedRows, setFlashedRows] = useState<Set<string>>(new Set());
    const prevBalances = useRef<Map<string, number>>(new Map(stockItems.map((i) => [i.stock_no, i.balance])));
    const listRef = useRef<HTMLDivElement>(null);

    // --- Real-time polling ---
    usePoll(5000, { onSuccess: () => setLastUpdated(new Date()) });

    useEffect(() => {
        const id = setInterval(() => {
            setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [lastUpdated]);

    useEffect(() => {
        const changed = new Set<string>();
        for (const item of stockItems) {
            const prev = prevBalances.current.get(item.stock_no);
            if (prev !== undefined && prev !== item.balance) {
                changed.add(item.stock_no);
            }
            prevBalances.current.set(item.stock_no, item.balance);
        }
        if (changed.size > 0) {
            setFlashedRows(changed);
            const t = setTimeout(() => setFlashedRows(new Set()), 1500);
            return () => clearTimeout(t);
        }
    }, [stockItems]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        return stockItems.filter((i) => {
            if (statusFilter !== 'all' && i.status !== statusFilter) return false;
            if (!q) return true;
            return i.item_name.toLowerCase().includes(q) || i.stock_no.toLowerCase().includes(q);
        });
    }, [search, statusFilter, stockItems]);

    const stockCardEntries = useMemo(() => {
        if (!selectedItem) return [];
        let running = 0;
        return transactions.data
            .filter((t) => t.item_name === selectedItem.item_name)
            .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
            .map((t) => {
                running += t.transaction_type === 'IN' ? t.quantity : -t.quantity;
                return { ...t, running };
            })
            .reverse();
    }, [selectedItem, transactions.data]);

    const TYPE_STYLES: Record<Transaction['transaction_type'], string> = {
        IN: 'bg-emerald-100 text-emerald-700',
        OUT: 'bg-red-100 text-red-700',
        ISSUE: 'bg-amber-100 text-amber-700',
        RECEIVE: 'bg-sky-100 text-sky-700',
    };

    const TYPE_ICON: Record<Transaction['transaction_type'], React.ReactNode> = {
        IN: <ArrowDownToLine className="size-3" />,
        OUT: <ArrowUpFromLine className="size-3" />,
        ISSUE: <PackageMinus className="size-3" />,
        RECEIVE: <PackagePlus className="size-3" />,
    };

    function applyTransactionFilters(overrides: Record<string, string> = {}) {
        router.get(
            window.location.pathname,
            {
                office_code: overrides.office_code ?? officeFilter,
                fund_cluster: overrides.fund_cluster ?? fundClusterFilter,
                page: 1,
            },
            { preserveState: true, preserveScroll: true, only: ['transactions'] }
        );
    }

    function goToPage(page: number) {
        router.get(
            window.location.pathname,
            { office_code: officeFilter, fund_cluster: fundClusterFilter, page },
            { preserveState: true, preserveScroll: true, only: ['transactions'] }
        );
    }

    function handleKpiClick(status: 'all' | StockItem['status']) {
        setStatusFilter(status);
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return (
        <>
            <Head title="Stock Item Dashboard" />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Stock Card Dashboard</h1>
                        <p className="text-sm text-muted-foreground">
                            Live view of stock items, balances, and recent movements.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            Updated {secondsAgo <= 1 ? 'just now' : `${secondsAgo}s ago`}
                        </span>
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            Live
                        </div>
                    </div>
                </div>

                {/* KPI strip — clickable */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <KpiCard
                        icon={<Boxes className="size-4" />}
                        label="Total Stock Items"
                        value={kpis.total_items}
                        onClick={() => handleKpiClick('all')}
                        href={STOCK_ITEMS_PAGE}
                    />
                    <KpiCard
                        icon={<Activity className="size-4" />}
                        label="Total Stock on Hand"
                        value={kpis.total_stock_on_hand}
                        onClick={() => handleKpiClick('all')}
                        href={STOCK_ITEMS_PAGE}
                    />
                    <KpiCard
                        icon={<AlertTriangle className="size-4" />}
                        label="Low Stock Items"
                        value={kpis.low_stock_count}
                        tone={kpis.low_stock_count > 0 ? 'warn' : 'default'}
                        onClick={() => handleKpiClick('low')}
                        href={`${STOCK_ITEMS_PAGE}?status=low`}
                    />
                    <KpiCard
                        icon={<PackageX className="size-4" />}
                        label="Out of Stock"
                        value={kpis.out_of_stock_count}
                        tone={kpis.out_of_stock_count > 0 ? 'danger' : 'default'}
                        onClick={() => handleKpiClick('out')}
                        href={`${STOCK_ITEMS_PAGE}?status=out`}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                    {/* Stock Item List */}
                    <div ref={listRef} className="rounded-xl border bg-card xl:col-span-3">
                        <div className="space-y-3 border-b p-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold">Stock Item List</h2>
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search item name or stock no..."
                                    className="h-8 w-56 text-sm"
                                />
                            </div>
                            <div className="flex gap-1.5">
                                {STATUS_FILTERS.map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => setStatusFilter(f.key)}
                                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                            statusFilter === f.key
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ScrollArea className="h-[520px]">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/50 text-left text-xs text-muted-foreground">
                                    <tr>
                                        <th className="p-3">Stock No</th>
                                        <th className="p-3">Item Name</th>
                                        <th className="p-3">Unit</th>
                                        <th className="p-3 text-right">Balance</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item) => {
                                        const defaultUnit = item.units.find((u) => u.is_default) ?? item.units[0];
                                        const isFlashed = flashedRows.has(item.stock_no);
                                        return (
                                            <tr
                                                key={item.stock_no}
                                                onClick={() => setSelectedItem(item)}
                                                className={`cursor-pointer border-t transition-colors hover:bg-muted/40 ${
                                                    isFlashed ? 'bg-amber-100/70' : ''
                                                }`}
                                            >
                                                <td className="p-3 font-mono text-xs">{item.stock_no}</td>
                                                <td className="p-3">{item.item_name}</td>
                                                <td className="p-3 text-muted-foreground">{defaultUnit?.unit_short_name ?? '—'}</td>
                                                <td className="p-3 text-right font-medium">{item.balance}</td>
                                                <td className="p-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                                                        {STATUS_LABEL[item.status]}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredItems.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                                No items match your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </ScrollArea>
                    </div>

                    {/* Transaction Log */}
                    <div className="rounded-xl border bg-card xl:col-span-2">
                        <div className="space-y-3 border-b p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ReceiptText className="size-4 text-muted-foreground" />
                                    <h2 className="font-semibold">Transactions This Month</h2>
                                </div>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    {transactions.total} total
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Select
                                    value={officeFilter || 'all'}
                                    onValueChange={(v) => {
                                        const value = v === 'all' ? '' : v;
                                        setOfficeFilter(value);
                                        applyTransactionFilters({ office_code: value });
                                    }}
                                >
                                    <SelectTrigger className="h-8 flex-1 text-xs">
                                        <SelectValue placeholder="All Offices" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Offices</SelectItem>
                                        {filters.offices.map((o) => (
                                            <SelectItem key={o.office_code} value={o.office_code}>
                                                {o.office_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={fundClusterFilter || 'all'}
                                    onValueChange={(v) => {
                                        const value = v === 'all' ? '' : v;
                                        setFundClusterFilter(value);
                                        applyTransactionFilters({ fund_cluster: value });
                                    }}
                                >
                                    <SelectTrigger className="h-8 flex-1 text-xs">
                                        <SelectValue placeholder="All Fund Clusters" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Fund Clusters</SelectItem>
                                        {filters.fundClusters.map((fc) => (
                                            <SelectItem key={fc.fund_cluster_id} value={fc.fund_cluster_id}>
                                                {fc.fund_cluster_id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <ScrollArea className="h-[420px]">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur-sm">
                                    <tr>
                                        <th className="p-3 font-medium">Date</th>
                                        <th className="p-3 font-medium">Item</th>
                                        <th className="p-3 font-medium">Ref.</th>
                                        <th className="p-3 font-medium">Type</th>
                                        <th className="p-3 text-right font-medium">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.data.map((t, i) => (
                                        <tr
                                            key={t.transactionID}
                                            className={`border-t transition-colors hover:bg-muted/40 ${
                                                i % 2 === 1 ? 'bg-muted/10' : ''
                                            }`}
                                        >
                                            <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                                                {formatDate(t.transaction_date)}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium">{t.item_name}</div>
                                                <div className="text-xs text-muted-foreground">{t.office_code}</div>
                                            </td>
                                            <td className="p-3 font-mono text-xs text-muted-foreground">{t.reference}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[t.transaction_type]}`}
                                                >
                                                    {TYPE_ICON[t.transaction_type]}
                                                    {t.transaction_type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-medium tabular-nums">
                                                {t.quantity}
                                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                    {t.unit_short_name}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-10 text-center">
                                                <ReceiptText className="mx-auto mb-2 size-6 text-muted-foreground/50" />
                                                <p className="text-sm text-muted-foreground">No transactions match your filters.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </ScrollArea>

                        <div className="flex items-center justify-between border-t bg-muted/20 p-3 text-xs text-muted-foreground">
                            <span>
                                Page <span className="font-medium text-foreground">{transactions.current_page}</span> of{' '}
                                {transactions.last_page}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    disabled={transactions.current_page <= 1}
                                    onClick={() => goToPage(transactions.current_page - 1)}
                                    className="rounded-md border bg-background p-1 transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-background"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <button
                                    disabled={transactions.current_page >= transactions.last_page}
                                    onClick={() => goToPage(transactions.current_page + 1)}
                                    className="rounded-md border bg-background p-1 transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-background"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stock Card drill-down */}
            {selectedItem && (
                <StockCardPanel item={selectedItem} entries={stockCardEntries} onClose={() => setSelectedItem(null)} />
            )}
        </>
    );
}

function StockCardPanel({
    item,
    entries,
    onClose,
}: {
    item: StockItem;
    entries: (Transaction & { running: number })[];
    onClose: () => void;
}) {
    const [jumpDate, setJumpDate] = useState('');
    const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

    function handleJump(date: string) {
        setJumpDate(date);
        if (!date) return;
        const target = entries.find((e) => e.transaction_date.slice(0, 10) <= date);
        if (target) {
            rowRefs.current.get(target.transactionID)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
            <div className="flex h-full w-full max-w-xl flex-col bg-background shadow-2xl">
                <div className="space-y-4 border-b p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">{item.stock_no}</p>
                            <h2 className="text-lg font-bold">{item.item_name}</h2>
                            <p className="text-sm text-muted-foreground">
                                Current balance: <span className="font-semibold">{item.balance}</span>
                                {' · '}Reorder point: {item.reorder_point}
                            </p>
                        </div>
                        <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
                            <X className="size-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        
                        <a
                            href={`/stock-items/print-cards?stock_no=${encodeURIComponent(item.stock_no)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                        >
                            <Printer className="size-3.5" />
                            Print Card
                        </a>
                        <div className="flex items-center gap-1.5">
                            <label className="text-xs text-muted-foreground">Jump to date:</label>
                            <input
                                type="date"
                                value={jumpDate}
                                onChange={(e) => handleJump(e.target.value)}
                                className="h-7 rounded-md border px-2 text-xs outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-6 pt-0">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 border-b bg-background text-left text-xs text-muted-foreground">
                            <tr>
                                <th className="py-2">Date</th>
                                <th className="py-2">Reference</th>
                                <th className="py-2">Office</th>
                                <th className="py-2 text-right">IN</th>
                                <th className="py-2 text-right">OUT</th>
                                <th className="py-2 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e) => (
                                <tr
                                    key={e.transactionID}
                                    ref={(el) => {
                                        if (el) rowRefs.current.set(e.transactionID, el);
                                    }}
                                    className="border-b"
                                >
                                    <td className="py-2 whitespace-nowrap">{formatDate(e.transaction_date)}</td>
                                    <td className="py-2 font-mono text-xs">{e.reference}</td>
                                    <td className="py-2">{e.office_code}</td>
                                    <td className="py-2 text-right text-emerald-600">{e.transaction_type === 'IN' ? e.quantity : ''}</td>
                                    <td className="py-2 text-right text-red-600">{e.transaction_type === 'OUT' ? e.quantity : ''}</td>
                                    <td className="py-2 text-right font-medium">{e.running}</td>
                                </tr>
                            ))}
                            {entries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                                        No transactions recorded for this item yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            </div>
        </div>
    );
}

function KpiCard({
    icon,
    label,
    value,
    tone = 'default',
    onClick,
    href,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    tone?: 'default' | 'warn' | 'danger';
    onClick?: () => void;
    href?: string;
}) {
    const toneStyles = {
        default: 'text-foreground',
        warn: 'text-amber-600',
        danger: 'text-red-600',
    }[tone];

    return (
        <button
            onClick={onClick}
            className="group relative w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
        >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                    {icon}
                    {label}
                </span>
                {href && (
                    <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        title="Go to full page"
                    >
                        <ChevronRight className="size-3.5" />
                    </Link>
                )}
            </div>
            <p className={`mt-2 text-2xl font-bold ${toneStyles}`}>{value}</p>
        </button>
    );
}

function formatDate(value: string) {
    const d = new Date(value);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

Index.layout = {
    breadcrumbs: [
        { title: 'Stock Cards', href: '#' },
        { title: 'Dashboard', href: '/stock-items-dashboard' },
    ],
};