import { Head, Link, router } from '@inertiajs/react';
import { auditLogsHighlight } from './auditLogsHighlight';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface AuditLog {
    log_id: number;
    timestamp: string;
    user: string;
    role: string;
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
    from: number;
    to: number;
    total: number;
}

interface Props {
    logs: PaginatedData;
    filters: {
        search: string;
        role: string;
    };
}

export default function Index({ logs, filters }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'All');

    

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== filters.search || roleFilter !== filters.role) {
                router.get(
                    '/audit-logs',
                    { search: searchQuery, role: roleFilter },
                    { preserveState: true, replace: true }
                );
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, roleFilter, filters.search, filters.role]);

    const handleClear = () => {
        setSearchQuery('');
        setRoleFilter('All');
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
                            <SelectTrigger className={`w-full sm:w-[180px] ${roleFilter === 'All' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="Filter by Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">Filter by Role</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Staff">Staff</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="secondary">
                            Search
                        </Button>
                        <Button type="button" variant="ghost" onClick={handleClear}>
                            Clear
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
                                <th className="px-4 py-3 text-left font-semibold text-white">Log ID</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Timestamp</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">User</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Role</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.length > 0 ? (
                                logs.data.map((row) => (
                                    <tr 
                                        key={row.log_id} 
                                        data-record-id={row.log_id}
                                        className="transition-colors duration-1000 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                            {row.log_id}
                                        </td>
                                        <td className="px-4 py-3">{row.timestamp}</td>
                                        <td className="px-4 py-3">{row.user}</td>
                                        <td className="px-4 py-3">{row.role}</td>
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
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No audit logs found.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>

                {logs.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {logs.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url ?? '#'}
                                preserveScroll
                                preserveState
                                className={
                                    'px-3 py-1.5 rounded-md text-sm border transition-colors ' +
                                    (link.active
                                        ? 'bg-[#612A35] text-white border-[#612A35]'
                                        : 'bg-card text-foreground border-border hover:bg-muted/50') +
                                    (!link.url
                                        ? ' opacity-40 pointer-events-none'
                                        : '')
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
            title: 'System / Administration',
            href: '#',
        },
        {
            title: 'Audit Logs',
            href: '/audit-logs',
        },
    ],
};