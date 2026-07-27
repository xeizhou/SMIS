import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export type RecentActivityRow = {
    log_id: number;
    timestamp: string;
    user: string;
    role: string;
    action: string;
    target_url?: string | null;
};

type Props = {
    data?: RecentActivityRow[];
};

// Mock data used as a fallback. The backend developer can override this 
// by passing a real `data` prop to the <RecentActivity data={realData} /> component.
const MOCK_ACTIVITY: RecentActivityRow[] = [
    { log_id: 1, timestamp: '2026-07-06 15:11:10', user: 'Jane D. Doe', role: 'Admin', action: 'Edited Units table', target_url: '/units' },
    { log_id: 2, timestamp: '2026-07-06 15:11:10', user: 'Alan T. Smith', role: 'Staff', action: 'Edited Offices table', target_url: '/offices' },
    { log_id: 3, timestamp: '2026-07-06 15:11:10', user: 'Aize A. Virtudazo', role: 'Staff', action: 'Added New P.O', target_url: '/purchase-orders' },
    { log_id: 4, timestamp: '2026-07-06 15:11:10', user: 'Cedric D. Galay', role: 'Staff', action: 'Added New Delivery', target_url: '/deliveries' },
    { log_id: 5, timestamp: '2026-07-06 15:11:10', user: 'Kyo Kaneko', role: 'Staff', action: 'Edited Clearance Table', target_url: '/clearance' },
    { log_id: 6, timestamp: '2026-07-06 14:30:00', user: 'Jane D. Doe', role: 'Admin', action: 'Deleted item from RRPPE', target_url: '/rrppe-monitoring' },
    { log_id: 7, timestamp: '2026-07-06 14:15:22', user: 'Alan T. Smith', role: 'Staff', action: 'Approved Waiver' },
    { log_id: 8, timestamp: '2026-07-06 13:45:10', user: 'Aize A. Virtudazo', role: 'Staff', action: 'Added new user', target_url: '/users' },
    { log_id: 9, timestamp: '2026-07-06 11:20:05', user: 'Cedric D. Galay', role: 'Staff', action: 'Updated Settings' },
    { log_id: 10, timestamp: '2026-07-06 10:10:00', user: 'Kyo Kaneko', role: 'Staff', action: 'Logged out' },
    { log_id: 11, timestamp: '2026-07-05 16:55:00', user: 'Jane D. Doe', role: 'Admin', action: 'Logged in' },
    { log_id: 12, timestamp: '2026-07-05 15:33:12', user: 'Alan T. Smith', role: 'Staff', action: 'Created Pre-Repair request', target_url: '/pre-repair-monitoring?highlight_search=PR-001' },
];

export function RecentActivity({ data }: Props) {
    const rawRows = data ?? MOCK_ACTIVITY;
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    const filteredRows = rawRows.filter((row) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
            row.user.toLowerCase().includes(searchLower) ||
            row.role.toLowerCase().includes(searchLower) ||
            row.action.toLowerCase().includes(searchLower) ||
            row.timestamp.toLowerCase().includes(searchLower) ||
            row.log_id.toString().includes(searchLower);

        const matchesRole = roleFilter === 'All' || row.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    return (
        <div className="rounded-xl border border-sidebar-border/70 bg-white dark:border-sidebar-border dark:bg-neutral-900">
            <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                    Recent Activity
                </h3>
                
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                        <Input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 w-full rounded-md pl-9 md:w-[250px]"
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Filter className="size-4" />
                                {roleFilter === 'All' ? 'Filter' : roleFilter}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setRoleFilter('All')}>All Roles</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRoleFilter('Admin')}>Admin</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRoleFilter('Staff')}>Staff</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[270px]">
                <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
                    <thead className="sticky top-0 z-10 border-y border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
                        <tr>
                            <th className="whitespace-nowrap px-6 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    Log ID <ArrowUpDown className="size-3" />
                                </div>
                            </th>
                            <th className="whitespace-nowrap px-6 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    Timestamp <ArrowUpDown className="size-3" />
                                </div>
                            </th>
                            <th className="whitespace-nowrap px-6 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    User <ArrowUpDown className="size-3" />
                                </div>
                            </th>
                            <th className="whitespace-nowrap px-6 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    Role <ArrowUpDown className="size-3" />
                                </div>
                            </th>
                            <th className="whitespace-nowrap px-6 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    Action <ArrowUpDown className="size-3" />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {filteredRows.map((row) => (
                            <tr key={row.log_id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                <td className="whitespace-nowrap px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                                    {row.log_id}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    {row.timestamp}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    {row.user}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    {row.role}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-neutral-500 dark:text-neutral-400">
                                    {row.target_url ? (
                                        <Link href={row.target_url} className="font-bold text-neutral-900 underline hover:text-blue-600 dark:text-neutral-50 dark:hover:text-blue-400">
                                            {row.action}
                                        </Link>
                                    ) : (
                                        <span className="font-bold text-neutral-900 underline dark:text-neutral-50">{row.action}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredRows.length === 0 && (
                    <div className="py-8 text-center text-neutral-500">
                        No recent activity found.
                    </div>
                )}
            </div>
        </div>
    );
}
