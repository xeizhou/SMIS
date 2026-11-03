import { Head, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import Pagination from '@/components/Pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Archive, Eye, ChevronUp, ChevronDown, ChevronsUpDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import TableColumnsPopover from '@/components/table/TableColumnsPopover';
import TableToolbar from '@/components/table/TableToolbar';
import TransactionAddForm from '@/components/transaction-logs/transactionaddform';
import TransactionDeleteModal from '@/components/transaction-logs/transactiondeletemodal';
import TransactionEditForm from '@/components/transaction-logs/transactioneditform';
import TransactionViewForm from '@/components/transaction-logs/transactionviewform';
import DateRangePicker, { formatDate } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { buildFilterUrl } from '@/lib/filterUrl';

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface Office {
    office_code: string;
    office_name: string;
    entity_name: string;
}

interface StockItem {
    stock_no: string;
    item_name: string;
    description: string | null;
    fund_cluster_id: string | null;
    available_stock?: number;
    units?: {
        unitID: number;
        pivot?: {
            is_default: boolean;
        };
    }[];
}

interface Transaction {
    transactionID: number;
    transaction_type: string;
    office_code: string | null;
    fund_cluster: string;
    fund_cluster_detail: FundCluster | null;
    transaction_date: string;
    stock_no: string | null;
    item_name: string;
    description: string | null;
    unitID: number;
    reference: string;
    quantity: number;
    unit: Unit | null;
    office: Office | null;
}

interface PaginatedTransactions {
    data: Transaction[];
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
    transaction_type: string | null;
    office_code: string | null;
    fund_cluster: string | null;
    date_from: string | null;
    date_to: string | null;
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
    per_page?: number;
}

interface Props {
    transactions: PaginatedTransactions;
    units: Unit[];
    fundClusters: FundCluster[];
    offices: Office[];
    stockItems: StockItem[];
    filters: Filters;
}

const TRANSACTION_COLUMNS = [
    { key: 'transaction_type', label: 'Type' },
    { key: 'transaction_date', label: 'Date' },
    { key: 'item_name', label: 'Item Name', locked: true },
    { key: 'unit_name', label: 'Unit' },
    { key: 'quantity', label: 'Qty' },
    { key: 'reference', label: 'Reference' },
    { key: 'office_code', label: 'Office' },
    { key: 'actions', label: 'Actions', locked: true },
];

export default function Index({
    transactions,
    units,
    fundClusters,
    offices,
    stockItems,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [transactionType, setTransactionType] = useState(filters.transaction_type ?? 'all');
    const [officeFilter, setOfficeFilter] = useState(filters.office_code ?? 'all');
    const [fundClusterFilter, setFundClusterFilter] = useState(filters.fund_cluster ?? 'all');

    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);

    const columnVisibility = useColumnVisibility({
        storageKey: 'smis_transaction_logs_visible_columns',
        columns: TRANSACTION_COLUMNS,
    });
    const { visibleColumns } = columnVisibility;

    const getFilterParams = (overrides = {}) =>
        buildFilterUrl({
            search,
            transaction_type: transactionType,
            office_code: officeFilter,
            fund_cluster: fundClusterFilter,
            date_from: dateFrom,
            date_to: dateTo,
            sort_field: filters.sort_field,
            sort_direction: filters.sort_direction,
            ...overrides,
        });

    const handleSort = (field: string) => {
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';

        router.get(
            '/transaction-logs',
            getFilterParams({ sort_field: field, sort_direction: direction }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/transaction-logs',
            getFilterParams({ page: 1 }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleClear = () => {
        setSearch('');
        setTransactionType('all');
        setOfficeFilter('all');
        setFundClusterFilter('all');
        setDateFrom('');
        setDateTo('');
        router.get(
            '/transaction-logs',
            buildFilterUrl({
                search: '', transaction_type: 'all', office_code: 'all', fund_cluster: 'all',
                date_from: '', date_to: '', page: 1,
            }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleEdit = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setEditOpen(true);
    };

    const handleView = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setViewOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setTransactionToDelete(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <>
            <Head title="Transaction Logs" />
            <div className="flex flex-col h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] p-4 sm:p-6 gap-6">
                {/* Sticky Header & Search */}
                <div className="shrink-0 relative z-30 -mx-4 -mt-4 bg-background/95 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Transaction Logs
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Track stock issue and receive transactions.
                            </p>
                        </div>
                    </div>

                    {/* Search + Filter */}
                    <form
                        onSubmit={handleSearch}
                        className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
                    >
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search item, reference, office..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <Select
                                value={transactionType}
                                onValueChange={(value) => {
                                    setTransactionType(value);
                                    router.get(
                                        '/transaction-logs',
                                        getFilterParams({ transaction_type: value, page: 1 }),
                                        { preserveState: true, preserveScroll: true, replace: true }
                                    );
                                }}
                            >
                                <SelectTrigger className="w-[140px] text-black">
                                    <SelectValue placeholder="Filter by Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="ISSUE">ISSUE</SelectItem>
                                    <SelectItem value="RECEIVE">RECEIVE</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={officeFilter}
                                onValueChange={(value) => {
                                    setOfficeFilter(value);
                                    router.get(
                                        '/transaction-logs',
                                        getFilterParams({ office_code: value, page: 1 }),
                                        { preserveState: true, preserveScroll: true, replace: true }
                                    );
                                }}
                            >
                                <SelectTrigger className="w-[140px] text-black">
                                    <SelectValue placeholder="All Offices" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Offices</SelectItem>
                                    {offices.map((o) => (
                                        <SelectItem key={o.office_code} value={o.office_code}>
                                            {o.office_code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={fundClusterFilter}
                                onValueChange={(value) => {
                                    setFundClusterFilter(value);
                                    router.get(
                                        '/transaction-logs',
                                        getFilterParams({ fund_cluster: value, page: 1 }),
                                        { preserveState: true, preserveScroll: true, replace: true }
                                    );
                                }}
                            >
                                <SelectTrigger className="w-[160px] text-black">
                                    <SelectValue placeholder="All Fund Clusters" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fund Clusters</SelectItem>
                                    {fundClusters.map((fc) => (
                                        <SelectItem key={fc.fund_cluster_id} value={fc.fund_cluster_id}>
                                            {fc.fund_cluster_id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <DateRangePicker
                                dateFrom={dateFrom}
                                dateTo={dateTo}
                                setDateFrom={setDateFrom}
                                setDateTo={setDateTo}
                                onApply={() =>
                                    router.get(
                                        '/transaction-logs',
                                        getFilterParams({ page: 1 }),
                                        { preserveState: true, preserveScroll: true, replace: true }
                                    )
                                }
                            />

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

                        <div className="flex flex-col gap-2 w-full xl:w-auto xl:flex-row">
                            <Button
                                type="button"
                                onClick={() => setDialogOpen(true)}
                                className="w-full xl:w-auto bg-[#612A35] hover:bg-[#612A35]/90 text-white flex items-center gap-2 shadow-sm"
                            >
                                <Plus className="size-4" />
                                Add Transaction
                            </Button>
                        </div>
                    </form>

                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <TableToolbar
                        currentCount={transactions.data.length}
                        total={transactions.total}
                        entityName="transaction logs"
                    >
                        <TableColumnsPopover visibility={columnVisibility} />
                    </TableToolbar>

                    {/* Table */}
                    <div className="flex-initial min-h-0 overflow-x-auto overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                        <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
                            <colgroup>
                                {visibleColumns.transaction_type && <col className="w-[8%]" />}
                                {visibleColumns.transaction_date && <col className="w-[10%]" />}
                                {visibleColumns.item_name && <col className="w-[24%]" />}
                                {visibleColumns.unit_name && <col className="w-[8%]" />}
                                {visibleColumns.quantity && <col className="w-[7%]" />}
                                {visibleColumns.reference && <col className="w-[13%]" />}
                                {visibleColumns.office_code && <col className="w-[10%]" />}
                                {visibleColumns.actions && <col className="w-[10%]" />}
                            </colgroup>
                            <thead className="border-b sticky top-0 z-20">
                            <tr>
                                {visibleColumns.transaction_type && (
                                    <th
                                        className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                        onClick={() => handleSort('transaction_type')}
                                    >
                                        <div className="flex items-center gap-2">Type</div>
                                    </th>
                                )}
                                {visibleColumns.transaction_date && (
                                    <th
                                        className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                        onClick={() => handleSort('transaction_date')}
                                    >
                                        <div className="flex items-center gap-2">Date</div>
                                    </th>
                                )}
                                {visibleColumns.item_name && (
                                    <th
                                        className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                        onClick={() => handleSort('item_name')}
                                    >
                                        <div className="flex items-center gap-2">Item Name</div>
                                    </th>
                                )}
                                {visibleColumns.unit_name && (
                                    <th
                                        className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                        onClick={() => handleSort('unit_name')}
                                    >
                                        <div className="flex items-center gap-2">Unit</div>
                                    </th>
                                )}
                                {visibleColumns.quantity && (
                                    <th
                                        className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                        onClick={() => handleSort('quantity')}
                                    >
                                        <div className="flex items-center justify-start gap-2">Qty</div>
                                    </th>
                                )}
                                {visibleColumns.reference && (
                                    <th
                                        className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                        onClick={() => handleSort('reference')}
                                    >
                                        <div className="flex items-center gap-2">Reference</div>
                                    </th>
                                )}
                                {visibleColumns.office_code && (
                                    <th
                                        className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                        onClick={() => handleSort('office_code')}
                                    >
                                        <div className="flex items-center gap-2">Office</div>
                                    </th>
                                )}
                                {visibleColumns.actions && (
                                    <th className="px-4 py-3 text-left font-semibold text-white bg-[#370001]">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.data.length === 0 ? (
                                <tr>
                                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No transactions added yet.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>"Add Transaction"</strong> to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                transactions.data.map((tx, index) => (
                                    <AnimatedTableRow
                                        key={tx.transactionID}
                                        index={index}
                                        data-record-id={tx.transactionID}
                                        className="border-b transition-colors hover:bg-muted/40"
                                    >
                                        {visibleColumns.transaction_type && (
                                            <td className="px-4 py-3 truncate">
                                                <span
                                                    className={
                                                        'px-2 py-1 rounded-full text-xs font-semibold ' +
                                                        (tx.transaction_type === 'ISSUE'
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-green-100 text-green-700')
                                                    }
                                                >
                                                    {tx.transaction_type}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.transaction_date && (
                                            <td className="px-4 py-3 truncate">{formatDate(tx.transaction_date)}</td>
                                        )}
                                        {visibleColumns.item_name && (
                                            <td
                                                className="px-4 py-3 truncate"
                                                title={`${tx.item_name}${tx.description ? ` - ${tx.description}` : ''}`}
                                            >
                                                {tx.item_name}
                                                {tx.description ? ` - ${tx.description}` : ''}
                                            </td>
                                        )}
                                        {visibleColumns.unit_name && (
                                            <td className="px-4 py-3 truncate">{tx.unit?.unit_short_name ?? '—'}</td>
                                        )}
                                        {visibleColumns.quantity && (
                                            <td className="px-4 py-3 text-left truncate">{tx.quantity}</td>
                                        )}
                                        {visibleColumns.reference && (
                                            <td className="px-4 py-3 truncate">{tx.reference}</td>
                                        )}
                                        {visibleColumns.office_code && (
                                            <td className="px-4 py-3 truncate">{tx.office?.office_code ?? '—'}</td>
                                        )}
                                        {visibleColumns.actions && (
                                            <td className="px-4 py-3 text-left">
                                                <div className="flex items-center justify-start gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(tx)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="size-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteModal(tx.transactionID)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Archive"
                                                    >
                                                        <Archive className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </AnimatedTableRow>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {transactions.data.length > 0 && (
                    <div className="shrink-0">
                        <Pagination meta={transactions} />
                    </div>
                )}
            </div>
        </div>

            <TransactionAddForm
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                units={units}
                fundClusters={fundClusters}
                offices={offices}
                stockItems={stockItems}
            />
            <TransactionEditForm
                open={editOpen}
                onOpenChange={setEditOpen}
                transaction={selectedTransaction}
                units={units}
                fundClusters={fundClusters}
                offices={offices}
                stockItems={stockItems}
            />
            <TransactionViewForm
                open={viewOpen}
                onOpenChange={setViewOpen}
                transaction={selectedTransaction}
            />
            <TransactionDeleteModal
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                transactionID={transactionToDelete}
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
            title: 'Transaction Logs',
            href: '/transaction-logs',
        },
    ],
};