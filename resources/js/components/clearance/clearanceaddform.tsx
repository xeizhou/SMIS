import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OfficeOption {
    office_code: string;
    office_name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    offices: OfficeOption[];
}

const emptyForm: Record<string, string> = {
    name: '',
    office: '',
    claim_date: '',
    received_by: '',
    status: '',
    cleared: '',
    pending: '',
    remarks: '',
};

const labelClass = 'mb-1 block text-sm font-medium text-foreground';

export default function ClearanceAddForm({ open, onOpenChange, offices }: Props) {
    const [data, setData] = useState<Record<string, string>>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) {
            setData(emptyForm);
            setErrors({});
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSelectChange = (value: string, name: string) => {
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleBooleanSelectChange = (value: string, name: 'cleared' | 'pending') => {
        const nextValue = value === 'true';

        setData((prev) => {
            if (name === 'cleared') {
                return {
                    ...prev,
                    cleared: nextValue ? 'true' : 'false',
                    pending: nextValue ? 'false' : prev.pending,
                };
            }

            return {
                ...prev,
                pending: nextValue ? 'true' : 'false',
                cleared: nextValue ? 'false' : prev.cleared,
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...data,
            cleared: data.cleared === 'true',
            pending: data.pending === 'true',
        };

        router.post('/clearance', payload, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Clearance Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass} htmlFor="name">Name <span className="text-red-500">*</span></label>
                            <Input id="name" name="name" value={data.name} onChange={handleChange} placeholder="Enter full name" />
                            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="office">Office <span className="text-red-500">*</span></label>
                            <Select value={data.office} onValueChange={(value) => handleSelectChange(value, 'office')}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select office" />
                                </SelectTrigger>
                                <SelectContent>
                                    {offices.map((office) => (
                                        <SelectItem key={office.office_code} value={office.office_code}>{office.office_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.office && <p className="mt-1 text-xs text-red-500">{errors.office}</p>}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="claim_date">Claim Date <span className="text-red-500">*</span></label>
                            <Input id="claim_date" type="date" name="claim_date" value={data.claim_date} onChange={handleChange} />
                            {errors.claim_date && <p className="mt-1 text-xs text-red-500">{errors.claim_date}</p>}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="received_by">Received By <span className="text-red-500">*</span></label>
                            <Input id="received_by" name="received_by" value={data.received_by} onChange={handleChange} placeholder="Enter receiver name" />
                            {errors.received_by && <p className="mt-1 text-xs text-red-500">{errors.received_by}</p>}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="status">Status <span className="text-red-500">*</span></label>
                            <Input id="status" name="status" value={data.status} onChange={handleChange} placeholder="e.g. Retired" />
                            {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status}</p>}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="cleared">Cleared <span className="text-red-500">*</span></label>
                            <Select value={data.cleared} onValueChange={(value) => handleBooleanSelectChange(value, 'cleared')}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select cleared" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">True</SelectItem>
                                    <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.cleared && <p className="mt-1 text-xs text-red-500">{errors.cleared}</p>}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="pending">Pending <span className="text-red-500">*</span></label>
                            <Select value={data.pending} onValueChange={(value) => handleBooleanSelectChange(value, 'pending')}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select pending" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">True</SelectItem>
                                    <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.pending && <p className="mt-1 text-xs text-red-500">{errors.pending}</p>}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="remarks">Remarks</label>
                        <textarea id="remarks" name="remarks" value={data.remarks} onChange={handleChange} rows={3} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Add any remarks or notes" />
                        {errors.remarks && <p className="mt-1 text-xs text-red-500">{errors.remarks}</p>}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" style={{ backgroundColor: '#612A35' }}>Save Record</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
