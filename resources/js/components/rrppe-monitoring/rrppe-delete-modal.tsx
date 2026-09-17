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
    itemId: number | null;
    rrppeNo?: string;
}

export default function RrppeDeleteModal({
    open,
    onOpenChange,
    itemId,
    rrppeNo,
}: Props) {
    const [processing, setProcessing] = useState(false);

    const confirmDelete = () => {
        if (!itemId) {
            return;
        }

        setProcessing(true);

        router.delete(`/rrppe-monitoring/${itemId}`, {
            onSuccess: () => {
                onOpenChange(false);
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Confirm Archive
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to archive RRPPE record{' '}
                        {rrppeNo ? (
                            <span className="font-medium text-foreground">{rrppeNo}</span>
                        ) : (
                            'this record'
                        )}
                        ?
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