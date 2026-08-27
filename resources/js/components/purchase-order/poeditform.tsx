import { router } from '@inertiajs/react';
import { Paperclip, X, RefreshCw, ExternalLink, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
    File,
    FileImage,
    FileText,
    FileSpreadsheet,
    FileArchive,
    Trash2,
    Check,
    ChevronsUpDown,
} from "lucide-react";
import SupplierQuickAddModal from '@/components/suppliers/supplier-quick-add-modal';
import ItemMultiSelect, { type StockItemOption } from '@/components/purchase-order/item-multi-select';
import StockItemQuickAddModal from '@/components/purchase-order/stock-item-quick-add-modal';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface Office {
    office_code: string;
    office_name: string;
}

interface Attachment {
    id: number;
    original_name: string;
    file_size: number;
    created_at: string;
    file_path: string; // add this
}

interface PurchaseOrder {
    po_number: string;
    item_description: string | null;
    po_date: string | null;
    po_received_date: string | null;
    inclusive_date: string | null;
    delivery_term: number | string | null;
    pr_number: string | null;
    pr_date: string | null;
    philgeps_reference_no: string | null;
    procurement_type: string | null;
    mode_of_procurement: string | null;
    total_amount_abc: string | number | null;
    total_amount_po: string | number | null;
    fund_cluster_id: string | null;
    ors_burs_no: string | null;
    ors_burs_date: string | null;
    responsibility_center: string | null;
    uacs_object_code: string | null;
    supplier_id: number | string | null;
    end_user: string | null;
    date_forwarded_to_smu: string | null;
    coa_processed_date: string | null;
    date_forwarded_frontdesk: string | null;
    attachments?: Attachment[];
    items?: { stock_no: string }[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrder: PurchaseOrder | null;
    suppliers: Supplier[];
    fundClusters: FundCluster[];
    offices: Office[];
    stockItems: StockItemOption[];
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
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

function getExtension(filename: string) {
    return filename.split(".").pop()?.toLowerCase() ?? "";
}

function getFileType(filename: string) {
    const ext = getExtension(filename);

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
        return "image";

    if (ext === "pdf")
        return "pdf";

    if (["doc", "docx"].includes(ext))
        return "word";

    if (["xls", "xlsx", "csv"].includes(ext))
        return "excel";

    if (["zip", "rar", "7z"].includes(ext))
        return "archive";

    return "file";
}

function FileIcon({ type }: { type: string }) {
    switch (type) {
        case "image":
            return <FileImage className="h-5 w-5 text-blue-500" />;

        case "pdf":
            return <FileText className="h-5 w-5 text-red-500" />;

        case "word":
            return <FileText className="h-5 w-5 text-blue-600" />;

        case "excel":
            return <FileSpreadsheet className="h-5 w-5 text-green-600" />;

        case "archive":
            return <FileArchive className="h-5 w-5 text-yellow-600" />;

        default:
            return <File className="h-5 w-5 text-muted-foreground" />;
    }
}

// Defined outside the parent component so it doesn't remount (and drop
// focus) on every parent re-render.
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

// Custom Searchable Dropdown — "Add new" row is always visible in the
// list (not just tucked inside CommandEmpty), so it's there whether or
// not the search currently has matches.
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
    onAddNew?: (query: string) => void;
    addNewLabel?: string;
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
    onAddNew,
    addNewLabel = 'new item',
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selectedLabel = options.find((o) => o.value === value)?.label;

    const trimmedQuery = query.trim();
    const hasExactMatch = options.some(
        (o) => o.label.trim().toLowerCase() === trimmedQuery.toLowerCase()
    );
    // Always show "Add new" once onAddNew is provided — pre-filled with
    // the current query if there's no exact match, otherwise just opens
    // the modal blank (or with the query, if they want to add a near-dup).
    const showAddNew = !!onAddNew && !hasExactMatch;

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
                        <CommandInput
                            placeholder={placeholder}
                            value={query}
                            onValueChange={setQuery}
                        />
                        <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <CommandEmpty>
                                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                                    No item found.
                                </p>
                            </CommandEmpty>

                            {showAddNew && (
                                <CommandGroup>
                                    <CommandItem
                                        value={`__add_new__${trimmedQuery}`}
                                        onSelect={() => {
                                            onAddNew(trimmedQuery);
                                            setOpen(false);
                                        }}
                                        className="text-primary"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {trimmedQuery ? `Add "${trimmedQuery}" as ${addNewLabel}` : `Add ${addNewLabel}`}
                                    </CommandItem>
                                </CommandGroup>
                            )}

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

const PROCUREMENT_TYPE_OPTIONS = [
    { value: 'Services', label: 'Services' },
    { value: 'Items', label: 'Item/s' },
];

const MODE_OF_PROCUREMENT_OPTIONS = [
    { value: 'SMALL VALUE PROCURMENT', label: 'SMALL VALUE PROCURMENT' },
    { value: 'SHOPPING', label: 'SHOPPING' },
    { value: 'PUBLIC BIDDING', label: 'PUBLIC BIDDING' },
];

const emptyForm = {
    po_number: '',
    item_description: '',
    po_date: '',
    po_received_date: '',
    inclusive_date: '',
    delivery_term: '',
    pr_number: '',
    pr_date: '',
    philgeps_reference_no: '',
    procurement_type: '', 
    mode_of_procurement: '',
    total_amount_abc: '',
    total_amount_po: '',
    fund_cluster_id: '',
    ors_burs_no: '',
    ors_burs_date: '',
    responsibility_center: '',
    uacs_object_code: '',
    supplier_id: '',
    end_user: '',
    date_forwarded_to_smu: '',
    coa_processed_date: '',
    date_forwarded_frontdesk: '',
};

function toDateInputValue(value: string | null): string {
    if (!value) {
        return '';
    }

    // Already in YYYY-MM-DD form
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    // ISO timestamp (e.g. "2026-01-15T00:00:00.000000Z") — just slice it
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

    if (match) {
        return match[1];
    }

    // Fallback: let the Date constructor try, guard against Invalid Date
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return parsed.toISOString().slice(0, 10);
}

function toFormData(po: PurchaseOrder | null): typeof emptyForm {
    if (!po) {
        return emptyForm;
    }

    return {
        po_number: po.po_number ?? '',
        item_description: po.item_description ?? '',
        po_date: toDateInputValue(po.po_date),
        po_received_date: toDateInputValue(po.po_received_date),
        inclusive_date: po.inclusive_date ?? '',
        delivery_term:
        po.delivery_term === null || po.delivery_term === undefined
            ? ''
            : String(po.delivery_term),
        pr_number: po.pr_number ?? '',
        pr_date: toDateInputValue(po.pr_date),
        philgeps_reference_no: po.philgeps_reference_no ?? '',
        procurement_type: po.procurement_type ?? '',
        mode_of_procurement: po.mode_of_procurement ?? '',
        total_amount_abc:
            po.total_amount_abc === null || po.total_amount_abc === undefined
                ? ''
                : String(po.total_amount_abc),
        total_amount_po:
            po.total_amount_po === null || po.total_amount_po === undefined
                ? ''
                : String(po.total_amount_po),
        fund_cluster_id: po.fund_cluster_id ?? '',
        ors_burs_no: po.ors_burs_no ?? '',
        ors_burs_date: toDateInputValue(po.ors_burs_date),
        responsibility_center: po.responsibility_center ?? '',
        uacs_object_code: po.uacs_object_code ?? '',
        supplier_id:
            po.supplier_id === null || po.supplier_id === undefined
                ? ''
                : String(po.supplier_id),
        end_user: po.end_user ?? '',
        date_forwarded_to_smu: toDateInputValue(po.date_forwarded_to_smu),
        coa_processed_date: toDateInputValue(po.coa_processed_date),
        date_forwarded_frontdesk: toDateInputValue(po.date_forwarded_frontdesk),
    };
}

function calculateDiff(abc: string, po: string) {
    const abcValue = parseFloat(abc);
    const poValue = parseFloat(po);

    const safeAbc = Number.isNaN(abcValue) ? 0 : abcValue;
    const safePo = Number.isNaN(poValue) ? 0 : poValue;

    return safePo - safeAbc;
}

function calculateResponsibilityCenter(fundClusterId: string, endUser: string) {
    return [fundClusterId, endUser].filter(Boolean).join(' ');
}

function formatPoNumberInput(raw: string): string {
    const digits = raw.replace(/\D/g, '');

    let year = digits.slice(0, 4);
    let month = digits.slice(4, 6);
    let seq = digits.slice(6, 10);

    if (month.length === 1 && !['0', '1'].includes(month)) {
        month = ''; 
    }
    if (month.length === 2) {
        const m = parseInt(month, 10);
        if (m < 1 || m > 12) {
            month = month[0]; 
        }
    }

    let out = year;
    if (month) out += '-' + month;
    if (seq) out += '-' + seq;
    return out;
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

interface StagedFile {
    id: string;
    file: File;
    previewUrl: string | null; // objectURL for images, null otherwise
}

// Local preview target: either a brand-new (unsaved) file or an already
// uploaded attachment. Normalized to one shape so the lightbox doesn't
// need to care which kind it's showing.
interface PreviewTarget {
    name: string;
    url: string;
}

export default function PurchaseOrderEditForm({
    open,
    onOpenChange,
    purchaseOrder,
    suppliers,
    fundClusters,
    offices,
    stockItems,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [newFiles, setNewFiles] = useState<StagedFile[]>([]);
    const [itemStockNos, setItemStockNos] = useState<string[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);
    const [refreshingField, setRefreshingField] = useState<string | null>(null);
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

    // Supplier quick-add state — same pattern as PurchaseOrderAddForm.
    const [supplierOptions, setSupplierOptions] = useState<Supplier[]>(suppliers);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickAddQuery, setQuickAddQuery] = useState('');

    // Stock item quick-add state — same pattern as PurchaseOrderAddForm
    const [stockItemOptions, setStockItemOptions] = useState<StockItemOption[]>(stockItems);
    const [itemQuickAddOpen, setItemQuickAddOpen] = useState(false);
    const [itemQuickAddQuery, setItemQuickAddQuery] = useState('');

    // Keep local supplier list in sync if the parent passes a fresh
    // `suppliers` prop (e.g. after a manual refresh).
    useEffect(() => {
        setSupplierOptions(suppliers);
    }, [suppliers]);

    useEffect(() => {
        setStockItemOptions(stockItems);
    }, [stockItems]);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['suppliers', 'fundClusters', 'offices'],
            onFinish: () => setRefreshingField(null),
        });
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Re-sync form state whenever a different PO is opened for editing.
    useEffect(() => {
        if (open) {
            setData(toFormData(purchaseOrder));
            setErrors({});
            setShowConfirmModal(false);
            newFiles.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
            setNewFiles([]);
            setExistingAttachments(purchaseOrder?.attachments ?? []);
            setDeletedAttachmentIds([]);
            setPreviewTarget(null);
            setItemStockNos(purchaseOrder?.items?.map((i) => i.stock_no) ?? []); // add this
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, purchaseOrder]);

    // Revoke every staged object URL when the component unmounts.
    useEffect(() => {
        return () => {
            newFiles.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const diff = calculateDiff(data.total_amount_abc, data.total_amount_po);
    const responsibilityCenter = calculateResponsibilityCenter(data.fund_cluster_id, data.end_user);

    const originalPoNumber = purchaseOrder?.po_number ?? '';
    const poNumberChanged = data.po_number.trim() !== originalPoNumber.trim();

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
        const url = `/storage/${att.file_path}`;
        if (type === 'image') {
            setPreviewTarget({ name: att.original_name, url });
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    // Fires the actual PUT request. Note: the URL still uses the ORIGINAL
    // po_number to identify the record; data.po_number (possibly changed)
    // is sent in the body so the backend can rename it.
    const submitUpdate = () => {
        if (!purchaseOrder) return;

        setProcessing(true);

        router.put(
            `/purchase-orders/${encodeURIComponent(purchaseOrder.po_number)}`,
            {
                ...data,
                item_stock_nos: itemStockNos, // add this
                total_amount_diff: diff,
                responsibility_center: responsibilityCenter,
                deleted_attachment_ids: deletedAttachmentIds,
            },
            {
                onSuccess: () => {
                    // PO updated successfully — if there are new files,
                    // upload them against the PO (using the original po_number).
                    if (newFiles.length > 0) {
                        const formData = new FormData();
                        newFiles.forEach(({ file }) => formData.append('files[]', file));

                        router.post(
                            `/purchase-orders/${encodeURIComponent(purchaseOrder.po_number)}/attachments`,
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!purchaseOrder) return;

        if (poNumberChanged) {
            setShowConfirmModal(true);
            return;
        }

        submitUpdate();
    };

    const confirmAndSubmit = () => {
        setShowConfirmModal(false);
        submitUpdate();
    };

    const handlePoNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData((prev) => ({
            ...prev,
            po_number: formatPoNumberInput(e.target.value),
        }));
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="w-[95vw] max-h-[95vh] overflow-hidden p-0"
                    style={{ maxWidth: '1200px' }}
                >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                    <DialogHeader>
                        <DialogTitle>Edit Purchase Order Record — {purchaseOrder?.po_number}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                        {/* Section: Purchase Order Details */}
                        <div>
                            <h3 className={sectionTitleClass}>Purchase Order Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field
                                    label="Purchase Order No."
                                    name="po_number"
                                    value={data.po_number}
                                    onChange={handlePoNumberChange}
                                    error={errors.po_number}
                                    placeholder="2026-01-0001"
                                    required
                                />
                                <SelectField
                                    label="Mode of Procurement"
                                    value={data.mode_of_procurement}
                                    onChange={handleSelectChange('mode_of_procurement')}
                                    error={errors.mode_of_procurement}
                                    placeholder="--Select Mode of Procurement--"
                                    options={MODE_OF_PROCUREMENT_OPTIONS}
                                />
                                <Field
                                    label="PO Date"
                                    name="po_date"
                                    type="date"
                                    value={data.po_date}
                                    onChange={handleChange}
                                    error={errors.po_date}
                                />
                                <Field
                                    label="PO Received Date"
                                    name="po_received_date"
                                    type="date"
                                    value={data.po_received_date}
                                    onChange={handleChange}
                                    error={errors.po_received_date}
                                />
                                <Field
                                    label="Delivery Term (Days)"
                                    name="delivery_term"
                                    type="number"
                                    value={data.delivery_term}
                                    onChange={handleChange}
                                    error={errors.delivery_term}
                                    placeholder="e.g. 15"
                                />
                                <Field
                                    label="Inclusive Date"
                                    name="inclusive_date"
                                    value={data.inclusive_date}
                                    onChange={handleChange}
                                    error={errors.inclusive_date}
                                    placeholder="e.g. Jan 1 - Jan 15, 2026"
                                />
                                <Field
                                    label="PR No."
                                    name="pr_number"
                                    value={data.pr_number}
                                    onChange={handleChange}
                                    error={errors.pr_number}
                                />
                                <Field
                                    label="PR Date"
                                    name="pr_date"
                                    type="date"
                                    value={data.pr_date}
                                    onChange={handleChange}
                                    error={errors.pr_date}
                                />
                                <Field
                                    label="Philgeps Reference No."
                                    name="philgeps_reference_no"
                                    value={data.philgeps_reference_no}
                                    onChange={handleChange}
                                    error={errors.philgeps_reference_no}
                                    placeholder="00000000"
                                />

                                <SelectField
                                    label="Type of Procurement"
                                    value={data.procurement_type}
                                    onChange={(value) => {
                                        handleSelectChange('procurement_type')(value);
                                        // Clear inclusive_date if switching away from Services
                                        if (value !== 'Services') {
                                            setData((prev) => ({ ...prev, procurement_type: value, inclusive_date: '' }));
                                        }
                                    }}
                                    error={errors.procurement_type}
                                    placeholder="-- Select Type --"
                                    options={PROCUREMENT_TYPE_OPTIONS}
                                />

                                {data.procurement_type === 'Services' && (
                                    <Field
                                        label="Inclusive Date"
                                        name="inclusive_date"
                                        value={data.inclusive_date}
                                        onChange={handleChange}
                                        error={errors.inclusive_date}
                                        placeholder="e.g. Jan 1 - Jan 15, 2026"
                                    />
                                )}                 
                                <div className="md:col-span-2">
                                    <ItemMultiSelect
                                        value={itemStockNos}
                                        onChange={setItemStockNos}
                                        options={stockItemOptions}
                                        error={errors.item_stock_nos}
                                        onAddNew={(query) => {
                                            setItemQuickAddQuery(query);
                                            setItemQuickAddOpen(true);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Section: Financial Details */}
                        <div>
                            <h3 className={sectionTitleClass}>Financial Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Field
                                    label="Total Amount ABC"
                                    name="total_amount_abc"
                                    type="number"
                                    value={data.total_amount_abc as string}
                                    onChange={handleChange}
                                    error={errors.total_amount_abc}
                                />
                                <Field
                                    label="Total Amount PO"
                                    name="total_amount_po"
                                    type="number"
                                    value={data.total_amount_po as string}
                                    onChange={handleChange}
                                    error={errors.total_amount_po}
                                />
                                <div>
                                    <label className={labelClass}>Total Amount Difference</label>
                                    <Input
                                        value={diff.toFixed(2)}
                                        disabled
                                        className="bg-muted text-muted-foreground"
                                    />
                                </div>
                                <SearchableSelect
                                    label="Fund Cluster"
                                    value={data.fund_cluster_id}
                                    onChange={handleSelectChange('fund_cluster_id')}
                                    error={errors.fund_cluster_id}
                                    placeholder="Select"
                                    options={fundClusters.map((fc) => ({
                                        value: fc.fund_cluster_id,
                                        label: fc.fund_cluster_id,
                                    }))}
                                    onRefresh={() => handleRefreshData('fund_cluster')}
                                    isRefreshing={refreshingField === 'fund_cluster'}
                                />
                                <Field
                                    label="ORS/BUR No."
                                    name="ors_burs_no"
                                    value={data.ors_burs_no}
                                    onChange={handleChange}
                                    error={errors.ors_burs_no}
                                />
                                <Field
                                    label="ORS/BURS Date"
                                    name="ors_burs_date"
                                    type="date"
                                    value={data.ors_burs_date}
                                    onChange={handleChange}
                                    error={errors.ors_burs_date}
                                />
                                <div>
                                    <label className={labelClass}>Responsibility Center</label>
                                    <Input
                                        value={responsibilityCenter}
                                        readOnly
                                        className="bg-muted text-muted-foreground"
                                        placeholder="Fund Cluster + End User"
                                    />
                                    {errors.responsibility_center && (
                                        <p className="mt-1 text-xs text-red-500">{errors.responsibility_center}</p>
                                    )}
                                </div>
                                <Field
                                    label="UACS Object Code"
                                    name="uacs_object_code"
                                    value={data.uacs_object_code}
                                    onChange={handleChange}
                                    error={errors.uacs_object_code}
                                />
                            </div>
                        </div>

                        {/* Section: Routing & Processing */}
                        <div>
                            <h3 className={sectionTitleClass}>Routing & Processing</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <SearchableSelect
                                    label="Supplier"
                                    value={data.supplier_id as string}
                                    onChange={handleSelectChange('supplier_id')}
                                    error={errors.supplier_id}
                                    placeholder="Search Supplier..."
                                    options={supplierOptions.map((s) => ({
                                        value: String(s.supplier_id),
                                        label: s.supplier_name,
                                    }))}
                                    onRefresh={() => handleRefreshData('supplier')}
                                    isRefreshing={refreshingField === 'supplier'}
                                    onAddNew={(query) => {
                                        setQuickAddQuery(query);
                                        setQuickAddOpen(true);
                                    }}
                                    addNewLabel="new supplier"
                                />
                                <SearchableSelect
                                    label="End User"
                                    value={data.end_user}
                                    onChange={handleSelectChange('end_user')}
                                    error={errors.end_user}
                                    placeholder="Search End User..."
                                    options={offices.map((o) => ({
                                        value: o.office_code,
                                        label: o.office_code,
                                    }))}
                                    onRefresh={() => handleRefreshData('end_user')}
                                    isRefreshing={refreshingField === 'end_user'}
                                />
                                <Field
                                    label="Date forwarded to SMU"
                                    name="date_forwarded_to_smu"
                                    type="date"
                                    value={data.date_forwarded_to_smu}
                                    onChange={handleChange}
                                    error={errors.date_forwarded_to_smu}
                                />
                                <Field
                                    label="COA Processed Date"
                                    name="coa_processed_date"
                                    type="date"
                                    value={data.coa_processed_date}
                                    onChange={handleChange}
                                    error={errors.coa_processed_date}
                                />
                                <Field
                                    label="Date Forwarded to Frontdesk"
                                    name="date_forwarded_frontdesk"
                                    type="date"
                                    value={data.date_forwarded_frontdesk}
                                    onChange={handleChange}
                                    error={errors.date_forwarded_frontdesk}
                                />
                            </div>
                        </div>

                        {/* Section: Attachments */}
                        <div>
                            <h3 className={sectionTitleClass}>Attachments</h3>
                            <div>
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
                                                            className="flex items-center gap-2 rounded-md border px-2 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer sm:gap-2.5 sm:px-2.5"
                                                        >
                                                            <div className="h-7 w-7 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden sm:h-8 sm:w-8">
                                                                {type === 'image' ? (
                                                                    <img
                                                                        src={`/storage/${att.file_path}`}
                                                                        alt={att.original_name}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <FileIcon type={type} />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-xs sm:text-sm">{att.original_name}</p>
                                                                <p className="hidden text-[11px] text-muted-foreground sm:block">{formatBytes(att.file_size)}</p>
                                                            </div>
                                                            <Badge variant="outline" className="hidden text-[10px] h-5 sm:inline-flex">
                                                                {getExtension(att.original_name).toUpperCase()}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 shrink-0 text-red-500 hover:text-red-600 sm:h-7 sm:w-7"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeExistingAttachment(att.id);
                                                                }}
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
                                                            className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/50 transition-colors cursor-pointer sm:gap-3 sm:px-3 sm:py-2"
                                                        >
                                                            <div className="h-7 w-7 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden sm:h-9 sm:w-9">
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
                                                            <span className="min-w-0 flex-1 truncate text-xs sm:text-sm">
                                                                {file.name}
                                                            </span>
                                                            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
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
                                                                <X className="size-3.5 sm:size-4" />
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

                        <div className="mt-8 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={processing}
                                style={{ backgroundColor: '#370001' }}
                            >
                                {processing ? 'Saving...' : 'Update Data'}
                            </Button>
                        </div>
                    </form>
                </div>
                </ScrollArea>
            </DialogContent>
            </Dialog>

            {/* Confirmation Modal */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Update</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-sm text-foreground">
                        <p className="font-semibold text-red-600">Warning:</p>
                        <p>
                            Changing the <strong>Purchase Order No.</strong> will also affect
                            any linked records that reference this PO (Deliveries, IARs, and
                            related documents).
                        </p>
                        <p className="mt-2">Are you sure you want to proceed with this change?</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowConfirmModal(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmAndSubmit}
                            disabled={processing}
                            style={{ backgroundColor: '#612A35' }}
                            className="text-white"
                        >
                            {processing ? 'Updating...' : 'Yes, Proceed'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Image Lightbox — used for both new (unsaved) files and existing attachments */}
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

            {/* Supplier Quick-Add — a sibling dialog, not nested inside the lightbox */}
            <SupplierQuickAddModal
                open={quickAddOpen}
                onOpenChange={setQuickAddOpen}
                initialName={quickAddQuery}
                onCreated={(created) => {
                    setSupplierOptions((prev) => [...prev, created]);
                    handleSelectChange('supplier_id')(String(created.supplier_id));
                }}
            />

            <StockItemQuickAddModal
                open={itemQuickAddOpen}
                onOpenChange={setItemQuickAddOpen}
                initialName={itemQuickAddQuery}
                onCreated={(created) => {
                    setStockItemOptions((prev) => [...prev, created]);
                    setItemStockNos((prev) => [...prev, created.stock_no]);
                }}
            />
        </>
    );
}