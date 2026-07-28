import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Office {
    office_code: string;
    office_name: string;
}

interface BonaVidaRecord {
    bvm_id: number;
    date_received: string;
    office_code: string;
    qty: number;
    price: string;
    total_amount: string;
    invoice_no: number;
    invoice_date: string;
    remarks: string | null;
    office?: {
        office_name: string;
    };
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: BonaVidaRecord | null;
    offices: Office[];
}

const emptyForm: Record<string, string> = {
    date_received: '',
    office_code: '',
    qty: '',
    price: '',
    total_amount: '',
    invoice_no: '',
    invoice_date: '',
    remarks: '',
};

const labelClass = 'mb-1 block text-sm font-medium text-foreground';

export default function BonaVidaEditForm({ open, onOpenChange, record, offices }: Props) {
    const [data, setData] = useState<Record<string, string>>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (record) {
            setData({
                date_received: record.date_received ? record.date_received.split('T')[0] : '',
                office_code: record.office_code,
                qty: record.qty.toString(),
                price: record.price,
                total_amount: record.total_amount,
                invoice_no: record.invoice_no.toString(),
                invoice_date: record.invoice_date ? record.invoice_date.split('T')[0] : '',
                remarks: record.remarks ?? '',
            });
            setErrors({});
        }
    }, [record]);

    // Automatically calculate total amount when qty or price changes
    useEffect(() => {
        const qty = parseFloat(data.qty) || 0;
        const price = parseFloat(data.price) || 0;
        if (qty > 0 && price > 0) {
            setData((prev) => ({ ...prev, total_amount: (qty * price).toFixed(2) }));
        }
    }, [data.qty, data.price]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!record) {
            return;
        }

        router.put(`/bona-vida-monitoring/${record.bvm_id}`, data, {
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
                    <DialogTitle>Edit Bona Vida Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass} htmlFor="edit_date_received">
                                Date Received <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="edit_date_received"
                                name="date_received"
                                type="date"
                                value={data.date_received}
                                onChange={handleChange}
                            />
                            {errors.date_received && (
                                <p className="mt-1 text-xs text-red-500">{errors.date_received}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="edit_office_code">
                                Office <span className="text-red-500">*</span>
                            </label>
                            <Select value={data.office_code} onValueChange={(value) => handleSelectChange(value, 'office_code')}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select office" />
                                </SelectTrigger>
                                <SelectContent>
                                    {offices.map((office) => (
                                        <SelectItem key={office.office_code} value={office.office_code}>
                                            {office.office_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.office_code && (
                                <p className="mt-1 text-xs text-red-500">{errors.office_code}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="edit_qty">
                                Quantity <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="edit_qty"
                                name="qty"
                                type="number"
                                min="1"
                                value={data.qty}
                                onChange={handleChange}
                            />
                            {errors.qty && (
                                <p className="mt-1 text-xs text-red-500">{errors.qty}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="edit_price">
                                Price <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="edit_price"
                                name="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.price}
                                onChange={handleChange}
                            />
                            {errors.price && (
                                <p className="mt-1 text-xs text-red-500">{errors.price}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="edit_total_amount">
                                Total Amount <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="edit_total_amount"
                                name="total_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.total_amount}
                                onChange={handleChange}
                            />
                            {errors.total_amount && (
                                <p className="mt-1 text-xs text-red-500">{errors.total_amount}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="edit_invoice_no">
                                Invoice No <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="edit_invoice_no"
                                name="invoice_no"
                                value={data.invoice_no}
                                onChange={handleChange}
                            />
                            {errors.invoice_no && (
                                <p className="mt-1 text-xs text-red-500">{errors.invoice_no}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="edit_invoice_date">
                                Invoice Date <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="edit_invoice_date"
                                name="invoice_date"
                                type="date"
                                value={data.invoice_date}
                                onChange={handleChange}
                            />
                            {errors.invoice_date && (
                                <p className="mt-1 text-xs text-red-500">{errors.invoice_date}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="edit_remarks">
                            Remarks
                        </label>
                        <Input
                            id="edit_remarks"
                            name="remarks"
                            value={data.remarks}
                            onChange={handleChange}
                        />
                        {errors.remarks && (
                            <p className="mt-1 text-xs text-red-500">{errors.remarks}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" style={{ backgroundColor: '#612A35' }}>
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
