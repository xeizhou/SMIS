// QUERY FOR DUE DELIVERY
// 'deliveries' => Delivery::whereNotNull('due_date')
//     ->where('due_date', '>=', now())
//     ->orderBy('due_date')
//     ->with('supplier:supplier_id,supplier_name')
//     ->get(['delivery_id', 'po_number', 'due_date', 'status', 'end_user', 'supplier_id']),


import { Head, usePage } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { CalendarButton } from '@/calendar/components/calendar-button';
import { DueDeliveries, type DueDelivery } from '@/components/due-deliveries';
import { dashboard } from '@/routes';

type DashboardPageProps = {
    deliveries?: DueDelivery[];
};

export default function Dashboard() {
    const { deliveries } = usePage<DashboardPageProps>().props;

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Welcome to Dashboard, User!</h1>
                    <CalendarButton />
                </div>

                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>

                    <div className="row-span-1 md:row-span-2">
                        <DueDeliveries deliveries={deliveries} />
                    </div>
                </div>

                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
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
