import { Head, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { RefreshCw, ClipboardCheck, FileText, Truck } from 'lucide-react';
import { CalendarButton } from '@/calendar/components/calendar-button';
import { StatCard } from '@/components/stat-card';
import { DueDeliveries, type DueDelivery } from '@/components/due-deliveries';
import { PoLettersStatusChart, type POLetterStatusRow } from '@/components/po-letter-status-chart';
import { dashboard } from '@/routes';

type DashboardPageProps = {
    deliveries?: DueDelivery[];
    poLettersStatus?: POLetterStatusRow[];
    pendingInspections?: number;
    pendingClearances?: number;
    pendingDeliveries?: number;
};

export default function Dashboard() {
    const {
        deliveries,
        poLettersStatus,
        pendingInspections,
        pendingClearances,
        pendingDeliveries,
    } = usePage<DashboardPageProps>().props;

    const [isRefreshing, setIsRefreshing] = useState(false);

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
                        label="Pending Inspections (P.I.R)"
                        value={pendingInspections ?? 42}
                        change="+ 5 last week"
                        icon={ClipboardCheck}
                        iconClassName="bg-amber-100 text-amber-600"
                    />
                    <StatCard
                        label="Pending Clearances"
                        value={pendingClearances ?? 18}
                        change="+ 5 last week"
                        icon={FileText}
                        iconClassName="bg-rose-100 text-rose-500"
                    />
                    <StatCard
                        label="Pending Deliveries"
                        value={pendingDeliveries ?? 15}
                        change="+ 5 last week"
                        icon={Truck}
                        iconClassName="bg-blue-100 text-blue-500"
                    />

                    <div className="row-span-1 md:row-span-2">
                        <DueDeliveries deliveries={deliveries} />
                    </div>

                    <div className="md:col-span-3">
                        <PoLettersStatusChart data={poLettersStatus} />
                    </div>
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