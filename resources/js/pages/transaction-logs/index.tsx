import { Head, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import Pagination from '@/components/Pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import TransactionAddForm from '@/components/transaction-logs/transactionaddform';
import TransactionDeleteModal from '@/components/transaction-logs/transactiondeletemodal';
import TransactionEditForm from '@/components/transaction-logs/transactioneditform';
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
    fund_cluster: string;
    fund_cluster_detail: FundCluster | null;
    transaction_date: string;
    stock_no: string | null;
    item_name: string;
    description: string | null;
    unitID: number;
    reference: string;
    quantity: number;
    office_code: string;
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

function formatDate(dateString: string) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

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
    const [fundClusterFilter, setFundClusterFilter] = useState(filters.fund_cluster ?? 'all');
    
    // Default native date states
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);

    const getFilterParams = (overrides = {}) =>
        buildFilterUrl({
            search,
            transaction_type: transactionType,
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
        setFundClusterFilter('all');
        setDateFrom('');
        setDateTo('');
        router.get(
            '/transaction-logs',
            buildFilterUrl({
                search: '', transaction_type: 'all', fund_cluster: 'all',
                date_from: '', date_to: '', page: 1,
            }),
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleEdit = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setEditOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setTransactionToDelete(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <>
            <Head title="Transaction Logs" />
            <div className="p-4 space-y-6 sm:p-6">
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
                            <SelectTrigger className="w-[220px] text-black">
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

                        {/* Native Date Range Inputs using Shadcn Input Component */}
                        <div className="flex items-center gap-2 bg-background">
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-auto text-black"
                                title="From Date"
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-auto text-black"
                                title="To Date"
                            />
                        </div>

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
                        className="w-full xl:w-auto bg-[#612A35] hover:bg-[#612A35]/90 text-white flex items-center gap-2"
                    >
                        Add Transaction
                    </Button>
                </form>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-border bg-card overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                        <colgroup>
                            <col className="w-[8%]" />   {/* Type */}
                            <col className="w-[10%]" />  {/* Date */}
                            <col className="w-[24%]" />  {/* Item Name */}
                            <col className="w-[8%]" />   {/* Unit */}
                            <col className="w-[7%]" />   {/* Qty */}
                            <col className="w-[13%]" />  {/* Reference */}
                            <col className="w-[10%]" />  {/* Office */}
                            <col className="w-[10%]" />  {/* Actions */}
                        </colgroup>
                        <thead className="border-b">
                            <tr>
                                <th 
                                    className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                    onClick={() => handleSort('transaction_type')}
                                >
                                    <div className="flex items-center gap-2">Type</div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                    onClick={() => handleSort('transaction_date')}
                                >
                                    <div className="flex items-center gap-2">Date</div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                    onClick={() => handleSort('item_name')}
                                >
                                    <div className="flex items-center gap-2">Item Name</div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                    onClick={() => handleSort('unit_name')}
                                >
                                    <div className="flex items-center gap-2">Unit</div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-center font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                    onClick={() => handleSort('quantity')}
                                >
                                    <div className="flex items-center justify-center gap-2">Qty</div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                    onClick={() => handleSort('reference')}
                                >
                                    <div className="flex items-center gap-2">Reference</div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left font-semibold text-white bg-[#370001] cursor-pointer select-none hover:bg-[#4C0002] transition-colors"
                                    onClick={() => handleSort('office_code')}
                                >
                                    <div className="flex items-center gap-2">Office</div>
                                </th>
                                {/* Make sure non-clickable headers get the background color too! */}
                                <th className="px-4 py-3 text-center font-semibold text-white bg-[#370001]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
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
                                        className="border-b transition-colors hover:bg-muted/40"
                                    >
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
                                        <td className="px-4 py-3 truncate">{formatDate(tx.transaction_date)}</td>
                                        <td
                                            className="px-4 py-3 truncate"
                                            title={`${tx.item_name}${tx.description ? ` - ${tx.description}` : ''}`}
                                        >
                                            {tx.item_name}
                                            {tx.description ? ` - ${tx.description}` : ''}
                                        </td>
                                        <td className="px-4 py-3 truncate">{tx.unit?.unit_short_name ?? '—'}</td>
                                        <td className="px-4 py-3 text-center truncate">{tx.quantity}</td>
                                        <td className="px-4 py-3 truncate">{tx.reference}</td>
                                        <td className="px-4 py-3 truncate">{tx.office?.office_code ?? '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-3">
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
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </AnimatedTableRow>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {transactions.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={transactions} />
                    </div>
                )}
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