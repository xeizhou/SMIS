import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { errors } = usePage().props;
    const hasErrors = Object.keys(errors).length > 0;

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {hasErrors && (
                    <div className="px-4 pb-4">
                        <Alert variant="destructive">
                            <AlertCircle className="size-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc pl-4">
                                    {Object.values(errors).map((error, index) => (
                                        <li key={index}>{error as string}</li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                {children}
            </AppContent>
        </AppShell>
    );
}
