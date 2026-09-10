import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { useSessionHeartbeat } from '@/hooks/use-session-heartbeat';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    // Only authenticated pages render through this layout (see the switch
    // in app.tsx: 'welcome' and 'auth/*' pages use different layouts) —
    // so this is the right place for the heartbeat, not app.tsx globally.
    useSessionHeartbeat();

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </AppLayoutTemplate>
    );
}