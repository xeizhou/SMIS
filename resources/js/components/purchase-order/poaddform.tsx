import { router } from '@inertiajs/react';
import { Paperclip, X, Check, RefreshCw, ChevronsUpDown, Info, Plus, File, FileImage, FileText, FileSpreadsheet, FileArchive, ExternalLink } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert } from '@/components/ui/alert';
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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

// Original searchable dropdown, restored — trigger just shows the
// selected label as text (no chip). The only addition vs. the original
// is an always-visible "Add new" row in the list itself (not just inside
// CommandEmpty), so it's there whether or not the search has results.
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
    { value: 'SMALL VALUE PROCUREMENT', label: 'SMALL VALUE PROCUREMENT' },
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

function calculateDiff(abc: string, po: string) {
    const abcValue = parseFloat(abc);
    const poValue = parseFloat(po);

    const safeAbc = Number.isNaN(abcValue) ? 0 : abcValue;
    const safePo = Number.isNaN(poValue) ? 0 : poValue;

    return safeAbc - safePo;
}

function calculateResponsibilityCenter(fundClusterId: string, endUser: string) {
    return [fundClusterId, endUser].filter(Boolean).join(' ');
}

function formatPoNumberInput(raw: string): string {
    const digits = raw.replace(/\D/g, '');

    let year = digits.slice(0, 4);
    let month = digits.slice(4, 6);
    let seq = digits.slice(6, 10);

    // Clamp month to 01–12 as it's typed
    if (month.length === 1 && !['0', '1'].includes(month)) {
        month = ''; // reject a first digit that can't start a valid month
    }
    if (month.length === 2) {
        const m = parseInt(month, 10);
        if (m < 1 || m > 12) {
            month = month[0]; // drop the invalid second digit
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

function FileTypeIcon({ type }: { type: string }) {
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

export default function PurchaseOrderAddForm({
    open,
    onOpenChange,
    suppliers,
    fundClusters,
    offices,
    stockItems,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [itemStockNos, setItemStockNos] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [files, setFiles] = useState<StagedFile[]>([]);
    const [refreshingField, setRefreshingField] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<StagedFile | null>(null);

    // Supplier quick-add state — lives here (inside the component), not at
    // module scope, so it's properly isolated per form instance.
    const [supplierOptions, setSupplierOptions] = useState<Supplier[]>(suppliers);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickAddQuery, setQuickAddQuery] = useState('');

    // Stock item quick-add state — same pattern as supplier quick-add.
    const [stockItemOptions, setStockItemOptions] = useState<StockItemOption[]>(stockItems);
    const [itemQuickAddOpen, setItemQuickAddOpen] = useState(false);
    const [itemQuickAddQuery, setItemQuickAddQuery] = useState('');

    useEffect(() => {
        setStockItemOptions(stockItems);
    }, [stockItems]);

    // Keep local supplier list in sync if the parent passes a fresh
    // `suppliers` prop (e.g. after a manual refresh).
    useEffect(() => {
        setSupplierOptions(suppliers);
    }, [suppliers]);

    // Revoke every staged object URL when the component unmounts, so we
    // don't leak blob URLs across dialog open/close cycles.
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
            only: ['suppliers', 'fundClusters', 'offices'],
            onFinish: () => setRefreshingField(null),
        });
    };

    const diff = calculateDiff(data.total_amount_abc, data.total_amount_po);
    const responsibilityCenter = calculateResponsibilityCenter(data.fund_cluster_id, data.end_user);

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

    const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, matches server-side limit

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const incoming = Array.from(e.target.files);
        const accepted: StagedFile[] = [];
        const rejected: string[] = [];

        for (const file of incoming) {
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                rejected.push(`${file.name} (unsupported type)`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                rejected.push(`${file.name} (over 10MB)`);
                continue;
            }
            accepted.push({
                file,
                id: generateFileId(),
                previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            });
        }

        if (rejected.length > 0) {
            setErrors((prev) => ({
                ...prev,
                files: `Skipped: ${rejected.join(', ')}`,
            }));
        } else {
            setErrors((prev) => {
                const { files, ...rest } = prev;
                return rest;
            });
        }

        setFiles((prev) => [...prev, ...accepted]);
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

    const resetForm = () => {
        files.forEach((f) => {
            if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        });
        setData(emptyForm);
        setItemStockNos([]);
        setErrors({});
        setFiles([]);
        setPreviewFile(null);
    };

    const openFilePreview = (staged: StagedFile) => {
        const type = getFileType(staged.file.name);
        if (type === 'image') {
            setPreviewFile(staged);
        } else if (staged.previewUrl) {
            window.open(staged.previewUrl, '_blank', 'noopener,noreferrer');
        } else {
            // Non-image files don't have a persistent preview URL yet
            // (created on demand) so build one for the new tab open.
            const url = URL.createObjectURL(staged.file);
            window.open(url, '_blank', 'noopener,noreferrer');
            // Revoke shortly after — the browser has already opened it.
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!data.po_number.trim()) {
            setErrors({ po_number: 'Purchase Order No. is required.' });
            return;
        }

        setProcessing(true);
        setErrors({});

        router.post(
            '/purchase-orders',
            {
                ...data,
                item_stock_nos: itemStockNos,
                total_amount_diff: diff,
                responsibility_center: responsibilityCenter,
            },
            {
                onSuccess: () => {
                    if (files.length > 0) {
                        const formData = new FormData();
                        files.forEach(({ file }) => formData.append('files[]', file));

                        router.post(
                            `/purchase-orders/${data.po_number}/attachments`,
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
                        className="w-[95vw] max-h-[95vh] p-0 overflow-hidden"
                        style={{ maxWidth: '1200px' }}
                    >
                    <ScrollArea className="max-h-[95vh] w-full">
                        <div className="p-6">
                            <DialogHeader>
                                <DialogTitle>Add Purchase Order Record</DialogTitle>
                            </DialogHeader>

                            <Alert className="border-red-200 bg-red-50 text-red-800 mt-4 flex items-center gap-2 py-3 px-4 [&>svg]:text-red-800">
                                <Info className="size-4 shrink-0" />
                                <div className="text-sm flex flex-wrap items-center gap-1">
                                    <span className="font-semibold">REMINDER:</span>
                                    <span>needs an existing fund cluster, end user, and supplier data.</span>
                                </div>
                            </Alert>

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
                                            placeholder="20XX-0X-XXXX"
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
                                            value={data.total_amount_abc}
                                            onChange={handleChange}
                                            error={errors.total_amount_abc}
                                            placeholder="Amount of the Budget"
                                        />
                                        <Field
                                            label="Total Amount PO"
                                            name="total_amount_po"
                                            type="number"
                                            value={data.total_amount_po}
                                            onChange={handleChange}
                                            error={errors.total_amount_po}
                                            placeholder="Amount of the Budget"
                                        />
                                        <div>
                                            <label className={labelClass}>Total Amount Difference</label>
                                            <Input
                                                value={diff.toFixed(2)}
                                                disabled
                                                className="bg-muted text-muted-foreground"
                                            />
                                        </div>
                                        <SelectField
                                            label="Fund Cluster"
                                            value={data.fund_cluster_id}
                                            onChange={handleSelectChange('fund_cluster_id')}
                                            error={errors.fund_cluster_id}
                                            placeholder="-- Select Fund Cluster --"
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
                                            placeholder="00-000000-2025-00-0000"
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
                                            placeholder="00000000"
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
                                                                        <FileTypeIcon type={type} />
                                                                    )}
                                                                </div>
                                                                <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                                                                <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
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