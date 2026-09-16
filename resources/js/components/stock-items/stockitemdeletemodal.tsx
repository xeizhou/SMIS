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

    const confirmArchive = () => {
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
                setError('Something went wrong while archiving this stock item.');
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
                        Are you sure you want to archive this stock item? You can restore it later from the Document Center.
                    </p>
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-md px-3 py-2">
                            {error.includes('\n') ? (
                                <>
                                    <p>{error.split('\n')[0]}</p>
                                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                                        {error.split('\n').slice(1).map((line, i) => (
                                            <li key={i}>{line}</li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <p>{error}</p>
                            )}
                        </div>
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