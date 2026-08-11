import { Paperclip, RefreshCw, X, Check, ChevronsUpDown, Plus, Mail } from 'lucide-react';
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
    po_received_date: string | null;
    due_date: string | null;
}

interface PoLetterInfo {
    po_number: string;
    type_of_letter: string;
    status_of_the_letter: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

// Read-only display for values derived from the selected PO — still
// submitted in the payload (via `data`), just not directly editable.
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

function daysBetween(startDate: string, endDate: string) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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

// crypto.randomUUID() requires a secure context (localhost/HTTPS). When
// serving over a plain-HTTP LAN IP (e.g. php artisan serve --host=192.168.x.x)
// it's undefined, so we roll our own simple unique id instead.
let fileIdCounter = 0;
function generateFileId() {
    fileIdCounter += 1;
    return `file-${Date.now()}-${fileIdCounter}`;
}

const STATUS_OPTIONS = [
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'ONGOING', label: 'ONGOING' },
    { value: 'CANCELLED', label: 'CANCELLED' },
];

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

export default function PirAddForm({
    open,
    onOpenChange,
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
            only: ['purchaseOrders', 'suppliers', 'offices', 'fundClusters', 'poLetters'],
            onFinish: () => setRefreshingField(null),
        });
    };
    const [data, setData] = useState(createEmptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [files, setFiles] = useState<{ id: string; file: File }[]>([]);

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

    // PO Number is selected first; everything inherited from the PO gets
    // auto-filled here, including delivery_term (calculated from the PO's
    // own po_received_date/due_date, same daysBetween() logic used in
    // DeliveryAddForm). These auto-filled fields are now LOCKED (read-only)
    // to prevent accidental edits — same pattern as PoLetterAddForm.
    const handlePoChange = (value: string) => {
        const po = purchaseOrders.find((p) => p.po_number === value);

        if (!po) {
            setData({ ...data, po_number: value });
            return;
        }

        const poDateReceived = po.po_received_date ? po.po_received_date.slice(0, 10) : '';
        const dueDate = po.due_date ? po.due_date.slice(0, 10) : '';

        setData({
            ...data,
            po_number: value,
            supplier_id: po.supplier_id ? String(po.supplier_id) : '',
            fund_cluster: po.fund_cluster_id ?? '',
            po_date: po.po_date ? po.po_date.slice(0, 10) : '',
            pr_number: po.pr_number ?? '',
            pr_date: po.pr_date ? po.pr_date.slice(0, 10) : '',
            ors_bur_number: po.ors_burs_no ?? '',
            ors_bur_date: po.ors_burs_date ? po.ors_burs_date.slice(0, 10) : '',
            po_amount: po.total_amount_po ? String(po.total_amount_po) : '',
            unit_office: po.end_user ?? '',
            delivery_term: String(daysBetween(poDateReceived, dueDate)),
        });
    };

    const resetForm = () => {
        setData(createEmptyForm());
        setErrors({});
        setFiles([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const payload = {
            ...data,
            inspection_entries: data.inspection_groups.flatMap((group) => {
                const inspectors = group.inspectors.filter((value) => value.trim() !== '');
                const dates = group.inspection_dates.filter((value) => value.trim() !== '');

                if (inspectors.length > 0 && dates.length > 0) {
                    return inspectors.flatMap((inspector) =>
                        dates.map((date) => ({
                            iar_number: group.iar_number,
                            inspected_by: inspector,
                            inspection_date: date,
                        }))
                    );
                }

                if (inspectors.length > 0) {
                    return inspectors.map((inspector) => ({
                        iar_number: group.iar_number,
                        inspected_by: inspector,
                        inspection_date: '',
                    }));
                }

                if (dates.length > 0) {
                    return dates.map((date) => ({
                        iar_number: group.iar_number,
                        inspected_by: '',
                        inspection_date: date,
                    }));
                }

                return [];
            }),
        };

        delete (payload as { inspection_groups?: unknown }).inspection_groups;

        router.post('/iar', payload, {
            onSuccess: (page) => {
                const createdPirId = (page as { props?: { flash?: { createdPirId?: number } } }).props?.flash?.createdPirId ?? null;

                const finishSubmission = () => {
                    router.reload({
                        only: ['pirs'],
                        onFinish: () => {
                            onOpenChange(false);
                            resetForm();
                        },
                    });
                };

                if (files.length > 0 && createdPirId) {
                    const formData = new FormData();
                    files.forEach(({ file }) => formData.append('files[]', file));

                    router.post(
                        `/iar/${createdPirId}/attachments`,
                        formData,
                        {
                            forceFormData: true,
                            onFinish: () => {
                                finishSubmission();
                            },
                        }
                    );
                } else {
                    finishSubmission();
                }
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    const poSelected = Boolean(data.po_number);

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
        group.iar_number.trim() !== '' &&
        group.inspectors.some((value) => value.trim() !== '') &&
        group.inspection_dates.some((value) => value.trim() !== '')
    );

    const forReleaseComplete = forReleaseFieldsComplete && forReleaseInspectionComplete;

    const afterForReleaseDisabled = !poSelected || !forReleaseComplete;


    // Status is auto-derived: CANCELLED if the PO has an approved CANCELLATION
    // letter, COMPLETED once every "For Release" field and at least one full
    // inspection entry exists, otherwise blank.
    useEffect(() => {
        console.log('poLetters:', poLetters);
        console.log('current po_number:', data.po_number);
        
        const poCancelled = poLetters.some(
            (letter) =>
                letter.po_number === data.po_number &&
                letter.type_of_letter === 'CANCELLATION' &&
                letter.status_of_the_letter === 'APPROVED'
        );
        
        console.log('poCancelled:', poCancelled);

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

    const supplierName = suppliers.find(
        (s) => String(s.supplier_id) === data.supplier_id
    )?.supplier_name ?? '';

    const officeLabel = (() => {
        const office = offices.find((o) => o.office_code === data.unit_office);
        return office ? `${office.office_code} - ${office.office_name}` : data.unit_office;
    })();

    const [sendingOfficeEmail, setSendingOfficeEmail] = useState(false);

    const sendOfficeEmail = (type: string) => {
        if (!data.unit_office) return;
        setSendingOfficeEmail(true);
        router.post(
            `/offices/${encodeURIComponent(data.unit_office)}/send-test-email`,
            { type, po_number: data.po_number, supplier_name: supplierName },
            {
                preserveScroll: true,
                onFinish: () => setSendingOfficeEmail(false),
            }
        );
    };

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
                    <DialogTitle>Add PIR Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Group: PO FROM VPAD */}
                    <div>
                        <h3 className={sectionTitleClass}>PO From VPAD</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <SearchableSelect
                                label="PO Number"
                                value={data.po_number}
                                onChange={handlePoChange}
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
                                disabled={!poSelected}
                            />
                            <SearchableSelect
                                label="Forwarded By"
                                value={data.forwarded_by_supplier}
                                onChange={handleSelectChange('forwarded_by_supplier')}
                                error={errors.forwarded_by_supplier}
                                placeholder="-- Select Office --"
                                disabled={!poSelected}
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
                                disabled={!poSelected}
                            />
                            <Field
                                label="Notified via Email or Number"
                                name="po_vpad_notified_via"
                                value={data.po_vpad_notified_via}
                                onChange={handleChange}
                                error={errors.po_vpad_notified_via}
                                disabled={!poSelected}
                                placeholder="Enter email or number"
                            />
                            <div>
                                <label className={labelClass}>Email OVPAD</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                     className="w-full"
                                    disabled={!data.unit_office || sendingOfficeEmail}
                                    onClick={() => sendOfficeEmail('pir_created')}
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {sendingOfficeEmail ? 'Sending...' : 'Notify Office'}
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
                                disabled={!poSelected}
                                placeholder="Enter Claimed By"
                            />
                            <Field
                                label="Date"
                                name="supplier_signature_date"
                                type="date"
                                value={data.supplier_signature_date}
                                onChange={handleChange}
                                error={errors.supplier_signature_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Date Received by Supplier"
                                name="date_received_by_supplier"
                                type="date"
                                value={data.date_received_by_supplier}
                                onChange={handleChange}
                                error={errors.date_received_by_supplier}
                                disabled={!poSelected}
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
                                disabled={!poSelected}
                            />
                            <Field
                                label="Forwarded By"
                                name="forwarded_by_coa"
                                value={data.forwarded_by_coa}
                                onChange={handleChange}
                                error={errors.forwarded_by_coa}
                                disabled={!poSelected}
                                placeholder="Enter Forwarded By"
                            />
                            <Field
                                label="Date Returned from COA"
                                name="date_returned_from_coa"
                                type="date"
                                value={data.date_returned_from_coa}
                                onChange={handleChange}
                                error={errors.date_returned_from_coa}
                                disabled={!poSelected}
                            />
                            <Field
                                label="COA Date"
                                name="coa_date"
                                type="date"
                                value={data.coa_date}
                                onChange={handleChange}
                                error={errors.coa_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Claim Date"
                                name="claim_date"
                                type="date"
                                value={data.claim_date}
                                onChange={handleChange}
                                error={errors.claim_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Claimed By"
                                name="claimed_by_coa"
                                value={data.claimed_by_coa}
                                onChange={handleChange}
                                error={errors.claimed_by_coa}
                                disabled={!poSelected}
                                placeholder="Enter Claimed By"
                            />
                            <Field
                                label="Notified Date"
                                name="coa_stamp_notified_date"
                                type="date"
                                value={data.coa_stamp_notified_date}
                                onChange={handleChange}
                                error={errors.coa_stamp_notified_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Notified via Email or Number"
                                name="coa_stamp_notified_via"
                                value={data.coa_stamp_notified_via}
                                onChange={handleChange}
                                error={errors.coa_stamp_notified_via}
                                disabled={!poSelected}
                                placeholder="Enter email or number"
                            />
                            <div>
                                <label className={labelClass}>COA Received</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!data.unit_office || sendingOfficeEmail}
                                     className="w-full"
                                    onClick={() => sendOfficeEmail('pir_coa_received')}
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {sendingOfficeEmail ? 'Sending...' : 'Notify Office'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Group: FOR RELEASE */}
                    <div>
                        <h3 className={sectionTitleClass}>
                            For Release
                            {poSelected && !forReleaseComplete && (
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
                                disabled={!poSelected}
                                placeholder="Enter Invoice Number"
                            />
                            <Field
                                label="Invoice Date"
                                name="invoice_date"
                                type="date"
                                value={data.invoice_date}
                                onChange={handleChange}
                                error={errors.invoice_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Delivery Receipt"
                                name="delivery_receipt"
                                value={data.delivery_receipt}
                                onChange={handleChange}
                                error={errors.delivery_receipt}
                                disabled={!poSelected}
                                placeholder="Enter Delivery Receipt"
                            />
                            <Field
                                label="Date Completed"
                                name="date_completed"
                                type="date"
                                value={data.date_completed}
                                onChange={handleChange}
                                error={errors.date_completed}
                                disabled={!poSelected}
                            />
                            <Field
                                label="PAR/ICS Number"
                                name="par_ics_number"
                                value={data.par_ics_number}
                                onChange={handleChange}
                                error={errors.par_ics_number}
                                disabled={!poSelected}
                                placeholder="Enter PAR/ICS Number"
                            />
                            <Field
                                label="RIS Number"
                                name="ris_number"
                                value={data.ris_number}
                                onChange={handleChange}
                                error={errors.ris_number}
                                disabled={!poSelected}
                                placeholder="Enter RIS Number"
                            />

                            {/* Inspection Entries — redesigned for clarity:
                                one compact row per IAR group, inspectors and
                                dates rendered as removable inline chips with
                                a single "+" affordance each, instead of two
                                nested bordered panels per group. */}
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
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addInspectionGroup}
                                        disabled={!poSelected}
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        Add IAR
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {data.inspection_groups.map((group, groupIndex) => (
                                        <div
                                            key={groupIndex}
                                            className="rounded-md border p-3"
                                        >
                                            <div className="flex flex-wrap items-start gap-3 md:flex-nowrap">
                                                {/* IAR number */}
                                                <div className="w-full shrink-0 md:w-48">
                                                    <label className="mb-1 block text-xs text-muted-foreground">
                                                        IAR Number
                                                    </label>
                                                    <Input
                                                        value={group.iar_number}
                                                        onChange={(e) => updateInspectionGroup(groupIndex, e.target.value)}
                                                        disabled={!poSelected}
                                                        placeholder="202603190005"
                                                        maxLength={12}
                                                        className={`h-8 ${
                                                            group.iar_number.length > 0 && !isValidIarNumber(group.iar_number)
                                                                ? 'border-red-500'
                                                                : ''
                                                        }`}
                                                    />
                                                    {group.iar_number.length > 0 && !isValidIarNumber(group.iar_number) && (
                                                        <p className="mt-1 text-xs text-red-500">
                                                            {group.iar_number.length < 12
                                                                ? `${12 - group.iar_number.length} more digit(s) needed`
                                                                : 'Invalid IAR number format (YYYYMMDDNNNN)'}
                                                        </p>
                                                    )}
                                                </div>
                                                {/* Inspectors */}
                                                <div className="min-w-0 flex-1">
                                                    <label className="mb-1 block text-xs text-muted-foreground">
                                                        Inspected By
                                                    </label>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {group.inspectors.map((inspector, inspectorIndex) => (
                                                            <div
                                                                key={`inspector-${groupIndex}-${inspectorIndex}`}
                                                                className="flex items-center gap-1"
                                                            >
                                                                <Input
                                                                    value={inspector}
                                                                    onChange={(e) => updateInspectionInspector(groupIndex, inspectorIndex, e.target.value)}
                                                                    disabled={!poSelected}
                                                                    placeholder="Name"
                                                                    className="h-8 w-36"
                                                                />
                                                                {group.inspectors.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeInspectionInspector(groupIndex, inspectorIndex)}
                                                                        disabled={!poSelected}
                                                                        className="text-muted-foreground hover:text-red-600 disabled:opacity-50"
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
                                                            disabled={!poSelected}
                                                            className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
                                                            title="Add inspector"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Dates */}
                                                <div className="min-w-0 flex-1">
                                                    <label className="mb-1 block text-xs text-muted-foreground">
                                                        Inspection Date
                                                    </label>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {group.inspection_dates.map((date, dateIndex) => (
                                                            <div
                                                                key={`date-${groupIndex}-${dateIndex}`}
                                                                className="flex items-center gap-1"
                                                            >
                                                                <Input
                                                                    type="date"
                                                                    value={date}
                                                                    onChange={(e) => updateInspectionDate(groupIndex, dateIndex, e.target.value)}
                                                                    disabled={!poSelected}
                                                                    className="h-8 w-36"
                                                                />
                                                                {group.inspection_dates.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeInspectionDate(groupIndex, dateIndex)}
                                                                        disabled={!poSelected}
                                                                        className="text-muted-foreground hover:text-red-600 disabled:opacity-50"
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
                                                            disabled={!poSelected}
                                                            className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
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
                                                    disabled={!poSelected || data.inspection_groups.length === 1}
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
                            <Field
                                label="Receipt Receiving Date"
                                name="receipt_receiving_date"
                                type="date"
                                value={data.receipt_receiving_date}
                                onChange={handleChange}
                                error={errors.receipt_receiving_date}
                                disabled={afterForReleaseDisabled}
                            />
                            <Field
                                label="Claimed By"
                                name="receipt_claimed_by"
                                value={data.receipt_claimed_by}
                                onChange={handleChange}
                                error={errors.receipt_claimed_by}
                                disabled={afterForReleaseDisabled}
                                placeholder="Enter Claimed By"
                            />
                            <Field
                                label="Item/s Receiving Date"
                                name="items_receiving_date"
                                type="date"
                                value={data.items_receiving_date}
                                onChange={handleChange}
                                error={errors.items_receiving_date}
                                disabled={afterForReleaseDisabled}
                            />
                            <Field
                                label="Claimed By"
                                name="items_claimed_by"
                                value={data.items_claimed_by}
                                onChange={handleChange}
                                error={errors.items_claimed_by}
                                disabled={afterForReleaseDisabled}
                                placeholder="Enter Claimed By"
                            />
                            <Field
                                label="Notified Date"
                                name="receipt_claimed_notified_date"
                                type="date"
                                value={data.receipt_claimed_notified_date}
                                onChange={handleChange}
                                error={errors.receipt_claimed_notified_date}
                                disabled={afterForReleaseDisabled}
                            />
                            <Field
                                label="Notified via Email or Number"
                                name="receipt_claimed_notified_via"
                                value={data.receipt_claimed_notified_via}
                                onChange={handleChange}
                                error={errors.receipt_claimed_notified_via}
                                disabled={afterForReleaseDisabled}
                                placeholder="Enter email or number"
                            />
                            <div>
                                <label className={labelClass}>For Release</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                     disabled={!forReleaseComplete || !data.unit_office || sendingOfficeEmail}
                                    className="w-full"
                                    onClick={() => sendOfficeEmail('pir_completed')}
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {sendingOfficeEmail ? 'Sending...' : 'Notify Office'}
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
                            disabled={processing || !poSelected}
                            style={{ backgroundColor: '#612A35' }}
                        >
                            {processing ? 'Saving...' : 'Save PIR'}
                        </Button>
                    </div>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}