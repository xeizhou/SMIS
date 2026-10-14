import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
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
    unitID: number | null;
}

export default function UnitDeleteModal({ open, onOpenChange, unitID }: Props) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setError(null);
        }
    }, [open]);

    const confirmArchive = () => {
        if (!unitID) {
            return;
        }

        setProcessing(true);
        setError(null);
        router.delete(`/units/${unitID}`, {
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
                setError('Something went wrong while archiving this unit.');
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-black">
                        Confirm Archive
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-2 py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to archive this unit? You can
                        restore it later from the Document Center.
                    </p>
                    {error && (
                        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950">
                            {error.includes('\n') ? (
                                <>
                                    <p>{error.split('\n')[0]}</p>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                                        {error
                                            .split('\n')
                                            .slice(1)
                                            .map((line, i) => (
                                                <li key={i}>
                                                    {line.replace(
                                                        /^[*•\-]\s*/,
                                                        '',
                                                    )}
                                                </li>
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
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
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
