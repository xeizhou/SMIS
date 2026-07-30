import { RefreshCw } from 'lucide-react';
import { router } from '@inertiajs/react';
import { Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
    supplier_id?: number | string | null;
    po_received_date?: string | null;
    due_date?: string | null;
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

interface LockedFieldProps {
    label: string;
    value: string;
    error?: string;
    placeholder?: string;
}

// Read-only display field for values derived from the selected PO —
// still submitted in the payload, just not directly editable.
function LockedField({ label, value, error, placeholder }: LockedFieldProps) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <Input
                value={value}
                disabled
                placeholder={placeholder}
                className="bg-muted text-muted-foreground"
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
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

function SelectField({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Select...',
    options,
    onRefresh,
    isRefreshing = false,
}: SelectFieldProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-foreground">
                    {label}
                    {required && <span className="text-red-500"> *</span>}
                </label>
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className={`text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={`Refresh ${label} list`}
                    >
                        <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
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
    { value: 'APPROVED', label: 'APPROVED' },
    { value: 'DISAPPROVED', label: 'DISAPPROVED' },
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

function toDateInputValue(value: string | null | undefined) {
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

function formatBytes(bytes: number) {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

// crypto.randomUUID() requires a secure context (localhost/HTTPS). When
// serving over a plain-HTTP LAN IP (e.g. php artisan serve --host=192.168.x.x)
// it's undefined, so we roll our own simple unique id instead.
let fileIdCounter = 0;
function generateFileId() {
    fileIdCounter += 1;
    return `file-${Date.now()}-${fileIdCounter}`;
}

interface FlashProps {
    createdId?: number;
}

export default function PoLetterAddForm({ open, onOpenChange, suppliers, poNumbers }: Props) {

    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['poNumbers'],
            onFinish: () => setRefreshingField(null),
        });
    };
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [files, setFiles] = useState<{ id: string; file: File }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setData(emptyForm);
            setErrors({});
            setFiles([]);
        }
    }, [open]);

    // Supplier / dates / delivery term are all derived from whichever PO is
    // selected — none of these are picked or typed independently anymore.
    const supplierName = (() => {
        const supplier = suppliers.find((s) => String(s.supplier_id) === data.supplier_id);
        return supplier?.supplier_name ?? '';
    })();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string) => (value: string) => {
        if (name === 'po_number') {
            const chosenPo = poNumbers.find((item) => item.po_number === value) ?? null;

            const dateReceivedBySupplier = toDateInputValue(chosenPo?.po_received_date ?? null);
            const dueDate = toDateInputValue(chosenPo?.due_date ?? null);
            const supplierId =
                chosenPo?.supplier_id === null || chosenPo?.supplier_id === undefined
                    ? ''
                    : String(chosenPo.supplier_id);

            setData({
                ...data,
                po_number: value,
                supplier_id: supplierId,
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files).map((file) => ({
            file,
            id: generateFileId(),
        }));
        setFiles((prev) => [...prev, ...newFiles]);
        e.target.value = '';
    };

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const resetForm = () => {
        setData(emptyForm);
        setErrors({});
        setFiles([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const payload = {
            ...data,
            delivery_term: Number(data.delivery_term) || 0,
        };

        router.post(
            '/po-letter-monitoring',
            payload,
            {
                onSuccess: (page) => {
                    const flash = page.props.flash as FlashProps;
                    const newId = flash?.createdId;

                    // Record created — id now exists, so any staged files
                    // can be uploaded against it.
                    if (files.length > 0 && newId) {
                        const formData = new FormData();
                        files.forEach(({ file }) => formData.append('files[]', file));
                        router.post(
                            `/po-letter-monitoring/${newId}/attachments`,
                            formData,
                            {
                                forceFormData: true,
                                onFinish: () => {
                                    onOpenChange(false);
                                    resetForm();
                                },
                            }
                        );
                    } else {
                        onOpenChange(false);
                        resetForm();
                    }
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
                            placeholder="REF-000"
                        />

                        <LockedField
                            label="Supplier"
                            value={supplierName}
                            error={errors.supplier_id}
                            placeholder="Auto-filled from PO Number"
                        />

                        <SelectField
                            label="PO Number"
                            value={data.po_number}
                            onChange={handleSelectChange('po_number')}
                            error={errors.po_number}
                            placeholder="-- Select PO --"
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

                        <LockedField
                            label="Date Received by Supplier"
                            value={data.date_received_by_supplier}
                            error={errors.date_received_by_supplier}
                            placeholder="Auto-filled from PO Number"
                        />

                        <LockedField
                            label="Delivery Term (days)"
                            value={data.delivery_term}
                            error={errors.delivery_term}
                            placeholder="Auto-calculated from PO dates"
                        />

                        <LockedField
                            label="Due Date"
                            value={data.due_date}
                            error={errors.due_date}
                            placeholder="Auto-filled from PO Number"
                        />

                        <Field
                            label="Office End User"
                            name="office_end_user"
                            value={data.office_end_user}
                            onChange={handleChange}
                            error={errors.office_end_user}
                            placeholder="GSU, OVPAD, etc."
                            required
                        />

                        <SelectField
                            label="Type of Letter"
                            value={data.type_of_letter}
                            onChange={handleSelectChange('type_of_letter')}
                            error={errors.type_of_letter}
                            placeholder="-- Select Type --"
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
                            placeholder="JOHN"
                        />

                        <SelectField
                            label="Status of the Letter"
                            value={data.status_of_the_letter}
                            onChange={handleSelectChange('status_of_the_letter')}
                            error={errors.status_of_the_letter}
                            placeholder="-- Select Status --"
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

                        {/* Attachments */}
                        <div className="md:col-span-2">
                            <label className={labelClass}>Attachments</label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40"
                            >
                                <Paperclip className="size-4" />
                                Click to select files (PDF, JPG, PNG)
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            {files.length > 0 && (
                                <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                                    {files.map(({ id, file }) => (
                                        <li
                                            key={id}
                                            className="flex items-center justify-between gap-3 px-3 py-2"
                                        >
                                            <span className="min-w-0 truncate text-sm">
                                                {file.name}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {formatBytes(file.size)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(id)}
                                                className="shrink-0 text-red-600 hover:text-red-800"
                                                title="Remove"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
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