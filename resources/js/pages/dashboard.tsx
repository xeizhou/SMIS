import { Head, usePage, router } from '@inertiajs/react';
import { RefreshCw, ClipboardCheck, FileText, Truck, Bell } from 'lucide-react';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarButton } from '@/calendar/components/calendar-button';
import { DueDeliveries  } from '@/components/due-deliveries';
import type {DueDelivery} from '@/components/due-deliveries';

import { RecentActivity  } from '@/components/recent-activity';
import type {RecentActivityRow} from '@/components/recent-activity';
import { StatCard } from '@/components/stat-card';
import { dashboard } from '@/routes';

type DashboardPageProps = {
    deliveries?: DueDelivery[];
    pendingInspections?: number;
    pendingClearances?: number;
    pendingDeliveries?: number;
    recentActivity?: RecentActivityRow[];
};

export default function Dashboard() {
    const {
        deliveries,
        pendingInspections,
        pendingClearances,
        pendingDeliveries,
        recentActivity,
    } = usePage<DashboardPageProps>().props;

    const [isRefreshing, setIsRefreshing] = useState(false);

    const mockNotifications = [
        { id: 1, message: 'New delivery arrived: PR-001', url: '/pre-repair-monitoring?highlight_search=PR-001' },
        { id: 2, message: 'New delivery arrived: DEL-023', url: '/deliveries?highlight_search=DEL-023' },
    ];

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => setIsRefreshing(false),
        });
    };

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Welcome to Dashboard, User!</h1>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="relative flex items-center justify-center rounded-md border border-sidebar-border/70 p-2 text-neutral-600 transition hover:bg-neutral-100 dark:border-sidebar-border dark:text-neutral-300 dark:hover:bg-neutral-800">
                                    <Bell className="size-4" />
                                    {mockNotifications.length > 0 && (
                                        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                                            {mockNotifications.length}
                                        </span>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                {mockNotifications.length === 0 ? (
                                    <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
                                ) : (
                                    mockNotifications.map(notif => (
                                        <DropdownMenuItem key={notif.id} onClick={() => router.visit(notif.url)} className="cursor-pointer">
                                            {notif.message}
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-1.5 rounded-md border border-sidebar-border/70 px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-sidebar-border dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <CalendarButton />
                    </div>
                </div>

                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <StatCard
                        label="Pending Deliveries"
                        value={pendingDeliveries ?? 15}
                        change="+ 5 last week"
                        icon={Truck}
                        iconClassName="bg-blue-100 text-blue-500"
                    />
                    <StatCard
                        label="Pending Inspections"
                        value={pendingInspections ?? 42}
                        change="+ 5 last week"
                        icon={ClipboardCheck}
                        iconClassName="bg-amber-100 text-amber-600"
                    />
                    <StatCard
                        label="Pending Issuance"
                        value={pendingClearances ?? 18}
                        change="+ 5 last week"
                        icon={FileText}
                        iconClassName="bg-rose-100 text-rose-500"
                    />

                    <div className="row-span-1 md:row-span-2">
                        <DueDeliveries deliveries={deliveries} />
                    </div>
                    
                    {/* <div className="md:col-span-4">
                        <RecentActivity data={recentActivity} />
                    </div> */}
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};