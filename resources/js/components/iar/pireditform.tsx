import { Eye, Paperclip, RefreshCw, Trash2, X, File, FileImage, FileText, FileSpreadsheet, FileArchive, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import type { Pir } from '@/pages/iar/index';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface Office {
    office_code: string;
    office_name: string;
    entity_name: string;
}

interface PurchaseOrder {
    po_number: string;
    po_date: string | null;
    pr_number: string | null;
    pr_date: string | null;
    ors_burs_no: string | null;
    ors_burs_date: string | null;
    total_amount_po: number | string | null;
    fund_cluster_id: string | null;
    supplier_id: number | null;
    end_user: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pir: Pir | null;
    suppliers: Supplier[];
    fundClusters: FundCluster[];
    offices: Office[];
    purchaseOrders: PurchaseOrder[];
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
    disabled?: boolean;
}

const labelClass = 'mb-1 block text-sm text-foreground';
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

function Field({
    label,
    name,
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
    type = 'text',
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
                disabled={disabled}
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

// Read-only display for values derived from the PO — still submitted in
// the payload (via `data`), just not directly editable.
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
    disabled?: boolean;
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
    disabled = false,
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
            <Select value={value} onValueChange={onChange} disabled={disabled}>
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

interface SearchableSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    options: { value: string; label: string }[];
    disabled?: boolean;
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
    disabled = false,
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
                        disabled={disabled}
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

interface Attachment {
    id: number;
    original_name: string;
    file_size?: number;
    url: string;
}

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

function FileIconDisplay({ type }: { type: string }) {
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

function formatBytes(bytes: number) {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

let fileIdCounter = 0;
function generateFileId() {
    fileIdCounter += 1;
    return `file-${Date.now()}-${fileIdCounter}`;
}

type InspectionEntry = {
    iar_number: string;
    inspected_by: string;
    inspection_date: string;
};

type InspectionItem = {
    id: string;
    inspected_by: string;
    inspection_date: string;
};

type InspectionGroup = {
    iar_number: string;
    items: InspectionItem[];
};

let inspectionEntryIdCounter = 0;
function generateInspectionItemId() {
    inspectionEntryIdCounter += 1;
    return `inspection-item-${Date.now()}-${inspectionEntryIdCounter}`;
}

const createInspectionItem = (): InspectionItem => ({
    id: generateInspectionItemId(),
    inspected_by: '',
    inspection_date: '',
});

const createInspectionGroup = (): InspectionGroup => ({
    iar_number: '',
    items: [createInspectionItem()],
});

const createEmptyForm = () => ({
    po_number: '',
    supplier_id: '',
    unit_office: '',
    po_date: '',
    delivery_term: '',
    fund_cluster: '',
    pr_number: '',
    pr_date: '',
    ors_bur_number: '',
    ors_bur_date: '',
    po_amount: '',
    date_forwarded_supplier: '',
    forwarded_by_supplier: '',
    claimed_by_supplier: '',
    supplier_signature_date: '',
    date_forwarded_coa: '',
    forwarded_by_coa: '',
    date_returned_from_coa: '',
    coa_date: '',
    claim_date: '',
    claimed_by_coa: '',
    date_received_by_supplier: '',
    invoice_number: '',
    invoice_date: '',
    delivery_receipt: '',
    date_completed: '',
    par_ics_number: '',
    ris_number: '',
    iar_number: '',
    date_forwarded_to_finance: '',
    receipt_receiving_date: '',
    receipt_claimed_by: '',
    items_receiving_date: '',
    items_claimed_by: '',
    po_vpad_notified_date: '',
    po_vpad_notified_via: '',
    coa_stamp_notified_date: '',
    coa_stamp_notified_via: '',
    receipt_claimed_notified_date: '',
    receipt_claimed_notified_via: '',
    status: '',
    remarks: '',
    inspection_groups: [createInspectionGroup()],
});

const emptyForm = createEmptyForm();

function d(value: string | null) {
    return value ? value.slice(0, 10) : '';
}

export default function PirEditForm({
    open,
    onOpenChange,
    pir,
    suppliers,
    fundClusters,
    offices,
    purchaseOrders,
}: Props) {

    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['suppliers', 'offices', 'fundClusters'],
            onFinish: () => setRefreshingField(null),
        });
    };

    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [files, setFiles] = useState<{ id: string; file: File }[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const removeExistingAttachment = (attachmentId: number) => {
        setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        setDeletedAttachmentIds((prev) => [...prev, attachmentId]);
    };

    useEffect(() => {
        if (pir) {
            const fundClusterId =
                pir.fund_cluster_detail?.fund_cluster_id ??
                pir.fund_cluster_raw ??
                (typeof pir.fund_cluster === 'string' ? pir.fund_cluster : '') ??
                '';

            setData({
                po_number: pir.po_number ?? '',
                supplier_id: String(pir.supplier_id ?? ''),
                unit_office: pir.unit_office ?? '',
                po_date: d(pir.po_date),
                delivery_term: pir.delivery_term ? String(pir.delivery_term) : '',
                fund_cluster: fundClusterId,
                pr_number: pir.pr_number ?? '',
                pr_date: d(pir.pr_date),
                ors_bur_number: pir.ors_bur_number ?? '',
                ors_bur_date: d(pir.ors_bur_date),
                po_amount: pir.po_amount ? String(pir.po_amount) : '',
                date_forwarded_supplier: d(pir.date_forwarded_supplier),
                forwarded_by_supplier: pir.forwarded_by_supplier ?? '',
                claimed_by_supplier: pir.claimed_by_supplier ?? '',
                supplier_signature_date: d(pir.supplier_signature_date),
                date_forwarded_coa: d(pir.date_forwarded_coa),
                forwarded_by_coa: pir.forwarded_by_coa ?? '',
                date_returned_from_coa: d(pir.date_returned_from_coa),
                coa_date: d(pir.coa_date),
                claim_date: d(pir.claim_date),
                claimed_by_coa: pir.claimed_by_coa ?? '',
                date_received_by_supplier: d(pir.date_received_by_supplier),
                invoice_number: pir.invoice_number ?? '',
                invoice_date: d(pir.invoice_date),
                delivery_receipt: pir.delivery_receipt ?? '',
                date_completed: d(pir.date_completed),
                par_ics_number: pir.par_ics_number ?? '',
                ris_number: pir.ris_number ?? '',
                iar_number: pir.iar_number ?? '',
                date_forwarded_to_finance: d(pir.date_forwarded_to_finance),
                receipt_receiving_date: d(pir.receipt_receiving_date),
                receipt_claimed_by: pir.receipt_claimed_by ?? '',
                items_receiving_date: d(pir.items_receiving_date),
                items_claimed_by: pir.items_claimed_by ?? '',
                po_vpad_notified_date: d(pir.po_vpad_notified_date),
                po_vpad_notified_via: pir.po_vpad_notified_via ?? '',
                coa_stamp_notified_date: d(pir.coa_stamp_notified_date),
                coa_stamp_notified_via: pir.coa_stamp_notified_via ?? '',
                receipt_claimed_notified_date: d(pir.receipt_claimed_notified_date),
                receipt_claimed_notified_via: pir.receipt_claimed_notified_via ?? '',
                status: pir.status ?? '',
                remarks: pir.remarks ?? '',
                inspection_groups: (() => {
                    const entries = Array.isArray((pir as { inspection_entries?: InspectionEntry[] }).inspection_entries)
                        ? (pir as { inspection_entries?: InspectionEntry[] }).inspection_entries!
                        : [];

                    if (entries.length === 0) {
                        return [createInspectionGroup()];
                    }

                    const grouped = new Map<string, InspectionEntry[]>();
                    entries.forEach((entry) => {
                        const key = entry.iar_number ?? '';
                        const list = grouped.get(key) ?? [];
                        list.push(entry);
                        grouped.set(key, list);
                    });

                    return Array.from(grouped.entries()).map(([iarNumber, iarEntries]) => ({
                        iar_number: iarNumber,
                        items: iarEntries.map((entry) => ({
                            id: generateInspectionItemId(),
                            inspected_by: entry.inspected_by ?? '',
                            inspection_date: entry.inspection_date ? String(entry.inspection_date).slice(0, 10) : '',
                        })),
                    }));
                })(),
            });
            setErrors({});
            setFiles([]);
            setExistingAttachments(pir.attachments ?? []);
            setDeletedAttachmentIds([]);
        }
    }, [pir]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setData({ ...data, [name]: value });
    };

    const updateInspectionGroup = (groupIndex: number, value: string) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex ? { ...group, iar_number: value } : group
            ),
        }));
    };

    const updateInspectionItem = (groupIndex: number, itemIndex: number, field: 'inspected_by' | 'inspection_date', value: string) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex
                    ? {
                        ...group,
                        items: group.items.map((item, currentIndex) =>
                            currentIndex === itemIndex ? { ...item, [field]: value } : item
                        ),
                    }
                    : group
            ),
        }));
    };

    const addInspectionGroup = () => {
        setData((prev) => ({
            ...prev,
            inspection_groups: [...prev.inspection_groups, createInspectionGroup()],
        }));
    };

    const removeInspectionGroup = (groupIndex: number) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.filter((_, index) => index !== groupIndex),
        }));
    };

    const addInspectionItem = (groupIndex: number) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex && group.items.length < 2
                    ? { ...group, items: [...group.items, createInspectionItem()] }
                    : group
            ),
        }));
    };

    const removeInspectionItem = (groupIndex: number, itemIndex: number) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex && group.items.length > 1
                    ? {
                        ...group,
                        items: group.items.filter((_, currentIndex) => currentIndex !== itemIndex),
                    }
                    : group
            ),
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pir) return;

        setProcessing(true);

        const payload = {
            ...data,
            deleted_attachment_ids: deletedAttachmentIds,
            inspection_entries: data.inspection_groups.flatMap((group) =>
                group.items
                    .filter((item) => item.inspected_by.trim() !== '' || item.inspection_date.trim() !== '' || group.iar_number.trim() !== '')
                    .map((item) => ({
                        iar_number: group.iar_number,
                        inspected_by: item.inspected_by,
                        inspection_date: item.inspection_date,
                    }))
            ),
        };

        delete (payload as { inspection_groups?: unknown }).inspection_groups;

        router.put(`/iar/${pir.pir_id}`, payload, {
            onSuccess: () => {
                const finishSubmission = () => {
                    router.reload({
                        only: ['pirs'],
                        onFinish: () => {
                            onOpenChange(false);
                            setFiles([]);
                            setDeletedAttachmentIds([]);
                        },
                    });
                };

                if (files.length > 0) {
                    const formData = new FormData();
                    files.forEach(({ file }) => formData.append('files[]', file));

                    router.post(
                        `/iar/${encodeURIComponent(pir.pir_id)}/attachments`,
                        formData,
                        {
                            forceFormData: true,
                            onFinish: () => finishSubmission(),
                        }
                    );
                } else {
                    finishSubmission();
                }
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    // "For Release" must be fully filled out before anything after it
    // (Receipt/Item's Claimed, For Payment, Status & Remarks) can be
    // touched — mirrors PirAddForm's lock.
    const forReleaseComplete = data.inspection_groups.some((group) =>
        group.iar_number.trim() !== '' || group.items.some((item) => item.inspected_by.trim() !== '' || item.inspection_date.trim() !== '')
    );

    if (!pir) return null;

    const supplierName = suppliers.find(
        (s) => String(s.supplier_id) === data.supplier_id
    )?.supplier_name ?? '';

    const officeLabel = (() => {
        const office = offices.find((o) => o.office_code === data.unit_office);
        return office ? `${office.office_code} - ${office.office_name}` : data.unit_office;
    })();

    const fundClusterLabel = (() => {
        const fc = fundClusters.find((f) => f.fund_cluster_id === data.fund_cluster);
        return fc ? `${fc.fund_cluster_id} - ${fc.fund_description}` : data.fund_cluster;
    })();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-h-[95vh] overflow-hidden p-0"
                style={{ maxWidth: '1200px' }}
            >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Edit PIR Record — {pir?.pir_id}, {pir?.po_number}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Group: PO FROM VPAD */}
                    <div>
                        <h3 className={sectionTitleClass}>PO From VPAD</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="PO Number"
                                name="po_number"
                                value={data.po_number}
                                onChange={handleChange}
                                error={errors.po_number}
                                disabled
                            />
                            <LockedField
                                label="Supplier"
                                value={supplierName}
                                error={errors.supplier_id}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="Unit/Office"
                                value={officeLabel}
                                error={errors.unit_office}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="PO Date"
                                value={data.po_date}
                                error={errors.po_date}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="Delivery Term (days)"
                                value={data.delivery_term}
                                error={errors.delivery_term}
                                placeholder="Auto-calculated from PO dates"
                            />
                            <LockedField
                                label="Fund Cluster"
                                value={fundClusterLabel}
                                error={errors.fund_cluster}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="PR Number"
                                value={data.pr_number}
                                error={errors.pr_number}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="PR Date"
                                value={data.pr_date}
                                error={errors.pr_date}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="ORS/BUR Number"
                                value={data.ors_bur_number}
                                error={errors.ors_bur_number}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="ORS/BUR Date"
                                value={data.ors_bur_date}
                                error={errors.ors_bur_date}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="PO Amount"
                                value={data.po_amount}
                                error={errors.po_amount}
                                placeholder="Auto-filled from PO Number"
                            />
                            <Field
                                label="Date Forwarded"
                                name="date_forwarded_supplier"
                                type="date"
                                value={data.date_forwarded_supplier}
                                onChange={handleChange}
                                error={errors.date_forwarded_supplier}
                            />
                            <SearchableSelect
                                label="Forwarded By"
                                value={data.forwarded_by_supplier}
                                onChange={handleSelectChange('forwarded_by_supplier')}
                                error={errors.forwarded_by_supplier}
                                placeholder="Search Office..."
                                options={offices.map((o) => ({
                                    value: o.office_code,
                                    label: o.office_code,
                                }))}
                                onRefresh={() => handleRefreshData('offices')}
                                isRefreshing={refreshingField === 'offices'}
                            />
                            <Field
                                label="Notified Date"
                                name="po_vpad_notified_date"
                                type="date"
                                value={data.po_vpad_notified_date}
                                onChange={handleChange}
                                error={errors.po_vpad_notified_date}
                            />
                            <Field
                                label="Notified via Email or Number"
                                name="po_vpad_notified_via"
                                value={data.po_vpad_notified_via}
                                onChange={handleChange}
                                error={errors.po_vpad_notified_via}
                                placeholder="Enter email or number"
                            />
                        </div>
                    </div>

                    {/* Group: FOR SUPPLIER'S SIGNATURE */}
                    <div>
                        <h3 className={sectionTitleClass}>For Supplier's Signature</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Claimed By"
                                name="claimed_by_supplier"
                                value={data.claimed_by_supplier}
                                onChange={handleChange}
                                error={errors.claimed_by_supplier}
                            />
                            <Field
                                label="Date"
                                name="supplier_signature_date"
                                type="date"
                                value={data.supplier_signature_date}
                                onChange={handleChange}
                                error={errors.supplier_signature_date}
                            />
                            <Field
                                label="Date Received by Supplier"
                                name="date_received_by_supplier"
                                type="date"
                                value={data.date_received_by_supplier}
                                onChange={handleChange}
                                error={errors.date_received_by_supplier}
                            />
                        </div>
                    </div>

                    {/* Group: FOR COA STAMP */}
                    <div>
                        <h3 className={sectionTitleClass}>For COA Stamp</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Date Forwarded"
                                name="date_forwarded_coa"
                                type="date"
                                value={data.date_forwarded_coa}
                                onChange={handleChange}
                                error={errors.date_forwarded_coa}
                            />
                            <Field
                                label="Forwarded By"
                                name="forwarded_by_coa"
                                value={data.forwarded_by_coa}
                                onChange={handleChange}
                                error={errors.forwarded_by_coa}
                            />
                            <Field
                                label="Date Returned from COA"
                                name="date_returned_from_coa"
                                type="date"
                                value={data.date_returned_from_coa}
                                onChange={handleChange}
                                error={errors.date_returned_from_coa}
                            />
                            <Field
                                label="COA Date"
                                name="coa_date"
                                type="date"
                                value={data.coa_date}
                                onChange={handleChange}
                                error={errors.coa_date}
                            />
                            <Field
                                label="Claim Date"
                                name="claim_date"
                                type="date"
                                value={data.claim_date}
                                onChange={handleChange}
                                error={errors.claim_date}
                            />
                            <Field
                                label="Claimed By"
                                name="claimed_by_coa"
                                value={data.claimed_by_coa}
                                onChange={handleChange}
                                error={errors.claimed_by_coa}
                            />
                            <Field
                                label="Notified Date"
                                name="coa_stamp_notified_date"
                                type="date"
                                value={data.coa_stamp_notified_date}
                                onChange={handleChange}
                                error={errors.coa_stamp_notified_date}
                            />
                            <Field
                                label="Notified via Email or Number"
                                name="coa_stamp_notified_via"
                                value={data.coa_stamp_notified_via}
                                onChange={handleChange}
                                error={errors.coa_stamp_notified_via}
                                placeholder="Enter email or number"
                            />
                        </div>
                    </div>

                    {/* Group: FOR RELEASE */}
                    <div>
                        <h3 className={sectionTitleClass}>
                            For Release
                            {!forReleaseComplete && (
                                <span className="ml-2 text-xs font-normal text-amber-600">
                                    (Complete this section to unlock the rest of the form)
                                </span>
                            )}
                        </h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Invoice Number"
                                name="invoice_number"
                                value={data.invoice_number}
                                onChange={handleChange}
                                error={errors.invoice_number}
                            />
                            <Field
                                label="Invoice Date"
                                name="invoice_date"
                                type="date"
                                value={data.invoice_date}
                                onChange={handleChange}
                                error={errors.invoice_date}
                            />
                            <Field
                                label="Delivery Receipt"
                                name="delivery_receipt"
                                value={data.delivery_receipt}
                                onChange={handleChange}
                                error={errors.delivery_receipt}
                            />
                            <Field
                                label="Date Completed"
                                name="date_completed"
                                type="date"
                                value={data.date_completed}
                                onChange={handleChange}
                                error={errors.date_completed}
                            />
                            <Field
                                label="PAR/ICS Number"
                                name="par_ics_number"
                                value={data.par_ics_number}
                                onChange={handleChange}
                                error={errors.par_ics_number}
                            />
                            <Field
                                label="RIS Number"
                                name="ris_number"
                                value={data.ris_number}
                                onChange={handleChange}
                                error={errors.ris_number}
                            />
                            <div className="col-span-4">
                                <div className="rounded-md border p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-sm font-medium text-foreground">Inspection Entries</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addInspectionGroup}
                                        >
                                            + Add IAR Row
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {data.inspection_groups.map((group, groupIndex) => (
                                            <div key={groupIndex} className="rounded-md border bg-background/50 p-3">
                                                <div className="mb-3 flex items-center justify-between">
                                                    <div className="w-full max-w-[280px]">
                                                        <label className="mb-1 block text-xs text-muted-foreground">IAR Number</label>
                                                        <Input
                                                            value={group.iar_number}
                                                            onChange={(e) => updateInspectionGroup(groupIndex, e.target.value)}
                                                            placeholder="Enter IAR Number"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => addInspectionItem(groupIndex)}
                                                            disabled={group.items.length >= 2}
                                                        >
                                                            <Plus className="mr-1 h-4 w-4" />
                                                            Add Inspector/Date
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeInspectionGroup(groupIndex)}
                                                            disabled={data.inspection_groups.length === 1}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    {group.items.map((item, itemIndex) => (
                                                        <div key={item.id} className="grid grid-cols-1 gap-2 rounded-md border border-dashed p-3 md:grid-cols-2">
                                                            <div>
                                                                <div className="mb-1 flex items-center justify-between">
                                                                    <label className="block text-xs text-muted-foreground">Inspected By</label>
                                                                    {itemIndex === group.items.length - 1 && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            onClick={() => addInspectionItem(groupIndex)}
                                                                            disabled={group.items.length >= 2}
                                                                            title="Add another inspector/date"
                                                                        >
                                                                            <Plus className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                <Input
                                                                    value={item.inspected_by}
                                                                    onChange={(e) => updateInspectionItem(groupIndex, itemIndex, 'inspected_by', e.target.value)}
                                                                    placeholder="Enter Inspected By"
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="mb-1 flex items-center justify-between">
                                                                    <label className="block text-xs text-muted-foreground">Inspection Date</label>
                                                                    {group.items.length > 1 && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            onClick={() => removeInspectionItem(groupIndex, itemIndex)}
                                                                            title="Remove inspector/date"
                                                                        >
                                                                            <X className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                <Input
                                                                    type="date"
                                                                    value={item.inspection_date}
                                                                    onChange={(e) => updateInspectionItem(groupIndex, itemIndex, 'inspection_date', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group: RECEIPT AND ITEM/S CLAIMED BY END-USER */}
                    <div>
                        <h3 className={sectionTitleClass}>Receipt and Item/s Claimed by End-User</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Receipt Receiving Date"
                                name="receipt_receiving_date"
                                type="date"
                                value={data.receipt_receiving_date}
                                onChange={handleChange}
                                error={errors.receipt_receiving_date}
                                disabled={!forReleaseComplete}
                            />
                            <Field
                                label="Claimed By"
                                name="receipt_claimed_by"
                                value={data.receipt_claimed_by}
                                onChange={handleChange}
                                error={errors.receipt_claimed_by}
                                disabled={!forReleaseComplete}
                            />
                            <Field
                                label="Item/s Receiving Date"
                                name="items_receiving_date"
                                type="date"
                                value={data.items_receiving_date}
                                onChange={handleChange}
                                error={errors.items_receiving_date}
                                disabled={!forReleaseComplete}
                            />
                            <Field
                                label="Claimed By"
                                name="items_claimed_by"
                                value={data.items_claimed_by}
                                onChange={handleChange}
                                error={errors.items_claimed_by}
                                disabled={!forReleaseComplete}
                            />
                            <Field
                                label="Notified Date"
                                name="receipt_claimed_notified_date"
                                type="date"
                                value={data.receipt_claimed_notified_date}
                                onChange={handleChange}
                                error={errors.receipt_claimed_notified_date}
                                disabled={!forReleaseComplete}
                            />
                            <Field
                                label="Notified via Email or Number"
                                name="receipt_claimed_notified_via"
                                value={data.receipt_claimed_notified_via}
                                onChange={handleChange}
                                error={errors.receipt_claimed_notified_via}
                                disabled={!forReleaseComplete}
                                placeholder="Enter email or number"
                            />
                        </div>
                    </div>

                    {/* Group: FOR PAYMENT (FINANCE) */}
                    <div>
                        <h3 className={sectionTitleClass}>For Payment (Finance)</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="IAR Number"
                                name="iar_number"
                                value={data.iar_number}
                                onChange={handleChange}
                                error={errors.iar_number}
                                disabled={!forReleaseComplete}
                            />
                            <Field
                                label="Date Forwarded to Finance"
                                name="date_forwarded_to_finance"
                                type="date"
                                value={data.date_forwarded_to_finance}
                                onChange={handleChange}
                                error={errors.date_forwarded_to_finance}
                                disabled={!forReleaseComplete}
                            />
                        </div>
                    </div>

                    {/* Group: ATTACHMENTS */}
                    <div>
                        <h3 className={sectionTitleClass}>Attachments</h3>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!forReleaseComplete}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
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
                                                    className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                        <FileIconDisplay type={type} />
                                                    </div>

                                                    <p className="min-w-0 flex-1 truncate text-sm">
                                                        {att.original_name}
                                                    </p>

                                                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                                        {getExtension(att.original_name).toUpperCase()}
                                                    </Badge>

                                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                                                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </a>
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                                                        onClick={() => removeExistingAttachment(att.id)}
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
                        {files.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">New Files</p>
                                <ScrollArea className="max-h-[180px]">
                                    <div className="space-y-1.5">
                                        {files.map(({ id, file }) => {
                                            const type = getFileType(file.name);
                                            return (
                                                <div
                                                    key={id}
                                                    className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                        {type === 'image' ? (
                                                            <img
                                                                src={URL.createObjectURL(file)}
                                                                alt={file.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <FileIconDisplay type={type} />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm">{file.name}</p>
                                                        <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
                                                    </div>

                                                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                                        {getExtension(file.name).toUpperCase()}
                                                    </Badge>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                                                        onClick={() => removeFile(id)}
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
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
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
                            style={{ backgroundColor: '#612A35' }}
                        >
                            {processing ? 'Saving...' : 'Update PIR'}
                        </Button>
                    </div>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}