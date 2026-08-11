import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { errors, flash } = usePage().props as any;
    
    const hasErrors = errors && Object.keys(errors).length > 0;
    const firstError = hasErrors ? Object.values(errors)[0] as string : null;
    const errorMessage = flash?.error || flash?.deleteError || firstError;
    const successMessage = flash?.success;
    const infoMessage = flash?.message || flash?.status;

    const alertMessage = errorMessage || successMessage || infoMessage;
    
    // Determine the variant and icon
    const isError = !!errorMessage;
    const isSuccess = !!successMessage;

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (alertMessage) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 5000);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [alertMessage, flash?.uuid]);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                
                {typeof window !== 'undefined' && createPortal(
                    <div 
                        className={`fixed bottom-6 right-6 z-[999999] w-full max-w-md shadow-2xl transition-all duration-500 ease-in-out pointer-events-none ${
                            isVisible && alertMessage 
                                ? 'translate-x-0 opacity-100' 
                                : 'translate-x-[120%] opacity-0'
                        }`}
                    >
                        <div className="pointer-events-auto">
                            <Alert 
                                variant={isError ? "destructive" : "default"} 
                                className={`p-5 [&>svg]:size-6 has-[>svg]:grid-cols-[calc(var(--spacing)*6)_1fr] ${isSuccess ? "border-green-500 text-green-700 dark:text-green-400 dark:border-green-800 bg-background" : "bg-background"}`}
                            >
                                {isError ? <AlertCircle /> : isSuccess ? <CheckCircle2 /> : <Info />}
                                <AlertTitle className="text-lg font-bold mb-1">{isError ? "Error" : isSuccess ? "Success" : "Notice"}</AlertTitle>
                                <AlertDescription className="text-base opacity-90">
                                    {alertMessage}
                                </AlertDescription>
                            </Alert>
                        </div>
                    </div>,
                    document.body
                )}
                
                {children}
            </AppContent>
        </AppShell>
    );
}
