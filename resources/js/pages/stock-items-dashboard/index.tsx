import { Head, router } from '@inertiajs/react';
import { usePoll } from '@inertiajs/react';
import {
    AlertTriangle,
    PackageX,
    Boxes,
    Activity,
    ChevronLeft,
    ChevronRight,
    ArrowDownToLine,
    ArrowUpFromLine,
    ReceiptText,
    Search,
    BarChart3,
    TrendingUp,
    AreaChart as AreaChartIcon,
    GitCompareArrows,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart, Line, LineChart, ReferenceLine, Cell } from 'recharts';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// ---------------------------------------------------------------------------
// Brand tokens (matches the maroon theme already used across Stock Items List
// and the print stock cards button elsewhere in SMIS).
// ---------------------------------------------------------------------------
const BRAND = '#612A35';
const BRAND_DARK = '#370001';
const GREEN = '#10b981';
const RED = '#dc2626';

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
    transaction_type: 'RECEIVE' | 'ISSUE';
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
    quarter: string;
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
    quarters: string[];
};

// Aggregated daily received/issued totals for the WHOLE filtered range
// (not just the current page of transactions). Comes from the backend's
// getMovement(), which applies the same office/fund_cluster/quarter scope
// as getTransactions() but is never paginated.
type MovementPoint = { date: string; received: number; issued: number };

type Props = {
    kpis: Kpis;
    stockItems: StockItem[];
    transactions: TransactionPage;
    movement: MovementPoint[];
    filters: FilterOptions;
};

const STATUS_STYLES: Record<StockItem['status'], string> = {
    ok: 'bg-green-100 text-green-700',
    low: 'bg-yellow-100 text-yellow-700',
    out: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<StockItem['status'], string> = {
    ok: 'In Stock',
    low: 'Low Stock',
    out: 'Out of Stock',
};

const STATUS_FILTERS: { key: 'all' | StockItem['status']; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'ok', label: 'In Stock' },
    { key: 'low', label: 'Low' },
    { key: 'out', label: 'Out' },
];

const movementChartConfig = {
    received: {
        label: 'Received',
        color: GREEN,
    },
    issued: {
        label: 'Issued',
        color: BRAND,
    },
} satisfies ChartConfig;

const netChartConfig = {
    net: {
        label: 'Net Movement',
        color: BRAND,
    },
} satisfies ChartConfig;

const cumulativeChartConfig = {
    cumulative: {
        label: 'Cumulative Net',
        color: BRAND,
    },
} satisfies ChartConfig;

type ChartType = 'grouped' | 'net' | 'area' | 'cumulative';

const CHART_TYPES: { key: ChartType; label: string; icon: React.ReactNode }[] = [
    { key: 'grouped', label: 'Grouped', icon: <BarChart3 className="size-3.5" /> },
    { key: 'net', label: 'Net Movement', icon: <GitCompareArrows className="size-3.5" /> },
    { key: 'area', label: 'Stacked Area', icon: <AreaChartIcon className="size-3.5" /> },
    { key: 'cumulative', label: 'Running Total', icon: <TrendingUp className="size-3.5" /> },
];

function getCurrentQuarter(): string {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Q${q} ${now.getFullYear()}`;
}

export default function Index({ kpis, stockItems, transactions, movement, filters }: Props) {
    const [quarterFilter, setQuarterFilter] = useState(getCurrentQuarter());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | StockItem['status']>('all');
    const [officeFilter, setOfficeFilter] = useState('');
    const [fundClusterFilter, setFundClusterFilter] = useState('');
    const [chartType, setChartType] = useState<ChartType>('grouped');
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [flashedRows, setFlashedRows] = useState<Set<string>>(new Set());
    const prevBalances = useRef<Map<string, number>>(new Map(stockItems.map((i) => [i.stock_no, i.balance])));
    const listRef = useRef<HTMLDivElement>(null);

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

    // Chart data now comes from the server-aggregated `movement` prop, which
    // is scoped to the full filtered date range (quarter/office/fund cluster)
    // — NOT from `transactions.data`, which is only the current page of rows
    // and was why "All Quarters" used to look identical to the current quarter.
    const movementData = useMemo(
        () => [...movement].sort((a, b) => a.date.localeCompare(b.date)),
        [movement]
    );

    const netMovementData = useMemo(
        () => movementData.map((d) => ({ date: d.date, net: d.received - d.issued })),
        [movementData]
    );

    const cumulativeData = useMemo(() => {
        let running = 0;
        return movementData.map((d) => {
            running += d.received - d.issued;
            return { date: d.date, cumulative: running };
        });
    }, [movementData]);

    const TYPE_STYLES: Record<Transaction['transaction_type'], string> = {
        RECEIVE: 'bg-green-100 text-green-700',
        ISSUE: 'bg-yellow-100 text-yellow-700',
    };

    const TYPE_ICON: Record<Transaction['transaction_type'], React.ReactNode> = {
        RECEIVE: <ArrowDownToLine className="size-3" />,
        ISSUE: <ArrowUpFromLine className="size-3" />,
    };

    function applyTransactionFilters(overrides: Record<string, string> = {}) {
        router.get(
            window.location.pathname,
            {
                office_code: overrides.office_code ?? officeFilter,
                fund_cluster: overrides.fund_cluster ?? fundClusterFilter,
                quarter: overrides.quarter ?? quarterFilter,
                page: 1,
            },
            { preserveState: true, preserveScroll: true, only: ['transactions', 'movement'] }
        );
    }

    function goToPage(page: number) {
        router.get(
            window.location.pathname,
            { office_code: officeFilter, fund_cluster: fundClusterFilter, quarter: quarterFilter, page },
            { preserveState: true, preserveScroll: true, only: ['transactions', 'movement'] }
        );
    }

    function handleKpiClick(status: 'all' | StockItem['status']) {
        setStatusFilter(status);
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function formatDayTick(value: string) {
        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function formatDayLabel(value: string) {
        return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    return (
        <>
            <Head title="Stock Item Dashboard" />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div className="relative sticky top-16 group-has-data-[collapsible=icon]/sidebar-wrapper:top-12 transition-[all] ease-linear z-30 -mx-4 -mt-4 mb-6 bg-background/95 backdrop-blur px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Stock Card Dashboard</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
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
                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <KpiCard
                        icon={<Boxes className="size-4" />}
                        label="Total Stock Items"
                        value={kpis.total_items}
                        onClick={() => handleKpiClick('all')}
                    />
                    <KpiCard
                        icon={<Activity className="size-4" />}
                        label="Total Stock on Hand"
                        value={kpis.total_stock_on_hand}
                        onClick={() => handleKpiClick('all')}
                    />
                    <KpiCard
                        icon={<AlertTriangle className="size-4" />}
                        label="Low Stock Items"
                        value={kpis.low_stock_count}
                        tone={kpis.low_stock_count > 0 ? 'warn' : 'default'}
                        onClick={() => handleKpiClick('low')}
                    />
                    <KpiCard
                        icon={<PackageX className="size-4" />}
                        label="Out of Stock"
                        value={kpis.out_of_stock_count}
                        tone={kpis.out_of_stock_count > 0 ? 'danger' : 'default'}
                        onClick={() => handleKpiClick('out')}
                    />
                </div>

                {/* Stock movement chart — switchable view */}
                <div className="rounded-xl border bg-card p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-semibold">Stock Movement</h2>
                            <p className="text-xs text-muted-foreground">
                                {chartType === 'grouped' && `Received vs. issued quantity, ${transactions.quarter}`}
                                {chartType === 'net' && `Daily net movement (received − issued), ${transactions.quarter}`}
                                {chartType === 'area' && `Received vs. issued volume, ${transactions.quarter}`}
                                {chartType === 'cumulative' && `Running net change over time, ${transactions.quarter}`}
                            </p>
                        </div>
                        <div className="flex gap-1 rounded-lg bg-muted p-1">
                            {CHART_TYPES.map((ct) => (
                                <button
                                    key={ct.key}
                                    onClick={() => setChartType(ct.key)}
                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                        chartType === ct.key
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {ct.icon}
                                    <span className="hidden sm:inline">{ct.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {movementData.length === 0 ? (
                        <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Activity className="size-6 text-muted-foreground/40" />
                            No transactions to chart for this period.
                        </div>
                    ) : chartType === 'grouped' ? (
                        <ChartContainer config={movementChartConfig} className="h-[240px] w-full">
                            <BarChart data={movementData} barGap={4} barCategoryGap="20%">
                                <defs>
                                    <linearGradient id="fillReceived" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={GREEN} stopOpacity={1} />
                                        <stop offset="100%" stopColor={GREEN} stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="fillIssued" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={BRAND} stopOpacity={1} />
                                        <stop offset="100%" stopColor={BRAND} stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    fontSize={11}
                                    tickFormatter={formatDayTick}
                                />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={32} allowDecimals={false} />
                                <ChartTooltip
                                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                                    content={<ChartTooltipContent labelFormatter={(v) => formatDayLabel(v as string)} />}
                                />
                                <Bar dataKey="received" fill="url(#fillReceived)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="issued" fill="url(#fillIssued)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                            </BarChart>
                        </ChartContainer>
                    ) : chartType === 'net' ? (
                        <ChartContainer config={netChartConfig} className="h-[240px] w-full">
                            <BarChart data={netMovementData} barCategoryGap="25%">
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    fontSize={11}
                                    tickFormatter={formatDayTick}
                                />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={32} allowDecimals={false} />
                                <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
                                <ChartTooltip
                                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                                    content={<ChartTooltipContent labelFormatter={(v) => formatDayLabel(v as string)} />}
                                />
                                <Bar dataKey="net" radius={[4, 4, 4, 4]} maxBarSize={32}>
                                    {netMovementData.map((d, i) => (
                                        <Cell key={i} fill={d.net >= 0 ? GREEN : RED} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    ) : chartType === 'area' ? (
                        <ChartContainer config={movementChartConfig} className="h-[240px] w-full">
                            <AreaChart data={movementData}>
                                <defs>
                                    <linearGradient id="areaReceived" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={GREEN} stopOpacity={0.5} />
                                        <stop offset="100%" stopColor={GREEN} stopOpacity={0.05} />
                                    </linearGradient>
                                    <linearGradient id="areaIssued" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.5} />
                                        <stop offset="100%" stopColor={BRAND} stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    fontSize={11}
                                    tickFormatter={formatDayTick}
                                />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={32} allowDecimals={false} />
                                <ChartTooltip
                                    cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                                    content={<ChartTooltipContent labelFormatter={(v) => formatDayLabel(v as string)} />}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="received"
                                    stackId="1"
                                    stroke={GREEN}
                                    strokeWidth={2}
                                    fill="url(#areaReceived)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="issued"
                                    stackId="1"
                                    stroke={BRAND}
                                    strokeWidth={2}
                                    fill="url(#areaIssued)"
                                />
                            </AreaChart>
                        </ChartContainer>
                    ) : (
                        <ChartContainer config={cumulativeChartConfig} className="h-[240px] w-full">
                            <LineChart data={cumulativeData}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    fontSize={11}
                                    tickFormatter={formatDayTick}
                                />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={32} allowDecimals={false} />
                                <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
                                <ChartTooltip
                                    cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                                    content={<ChartTooltipContent labelFormatter={(v) => formatDayLabel(v as string)} />}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="cumulative"
                                    stroke={BRAND}
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: BRAND }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ChartContainer>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                    {/* Stock Item List — no print action here by design */}
                    <div ref={listRef} className="rounded-xl border bg-card xl:col-span-3">
                        <div className="space-y-3 border-b p-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold">Stock Item List</h2>
                                <div className="relative w-56">
                                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search item name or stock no..."
                                        className="h-8 pl-8 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-1.5">
                                {STATUS_FILTERS.map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => setStatusFilter(f.key)}
                                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                            statusFilter === f.key
                                                ? 'text-white'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                        }`}
                                        style={statusFilter === f.key ? { backgroundColor: BRAND } : undefined}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ScrollArea className="h-[520px]">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 text-left text-xs text-white" style={{ backgroundColor: BRAND_DARK }}>
                                    <tr>
                                        <th className="p-3 font-semibold">Stock No</th>
                                        <th className="p-3 font-semibold">Item Name</th>
                                        <th className="p-3 font-semibold">Unit</th>
                                        <th className="p-3 text-right font-semibold">Balance</th>
                                        <th className="p-3 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item) => {
                                        const defaultUnit = item.units.find((u) => u.is_default) ?? item.units[0];
                                        const isFlashed = flashedRows.has(item.stock_no);
                                        return (
                                            <tr
                                                key={item.stock_no}
                                                className={`border-t transition-colors ${isFlashed ? 'bg-amber-100/70' : ''}`}
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
                                    <h2 className="font-semibold">Transactions ({transactions.quarter})</h2>
                                </div>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    {transactions.total} total
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Select
                                    value={quarterFilter || 'all'}
                                    onValueChange={(v) => {
                                        const value = v === 'all' ? '' : v;
                                        setQuarterFilter(value);
                                        applyTransactionFilters({ quarter: value });
                                    }}
                                >
                                    <SelectTrigger className="h-8 flex-1 text-xs">
                                        <SelectValue placeholder="All Quarters" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Quarters</SelectItem>
                                        {filters.quarters.map((q) => (
                                            <SelectItem key={q} value={q}>
                                                {q}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                            className={`border-t transition-colors hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
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
                                                <span className="ml-1 text-xs font-normal text-muted-foreground">{t.unit_short_name}</span>
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
                                Page <span className="font-medium text-foreground">{transactions.current_page}</span> of {transactions.last_page}
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

        </>
    );
}

function KpiCard({
    icon,
    label,
    value,
    tone = 'default',
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    tone?: 'default' | 'warn' | 'danger';
    onClick?: () => void;
}) {
    const toneStyles = {
        default: 'text-foreground',
        warn: 'text-amber-600',
        danger: 'text-red-600',
    }[tone];

    return (
        <button
            onClick={onClick}
            className="group relative w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${BRAND}80`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
        >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {icon}
                {label}
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