import { Head, Link, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import Pagination from '@/components/Pagination';
import { auditLogsHighlight } from './auditLogsHighlight';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface AuditLog {
    log_id: number;
    timestamp: string;
    user: string;
    avatar_url: string | null;
    role: string;
    module: string;
    reference: string | null;
    action: string;
    target_url: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedData {
    data: AuditLog[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    logs: PaginatedData;
    filters: {
        search: string;
        role: string;
        module: string;
        action: string;
        date_range: string;
        per_page: number;
    };
    userActions: string[];
}

export default function Index({ logs, filters, userActions }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'All');
    const [moduleFilter, setModuleFilter] = useState(filters.module || 'All');
    const [actionFilter, setActionFilter] = useState(filters.action || 'All');
    const [dateFilter, setDateFilter] = useState(filters.date_range || 'All Time');

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (
                searchQuery !== filters.search ||
                roleFilter !== filters.role ||
                moduleFilter !== filters.module ||
                actionFilter !== filters.action ||
                dateFilter !== filters.date_range
            ) {
                router.get(
                    '/audit-logs',
                    { 
                        search: searchQuery, 
                        role: roleFilter,
                        module: moduleFilter,
                        action: actionFilter,
                        date_range: dateFilter,
                        per_page: filters.per_page,
                    },
                    { preserveState: true, replace: true }
                );
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, roleFilter, moduleFilter, actionFilter, dateFilter, filters]);

    const handleClear = () => {
        setSearchQuery('');
        setRoleFilter('All');
        setModuleFilter('All');
        setActionFilter('All');
        setDateFilter('All Time');
    };

    return (
        <>
            <Head title="Audit Logs" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        Audit Logs
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Track and review all system activities, actions, and user events.
                    </p>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search..."
                                className="pl-9 bg-white dark:bg-gray-900 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className={`w-full sm:w-[150px] ${roleFilter === 'All' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Roles</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Staff">Staff</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={moduleFilter} onValueChange={setModuleFilter}>
                            <SelectTrigger className={`w-full sm:w-[220px] ${moduleFilter === 'All' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="Module" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Modules</SelectItem>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel>ASSETS</SelectLabel>
                                    <SelectItem value="RRPPE Monitoring">RRPPE Monitoring</SelectItem>
                                    <SelectItem value="RRSP Monitoring">RRSP Monitoring</SelectItem>
                                    <SelectItem value="RegSPI Monitoring">RegSPI Monitoring</SelectItem>
                                    <SelectItem value="ITR PTR">ITR PTR</SelectItem>
                                    <SelectItem value="For Disposal">For Disposal</SelectItem>
                                    <SelectItem value="Bona Vida">Bona Vida</SelectItem>
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel>PROCUREMENT</SelectLabel>
                                    <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                                    <SelectItem value="PO Letter Monitoring">PO Letter Monitoring</SelectItem>
                                    <SelectItem value="Delivery">Delivery</SelectItem>
                                    <SelectItem value="Supplier List">Supplier List</SelectItem>
                                    <SelectItem value="Fund Clusters">Fund Clusters</SelectItem>
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel>PERSONNEL FILES</SelectLabel>
                                    <SelectItem value="Employee File Locator">Employee File Locator</SelectItem>
                                    <SelectItem value="Offices">Offices</SelectItem>
                                    <SelectItem value="Clearance">Clearance</SelectItem>
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel>STOCK CARDS</SelectLabel>
                                    <SelectItem value="Stock Items">Stock Items</SelectItem>
                                    <SelectItem value="Units">Units</SelectItem>
                                    <SelectItem value="Transactions">Transactions</SelectItem>
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel>SYSTEM</SelectLabel>
                                    <SelectItem value="System Audit Logs">System Audit Logs</SelectItem>
                                    <SelectItem value="Notifications">Notifications</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>

                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className={`w-full sm:w-[220px] ${actionFilter === 'All' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Actions</SelectItem>
                                {userActions?.map((action, i) => (
                                    <SelectItem key={i} value={action}>{action}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className={`w-full sm:w-[180px] ${dateFilter === 'All Time' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All Time">All Time</SelectItem>
                                <SelectItem value="Today">Today</SelectItem>
                                <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                                <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" onClick={handleClear}>
                            Clear Filters
                        </Button>
                    </div>
                </div>

                <div>
                    <div className="overflow-hidden rounded-xl border border-border bg-card overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead
                            className="border-b"
                            style={{ backgroundColor: '#370001' }}
                        >
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">Date & Time</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">User</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Role</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Module</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Reference</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Action Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.length > 0 ? (
                                logs.data.map((row, index) => (
                                    <AnimatedTableRow
                                        key={row.log_id}
                                        index={index}
                                        data-record-id={row.log_id}
                                        className="transition-colors duration-1000 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                                    >
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                            {row.timestamp}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {row.avatar_url ? (
                                                    <img
                                                        src={row.avatar_url}
                                                        alt={row.user}
                                                        className="size-7 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                        {row.user.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span>{row.user}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{row.role}</td>
                                        <td className="px-4 py-3">{row.module}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                            {row.reference || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                            {row.target_url ? (
                                                <Link
                                                    href={row.target_url}
                                                    onClick={() => {
                                                        const url = new URL(row.target_url!, 'http://localhost');
                                                        const highlightSearch = url.searchParams.get('highlight_search') || url.searchParams.get('highlight_id');
                                                        if (highlightSearch) {
                                                            auditLogsHighlight(highlightSearch, url.pathname);
                                                        }
                                                    }}
                                                    className="font-bold text-gray-900 underline hover:text-blue-600 dark:text-gray-50 dark:hover:text-blue-400"
                                                >
                                                    {row.action}
                                                </Link>
                                            ) : (
                                                <span className="font-bold text-gray-900 underline dark:text-gray-50">{row.action}</span>
                                            )}
                                        </td>
                                    </AnimatedTableRow>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            {(moduleFilter !== 'All' || actionFilter !== 'All' || dateFilter !== 'All Time' || roleFilter !== 'All' || searchQuery) 
                                                ? 'No audit logs found matching your filters.' 
                                                : 'No audit logs found.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>

                {logs.data.length > 0 && (
                    <div className="p-4">
                        <Pagination meta={logs} />
                    </div>
                )}
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'System / Administration',
            href: '#',
        },
        {
            title: 'Audit Logs',
            href: '/audit-logs',
        },
    ],
};