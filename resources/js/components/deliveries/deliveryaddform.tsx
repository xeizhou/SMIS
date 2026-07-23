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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
}

interface PurchaseOrderOption {
    po_number: string;
    supplier_id: number | null;
    supplier: SupplierOption | null;
    total_amount_po: string | number | null;
    end_user: string | null;
    due_date: string | null;
    po_received_date: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrders: PurchaseOrderOption[];
    statuses: string[];
}

interface FieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    type?: string;
    readOnly?: boolean;
    disabled?: boolean;
}

const labelClass = 'mb-1 block text-sm text-foreground';

function Field({
    label,
    name,
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
    type = 'text',
    readOnly = false,
    disabled = false,
}: FieldProps) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            <Input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                disabled={disabled}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    options: { value: string; label: string }[];
}

function SelectField({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Select...',
    options,
}: SelectFieldProps) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

const emptyForm = {
    po_number: '',
    supplier_id: '',
    supplier_name: '',
    delivery_date: '',
    po_date_received: '',
    delivery_term: '',
    due_date: '',
    no_of_days_ld: '',
    received_by_1: '',
    received_by_2: '',
    end_user: '',
    place_of_delivery: '',
    status: '',
    remarks: '',
    total_amount_delivered: '',
    po_total_amount: '',
    folder_link: '',
};

function toDateInputValue(value: string | null) {
    if (!value) {
return '';
}

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
return value;
}

    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

    if (match) {
return match[1];
}

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
return '';
}

    return parsed.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
    if (!startDate || !endDate) {
return 0;
}

    const start = new Date(startDate);
    const end = new Date(endDate);

    const diff = end.getTime() - start.getTime();

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function DeliveryAddForm({ open, onOpenChange, purchaseOrders, statuses }: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setData(emptyForm);
            setErrors({});
        }
    }, [open]);

    const selectedPo = purchaseOrders.find((po) => po.po_number === data.po_number) ?? null;
    const computedLdDays = daysBetween(data.due_date, data.delivery_date);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setData((prev) => {
            const next = { ...prev, [name]: value };

            // Keep delivery_term in sync if the user manually edits the dates
            if (name === 'po_date_received' || name === 'due_date') {
                next.delivery_term = String(daysBetween(next.po_date_received, next.due_date));
            }

            return next;
        });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        if (name === 'po_number') {
            const chosenPo = purchaseOrders.find((item) => item.po_number === value) ?? null;

            const poDateReceived = chosenPo?.po_received_date
                ? toDateInputValue(chosenPo.po_received_date)
                : data.po_date_received;
            const dueDate = chosenPo?.due_date ? toDateInputValue(chosenPo.due_date) : data.due_date;

            setData({
                ...data,
                po_number: value,
                supplier_id: chosenPo?.supplier_id ? String(chosenPo.supplier_id) : '',
                supplier_name: chosenPo?.supplier?.supplier_name ?? '',
                po_total_amount: chosenPo?.total_amount_po != null ? String(chosenPo.total_amount_po) : '',
                end_user: chosenPo?.end_user ?? '',
                due_date: dueDate,
                po_date_received: poDateReceived,
                delivery_term: String(daysBetween(poDateReceived, dueDate)),
            });

            return;
        }

        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const { supplier_name, ...rest } = data;
        const payload = {
            ...rest,
            delivery_term: Number(rest.delivery_term) || 0,
            no_of_days_ld: computedLdDays,
            po_total_amount: rest.po_total_amount || (selectedPo?.total_amount_po != null ? String(selectedPo.total_amount_po) : ''),
            end_user: rest.end_user || (selectedPo?.end_user ?? ''),
            supplier_id: rest.supplier_id || (selectedPo?.supplier_id ? String(selectedPo.supplier_id) : ''),
            status: rest.status || (Number(rest.total_amount_delivered || 0) >= Number(rest.po_total_amount || 0) ? 'COMPLETED' : 'PARTIAL'),
        };

        router.post(
            '/deliveries',
            payload,
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setData(emptyForm);
                    setErrors({});
                },
                onError: (errors) => setErrors(errors),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto" style={{ maxWidth: '1000px' }}>
                <DialogHeader>
                    <DialogTitle>New Delivery Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                        <SelectField
                            label="Purchase Order"
                            value={data.po_number}
                            onChange={handleSelectChange('po_number')}
                            error={errors.po_number}
                            required
                            placeholder="Select PO"
                            options={purchaseOrders.map((po) => ({
                                value: po.po_number,
                                label: po.po_number,
                            }))}
                        />

                        <Field
                            label="Supplier"
                            name="supplier_name"
                            value={data.supplier_name || selectedPo?.supplier?.supplier_name || ''}
                            onChange={handleChange}
                            error={errors.supplier_id}
                            placeholder="Auto-filled from selected PO"
                            readOnly
                            disabled
                        />

                        <Field
                            label="Date of Delivery"
                            name="delivery_date"
                            type="date"
                            value={data.delivery_date}
                            onChange={handleChange}
                            error={errors.delivery_date}
                            placeholder="Select date"
                        />

                        <Field
                            label="PO Date Received"
                            name="po_date_received"
                            type="date"
                            value={data.po_date_received}
                            onChange={handleChange}
                            error={errors.po_date_received}
                            placeholder="Select date"
                        />

                        <Field
                            label="Delivery Term (days)"
                            name="delivery_term"
                            type="number"
                            value={data.delivery_term}
                            onChange={handleChange}
                            error={errors.delivery_term}
                            placeholder="Auto-calculated from PO dates"
                        />

                        <Field
                            label="Due Date"
                            name="due_date"
                            type="date"
                            value={data.due_date}
                            onChange={handleChange}
                            error={errors.due_date}
                            placeholder="Select date"
                        />

                        <Field
                            label="No. of Days (LD)"
                            name="no_of_days_ld"
                            type="number"
                            value={String(computedLdDays)}
                            onChange={handleChange}
                            error={errors.no_of_days_ld}
                            placeholder="Auto-calculated"
                            readOnly
                            disabled
                        />

                        <Field
                            label="Received By (1)"
                            name="received_by_1"
                            value={data.received_by_1}
                            onChange={handleChange}
                            error={errors.received_by_1}
                            placeholder="e.g. Alvin B."
                        />

                        <Field
                            label="Received By (2)"
                            name="received_by_2"
                            value={data.received_by_2}
                            onChange={handleChange}
                            error={errors.received_by_2}
                            placeholder="e.g. J. Santos"
                        />

                        <Field
                            label="End User"
                            name="end_user"
                            value={data.end_user}
                            onChange={handleChange}
                            error={errors.end_user}
                            placeholder="Auto-filled from PO"
                        />

                        <Field
                            label="Place of Delivery"
                            name="place_of_delivery"
                            value={data.place_of_delivery}
                            onChange={handleChange}
                            error={errors.place_of_delivery}
                            placeholder="e.g. BGH, Davao City"
                        />

                        <SelectField
                            label="Status"
                            value={data.status}
                            onChange={handleSelectChange('status')}
                            error={errors.status}
                            placeholder="Select status"
                            options={statuses.map((status) => ({ value: status, label: status }))}
                        />

                        <Field
                            label="Total Amount Delivered"
                            name="total_amount_delivered"
                            type="number"
                            value={data.total_amount_delivered}
                            onChange={handleChange}
                            error={errors.total_amount_delivered}
                            placeholder="e.g. 141000"
                        />

                        <Field
                            label="PO Total Amount"
                            name="po_total_amount"
                            type="number"
                            value={data.po_total_amount}
                            onChange={handleChange}
                            error={errors.po_total_amount}
                            placeholder="Auto-filled from PO"
                        />

                        <Field
                            label="Folder Link"
                            name="folder_link"
                            value={data.folder_link}
                            onChange={handleChange}
                            error={errors.folder_link}
                            placeholder="https://drive.google.com/drive/folders/..."
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Remarks</label>
                        <Input
                            name="remarks"
                            value={data.remarks}
                            onChange={handleChange}
                            placeholder="e.g. Partial delivery received"
                        />
                        {errors.remarks && <p className="mt-1 text-xs text-red-500">{errors.remarks}</p>}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} style={{ backgroundColor: '#370001' }}>
                            {processing ? 'Saving...' : 'Save New Data'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}