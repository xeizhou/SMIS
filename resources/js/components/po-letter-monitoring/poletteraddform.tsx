import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

export default function PoLetterAddForm({ open, onOpenChange, suppliers, poNumbers }: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setData(emptyForm);
            setErrors({});
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post(
            '/po-letter-monitoring',
            data,
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
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto" style={{ maxWidth: '900px' }}>
                <DialogHeader>
                    <DialogTitle>New PO Letter Record</DialogTitle>
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
                            label="Delivery Term"
                            name="delivery_term"
                            value={data.delivery_term}
                            onChange={handleChange}
                            error={errors.delivery_term}
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
                            {processing ? 'Saving...' : 'Save New Data'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
