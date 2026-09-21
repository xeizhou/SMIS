import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface WmrRecord {
    id: number;
    wmr_no: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: WmrRecord | null;
}

export default function WmrDeleteModal({ open, onOpenChange, record }: Props) {
    const [processing, setProcessing] = useState(false);

    const confirmDelete = () => {
        if (!record) {
            return;
        }

        setProcessing(true);

        router.delete(`/wmr-monitoring/${record.id}`, {
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
                        Are you sure you want to archive WMR record with WMR No. {' '}
                        {record?.wmr_no ? (
                            <span className="font-medium text-foreground">{record.wmr_no}</span>
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