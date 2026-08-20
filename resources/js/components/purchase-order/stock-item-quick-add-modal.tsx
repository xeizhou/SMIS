import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface CreatedStockItem {
    stock_no: string;
    item_name: string;
    description: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName?: string;
    onCreated: (item: CreatedStockItem) => void;
}

const labelClass = 'mb-1 block text-sm text-foreground';

export default function StockItemQuickAddModal({ open, onOpenChange, initialName = '', onCreated }: Props) {
    const [data, setData] = useState({
        item_name: initialName,
        description: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setData({
                item_name: initialName,
                description: '',
            });
            setErrors({});
        }
    }, [open, initialName]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');

            const res = await fetch('/stock-items/quick-add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token ?? '',
                },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const body = await res.json();
                if (body.errors) {
                    const flat = Object.fromEntries(
                        Object.entries(body.errors).map(([k, v]) => [k, (v as string[])[0]]),
                    );
                    setErrors(flat);
                }
                return;
            }

            const created: CreatedStockItem = await res.json();
            onCreated(created);
            onOpenChange(false);
        } catch {
            setErrors({ item_name: 'Something went wrong. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Quick-Add Stock Item</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="mt-2 space-y-3">
                    <div>
                        <label className={labelClass}>
                            Item Name<span className="text-red-500"> *</span>
                        </label>
                        <Input
                            name="item_name"
                            value={data.item_name}
                            onChange={handleChange}
                            placeholder="e.g. Bond Paper A4"
                            autoFocus
                        />
                        {errors.item_name && <p className="mt-1 text-xs text-red-500">{errors.item_name}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Description</label>
                        <Input
                            name="description"
                            value={data.description}
                            onChange={handleChange}
                            placeholder="e.g. Sub 20, 500 sheets/ream"
                        />
                        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Stock No. and Unit will be left unassigned. Complete them later in Stock Items.
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} style={{ backgroundColor: '#612A35' }} className="text-white">
                            {processing ? 'Adding...' : 'Add Item'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}