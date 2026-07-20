import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    poNumber: string | null;
}

export default function PurchaseOrderDeleteModal({
    open,
    onOpenChange,
    poNumber,
}: Props) {
    const [processing, setProcessing] = useState(false);

    const confirmDelete = () => {
        if (!poNumber) return;

        setProcessing(true);

        router.delete(`/purchase-orders/${encodeURIComponent(poNumber)}`, {
            onSuccess: () => {
                onOpenChange(false);
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
                        Confirm Delete
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete purchase order{' '}
                        {poNumber ? (
                            <span className="font-medium text-foreground">
                                {poNumber}
                            </span>
                        ) : (
                            'this purchase order'
                        )}
                        ? This action cannot be undone.
                    </p>
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