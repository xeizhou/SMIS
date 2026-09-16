import { router } from '@inertiajs/react';
import { useState } from 'react';
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
    transactionID: number | null;
}

export default function TransactionDeleteModal({ open, onOpenChange, transactionID }: Props) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const confirmArchive = () => {
        if (!transactionID) {
            return;
        }

        setProcessing(true);
        setError(null);
        router.delete(`/transaction-logs/${transactionID}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = (page.props as any)?.flash;
                if (flash?.error) {
                    setError(flash.error);
                    return;
                }
                onOpenChange(false);
            },
            onError: () => {
                setError('Something went wrong while archiving this transaction.');
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-black">Confirm Archive</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to archive this transaction record? You can restore it later from the Document Center.
                    </p>
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={confirmArchive}
                        disabled={processing}
                        style={{ backgroundColor: '#612A35' }}
                        className="text-white hover:opacity-90"
                    >
                        {processing ? 'Archiving...' : 'Archive'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}