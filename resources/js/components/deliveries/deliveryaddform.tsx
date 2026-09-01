import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Paperclip, X, Check, ChevronsUpDown, ExternalLink, File, FileImage, FileText, FileSpreadsheet, FileArchive, Plus } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toDateInputValue, addDays, daysBetween } from '@/lib/date';

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
    delivery_term: number | string | null;
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
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

function getExtension(filename: string) {
    return filename.split('.').pop()?.toLowerCase() ?? '';
}

function getFileType(filename: string) {
    const ext = getExtension(filename);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    return 'file';
}

function FileIcon({ type }: { type: string }) {
    switch (type) {
        case 'image':
            return <FileImage className="h-5 w-5 text-blue-500" />;
        case 'pdf':
            return <FileText className="h-5 w-5 text-red-500" />;
        case 'word':
            return <FileText className="h-5 w-5 text-blue-600" />;
        case 'excel':
            return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
        case 'archive':
            return <FileArchive className="h-5 w-5 text-yellow-600" />;
        default:
            return <File className="h-5 w-5 text-muted-foreground" />;
    }
}

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

// Custom Searchable Dropdown with refresh support
interface SearchableSelectProps {
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

function SearchableSelect({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Search...',
    options,
    onRefresh,
    isRefreshing = false,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);

    const selectedLabel = options.find((o) => o.value === value)?.label;

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

            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            'w-full justify-between font-normal',
                            !selectedLabel && 'text-muted-foreground',
                            error && 'border-red-500'
                        )}
                    >
                        {selectedLabel || placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                        <CommandInput placeholder={placeholder} />
                        <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((opt) => (
                                    <CommandItem
                                        key={opt.value}
                                        value={opt.label}
                                        onSelect={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                value === opt.value ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        {opt.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

const STATUS_OPTIONS = [
    { value: 'PARTIAL', label: 'PARTIAL' },
    { value: 'COMPLETE', label: 'COMPLETE' },
    { value: 'PENDING', label: 'PENDING' },
    { value: 'CANCELLED', label: 'CANCELLED' },
];

const emptyForm = {
    po_number: '',
    supplier_id: '',
    supplier_name: '',
    po_date_received: '',
    delivery_term: '',
    due_date: '',
    delivery_dates: [''] as string[],
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

function generateDeliveryId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatBytes(bytes: number) {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

let fileIdCounter = 0;
function generateFileId() {
    fileIdCounter += 1;
    return `file-${Date.now()}-${fileIdCounter}`;
}

interface StagedFile {
    id: string;
    file: File;
    previewUrl: string | null;
}

export default function DeliveryAddForm({ open, onOpenChange, purchaseOrders, statuses }: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [files, setFiles] = useState<StagedFile[]>([]);
    const [newDeliveryId, setNewDeliveryId] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<StagedFile | null>(null);

    const [refreshingField, setRefreshingField] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setData(emptyForm);
            setErrors({});
            files.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
            setFiles([]);
            setNewDeliveryId(generateDeliveryId());
            setPreviewFile(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        return () => {
            files.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['purchaseOrders'],
            onFinish: () => setRefreshingField(null),
        });
    };

    const selectedPo = purchaseOrders.find((po) => po.po_number === data.po_number) ?? null;
    const hasDeliveryDate = data.delivery_dates.some((d) => d.trim() !== '');

    // Latest non-empty delivery date drives the "days late" calculation,
    // same convention used to pick delivery_date on the backend (sort().last()).
    const latestDeliveryDate = data.delivery_dates
        .filter((d) => d.trim() !== '')
        .sort()
        .pop() ?? '';
    const computedLdDays = daysBetween(data.due_date, latestDeliveryDate);

    // Status is auto-derived from delivery data — not manually picked, except
    // CANCELLED which stays a manual override since it can't be inferred.
    useEffect(() => {
        setData((prev) => {
            if (prev.status === 'CANCELLED') {
                return prev;
            }

            let nextStatus = '';
            const anyDate = prev.delivery_dates.some((d) => d.trim() !== '');

            if (!anyDate) {
                nextStatus = 'PENDING';
            } else {
                const delivered = parseFloat(prev.total_amount_delivered);
                const poTotal = parseFloat(prev.po_total_amount);

                if (
                    prev.total_amount_delivered !== '' &&
                    prev.po_total_amount !== '' &&
                    !Number.isNaN(delivered) &&
                    !Number.isNaN(poTotal) &&
                    delivered !== poTotal
                ) {
                    nextStatus = 'PARTIAL';
                } else if (
                    prev.total_amount_delivered !== '' &&
                    prev.po_total_amount !== '' &&
                    !Number.isNaN(delivered) &&
                    !Number.isNaN(poTotal) &&
                    delivered === poTotal
                ) {
                    nextStatus = 'COMPLETE';
                }
            }

            if (nextStatus === prev.status) {
                return prev;
            }

            return { ...prev, status: nextStatus };
        });
    }, [data.delivery_dates, data.total_amount_delivered, data.po_total_amount]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string) => (value: string) => {
        if (name === 'po_number') {
            const chosenPo = purchaseOrders.find((item) => item.po_number === value) ?? null;
            const poDateReceived = toDateInputValue(chosenPo?.po_received_date ?? null);
            const deliveryTerm = chosenPo?.delivery_term != null ? String(chosenPo.delivery_term) : '';
            const dueDate = addDays(poDateReceived, Number(deliveryTerm) || 0);

            setData({
                ...data,
                po_number: value,
                supplier_id: chosenPo?.supplier_id ? String(chosenPo.supplier_id) : '',
                supplier_name: chosenPo?.supplier?.supplier_name ?? '',
                po_total_amount: chosenPo?.total_amount_po != null ? String(chosenPo.total_amount_po) : '',
                end_user: chosenPo?.end_user ?? '',
                po_date_received: poDateReceived,
                delivery_term: deliveryTerm,
                due_date: dueDate,
            });
            return;
        }

        setData({
            ...data,
            [name]: value,
        });
    };

    const updateDeliveryDate = (index: number, value: string) => {
        setData((prev) => ({
            ...prev,
            delivery_dates: prev.delivery_dates.map((d, i) => (i === index ? value : d)),
        }));
    };

    const addDeliveryDate = () => {
        setData((prev) => ({
            ...prev,
            delivery_dates: [...prev.delivery_dates, ''],
        }));
    };

    const removeDeliveryDate = (index: number) => {
        setData((prev) => ({
            ...prev,
            delivery_dates:
                prev.delivery_dates.length > 1
                    ? prev.delivery_dates.filter((_, i) => i !== index)
                    : prev.delivery_dates,
        }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files).map((file) => ({
            file,
            id: generateFileId(),
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));
        setFiles((prev) => [...prev, ...newFiles]);
        e.target.value = '';
    };

    const removeFile = (id: string) => {
        setFiles((prev) => {
            const target = prev.find((f) => f.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((f) => f.id !== id);
        });
        setPreviewFile((prev) => (prev?.id === id ? null : prev));
    };

    const openFilePreview = (staged: StagedFile) => {
        const type = getFileType(staged.file.name);
        if (type === 'image' && staged.previewUrl) {
            setPreviewFile(staged);
        } else if (staged.previewUrl) {
            window.open(staged.previewUrl, '_blank', 'noopener,noreferrer');
        } else {
            const url = URL.createObjectURL(staged.file);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const { supplier_name, ...rest } = data;

        const selectedPo =
            purchaseOrders.find((po) => po.po_number === data.po_number) ?? null;

        const payload = {
            ...rest,
            delivery_dates: rest.delivery_dates.filter((d) => d.trim() !== ''),
            delivery_id: newDeliveryId,
            delivery_term: Number(rest.delivery_term) || 0,
            no_of_days_ld: computedLdDays,
            po_total_amount: rest.po_total_amount || (selectedPo?.total_amount_po != null ? String(selectedPo.total_amount_po) : ''),
            end_user: rest.end_user || (selectedPo?.end_user ?? ''),
            supplier_id: rest.supplier_id || (selectedPo?.supplier_id ? String(selectedPo.supplier_id) : ''),
        };

        router.post(
            '/deliveries',
            payload,
            {
                onSuccess: () => {
                    if (files.length > 0 && newDeliveryId) {
                        const formData = new FormData();
                        files.forEach(({ file }) => formData.append('files[]', file));

                        router.post(
                            `/deliveries/${encodeURIComponent(newDeliveryId)}/attachments`,
                            formData,
                            {
                                forceFormData: true,
                                onFinish: () => {
                                    onOpenChange(false);
                                    setData(emptyForm);
                                    setErrors({});
                                    files.forEach((f) => {
                                        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
                                    });
                                    setFiles([]);
                                },
                            }
                        );
                    } else {
                        onOpenChange(false);
                        setData(emptyForm);
                        setErrors({});
                    }
                },
                onError: (errors) => setErrors(errors),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-h-[95vh] overflow-hidden p-0" style={{ maxWidth: '1000px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Add Delivery Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                    {/* Section: Order Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Order Details</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <SearchableSelect
                                label="Purchase Order"
                                value={data.po_number}
                                onChange={handleSelectChange('po_number')}
                                error={errors.po_number}
                                required
                                placeholder="Search PO Number..."
                                options={purchaseOrders.map((po) => ({
                                    value: po.po_number,
                                    label: po.po_number,
                                }))}
                                onRefresh={() => handleRefreshData('purchaseOrders')}
                                isRefreshing={refreshingField === 'purchaseOrders'}
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
                                label="PO Date Received"
                                name="po_date_received"
                                value={data.po_date_received}
                                onChange={handleChange}
                                error={errors.po_date_received}
                                placeholder="Auto-filled from selected PO"
                                readOnly
                                disabled
                            />

                            <Field
                                label="Delivery Term (days)"
                                name="delivery_term"
                                value={data.delivery_term}
                                onChange={handleChange}
                                error={errors.delivery_term}
                                placeholder="Auto-filled from selected PO"
                                readOnly
                                disabled
                            />

                            <Field
                                label="Due Date"
                                name="due_date"
                                value={data.due_date}
                                onChange={handleChange}
                                error={errors.due_date}
                                placeholder="Auto-calculated from PO dates"
                                readOnly
                                disabled
                            />
                        </div>
                    </div>

                    {/* Section: Delivery Information */}
                    <div>
                        <h3 className={sectionTitleClass}>Delivery Information</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* Multiple delivery dates — same chip pattern as IAR inspection dates */}
                            <div className="md:col-span-2">
                                <label className={labelClass}>Date(s) of Delivery</label>
                                <div className="flex flex-wrap items-center gap-2">
                                    {data.delivery_dates.map((date, index) => (
                                        <div key={`delivery-date-${index}`} className="flex items-center gap-1">
                                            <Input
                                                type="date"
                                                value={date}
                                                onChange={(e) => updateDeliveryDate(index, e.target.value)}
                                                className="h-9 w-36"
                                            />
                                            {data.delivery_dates.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeDeliveryDate(index)}
                                                    className="text-muted-foreground hover:text-red-600"
                                                    title="Remove date"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addDeliveryDate}
                                        className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/40"
                                        title="Add another delivery date"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                {errors.delivery_dates && <p className="mt-1 text-xs text-red-500">{errors.delivery_dates}</p>}
                            </div>

                            <Field
                                label="No. of Days (LD)"
                                name="no_of_days_ld"
                                type="number"
                                value={String(computedLdDays)}
                                onChange={handleChange}
                                error={errors.no_of_days_ld}
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
                        </div>
                    </div>

                    {/* Section: Financial & Status Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Financial & Status Details</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Field
                                label="Total Amount Delivered"
                                name="total_amount_delivered"
                                type="number"
                                value={data.total_amount_delivered}
                                onChange={handleChange}
                                error={errors.total_amount_delivered}
                                placeholder="e.g. 141000"
                                required
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

                           <div>
                                <label className={labelClass}>
                                    Status
                                    <span className="text-red-500"> *</span>
                                </label>
                                <div className="flex items-center gap-2 w-69">
                                    <Input
                                        value={data.status}
                                        disabled
                                        placeholder="Auto-determined"
                                        className="bg-muted text-muted-foreground flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() =>
                                            setData((prev) => ({
                                                ...prev,
                                                status: prev.status === 'CANCELLED' ? '' : 'CANCELLED',
                                            }))
                                        }
                                    >
                                        {data.status === 'CANCELLED' ? 'Undo Cancel' : 'Mark Cancelled'}
                                    </Button>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    PENDING until a delivery date is set; PARTIAL if amounts don't match; COMPLETE if they do.
                                </p>
                                {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section: Additional Information */}
                    <div>
                        <h3 className={sectionTitleClass}>Additional Information</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Field
                                label="Folder Link"
                                name="folder_link"
                                value={data.folder_link}
                                onChange={handleChange}
                                error={errors.folder_link}
                                placeholder="https://drive.google.com/drive/folders/..."
                            />

                            <div className="md:col-span-2">
                                <label className={labelClass}>Remarks</label>
                                <Input
                                    name="remarks"
                                    value={data.remarks}
                                    onChange={handleChange}
                                    placeholder="e.g. Partial delivery received"
                                />
                                {errors.remarks && <p className="mt-1 text-xs text-red-500">{errors.remarks}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section: Attachments */}
                    <div>
                        <h3 className={sectionTitleClass}>Attachments</h3>
                        <div className="md:col-span-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40 mt-2"
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
                                    {files.map((staged) => {
                                        const { id, file } = staged;
                                        const type = getFileType(file.name);
                                        return (
                                            <li key={id}>
                                                <button
                                                    type="button"
                                                    onClick={() => openFilePreview(staged)}
                                                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                                                >
                                                    <div className="h-9 w-9 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                        {staged.previewUrl ? (
                                                            <img
                                                                src={staged.previewUrl}
                                                                alt={file.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <FileIcon type={type} />
                                                        )}
                                                    </div>
                                                    <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                                                    <span className="shrink-0 text-xs text-muted-foreground">
                                                        {formatBytes(file.size)}
                                                    </span>
                                                    <span
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFile(id);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.stopPropagation();
                                                                removeFile(id);
                                                            }
                                                        }}
                                                        className="shrink-0 text-red-600 hover:text-red-800"
                                                        title="Remove"
                                                    >
                                                        <X className="size-4" />
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
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
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>

        {/* Image Lightbox */}
        <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
            <DialogContent className="w-[95vw] p-0 overflow-hidden" style={{ maxWidth: '900px' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <p className="text-sm font-medium truncate pr-4">
                        {previewFile?.file.name}
                    </p>
                    {previewFile?.previewUrl && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 mr-6" asChild>
                            <a
                                href={previewFile.previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in new tab"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </Button>
                    )}
                </div>
                <div className="flex items-center justify-center bg-muted/30 p-4 max-h-[80vh] overflow-auto">
                    {previewFile?.previewUrl && (
                        <img
                            src={previewFile.previewUrl}
                            alt={previewFile.file.name}
                            className="max-w-full max-h-[75vh] object-contain rounded"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}