import { router } from '@inertiajs/react';
import { Paperclip, X, RefreshCw, Check, ChevronsUpDown, Trash2, ExternalLink, File, FileImage, FileText, FileSpreadsheet, FileArchive } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { toDateInputValue, daysBetween, addDays } from '@/lib/date';
interface Attachment {
    id: number;
    original_name: string;
    file_size: number;
    created_at: string;
    url: string;
}

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

interface DeliveryRecord {
    delivery_id: string;
    po_number: string;
    supplier_id: number | null;
    supplier?: SupplierOption | null;
    delivery_date: string | null;
    po_date_received: string | null;
    delivery_term: string | number | null;
    due_date: string | null;
    no_of_days_ld: number | string | null;
    received_by_1: string | null;
    received_by_2: string | null;
    end_user: string | null;
    place_of_delivery: string | null;
    status: string | null;
    remarks: string | null;
    total_amount_delivered: string | number | null;
    po_total_amount: string | number | null;
    folder_link: string | null;
    attachments?: Attachment[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    delivery: DeliveryRecord | null;
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

    onRefresh?: () => void;
    isRefreshing?: boolean;
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
    onRefresh,
    isRefreshing = false,
}: FieldProps) {
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

function formatBytes(bytes: number) {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

let fileIdCounter = 0;
function generateFileId() {
    fileIdCounter += 1;
    return `file-${Date.now()}-${fileIdCounter}`;
}

function toFormData(delivery: DeliveryRecord | null) {
    if (!delivery) return emptyForm;
    return {
        po_number: delivery.po_number ?? '',
        supplier_id: delivery.supplier_id === null || delivery.supplier_id === undefined ? '' : String(delivery.supplier_id),
        supplier_name: delivery.supplier?.supplier_name ?? '',
        delivery_date: toDateInputValue(delivery.delivery_date),
        po_date_received: toDateInputValue(delivery.po_date_received),
        delivery_term: delivery.delivery_term === null || delivery.delivery_term === undefined ? '' : String(delivery.delivery_term),
        due_date: toDateInputValue(delivery.due_date),
        no_of_days_ld: delivery.no_of_days_ld === null || delivery.no_of_days_ld === undefined ? '' : String(delivery.no_of_days_ld),
        received_by_1: delivery.received_by_1 ?? '',
        received_by_2: delivery.received_by_2 ?? '',
        end_user: delivery.end_user ?? '',
        place_of_delivery: delivery.place_of_delivery ?? '',
        status: delivery.status ?? '',
        remarks: delivery.remarks ?? '',
        total_amount_delivered: delivery.total_amount_delivered === null || delivery.total_amount_delivered === undefined ? '' : String(delivery.total_amount_delivered),
        po_total_amount: delivery.po_total_amount === null || delivery.po_total_amount === undefined ? '' : String(delivery.po_total_amount),
        folder_link: delivery.folder_link ?? '',
    };
}

interface StagedFile {
    id: string;
    file: File;
    previewUrl: string | null;
}

interface PreviewTarget {
    name: string;
    url: string;
}

export default function DeliveryEditForm({ open, onOpenChange, delivery, purchaseOrders, statuses }: Props) {

    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['purchaseOrders', 'statuses'],
            onFinish: () => setRefreshingField(null),
        });
    };
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [newFiles, setNewFiles] = useState<StagedFile[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setData(toFormData(delivery));
            setErrors({});
            newFiles.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
            setNewFiles([]);
            setExistingAttachments(delivery?.attachments ?? []);
            setDeletedAttachmentIds([]);
            setPreviewTarget(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, delivery]);

    useEffect(() => {
        return () => {
            newFiles.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedPo = purchaseOrders.find((po) => po.po_number === data.po_number) ?? null;
    const computedLdDays = daysBetween(data.due_date, data.delivery_date);

    // Status is auto-derived from delivery data — not manually picked, except
    // CANCELLED which stays a manual override since it can't be inferred.
    useEffect(() => {
        setData((prev) => {
            if (prev.status === 'CANCELLED') {
                return prev;
            }

            let nextStatus = '';

            if (!prev.delivery_date) {
                nextStatus = 'PENDING';
            } else {
                const delivered = parseFloat(prev.total_amount_delivered);
                const poTotal = parseFloat(prev.po_total_amount);
                const bothValid =
                    prev.total_amount_delivered !== '' &&
                    prev.po_total_amount !== '' &&
                    !Number.isNaN(delivered) &&
                    !Number.isNaN(poTotal);

                if (bothValid) {
                    nextStatus = delivered !== poTotal ? 'PARTIAL' : 'COMPLETE';
                }
            }

            if (nextStatus === prev.status) {
                return prev;
            }

            return { ...prev, status: nextStatus };
        });
    }, [data.delivery_date, data.total_amount_delivered, data.po_total_amount]);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selectedFiles = Array.from(e.target.files).map((file) => ({
            file,
            id: generateFileId(),
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));
        setNewFiles((prev) => [...prev, ...selectedFiles]);
        e.target.value = '';
    };

    const removeNewFile = (id: string) => {
        setNewFiles((prev) => {
            const target = prev.find((f) => f.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((f) => f.id !== id);
        });
    };

    const removeExistingAttachment = (attachmentId: number) => {
        setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        setDeletedAttachmentIds((prev) => [...prev, attachmentId]);
    };

    const openNewFilePreview = (staged: StagedFile) => {
        const type = getFileType(staged.file.name);
        if (type === 'image' && staged.previewUrl) {
            setPreviewTarget({ name: staged.file.name, url: staged.previewUrl });
        } else if (staged.previewUrl) {
            window.open(staged.previewUrl, '_blank', 'noopener,noreferrer');
        } else {
            const url = URL.createObjectURL(staged.file);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    };

    const openExistingAttachmentPreview = (att: Attachment) => {
        const type = getFileType(att.original_name);
        if (type === 'image') {
            setPreviewTarget({ name: att.original_name, url: att.url });
        } else {
            window.open(att.url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!delivery) return;

        setProcessing(true);

        const { supplier_name, ...rest } = data;
        const payload = {
            ...rest,
            delivery_term: Number(rest.delivery_term) || 0,
            no_of_days_ld: computedLdDays,
            po_total_amount: rest.po_total_amount || (selectedPo?.total_amount_po != null ? String(selectedPo.total_amount_po) : ''),
            end_user: rest.end_user || (selectedPo?.end_user ?? ''),
            supplier_id: rest.supplier_id || (selectedPo?.supplier_id ? String(selectedPo.supplier_id) : ''),
            status: rest.status,
            deleted_attachment_ids: deletedAttachmentIds,
        };

        router.put(
            `/deliveries/${encodeURIComponent(delivery.delivery_id)}`,
            payload,
            {
                onSuccess: () => {
                    // If there are new files, upload them
                    if (newFiles.length > 0) {
                        const formData = new FormData();
                        newFiles.forEach(({ file }) => formData.append('files[]', file));

                        router.post(
                            `/deliveries/${encodeURIComponent(delivery.delivery_id)}/attachments`,
                            formData,
                            {
                                forceFormData: true,
                                onFinish: () => {
                                    onOpenChange(false);
                                    newFiles.forEach((f) => {
                                        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
                                    });
                                    setNewFiles([]);
                                    setDeletedAttachmentIds([]);
                                },
                            }
                        );
                    } else {
                        onOpenChange(false);
                        setNewFiles([]);
                        setDeletedAttachmentIds([]);
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
                            <DialogTitle>Edit Delivery Record — {delivery?.delivery_id}, {delivery?.po_number}</DialogTitle>
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
                                    <Field 
                                        label="Date of Delivery" 
                                        name="delivery_date" 
                                        type="date" 
                                        value={data.delivery_date} 
                                        onChange={handleChange} 
                                        error={errors.delivery_date}
                                    />

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

                    {/* Attachments Section */}
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

                        {/* Existing Attachments */}
                        {existingAttachments.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Existing Files</p>
                                <ScrollArea className="max-h-[180px]">
                                    <div className="space-y-1.5">
                                        {existingAttachments.map((att) => {
                                            const type = getFileType(att.original_name);
                                            return (
                                                <div
                                                    key={att.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => openExistingAttachmentPreview(att)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            openExistingAttachmentPreview(att);
                                                        }
                                                    }}
                                                    className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
                                                >
                                                    <div className="h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                        {type === 'image' ? (
                                                            <img
                                                                src={att.url}
                                                                alt={att.original_name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <FileIcon type={type} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm">{att.original_name}</p>
                                                        <p className="text-[11px] text-muted-foreground">{formatBytes(att.file_size)}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] h-5">
                                                        {getExtension(att.original_name).toUpperCase()}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-red-500 hover:text-red-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeExistingAttachment(att.id);
                                                        }}
                                                        title="Remove"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {/* New Files */}
                        {newFiles.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">New Files</p>
                                <ul className="divide-y divide-border rounded-md border border-border">
                                    {newFiles.map((staged) => {
                                        const { id, file } = staged;
                                        const type = getFileType(file.name);
                                        return (
                                            <li key={id}>
                                                <button
                                                    type="button"
                                                    onClick={() => openNewFilePreview(staged)}
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
                                                    <span className="min-w-0 flex-1 truncate text-sm">
                                                        {file.name}
                                                    </span>
                                                    <span className="shrink-0 text-xs text-muted-foreground">
                                                        {formatBytes(file.size)}
                                                    </span>
                                                    <span
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeNewFile(id);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.stopPropagation();
                                                                removeNewFile(id);
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
                            </div>
                        )}
                    </div>
                    </div>

                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing} style={{ backgroundColor: '#370001' }}>
                                    {processing ? 'Saving...' : 'Update Data'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>

        {/* Image Lightbox — new and existing attachments */}
        <Dialog open={!!previewTarget} onOpenChange={(o) => !o && setPreviewTarget(null)}>
            <DialogContent className="w-[95vw] p-0 overflow-hidden" style={{ maxWidth: '900px' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <p className="text-sm font-medium truncate pr-4">
                        {previewTarget?.name}
                    </p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 mr-6" asChild>
                        <a
                            href={previewTarget?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </Button>
                </div>
                <div className="flex items-center justify-center bg-muted/30 p-4 max-h-[80vh] overflow-auto">
                    {previewTarget && (
                        <img
                            src={previewTarget.url}
                            alt={previewTarget.name}
                            className="max-w-full max-h-[75vh] object-contain rounded"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}