import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
    poNumber: string | null;
}

interface FlashProps {
    success?: string;
    error?: string;}

export default function PurchaseOrderDeleteModal({
    open,
    onOpenChange,
    poNumber,
}: Props) {
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setErrorMessage(null);
        }
    }, [open]);

    const confirmDelete = () => {
        if (!poNumber) {
            return;
        }

        setProcessing(true);
        setErrorMessage(null);

        router.delete(`/purchase-orders/${encodeURIComponent(poNumber)}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = page.props.flash as FlashProps;

                if (flash?.error) {
                    setErrorMessage(flash.error);
                } else {
                    onOpenChange(false);
                }
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-black">
                        Confirm Archive
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to archive purchase order{' '}
                        {poNumber ? (
                            <span className="font-medium text-foreground">
                                {poNumber}
                            </span>
                        ) : (
                            'this purchase order'
                        )}
                        ?
                    </p>

                    {errorMessage && (
                        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                            {errorMessage.includes('\n') ? (
                                <>
                                    <p>{errorMessage.split('\n')[0]}</p>
                                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                                        {errorMessage.split('\n').slice(1).map((line, i) => (
                                            <li key={i}>{line}</li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <p>{errorMessage}</p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        onClick={confirmDelete}
                        disabled={processing}
                    >
                        {processing ? 'Archiving...' : 'Archive'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}