import { router, usePage } from '@inertiajs/react';
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
    fundClusterId: string | null;
}

export default function FundClusterDeleteModal({ open, onOpenChange, fundClusterId }: Props) {
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const confirmDelete = () => {
        if (!fundClusterId) {
return;
}

        setProcessing(true);
        setErrorMessage(null);

        router.delete(`/fund-clusters/${fundClusterId}`, {
            onSuccess: () => {
                onOpenChange(false);
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

                if (!next) {
setErrorMessage(null);
}
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-black">Confirm Archive</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to archive fund cluster{' '}
                        {fundClusterId ? (
                            <span className="font-medium text-foreground">
                                {fundClusterId}
                            </span>
                        ) : (
                            'this fund cluster'
                        )}
                        ?
                    </p>
                    {errorMessage && (
                        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                            {errorMessage.includes('\n') ? (
                                <>
                                    <p>{errorMessage.split('\n')[0]}</p>
                                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                                        {errorMessage.split('\n').slice(1).map((line, i) => (
                                            <li key={i}>{line}</li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <p>{errorMessage}</p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        className='bg-[#612A35]'
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
