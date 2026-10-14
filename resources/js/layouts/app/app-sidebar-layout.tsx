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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { flash } = usePage().props as any;

    const [errorModalVisible, setErrorModalVisible] = useState(false);

    useEffect(() => {
        if (flash?.error_modal) {
            setErrorModalVisible(true);
        } else {
            setErrorModalVisible(false);
        }
    }, [flash?.error_modal, flash?.uuid]);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />

                {children}

                <Dialog
                    open={errorModalVisible}
                    onOpenChange={setErrorModalVisible}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertCircle className="size-5" />
                                Record Not Found
                            </DialogTitle>
                            <DialogDescription className="pt-2 text-base">
                                {flash?.error_modal}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="sm:justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => setErrorModalVisible(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AppContent>
        </AppShell>
    );
}
