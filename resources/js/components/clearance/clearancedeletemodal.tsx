import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ClearanceRecord {
    clearance_id: number;
    name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: ClearanceRecord | null;
}

export default function ClearanceDeleteModal({ open, onOpenChange, record }: Props) {
    const [processing, setProcessing] = useState(false);

    const confirmDelete = () => {
        if (!record) {
            return;
        }

        setProcessing(true);

        router.delete(`/clearance/${record.clearance_id}`, {
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
                    <DialogTitle className="text-black">Confirm Delete</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete this clearance record? This action cannot be undone.
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" variant="destructive" onClick={confirmDelete} disabled={processing} className="bg-red-600 hover:bg-red-700 text-white">
                        {processing ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
