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

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface PoNumberOption {
    po_number: string;
    po_received_date?: string | null;
    due_date?: string | null;
}

interface PoLetterRecord {
    id: number;
    reference_no: string | null;
    supplier_id: number | null;
    po_number: string;
    po_date: string | null;
    date_received_by_supplier: string | null;
    delivery_term: string | number | null;
    due_date: string | null;
    office_end_user: string;
    type_of_letter: string;
    date_received_by_smu: string | null;
    date_forwarded_to_ovpad: string | null;
    received_by: string | null;
    status_of_the_letter: string;
    document_link: string | null;
    date_forwarded_to_end_user: string | null;
    remarks: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    poLetter: PoLetterRecord | null;
    suppliers: Supplier[];
    poNumbers: PoNumberOption[];
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

const TYPE_OPTIONS = [
    { value: 'EXTENSION', label: 'EXTENSION' },
    { value: 'WAIVER', label: 'WAIVER' },
    { value: 'CANCELLATION', label: 'CANCELLATION' },
    { value: 'REPLACEMENT/ALTERNATIVE OFFER', label: 'REPLACEMENT/ALTERNATIVE OFFER' },
];

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'PENDING' },
    { value: 'RECEIVED', label: 'RECEIVED' },
    { value: 'FORWARDED', label: 'FORWARDED' },
    { value: 'COMPLETED', label: 'COMPLETED' },
];

const emptyForm = {
    reference_no: '',
    supplier_id: '',
    po_number: '',
    po_date: '',
    date_received_by_supplier: '',
    delivery_term: '',
    due_date: '',
    office_end_user: '',
    type_of_letter: '',
    date_received_by_smu: '',
    date_forwarded_to_ovpad: '',
    received_by: '',
    status_of_the_letter: '',
    document_link: '',
    date_forwarded_to_end_user: '',
    remarks: '',
};

function toDateInputValue(value: string | null | undefined): string {
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

function toFormData(poLetter: PoLetterRecord | null) {
    if (!poLetter) {
return emptyForm;
}

    return {
        reference_no: poLetter.reference_no ?? '',
        supplier_id: poLetter.supplier_id === null || poLetter.supplier_id === undefined ? '' : String(poLetter.supplier_id),
        po_number: poLetter.po_number ?? '',
        po_date: toDateInputValue(poLetter.po_date),
        date_received_by_supplier: toDateInputValue(poLetter.date_received_by_supplier),
        delivery_term: poLetter.delivery_term === null || poLetter.delivery_term === undefined ? '' : String(poLetter.delivery_term),
        due_date: toDateInputValue(poLetter.due_date),
        office_end_user: poLetter.office_end_user ?? '',
        type_of_letter: poLetter.type_of_letter ?? '',
        date_received_by_smu: toDateInputValue(poLetter.date_received_by_smu),
        date_forwarded_to_ovpad: toDateInputValue(poLetter.date_forwarded_to_ovpad),
        received_by: poLetter.received_by ?? '',
        status_of_the_letter: poLetter.status_of_the_letter ?? '',
        document_link: poLetter.document_link ?? '',
        date_forwarded_to_end_user: toDateInputValue(poLetter.date_forwarded_to_end_user),
        remarks: poLetter.remarks ?? '',
    };
}

export default function PoLetterEditForm({ open, onOpenChange, poLetter, suppliers, poNumbers }: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setData(toFormData(poLetter));
            setErrors({});
        }
    }, [open, poLetter]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setData((prev) => {
            const next = { ...prev, [name]: value };

            if (name === 'date_received_by_supplier' || name === 'due_date') {
                next.delivery_term = String(daysBetween(next.date_received_by_supplier, next.due_date));
            }

            return next;
        });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        if (name === 'po_number') {
            const chosenPo = poNumbers.find((item) => item.po_number === value) ?? null;

            const dateReceivedBySupplier = chosenPo?.po_received_date
                ? toDateInputValue(chosenPo.po_received_date)
                : data.date_received_by_supplier;
            const dueDate = chosenPo?.due_date ? toDateInputValue(chosenPo.due_date) : data.due_date;

            setData({
                ...data,
                po_number: value,
                date_received_by_supplier: dateReceivedBySupplier,
                due_date: dueDate,
                delivery_term: String(daysBetween(dateReceivedBySupplier, dueDate)),
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

        if (!poLetter) {
return;
}

        setProcessing(true);

        const payload = {
            ...data,
            delivery_term: Number(data.delivery_term) || 0,
        };

        router.put(
            `/po-letter-monitoring/${encodeURIComponent(String(poLetter.id))}`,
            payload,
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setErrors({});
                },
                onError: (errors) => setErrors(errors),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto" style={{ maxWidth: '900px' }}>
                <DialogHeader>
                    <DialogTitle>Edit PO Letter Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="grid gap-5 md:grid-cols-2">
                        <Field
                            label="Reference No."
                            name="reference_no"
                            value={data.reference_no}
                            onChange={handleChange}
                            error={errors.reference_no}
                        />

                        <SelectField
                            label="Supplier"
                            value={data.supplier_id}
                            onChange={handleSelectChange('supplier_id')}
                            error={errors.supplier_id}
                            placeholder="Select supplier"
                            options={suppliers.map((supplier) => ({
                                value: String(supplier.supplier_id),
                                label: supplier.supplier_name,
                            }))}
                        />

                        <SelectField
                            label="PO Number"
                            value={data.po_number}
                            onChange={handleSelectChange('po_number')}
                            error={errors.po_number}
                            placeholder="Select PO"
                            options={poNumbers.map((po) => ({
                                value: po.po_number,
                                label: po.po_number,
                            }))}
                        />

                        <Field
                            label="PO Date"
                            name="po_date"
                            type="date"
                            value={data.po_date}
                            onChange={handleChange}
                            error={errors.po_date}
                            required
                        />

                        <Field
                            label="Date Received by Supplier"
                            name="date_received_by_supplier"
                            type="date"
                            value={data.date_received_by_supplier}
                            onChange={handleChange}
                            error={errors.date_received_by_supplier}
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
                        />

                        <Field
                            label="Office End User"
                            name="office_end_user"
                            value={data.office_end_user}
                            onChange={handleChange}
                            error={errors.office_end_user}
                            required
                        />

                        <SelectField
                            label="Type of Letter"
                            value={data.type_of_letter}
                            onChange={handleSelectChange('type_of_letter')}
                            error={errors.type_of_letter}
                            placeholder="Select type"
                            options={TYPE_OPTIONS}
                        />

                        <Field
                            label="Date Received by SMU"
                            name="date_received_by_smu"
                            type="date"
                            value={data.date_received_by_smu}
                            onChange={handleChange}
                            error={errors.date_received_by_smu}
                        />

                        <Field
                            label="Date Forwarded to OVPAD"
                            name="date_forwarded_to_ovpad"
                            type="date"
                            value={data.date_forwarded_to_ovpad}
                            onChange={handleChange}
                            error={errors.date_forwarded_to_ovpad}
                        />

                        <Field
                            label="Received By"
                            name="received_by"
                            value={data.received_by}
                            onChange={handleChange}
                            error={errors.received_by}
                        />

                        <SelectField
                            label="Status of the Letter"
                            value={data.status_of_the_letter}
                            onChange={handleSelectChange('status_of_the_letter')}
                            error={errors.status_of_the_letter}
                            placeholder="Select status"
                            options={STATUS_OPTIONS}
                        />

                        <Field
                            label="Document Link"
                            name="document_link"
                            value={data.document_link}
                            onChange={handleChange}
                            error={errors.document_link}
                            placeholder="https://"
                        />

                        <Field
                            label="Date Forwarded to End User"
                            name="date_forwarded_to_end_user"
                            type="date"
                            value={data.date_forwarded_to_end_user}
                            onChange={handleChange}
                            error={errors.date_forwarded_to_end_user}
                        />

                        <Field
                            label="Remarks"
                            name="remarks"
                            value={data.remarks}
                            onChange={handleChange}
                            error={errors.remarks}
                        />
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} style={{ backgroundColor: '#370001' }}>
                            {processing ? 'Saving...' : 'Update Data'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}