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
    stockNo: string | null;
}

export default function StockItemDeleteModal({ open, onOpenChange, stockNo }: Props) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const confirmDelete = () => {
        if (!stockNo) {
            return;
        }

        setProcessing(true);
        setError(null);
        router.delete(`/stock-items/${stockNo}`, {
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
                setError('Something went wrong while deleting this item.');
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-red-600">Delete Stock Item</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete this stock item? This action cannot be undone.
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
                        variant="destructive"
                        onClick={confirmDelete}
                        disabled={processing}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {processing ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}