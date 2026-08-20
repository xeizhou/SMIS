import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface CreatedSupplier {
    supplier_id: number;
    supplier_name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName?: string;
    onCreated: (supplier: CreatedSupplier) => void;
}

const labelClass = 'mb-1 block text-sm text-foreground';

export default function SupplierQuickAddModal({ open, onOpenChange, initialName = '', onCreated }: Props) {
    const [data, setData] = useState({
        supplier_name: initialName,
        contact_person: '',
        contact_number: '',
        email_address: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setData({
                supplier_name: initialName,
                contact_person: '',
                contact_number: '',
                email_address: '',
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

            const res = await fetch('/supplier/quick-add', {
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

            const created: CreatedSupplier = await res.json();
            onCreated(created);
            onOpenChange(false);
        } catch {
            setErrors({ supplier_name: 'Something went wrong. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Quick-Add Supplier</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="mt-2 space-y-3">
                    <div>
                        <label className={labelClass}>
                            Supplier Name<span className="text-red-500"> *</span>
                        </label>
                        <Input
                            name="supplier_name"
                            value={data.supplier_name}
                            onChange={handleChange}
                            placeholder="e.g. ABC Trading"
                            autoFocus
                        />
                        {errors.supplier_name && <p className="mt-1 text-xs text-red-500">{errors.supplier_name}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Contact Person</label>
                        <Input
                            name="contact_person"
                            value={data.contact_person}
                            onChange={handleChange}
                            placeholder="e.g. Juan Dela Cruz"
                        />
                        {errors.contact_person && <p className="mt-1 text-xs text-red-500">{errors.contact_person}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Contact Number</label>
                        <Input
                            name="contact_number"
                            value={data.contact_number}
                            onChange={handleChange}
                            placeholder="e.g. 09171234567"
                        />
                        {errors.contact_number && <p className="mt-1 text-xs text-red-500">{errors.contact_number}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Email Address</label>
                        <Input
                            name="email_address"
                            type="email"
                            value={data.email_address}
                            onChange={handleChange}
                            placeholder="e.g. supplier@email.com"
                        />
                        {errors.email_address && <p className="mt-1 text-xs text-red-500">{errors.email_address}</p>}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} style={{ backgroundColor: '#612A35' }} className="text-white">
                            {processing ? 'Adding...' : 'Add Supplier'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}