import { router } from '@inertiajs/react';
import { Paperclip, X, Check, RefreshCw, ChevronsUpDown } from 'lucide-react';
import { useRef, useState } from 'react';
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

// Custom Searchable Dropdown
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
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

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
                        {/* ADDED max-h and overflow-y-auto here to fix scrolling */}
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
    due_date: '',
    pr_number: '',
    pr_date: '',
    philgeps_reference_no: '',
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

function formatBytes(bytes: number) {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

let fileIdCounter = 0;
function generateFileId() {
    fileIdCounter += 1;
    return `file-${Date.now()}-${fileIdCounter}`;
}

export default function PurchaseOrderAddForm({
    open,
    onOpenChange,
    suppliers,
    fundClusters,
    offices,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [files, setFiles] = useState<{ id: string; file: File }[]>([]);
    const [refreshingField, setRefreshingField] = useState<string | null>(null);

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

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post(
            '/purchase-orders',
            {
                ...data,
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                    className="w-[95vw] max-h-[90vh] overflow-y-auto"
                    style={{ maxWidth: '1200px' }}
                >
                <DialogHeader>
                    <DialogTitle>New Purchase Order</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="grid grid-cols-2 gap-10 w-full">
                        {/* Left column */}
                        <div className="space-y-5">
                            <Field
                                label="Purchase Order No."
                                name="po_number"
                                value={data.po_number}
                                onChange={handleChange}
                                error={errors.po_number}
                                placeholder="20XX-0X-XXXX"
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field
                                    label="Due Date"
                                    name="due_date"
                                    type="date"
                                    value={data.due_date}
                                    onChange={handleChange}
                                    error={errors.due_date}
                                />

                                <Field
                                    label="PR No."
                                    name="pr_number"
                                    value={data.pr_number}
                                    onChange={handleChange}
                                    error={errors.pr_number}
                                    placeholder="20XX-0X-XXXX"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <SelectField
                                    label="Mode of Procurement"
                                    value={data.mode_of_procurement}
                                    onChange={handleSelectChange('mode_of_procurement')}
                                    error={errors.mode_of_procurement}
                                    placeholder="--Select Mode of Procurement--"
                                    options={MODE_OF_PROCUREMENT_OPTIONS}
                                />

                                <Field
                                    label="Inclusive Date"
                                    name="inclusive_date"
                                    value={data.inclusive_date}
                                    onChange={handleChange}
                                    error={errors.inclusive_date}
                                    placeholder="e.g. Jan 1 - Jan 15, 2026"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Item Description</label>

                                <textarea
                                    name="item_description"
                                    value={data.item_description}
                                    onChange={(e) =>
                                        setData({ ...data, item_description: e.target.value })
                                    }
                                    rows={4}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    placeholder='KEYBOARD 5pcs'
                                />

                                {errors.item_description && (
                                    <p className="mt-1 text-xs text-red-500">{errors.item_description}</p>
                                )}
                            </div>

                            {/* Attachments */}
                            <div>
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

                        {/* Right column */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Total Amount Difference
                                    </label>

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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Responsibility Center
                                    </label>

                                    <Input
                                        value={responsibilityCenter}
                                        readOnly
                                        className="bg-muted text-muted-foreground"
                                        placeholder="Fund Cluster + End User"
                                    />

                                    {errors.responsibility_center && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.responsibility_center}
                                        </p>
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

                            <div className="grid grid-cols-2 gap-4">
                                <SearchableSelect
                                    label="Supplier"
                                    value={data.supplier_id}
                                    onChange={handleSelectChange('supplier_id')}
                                    error={errors.supplier_id}
                                    placeholder="Search Supplier..."
                                    options={suppliers.map((s) => ({
                                        value: String(s.supplier_id),
                                        label: s.supplier_name,
                                    }))}
                                    onRefresh={() => handleRefreshData('supplier')}
                                    isRefreshing={refreshingField === 'supplier'}
                                />

                                {/* Reverted label back to just office_code */}
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
            </DialogContent>
        </Dialog>
    );
}