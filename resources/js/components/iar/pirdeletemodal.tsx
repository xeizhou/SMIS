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
    pirID: number | null;
}

export default function PirDeleteModal({ open, onOpenChange, pirID }: Props) {
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const confirmDelete = () => {
        if (!pirID) return;

        setProcessing(true);
        setErrorMessage(null);

        router.delete(`/iar/${pirID}`, {
            onSuccess: (page) => {
                const errors = (page.props.errors as Record<string, string>) ?? {};
                if (errors.delete) {
                    setErrorMessage(errors.delete);
                } else {
                    onOpenChange(false);
                }
            },
            onError: (errors) => {
                if (errors.delete) {
                    setErrorMessage(errors.delete);
                }
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next);
                if (!next) setErrorMessage(null);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-red-600">Delete PIR Record</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete this PIR record? This action cannot be undone.
                    </p>
                    {errorMessage && (
                        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                            {errorMessage}
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