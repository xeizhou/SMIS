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

    const confirmArchive = () => {
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
                    <DialogTitle className="text-black">Confirm Archive</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to archive this clearance record? You can restore it later from the Document Center.
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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