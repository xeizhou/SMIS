import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface CreatedOffice {
    id: number;
    clearance_office_name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName?: string;
    onCreated: (office: CreatedOffice) => void;
}

export default function OfficeQuickAddModal({ open, onOpenChange, initialName = '', onCreated }: Props) {
    const [name, setName] = useState(initialName);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setName(initialName);
            setError('');
        }
    }, [open, initialName]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // don't bubble into the parent form
        setProcessing(true);
        setError('');

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            const res = await fetch('/clearance/offices/quick-add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token ?? '',
                },
                body: JSON.stringify({ clearance_office_name: name }),
            });

            if (!res.ok) {
                if (res.status === 422) {
                    const body = await res.json();
                    setError(body.errors?.clearance_office_name?.[0] ?? 'Invalid input.');
                } else if (res.status === 419) {
                    setError('Session expired. Please refresh the page.');
                } else {
                    setError('Something went wrong. Please try again.');
                }
                return;
            }

            onCreated(await res.json());
            onOpenChange(false);
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Quick-Add Office</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="mt-2 space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                            Office Name<span className="text-red-500"> *</span>
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Library"
                            autoFocus
                        />
                        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} style={{ backgroundColor: '#612A35' }} className="text-white">
                            {processing ? 'Adding...' : 'Add Office'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}