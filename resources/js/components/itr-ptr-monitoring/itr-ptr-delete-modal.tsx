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
}

export default function ItrPtrDeleteModal({ open, onOpenChange, itemId }: Props) {
    const [processing, setProcessing] = useState(false);

    const confirmDelete = () => {
        if (!itemId) {
return;
}

        setProcessing(true);

        router.delete(`/itr-ptr-monitoring/${itemId}`, {
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
                    <DialogTitle className="text-red-600">Delete Record</DialogTitle>
                </DialogHeader>
                
                <div className="py-4">
                    <p className="font-semibold text-red-600 text-sm mb-2">Warning: Cascading Deletion</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete this record? <strong>Deleting this ITR/PTR record will also automatically delete all linked Pre-Repair and For Disposal records.</strong>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        This action cannot be undone.
                    </p>
                </div>
                
                <DialogFooter className="gap-3 sm:space-x-2">
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
