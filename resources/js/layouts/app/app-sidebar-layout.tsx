import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { usePage } from '@inertiajs/react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { errors, flash } = usePage().props as any;
    
    const hasErrors = errors && Object.keys(errors).length > 0;
    const firstError = hasErrors ? Object.values(errors)[0] as string : null;
    const errorMessage = flash?.error || firstError;
    const successMessage = flash?.success;
    const infoMessage = flash?.message;

    const alertMessage = errorMessage || successMessage || infoMessage;
    
    // Determine the variant and icon
    const isError = !!errorMessage;
    const isSuccess = !!successMessage;

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                
                {alertMessage && (
                    <div className="px-4 pt-4 md:px-6 md:pt-6 pb-2">
                        <Alert variant={isError ? "destructive" : "default"} className={isSuccess ? "border-green-500 text-green-700 dark:text-green-400 dark:border-green-800" : ""}>
                            {isError ? <AlertCircle className="h-4 w-4" /> : isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                            <AlertTitle>{isError ? "Error" : isSuccess ? "Success" : "Notice"}</AlertTitle>
                            <AlertDescription>
                                {alertMessage}
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                
                {children}
            </AppContent>
        </AppShell>
    );
}
