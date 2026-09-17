import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemId: number | null;
    identifierValue?: string | null;
}

export default function ForDisposalDeleteModal({ open, onOpenChange, itemId, identifierValue }: Props) {
    const [processing, setProcessing] = useState(false);
    const [warningOpen, setWarningOpen] = useState(false);
    const [warningMessage, setWarningMessage] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setWarningMessage(null);
            setWarningOpen(false);
        }
    }, [open]);

    const confirmDelete = () => {
        if (!itemId) return;

        setProcessing(true);

        router.delete(`/for-disposal-monitoring/${itemId}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = (page.props as any)?.flash;

                if (flash?.error) {
                    setWarningMessage(flash.error);
                    onOpenChange(false);
                    setTimeout(() => setWarningOpen(true), 150);
                } else {
                    onOpenChange(false);
                }
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Archive</DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Are you sure you want to archive For Disposal record{' '}
                            {identifierValue ? (
                                <span className="font-medium text-foreground">{identifierValue}</span>
                            ) : (
                                'this record'
                            )}
                            ?
                        </p>
                    </div>
                    
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button 
                            className="bg-[#612A35]"
                            type="button" 
                            onClick={confirmDelete} 
                            disabled={processing}
                        >
                            {processing ? 'Archiving...' : 'Archive'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Warning
                        </DialogTitle>
                    </DialogHeader>

                    <div className="pb-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Cannot archive For Disposal record{' '}
                            {identifierValue ? (
                                <span className="font-medium text-foreground">{identifierValue}</span>
                            ) : (
                                'this record'
                            )}
                            .
                        </p>
                    </div>

                    <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                        {warningMessage?.includes('\n') ? (
                            <>
                                <p>{warningMessage.split('\n')[0]}</p>
                                <ul className="list-disc pl-5 mt-3 space-y-0.5">
                                    {warningMessage
                                        .split('\n')
                                        .slice(1)
                                        .filter((line) => line.trim() !== '')
                                        .map((line, i) =>
                                            line.startsWith('- ') ? (
                                                <li key={i} className="list-[circle] ml-5">
                                                    {line.substring(2)}
                                                </li>
                                            ) : (
                                                <li key={i}>{line}</li>
                                            ),
                                        )}
                                </ul>
                            </>
                        ) : (
                            <p>{warningMessage}</p>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" onClick={() => setWarningOpen(false)}>
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
