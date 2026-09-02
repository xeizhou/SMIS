import { Eye, Paperclip, RefreshCw, Trash2, X, File, FileImage, FileText, FileSpreadsheet, FileArchive, Check, ChevronsUpDown, Plus, Mail, ExternalLink } from 'lucide-react';
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

interface PoLetterInfo {
    po_number: string;
    type_of_letter: string;
    status_of_the_letter: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pir: Pir | null;
    suppliers: Supplier[];
    fundClusters: FundCluster[];
    offices: Office[];
    purchaseOrders: PurchaseOrder[];
    poLetters: PoLetterInfo[];
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

const STATUS_OPTIONS = [
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'ONGOING', label: 'ONGOING' },
    { value: 'CANCELLED', label: 'CANCELLED' },
];

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

interface StagedFile {
    id: string;
    file: File;
    previewUrl: string | null;
}

interface PreviewTarget {
    name: string;
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

function formatIarNumberInput(raw: string): string {
    // 12 digits: YYYYMMDD + 4-digit sequence, auto-clamped as you type
    const digits = raw.replace(/\D/g, '').slice(0, 12);

    if (digits.length >= 6) {
        const month = digits.slice(4, 6);
        const m = parseInt(month, 10);
        if (m < 1 || m > 12) {
            // reject the invalid month digit(s), keep year only
            return digits.slice(0, 4) + digits.slice(6);
        }
    }

    if (digits.length >= 8) {
        const day = digits.slice(6, 8);
        const dNum = parseInt(day, 10);
        if (dNum < 1 || dNum > 31) {
            return digits.slice(0, 6) + digits.slice(8);
        }
    }

    return digits;
}

function isValidIarNumber(value: string): boolean {
    if (!/^\d{12}$/.test(value)) return false;
    const month = parseInt(value.slice(4, 6), 10);
    const day = parseInt(value.slice(6, 8), 10);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31;
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

type InspectionGroup = {
    iar_number: string;
    inspectors: string[];
    inspection_dates: string[];
};

const createInspectionGroup = (): InspectionGroup => ({
    iar_number: '',
    inspectors: [''],
    inspection_dates: [''],
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
    poLetters,
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
    const [files, setFiles] = useState<StagedFile[]>([]);
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            files.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    };

    const openFilePreview = (staged: StagedFile) => {
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

    const openExistingPreview = (att: Attachment) => {
        const type = getFileType(att.original_name);
        if (type === 'image') {
            setPreviewTarget({ name: att.original_name, url: att.url });
        } else {
            window.open(att.url, '_blank', 'noopener,noreferrer');
        }
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
                        inspectors: iarEntries
                            .map((entry) => entry.inspected_by ?? '')
                            .filter((value, index, all) => value.trim() !== '' && all.indexOf(value) === index),
                        inspection_dates: iarEntries
                            .map((entry) => (entry.inspection_date ? String(entry.inspection_date).slice(0, 10) : ''))
                            .filter((value, index, all) => value.trim() !== '' && all.indexOf(value) === index),
                    }));
                })(),
            });
            setErrors({});
            files.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
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
        const formatted = formatIarNumberInput(value);
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex ? { ...group, iar_number: formatted } : group
            ),
        }));
    };

    const updateInspectionInspector = (groupIndex: number, inspectorIndex: number, value: string) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex
                    ? {
                        ...group,
                        inspectors: group.inspectors.map((item, currentIndex) =>
                            currentIndex === inspectorIndex ? value : item
                        ),
                    }
                    : group
            ),
        }));
    };

    const updateInspectionDate = (groupIndex: number, dateIndex: number, value: string) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex
                    ? {
                        ...group,
                        inspection_dates: group.inspection_dates.map((item, currentIndex) =>
                            currentIndex === dateIndex ? value : item
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

    const addInspectionInspector = (groupIndex: number) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex
                    ? { ...group, inspectors: [...group.inspectors, ''] }
                    : group
            ),
        }));
    };

    const addInspectionDate = (groupIndex: number) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex
                    ? { ...group, inspection_dates: [...group.inspection_dates, ''] }
                    : group
            ),
        }));
    };

    const removeInspectionInspector = (groupIndex: number, inspectorIndex: number) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex && group.inspectors.length > 1
                    ? {
                        ...group,
                        inspectors: group.inspectors.filter((_, currentIndex) => currentIndex !== inspectorIndex),
                    }
                    : group
            ),
        }));
    };

    const removeInspectionDate = (groupIndex: number, dateIndex: number) => {
        setData((prev) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group, index) =>
                index === groupIndex && group.inspection_dates.length > 1
                    ? {
                        ...group,
                        inspection_dates: group.inspection_dates.filter((_, currentIndex) => currentIndex !== dateIndex),
                    }
                    : group
            ),
        }));
    };

    const supplierName = suppliers.find(
        (s) => String(s.supplier_id) === data.supplier_id
    )?.supplier_name ?? '';

    const [sendingOfficeEmail, setSendingOfficeEmail] = useState<string | null>(null);

    const sendOfficeEmail = (type: string) => {
        if (!data.unit_office) return;
        setSendingOfficeEmail(type);
        router.post(
            `/offices/${encodeURIComponent(data.unit_office)}/send-test-email`,
            { type, po_number: data.po_number, supplier_name: supplierName },
            {
                preserveScroll: true,
                onFinish: () => setSendingOfficeEmail(null),
            }
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pir) return;

        setProcessing(true);

        const payload = {
            ...data,
            deleted_attachment_ids: deletedAttachmentIds,
            inspection_entries: data.inspection_groups.flatMap((group) => {
                const inspectors = group.inspectors.filter((value) => value.trim() !== '');
                const dates = group.inspection_dates.filter((value) => value.trim() !== '');

                if (inspectors.length > 0 && dates.length > 0) {
                    return inspectors.flatMap((inspector) =>
                        dates.map((date) => ({
                            inspected_by: inspector,
                            inspection_date: date,
                        }))
                    );
                }

                if (inspectors.length > 0) {
                    return inspectors.map((inspector) => ({
                        inspected_by: inspector,
                        inspection_date: '',
                    }));
                }

                if (dates.length > 0) {
                    return dates.map((date) => ({
                        inspected_by: '',
                        inspection_date: date,
                    }));
                }

                return [];
            }),
        };

        delete (payload as { inspection_groups?: unknown }).inspection_groups;

        router.put(`/iar/${pir.pir_id}`, payload, {
            onSuccess: () => {
                const finishSubmission = () => {
                    router.reload({
                        only: ['pirs'],
                        onFinish: () => {
                            onOpenChange(false);
                            files.forEach((f) => {
                                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
                            });
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

    const FOR_RELEASE_FIELDS = [
        'invoice_number',
        'invoice_date',
        'delivery_receipt',
        'date_completed',
        'par_ics_number',
        'ris_number',
    ] as const;

    const forReleaseFieldsComplete = FOR_RELEASE_FIELDS.every(
        (field) => data[field].trim() !== ''
    );

    const forReleaseInspectionComplete = data.inspection_groups.some((group) =>
        group.inspectors.some((value) => value.trim() !== '') &&
        group.inspection_dates.some((value) => value.trim() !== '')
    );

    const forReleaseComplete = forReleaseFieldsComplete && forReleaseInspectionComplete;

    useEffect(() => {
        const poCancelled = poLetters.some(
            (letter) =>
                letter.po_number === data.po_number &&
                letter.type_of_letter === 'CANCELLATION' &&
                letter.status_of_the_letter === 'APPROVED'
        );

        setData((prev) => {
            const nextStatus = poCancelled
                ? 'CANCELLED'
                : forReleaseComplete
                ? 'COMPLETED'
                : 'ONGOING';

            if (nextStatus === prev.status) {
                return prev;
            }

            return { ...prev, status: nextStatus };
        });
    }, [forReleaseComplete, data.po_number, poLetters]);

    if (!pir) return null;

    const officeLabel = (() => {
        const office = offices.find((o) => o.office_code === data.unit_office);
        return office ? `${office.office_code} - ${office.office_name}` : data.unit_office;
    })();

    const fundClusterLabel = (() => {
        const fc = fundClusters.find((f) => f.fund_cluster_id === data.fund_cluster);
        return fc ? `${fc.fund_cluster_id} - ${fc.fund_description}` : data.fund_cluster;
    })();

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
                            <div>
                                <label className={labelClass}>Email OVPAD</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    disabled={!data.unit_office || sendingOfficeEmail !== null}
                                    onClick={() => sendOfficeEmail('pir_created')}
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {sendingOfficeEmail === 'pir_created' ? 'Sending...' : 'Notify Office'}
                                </Button>
                            </div>
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
                            <div>
                                <label className={labelClass}>COA Received</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!data.unit_office || sendingOfficeEmail !== null}
                                    className="w-full"
                                    onClick={() => sendOfficeEmail('pir_coa_received')}
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {sendingOfficeEmail === 'pir_coa_received' ? 'Sending...' : 'Notify Office'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Group: FOR RELEASE */}
                    <div>
                        <h3 className={sectionTitleClass}>
                            For Release
                            {!forReleaseComplete && (
                                <span className="ml-2 text-xs font-normal text-amber-600">
                                    (Complete this section to unlock Receipt and Item/s Claimed by End-User)
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
                           {/* Inspection Entries — compact row-per-IAR layout with inline chips */}
                            <div className="col-span-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-foreground">
                                        Inspection Entries
                                        {data.inspection_groups.length > 0 && (
                                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                {data.inspection_groups.length} IAR{data.inspection_groups.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </p>
                                    <Button type="button" variant="outline" size="sm" onClick={addInspectionGroup}>
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        Add IAR
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {data.inspection_groups.map((group, groupIndex) => (
                                        <div key={groupIndex} className="rounded-md border p-3">
                                            <div className="flex flex-wrap items-start gap-3 md:flex-nowrap">


                                                {/* Inspectors */}
                                                <div className="min-w-0 flex-1">
                                                    <label className="mb-1 block text-xs text-muted-foreground">Inspected By</label>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {group.inspectors.map((inspector, inspectorIndex) => (
                                                            <div key={`inspector-${groupIndex}-${inspectorIndex}`} className="flex items-center gap-1">
                                                                <Input
                                                                    value={inspector}
                                                                    onChange={(e) => updateInspectionInspector(groupIndex, inspectorIndex, e.target.value)}
                                                                    placeholder="Name"
                                                                    className="h-8 w-36"
                                                                />
                                                                {group.inspectors.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeInspectionInspector(groupIndex, inspectorIndex)}
                                                                        className="text-muted-foreground hover:text-red-600"
                                                                        title="Remove inspector"
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => addInspectionInspector(groupIndex)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/40"
                                                            title="Add inspector"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Dates */}
                                                <div className="min-w-0 flex-1">
                                                    <label className="mb-1 block text-xs text-muted-foreground">Inspection Date</label>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {group.inspection_dates.map((date, dateIndex) => (
                                                            <div key={`date-${groupIndex}-${dateIndex}`} className="flex items-center gap-1">
                                                                <Input
                                                                    type="date"
                                                                    value={date}
                                                                    onChange={(e) => updateInspectionDate(groupIndex, dateIndex, e.target.value)}
                                                                    className="h-8 w-36"
                                                                />
                                                                {group.inspection_dates.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeInspectionDate(groupIndex, dateIndex)}
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
                                                            onClick={() => addInspectionDate(groupIndex)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/40"
                                                            title="Add date"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Remove whole IAR row */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeInspectionGroup(groupIndex)}
                                                    disabled={data.inspection_groups.length === 1}
                                                    className="mt-5 shrink-0 text-muted-foreground hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                                    title="Remove IAR row"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group: RECEIPT AND ITEM/S CLAIMED BY END-USER */}
                    <div>
                        <h3 className={sectionTitleClass}>Receipt and Item/s Claimed by End-User</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <div className="w-full">
                                <label className="mb-1 block text-xs text-muted-foreground">
                                    IAR Number
                                </label>
                                <Input
                                    value={data.iar_number}
                                    onChange={(e) => setData({ ...data, iar_number: formatIarNumberInput(e.target.value) })}
                                    disabled={data.status !== 'COMPLETED'}
                                    placeholder="202603190005"
                                    maxLength={12}
                                    className={`h-9 ${
                                        data.iar_number.length > 0 && !isValidIarNumber(data.iar_number)
                                            ? 'border-red-500 focus-visible:ring-red-500'
                                            : ''
                                    }`}
                                />
                                {data.iar_number.length > 0 && !isValidIarNumber(data.iar_number) && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {data.iar_number.length < 12
                                            ? `${12 - data.iar_number.length} more digit(s) needed`
                                            : 'Invalid IAR number format (YYYYMMDDNNNN)'}
                                    </p>
                                )}
                            </div>
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
                            <div>
                                <label className={labelClass}>For Release</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!forReleaseComplete || !data.unit_office || sendingOfficeEmail !== null}
                                    onClick={() => sendOfficeEmail('pir_completed')}
                                    className="w-full"
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {sendingOfficeEmail === 'pir_completed' ? 'Sending...' : 'Notify Office'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Group: STATUS, REMARKS */}
                    <div>
                        <h3 className={sectionTitleClass}>Status & Remarks</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <div>
                                <label className={labelClass}>
                                    Status
                                    <span className="text-red-500"> *</span>
                                </label>
                                <div className="flex items-center gap-2">
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
                                        disabled={poLetters.some(
                                            (letter) =>
                                                letter.po_number === data.po_number &&
                                                letter.type_of_letter === 'CANCELLATION' &&
                                                letter.status_of_the_letter === 'APPROVED'
                                        )}
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
                                    Auto-CANCELLED if this PO has an approved cancellation letter; otherwise COMPLETED once For Release and Inspection Entries are fully filled out.
                                </p>
                                {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status}</p>}
                            </div>
                            <Field
                                label="Date Forwarded to Finance"
                                name="date_forwarded_to_finance"
                                type="date"
                                value={data.date_forwarded_to_finance}
                                onChange={handleChange}
                                error={errors.date_forwarded_to_finance}
                            />
                            <div className="col-span-2">
                                <Field
                                    label="Remarks"
                                    name="remarks"
                                    value={data.remarks}
                                    onChange={handleChange}
                                    error={errors.remarks}
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Group: ATTACHMENTS */}
                    <div>
                        <h3 className={sectionTitleClass}>Attachments</h3>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
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
                                    <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                                        {existingAttachments.map((att) => {
                                            const type = getFileType(att.original_name);
                                            return (
                                                <li key={att.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openExistingPreview(att)}
                                                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                                                    >
                                                        <div className="h-9 w-9 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                            {type === 'image' ? (
                                                                <img
                                                                    src={att.url}
                                                                    alt={att.original_name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <FileIconDisplay type={type} />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm">{att.original_name}</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {att.file_size ? formatBytes(att.file_size) : ''}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px] h-5">
                                                            {getExtension(att.original_name).toUpperCase()}
                                                        </Badge>
                                                        <span
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeExistingAttachment(att.id);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.stopPropagation();
                                                                    removeExistingAttachment(att.id);
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
                                </ScrollArea>
                            </div>
                        )}

                        {/* New Files */}
                        {files.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">New Files</p>
                                <ScrollArea className="max-h-[180px]">
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
                                                                <FileIconDisplay type={type} />
                                                            )}
                                                        </div>
                                                        <span className="min-w-0 flex-1 truncate text-sm">
                                                            {file.name}
                                                        </span>
                                                        <span className="shrink-0 text-xs text-muted-foreground">
                                                            {formatBytes(file.size)}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] h-5">
                                                            {getExtension(file.name).toUpperCase()}
                                                        </Badge>
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

        {/* Image Lightbox */}
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