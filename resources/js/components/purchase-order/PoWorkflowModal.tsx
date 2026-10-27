import { router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { Plus, Trash2, Mail, Lock, X,  Check, ChevronsUpDown, FileSpreadsheet, Info } from 'lucide-react';
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
import axios from 'axios';
import {
    ItemDescriptionBadge,
    OperationalImpactBadge,
    DEFAULT_ITEM_DESCRIPTIONS,
    OPERATIONAL_IMPACT_OPTIONS,
} from '@/components/purchase-order/po-badges';
import { useNativeValidation } from '@/hooks/useNativeValidation';
import { PATTERNS, MESSAGES } from '@/lib/validation';

// Utility functions
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

function groupInspectionEntries(entries: any[] | undefined): InspectionGroup[] {
    if (!entries || entries.length === 0) {
        return [createInspectionGroup()];
    }

    const grouped = new Map<string, { inspectors: Set<string>; dates: Set<string> }>();

    entries.forEach(entry => {
        const iar = entry.iar_number || '';
        if (!grouped.has(iar)) {
            grouped.set(iar, { inspectors: new Set(), dates: new Set() });
        }
        const g = grouped.get(iar)!;
        if (entry.inspected_by) g.inspectors.add(entry.inspected_by);
        if (entry.inspection_date) g.dates.add(toDateInputValue(entry.inspection_date));
    });

    const result: InspectionGroup[] = [];
    grouped.forEach((data, iar) => {
        result.push({
            iar_number: iar,
            inspectors: data.inspectors.size > 0 ? Array.from(data.inspectors) : [''],
            inspection_dates: data.dates.size > 0 ? Array.from(data.dates) : [''],
        });
    });

    return result.length > 0 ? result : [createInspectionGroup()];
}

function toDateInputValue(value: string | null): string {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

interface FieldProps {
    label: string;
    name: string;
    value?: any;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    readOnly?: boolean;
    pattern?: string;
    title?: string;
    disabled?: boolean;
}

function Field({
    label,
    name,
    value,
    onChange,
    error,
    type = 'text',
    placeholder,
    required,
    readOnly,
    pattern,
    title,
    disabled,
}: FieldProps) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor={name}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <Input
                type={type}
                name={name}
                id={name}
                value={value ?? ''}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                readOnly={readOnly}
                disabled={disabled}
                pattern={pattern}
                title={title}
                className={cn(error && 'border-red-500', readOnly && 'bg-muted text-muted-foreground cursor-not-allowed')}
            />
            {error && <p className="mt-1 text-[11px] text-red-500 font-medium">{error}</p>}
        </div>
    );
}

function SelectField({ label, value, onChange, error, options, placeholder, renderOption, renderTrigger }: any) {
    const selectedOpt = options?.find((o: any) => o.value === value);

    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{label}</label>
            <Select value={value || ''} onValueChange={onChange}>
                <SelectTrigger className={cn("w-full h-9", error && 'border-red-500')}>
                    {renderTrigger ? (
                        renderTrigger(selectedOpt)
                    ) : (
                        <SelectValue placeholder={placeholder} />
                    )}
                </SelectTrigger>
                <SelectContent>
                    {options?.map((opt: any) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {renderOption ? renderOption(opt) : opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && <p className="mt-1 text-[11px] text-red-500 font-medium">{error}</p>}
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
    onAddNew?: (query: string) => void;
    addNewLabel?: string;
    renderOption?: (opt: { value: string; label: string }) => React.ReactNode;
    renderTrigger?: (selectedOpt?: { value: string; label: string }) => React.ReactNode;
}

function SearchableSelect({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Search...',
    options,
    onAddNew,
    addNewLabel = 'new item',
    renderOption,
    renderTrigger,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selectedOpt = options.find((o) => o.value === value);

    const trimmedQuery = query.trim();
    const hasExactMatch = options.some(
        (o) => o.label.trim().toLowerCase() === trimmedQuery.toLowerCase()
    );
    const showAddNew = !!onAddNew && !hasExactMatch && trimmedQuery.length > 0;

    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            'w-full justify-between font-normal h-9',
                            !selectedOpt && !value && 'text-muted-foreground',
                            error && 'border-red-500'
                        )}
                    >
                        {selectedOpt || value ? (
                            renderTrigger ? (
                                renderTrigger(selectedOpt ?? { value, label: value })
                            ) : (
                                selectedOpt?.label || value
                            )
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
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
                                            setQuery('');
                                        }}
                                        className="text-primary font-medium cursor-pointer"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {`Add "${trimmedQuery}" as ${addNewLabel}`}
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
                                        {renderOption ? renderOption(opt) : opt.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {error && <p className="mt-1 text-[11px] text-red-500 font-medium">{error}</p>}
        </div>
    );
}

const STEPS = [
    'PO From VPAD',
    'End User',
    'For COA Stamp',
    'For Release',
    'Payment Processing',
    'Forwarded to Finance'
];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrder: any | null;
    itemDescriptions?: string[];
    operationalImpacts?: (string | { value: string; label: string; [key: string]: any })[] | readonly any[];
}

export default function PoWorkflowModal({
    open,
    onOpenChange,
    purchaseOrder,
    itemDescriptions = [],
    operationalImpacts = OPERATIONAL_IMPACT_OPTIONS,
}: Props) {
    const { auth } = usePage<any>().props;
    const isAdmin = auth?.user?.role === 'admin';
    const isStaff = auth?.user?.role === 'staff';

    const [data, setData] = useState<any>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const setError = (field: string, message: string) => setErrors((prev) => ({ ...prev, [field]: message }));
    const clearErrors = (field: string) => setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    const { handleBlur, handleChange: handleValidationChange } = useNativeValidation(errors, setError, clearErrors);
    const [processing, setProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('PO From VPAD');
    const [dvTemplate, setDvTemplate] = useState<string>('ld_only');
    const [ldAmount, setLdAmount] = useState<string>('');
    const [ldError, setLdError] = useState<string | null>(null);
    const [retentionAmount, setRetentionAmount] = useState<string>('');
    const [retentionError, setRetentionError] = useState<string | null>(null);
    const [hasDeliveryRecord, setHasDeliveryRecord] = useState<boolean>(() =>
        Boolean(purchaseOrder?.has_delivery_record ?? (purchaseOrder?.deliveries && purchaseOrder.deliveries.length > 0))
    );

    const poTotal = Number(purchaseOrder?.total_amount_po ?? 0);

    const isLdInputted = ldAmount !== null && ldAmount !== undefined && ldAmount.trim() !== '';
    const isLdValid = isLdInputted && !isNaN(Number(ldAmount)) && Number(ldAmount) >= 0 && Number(ldAmount) <= poTotal && !ldError;

    const isRetentionInputted = retentionAmount !== null && retentionAmount !== undefined && retentionAmount.trim() !== '';
    const isRetentionValid = !isRetentionInputted || (!isNaN(Number(retentionAmount)) && Number(retentionAmount) >= 0 && Number(retentionAmount) <= poTotal && !retentionError);

    const isDateCompletedFilled = Boolean(data.date_completed) || Boolean(purchaseOrder?.date_completed);
    const canExport = hasDeliveryRecord && (dvTemplate === 'neither'
        ? isDateCompletedFilled
        : (dvTemplate === 'retention_only'
            ? (isRetentionValid && isDateCompletedFilled)
            : (dvTemplate === 'ld_and_retention'
                ? (isLdValid && isRetentionValid && isDateCompletedFilled)
                : (isLdValid && isDateCompletedFilled))));

    const validateLdAmount = (val: string): boolean => {
        if (!val || val.trim() === '') {
            setLdError(null);
            return false;
        }
        const num = Number(val);
        if (isNaN(num)) {
            setLdError('LD amount must be a valid number.');
            return false;
        }
        if (num < 0) {
            setLdError('LD amount cannot be negative.');
            return false;
        }
        if (num > poTotal) {
            setLdError(`LD amount cannot exceed PO amount (₱${poTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`);
            return false;
        }
        setLdError(null);
        return true;
    };

    const handleLdChange = (val: string) => {
        setLdAmount(val);
        setData((prev: any) => ({ ...prev, ld_amount: val }));
        if (val.trim() === '') {
            setLdError(null);
        } else {
            validateLdAmount(val);
        }
    };

    const validateRetentionAmount = (val: string): boolean => {
        if (!val || val.trim() === '') {
            setRetentionError(null);
            return false;
        }
        const num = Number(val);
        if (isNaN(num)) {
            setRetentionError('Retention amount must be a valid number.');
            return false;
        }
        if (num < 0) {
            setRetentionError('Retention amount cannot be negative.');
            return false;
        }
        if (num > poTotal) {
            setRetentionError(`Retention amount cannot exceed PO amount (₱${poTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`);
            return false;
        }
        setRetentionError(null);
        return true;
    };

    const handleRetentionChange = (val: string) => {
        setRetentionAmount(val);
        setData((prev: any) => ({ ...prev, retention_amount: val }));
        if (val.trim() === '') {
            setRetentionError(null);
        } else {
            validateRetentionAmount(val);
        }
    };

    const handleExportDv = async () => {
        if (!purchaseOrder?.po_number) return;
        if (!hasDeliveryRecord) {
            alert('Disbursement Voucher export restricted: No matching Delivery Monitoring record was found for this Purchase Order.');
            return;
        }

        try {
            const check = await axios.get(`/purchase-orders/${encodeURIComponent(purchaseOrder.po_number)}/dv-eligibility`);
            if (!check.data?.eligible) {
                setHasDeliveryRecord(false);
                alert('Disbursement Voucher export restricted: No matching Delivery Monitoring record was found for this Purchase Order.');
                return;
            }
        } catch (e) {
            // Proceed to backend endpoint where authoritative verification will occur
        }

        if (dvTemplate === 'ld_only') {
            if (!isLdInputted) {
                setLdError('Please enter an LD amount.');
                return;
            }
            if (!validateLdAmount(ldAmount)) {
                return;
            }
        } else if (dvTemplate === 'retention_only') {
            if (retentionAmount.trim() !== '' && !validateRetentionAmount(retentionAmount)) {
                return;
            }
        } else if (dvTemplate === 'ld_and_retention') {
            if (!isLdInputted) {
                setLdError('Please enter an LD amount.');
                return;
            }
            if (!validateLdAmount(ldAmount)) {
                return;
            }
            if (retentionAmount.trim() !== '' && !validateRetentionAmount(retentionAmount)) {
                return;
            }
        }
        const params = new URLSearchParams();
        params.append('template', dvTemplate);
        if (dvTemplate === 'ld_only' || dvTemplate === 'ld_and_retention') {
            const effectiveLd = ldAmount.trim() !== '' ? ldAmount.trim() : (purchaseOrder?.ld_amount != null ? String(purchaseOrder.ld_amount) : '0');
            if (effectiveLd !== '') {
                params.append('ld_amount', effectiveLd);
            }
        }
        if (dvTemplate === 'retention_only' || dvTemplate === 'ld_and_retention') {
            const defaultOnePercent = poTotal > 0 ? (poTotal * 0.01).toFixed(2) : '0';
            const effectiveRetention = retentionAmount.trim() !== ''
                ? retentionAmount.trim()
                : (purchaseOrder?.retention_amount != null && String(purchaseOrder.retention_amount).trim() !== ''
                    ? String(purchaseOrder.retention_amount)
                    : defaultOnePercent);
            params.append('retention_amount', effectiveRetention);
        }
        window.location.href = `/purchase-orders/${encodeURIComponent(purchaseOrder.po_number)}/export-dv?${params.toString()}`;
    };

    const handleTemplateChange = (template: string) => {
        setDvTemplate(template);
        setData((prev: any) => ({ ...prev, dv_template: template }));
        if ((template === 'retention_only' || template === 'ld_and_retention') && retentionAmount.trim() === '' && poTotal > 0) {
            const onePercent = (poTotal * 0.01).toFixed(2);
            setRetentionAmount(onePercent);
            setData((prev: any) => ({ ...prev, retention_amount: onePercent }));
        }
    };

    const [itemDescList, setItemDescList] = useState<string[]>(() => {
        return Array.from(new Set([...DEFAULT_ITEM_DESCRIPTIONS, ...(itemDescriptions || [])]));
    });

    useEffect(() => {
        if (itemDescriptions && itemDescriptions.length > 0) {
            setItemDescList((prev) => Array.from(new Set([...prev, ...itemDescriptions])));
        }
    }, [itemDescriptions]);

    useEffect(() => {
        if (purchaseOrder?.item_description) {
            const val = purchaseOrder.item_description.trim();
            if (val && !val.includes('\n') && val.length <= 40) {
                setItemDescList((prev) => (prev.includes(val) ? prev : [...prev, val]));
            }
        }
    }, [purchaseOrder]);

    const handleAddItemDescription = async (newVal: string) => {
        const trimmed = newVal.trim();
        if (!trimmed) return;
        setData((prev: any) => ({ ...prev, item_description: trimmed }));
        setItemDescList((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
        try {
            await axios.post('/purchase-orders/item-descriptions', { name: trimmed });
        } catch (e) {
            console.error('Failed to save new item description', e);
        }
    };

    useEffect(() => {
        if (open && purchaseOrder) {
            const initialHas = Boolean(purchaseOrder.has_delivery_record ?? (purchaseOrder.deliveries && purchaseOrder.deliveries.length > 0));
            setHasDeliveryRecord(initialHas);
            if (purchaseOrder.po_number) {
                axios.get(`/purchase-orders/${encodeURIComponent(purchaseOrder.po_number)}/dv-eligibility`)
                    .then((res) => {
                        if (typeof res.data?.eligible === 'boolean') {
                            setHasDeliveryRecord(res.data.eligible);
                        }
                    })
                    .catch(() => {});
            }

            const initialLd = purchaseOrder.ld_amount != null ? String(purchaseOrder.ld_amount) : '';
            const initialTemplate = purchaseOrder.dv_template || '';
            const defaultRetention = poTotal > 0 ? (poTotal * 0.01).toFixed(2) : '';
            const initialRetention = purchaseOrder.retention_amount != null && String(purchaseOrder.retention_amount).trim() !== ''
                ? String(purchaseOrder.retention_amount)
                : ((initialTemplate === 'retention_only' || initialTemplate === 'ld_and_retention') ? defaultRetention : '');
            setLdAmount(initialLd);
            setRetentionAmount(initialRetention);
            setDvTemplate(initialTemplate || 'ld_only');
            setLdError(null);
            setRetentionError(null);
            setData({
                po_number: purchaseOrder.po_number || '',
                po_step: purchaseOrder.po_step || 'PO From VPAD',
                item_description: purchaseOrder.item_description || '',
                operational_impact: purchaseOrder.operational_impact || '',
                po_received_date: toDateInputValue(purchaseOrder.po_received_date),
                po_vpad_forwarded_by: purchaseOrder.po_vpad_forwarded_by || '',
                date_forwarded_to_end_user: toDateInputValue(purchaseOrder.date_forwarded_to_end_user),
                date_forwarded_supplier: toDateInputValue(purchaseOrder.date_forwarded_supplier),
                forwarded_by_supplier: purchaseOrder.forwarded_by_supplier || '',
                claimed_by_supplier: purchaseOrder.claimed_by_supplier || '',
                supplier_signature_date: toDateInputValue(purchaseOrder.supplier_signature_date),
                date_forwarded_coa: toDateInputValue(purchaseOrder.date_forwarded_coa),
                date_returned_from_coa: toDateInputValue(purchaseOrder.date_returned_from_coa),
                coa_date: toDateInputValue(purchaseOrder.coa_date),
                coa_processed_date: toDateInputValue(purchaseOrder.coa_processed_date),
                claim_date: toDateInputValue(purchaseOrder.claim_date),
                claimed_by_coa: purchaseOrder.claimed_by_coa || '',
                po_vpad_notified_date: toDateInputValue(purchaseOrder.po_vpad_notified_date),
                po_vpad_notified_via: purchaseOrder.po_vpad_notified_via || '',
                coa_stamp_notified_date: toDateInputValue(purchaseOrder.coa_stamp_notified_date),
                coa_stamp_notified_via: purchaseOrder.coa_stamp_notified_via || '',
                receipt_claimed_notified_date: toDateInputValue(purchaseOrder.receipt_claimed_notified_date),
                receipt_claimed_notified_via: purchaseOrder.receipt_claimed_notified_via || '',
                date_received_by_supplier: toDateInputValue(purchaseOrder.date_received_by_supplier),
                receipt_receiving_date: toDateInputValue(purchaseOrder.receipt_receiving_date),
                receipt_claimed_by: purchaseOrder.receipt_claimed_by || '',
                items_receiving_date: toDateInputValue(purchaseOrder.items_receiving_date),
                items_claimed_by: purchaseOrder.items_claimed_by || '',
                payment_status: purchaseOrder.payment_status || '',
                ld_amount: initialLd,
                retention_amount: initialRetention,
                dv_template: purchaseOrder.dv_template || '',
                workflow_remarks: purchaseOrder.workflow_remarks || '',
                invoice_number: purchaseOrder.invoice_number || '',
                invoice_date: toDateInputValue(purchaseOrder.invoice_date),
                delivery_receipt: purchaseOrder.delivery_receipt || '',
                par_ics_number: purchaseOrder.par_ics_number || '',
                ris_number: purchaseOrder.ris_number || '',
                date_completed: toDateInputValue(purchaseOrder.date_completed),
                date_forwarded_to_finance: toDateInputValue(purchaseOrder.date_forwarded_to_finance),
                inspection_groups: groupInspectionEntries(purchaseOrder.inspection_entries),
            });
            let stepToSet = purchaseOrder.po_step === "For Supplier's Signature" 
                ? "For COA Stamp" 
                : (STEPS.includes(purchaseOrder.po_step) ? purchaseOrder.po_step : 'PO From VPAD');

            if (isStaff && purchaseOrder.locked_steps) {
                if (purchaseOrder.locked_steps[stepToSet]) {
                    const firstUnlocked = STEPS.find((s) => !purchaseOrder.locked_steps[s]);
                    if (firstUnlocked) {
                        stepToSet = firstUnlocked;
                    }
                }
            }
            setActiveTab(stepToSet);
            setErrors({});
            setProcessing(false);
        }
    }, [open, purchaseOrder]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData((prev: any) => ({ ...prev, [name]: value }));
    };

    const updateInspectionGroup = (groupIndex: number, value: string) => {
        setData((prev: any) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group: any, index: number) =>
                index === groupIndex ? { ...group, iar_number: value } : group
            ),
        }));
    };

    const updateInspectionInspector = (groupIndex: number, inspectorIndex: number, value: string) => {
        setData((prev: any) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group: any, index: number) =>
                index === groupIndex
                    ? {
                        ...group,
                        inspectors: group.inspectors.map((item: string, currentIndex: number) =>
                            currentIndex === inspectorIndex ? value : item
                        ),
                    }
                    : group
            ),
        }));
    };

    const updateInspectionDate = (groupIndex: number, dateIndex: number, value: string) => {
        setData((prev: any) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group: any, index: number) =>
                index === groupIndex
                    ? {
                        ...group,
                        inspection_dates: group.inspection_dates.map((item: string, currentIndex: number) =>
                            currentIndex === dateIndex ? value : item
                        ),
                    }
                    : group
            ),
        }));
    };

    const addInspectionGroup = () => {
        setData((prev: any) => ({
            ...prev,
            inspection_groups: [...prev.inspection_groups, createInspectionGroup()],
        }));
    };

    const removeInspectionGroup = (groupIndex: number) => {
        setData((prev: any) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.filter((_: any, index: number) => index !== groupIndex),
        }));
        setErrors((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (key.startsWith(`inspection_groups.${groupIndex}`)) {
                    delete next[key];
                }
            });
            return next;
        });
    };

    const addInspectionInspector = (groupIndex: number) => {
        setData((prev: any) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group: any, index: number) =>
                index === groupIndex
                    ? { ...group, inspectors: [...group.inspectors, ''] }
                    : group
            ),
        }));
    };

    const addInspectionDate = (groupIndex: number) => {
        setData((prev: any) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group: any, index: number) =>
                index === groupIndex
                    ? { ...group, inspection_dates: [...group.inspection_dates, ''] }
                    : group
            ),
        }));
    };

    const removeInspectionInspector = (groupIndex: number, inspectorIndex: number) => {
        setData((prev: any) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group: any, index: number) =>
                index === groupIndex && group.inspectors.length > 1
                    ? {
                        ...group,
                        inspectors: group.inspectors.filter((_: any, currentIndex: number) => currentIndex !== inspectorIndex),
                    }
                    : group
            ),
        }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[`inspection_groups.${groupIndex}.inspectors.${inspectorIndex}`];
            return next;
        });
    };

    const removeInspectionDate = (groupIndex: number, dateIndex: number) => {
        setData((prev: any) => ({
            ...prev,
            inspection_groups: prev.inspection_groups.map((group: any, index: number) =>
                index === groupIndex && group.inspection_dates.length > 1
                    ? {
                        ...group,
                        inspection_dates: group.inspection_dates.filter((_: any, currentIndex: number) => currentIndex !== dateIndex),
                    }
                    : group
            ),
        }));
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setData((prev: any) => ({ ...prev, [name]: value }));
    };

    const STEP_RULES: Record<string, Array<{ name: string; label: string; required?: boolean; pattern?: RegExp; message?: string }>> = {
        'PO From VPAD': [
            { name: 'po_received_date', label: 'Date Received', required: true },
            { name: 'po_vpad_forwarded_by', label: 'Forwarded By', pattern: PATTERNS.nameOrOffice, message: MESSAGES.names },
            { name: 'po_vpad_notified_via', label: 'Notified via Email or Number', pattern: PATTERNS.contactInfo, message: MESSAGES.contactInfo },
        ],
        'End User': [
            { name: 'date_forwarded_to_end_user', label: 'Date Forwarded to End User', required: true },
        ],
        'For COA Stamp': [
            { name: 'supplier_signature_date', label: 'Supplier Signature Date', required: true },
            { name: 'coa_date', label: 'COA Date', required: true },
            { name: 'claimed_by_coa', label: 'Claimed By (COA)', pattern: PATTERNS.nameOrOffice, message: MESSAGES.names },
            { name: 'coa_stamp_notified_via', label: 'Notified via Email or Number', pattern: PATTERNS.contactInfo, message: MESSAGES.contactInfo },
        ],
        'For Release': [
            { name: 'date_received_by_supplier', label: 'Date Received by Supplier', required: true },
            { name: 'receipt_claimed_by', label: 'Receipt Claimed By', pattern: PATTERNS.nameOrOffice, message: MESSAGES.names },
            { name: 'items_claimed_by', label: 'Items Claimed By', pattern: PATTERNS.nameOrOffice, message: MESSAGES.names },
            { name: 'receipt_claimed_notified_via', label: 'Notified via Email or Number', pattern: PATTERNS.contactInfo, message: MESSAGES.contactInfo },
        ],
        'Payment Processing': [
            { name: 'date_completed', label: 'Date Completed', required: true },
            { name: 'invoice_number', label: 'Invoice Number', pattern: PATTERNS.invoiceDocumentRef, message: MESSAGES.invoiceDocumentRef },
            { name: 'delivery_receipt', label: 'Delivery Receipt', pattern: PATTERNS.deliveryReceiptRef, message: MESSAGES.deliveryReceiptRef },
            { name: 'par_ics_number', label: 'PAR/ICS Number', pattern: PATTERNS.parIcsMultiRef, message: MESSAGES.parIcsMultiRef },
            { name: 'ris_number', label: 'RIS Number', pattern: PATTERNS.risMultiRef, message: MESSAGES.risMultiRef },
        ],
        'Forwarded to Finance': [
            { name: 'date_forwarded_to_finance', label: 'Date Forwarded to Finance', required: true },
        ],
    };

    const validateStep = (stepName: string, showErrors = false): boolean => {
        const stepErrors: Record<string, string> = {};
        const rules = STEP_RULES[stepName] || [];

        rules.forEach(({ name, label, required, pattern, message }) => {
            const val = (data[name] ?? '').toString().trim();
            if (required && !val) {
                stepErrors[name] = `${label} is required.`;
            } else if (val && pattern && !pattern.test(val)) {
                stepErrors[name] = message || 'Invalid format.';
            }
        });

        if (stepName === 'For Release') {
            data.inspection_groups?.forEach((group: any, gIdx: number) => {
                if (group.iar_number?.trim() && !PATTERNS.iarNumber.test(group.iar_number.trim())) {
                    stepErrors[`inspection_groups.${gIdx}.iar_number`] = MESSAGES.numbersOnly;
                }
                group.inspectors?.forEach((inspector: string, iIdx: number) => {
                    if (inspector?.trim() && !PATTERNS.nameOrOffice.test(inspector.trim())) {
                        stepErrors[`inspection_groups.${gIdx}.inspectors.${iIdx}`] = MESSAGES.names;
                    }
                });
            });
        }

        const stepKeys = rules.map((r) => r.name);
        const hasExistingErrors = Object.keys(errors).some((k) =>
            (stepName === 'For Release' && k.startsWith('inspection_')) || (stepKeys.includes(k) && !!errors[k])
        );

        if (showErrors && Object.keys(stepErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...stepErrors }));
        }

        return Object.keys(stepErrors).length === 0 && !hasExistingErrors;
    };

    const isStepDone = (stepName: string) =>
        (activeTab !== stepName && isStepSavedAsDone(stepName)) || validateStep(stepName, false);

    const handleNextStep = () => {
        if (!validateStep(activeTab, true)) return;
        const currentIdx = STEPS.indexOf(activeTab);
        if (currentIdx < STEPS.length - 1) {
            const nextStep = STEPS[currentIdx + 1];
            setActiveTab(nextStep);
            handleSelectChange('po_step')(nextStep);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const currentIdx = STEPS.indexOf(activeTab);
        for (let i = 0; i <= currentIdx; i++) {
            if (!validateStep(STEPS[i], true)) {
                setActiveTab(STEPS[i]);
                return;
            }
        }

        if (ldAmount.trim() !== '' && !validateLdAmount(ldAmount)) {
            setActiveTab('Payment Processing');
            return;
        }

        setProcessing(true);

        const now = new Date().toISOString();
        const updatedLockedSteps: Record<string, string> = {
            ...(purchaseOrder?.locked_steps || {}),
        };

        for (let i = 0; i <= currentIdx; i++) {
            const sName = STEPS[i];
            if (!updatedLockedSteps[sName]) {
                updatedLockedSteps[sName] = now;
            }
        }

        const nextStep = currentIdx < STEPS.length - 1 ? STEPS[currentIdx + 1] : activeTab;

        const payload = {
            ...data,
            po_step: nextStep,
            locked_steps: updatedLockedSteps,
            ld_amount: ldAmount.trim() !== '' ? Number(ldAmount) : null,
            inspection_entries: (data.inspection_groups || []).flatMap((group: any) => {
                const inspectors = (group.inspectors || []).filter((v: string) => v.trim() !== '');
                const dates = (group.inspection_dates || []).filter((v: string) => v.trim() !== '');
                const iar = group.iar_number?.trim() || '';

                if (!inspectors.length && !dates.length && !iar) return [];

                const inspList = inspectors.length ? inspectors : [''];
                const dateList = dates.length ? dates : [''];

                return inspList.flatMap((inspected_by: string) =>
                    dateList.map((inspection_date: string) => ({
                        iar_number: group.iar_number || '',
                        inspected_by,
                        inspection_date,
                    }))
                );
            }),
        };
        delete (payload as any).inspection_groups;

        // If no delivery record exists or the user is saving a step prior to Payment Processing,
        // do not send unconfigured/defaulted DV fields that would trigger backend validation.
        if (!hasDeliveryRecord || (activeTab !== 'Payment Processing' && activeTab !== 'Forwarded to Finance')) {
            if (purchaseOrder?.dv_template) {
                payload.dv_template = purchaseOrder.dv_template;
            } else {
                delete (payload as any).dv_template;
            }
            if (purchaseOrder?.ld_amount != null) {
                payload.ld_amount = purchaseOrder.ld_amount;
            } else {
                delete (payload as any).ld_amount;
            }
            if (purchaseOrder?.retention_amount != null) {
                payload.retention_amount = purchaseOrder.retention_amount;
            } else {
                delete (payload as any).retention_amount;
            }
        }

        router.put(`/purchase-orders/${purchaseOrder.po_number}`, payload, {
            onSuccess: () => {
                setProcessing(false);
                onOpenChange(false);
            },
            onError: (errs) => {
                setProcessing(false);
                setErrors(errs);
            },
            onFinish: () => {
                setProcessing(false);
            }
        });
    };

    const handleNotifyOffice = () => {
        setProcessing(true);
        router.post(`/purchase-orders/${purchaseOrder.po_number}/notify-office`, {
            email: data.po_vpad_notified_via
        }, {
            onSuccess: () => {
                setData((prev: any) => ({ ...prev, po_vpad_notified_date: new Date().toISOString().split('T')[0] }));
                setProcessing(false);
            },
            onError: (errs) => {
                setErrors(errs);
                setProcessing(false);
            }
        });
    };

    const handleNotifyCoa = () => {
        setProcessing(true);
        router.post(`/purchase-orders/${purchaseOrder.po_number}/notify-coa`, {
            email: data.coa_stamp_notified_via
        }, {
            onSuccess: () => {
                setData((prev: any) => ({ ...prev, coa_stamp_notified_date: new Date().toISOString().split('T')[0] }));
                setProcessing(false);
            },
            onError: (errs) => {
                setErrors(errs);
                setProcessing(false);
            }
        });
    };

    const handleNotifyRelease = () => {
        setProcessing(true);
        router.post(`/purchase-orders/${purchaseOrder.po_number}/notify-release`, {
            email: data.receipt_claimed_notified_via
        }, {
            onSuccess: () => {
                setData((prev: any) => ({ ...prev, receipt_claimed_notified_date: new Date().toISOString().split('T')[0] }));
                setProcessing(false);
            },
            onError: (errs) => {
                setErrors(errs);
                setProcessing(false);
            }
        });
    };

    const isStepSavedAsDone = (stepName: string) => {
        switch (stepName) {
            case 'PO From VPAD': return !!purchaseOrder?.po_received_date;
            case 'End User': return !!purchaseOrder?.date_forwarded_to_end_user;
            case 'For COA Stamp': return !!purchaseOrder?.coa_date;
            case 'For Release': return !!purchaseOrder?.date_received_by_supplier;
            case 'Payment Processing': return !!purchaseOrder?.date_completed;
            case 'Forwarded to Finance': return !!purchaseOrder?.date_forwarded_to_finance;
            default: return false;
        }
    };

    const isStepLocked = (stepName: string) => {
        const targetStepIndex = STEPS.indexOf(stepName);
        
        // 1. Sequential Unlocking: Cannot jump forward if previous step is not done in the form.
        // This applies to ALL roles to enforce workflow progression.
        if (targetStepIndex > 0) {
            const previousStep = STEPS[targetStepIndex - 1];
            if (!isStepDone(previousStep)) {
                return true;
            }
        }

        // Admin can access, view, and edit any step!
        if (isAdmin) return false;

        // 2. Staff Restriction: If step is locked in the database via Save & Exit, staff cannot edit it.
        if (purchaseOrder?.locked_steps && purchaseOrder.locked_steps[stepName]) {
            return true;
        }

        // 3. Fallback: Lock if it's already finished in the database
        if (isStepSavedAsDone(stepName)) {
            return true;
        }

        const savedCurrentStepIndex = STEPS.indexOf(purchaseOrder?.po_step || 'PO From VPAD');
        if (isStaff && targetStepIndex < savedCurrentStepIndex) {
            return true;
        }

        return false;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[98vw] sm:max-w-[1400px] max-h-[95vh] overflow-hidden p-0 bg-background">
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl">
                                Workflow Tracking — {purchaseOrder?.po_number}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} onBlur={handleBlur} onChange={handleValidationChange} noValidate className="mt-6 space-y-6">
                            
                            {/* Pill-shaped Tabs List */}
                            <div className="flex flex-nowrap gap-2 p-1.5 bg-muted/80 rounded-full w-full overflow-x-auto border border-border hide-scrollbar shadow-inner">
                                {STEPS.map((step) => {
                                    const isActive = activeTab === step;
                                    const isLocked = isStepLocked(step);
                                    return (
                                        <button
                                            key={step}
                                            type="button"
                                            disabled={isLocked && isStaff}
                                            onClick={() => {
                                                if (isLocked && isStaff) return;
                                                const currentIdx = STEPS.indexOf(activeTab);
                                                const targetIdx = STEPS.indexOf(step);
                                                if (targetIdx > currentIdx) {
                                                    if (!validateStep(activeTab, true)) {
                                                        return;
                                                    }
                                                    for (let i = currentIdx; i < targetIdx; i++) {
                                                        if (!validateStep(STEPS[i], true)) {
                                                            setActiveTab(STEPS[i]);
                                                            return;
                                                        }
                                                    }
                                                }
                                                setActiveTab(step);
                                                handleSelectChange('po_step')(step);
                                            }}
                                            className={cn(
                                                "px-5 py-2 rounded-full text-sm transition-all duration-200 whitespace-nowrap flex items-center gap-2",
                                                isActive 
                                                    ? "bg-background text-foreground font-semibold shadow-md ring-1 ring-border" 
                                                    : (isLocked && isStaff)
                                                        ? "text-muted-foreground/50 cursor-not-allowed"
                                                        : "text-muted-foreground font-medium hover:text-foreground hover:bg-background/40"
                                            )}
                                        >
                                            {isLocked && <Lock className="h-3 w-3" />}
                                            {step}
                                        </button>
                                    );
                                })}
                            </div>

                            {isStepLocked(activeTab) && (
                                <div className="flex items-center gap-2 p-4 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
                                    <Lock className="h-4 w-4" />
                                    <span>
                                        {purchaseOrder?.locked_steps && purchaseOrder.locked_steps[activeTab]
                                            ? "This step was locked upon Save & Exit and cannot be modified by staff."
                                            : "This step is currently locked because the previous workflow step has not been completed yet."}
                                    </span>
                                </div>
                            )}

                            {/* Tab Content Wrapper */}
                            <div className={cn("p-6 border rounded-xl bg-card shadow-sm transition-opacity duration-300", isStepLocked(activeTab) && "opacity-60 pointer-events-none")}>
                                
                                {/* 0. PO From VPAD */}
                                {activeTab === 'PO From VPAD' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">PO Number</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.po_number || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Supplier</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.supplier?.supplier_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Unit/Office</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.office?.office_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">PO Date</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.po_date ? new Date(purchaseOrder.po_date).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Delivery Term</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.delivery_term ? `${purchaseOrder.delivery_term} Days` : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Fund Cluster</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.fund_cluster?.fund_description || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">PR Number</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.pr_number || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">PR Date</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.pr_date ? new Date(purchaseOrder.pr_date).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">ORS/BUR Number</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.ors_burs_no || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">ORS/BUR Date</p>
                                                <p className="text-sm font-semibold">{purchaseOrder?.ors_burs_date ? new Date(purchaseOrder.ors_burs_date).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">PO Amount</p>
                                                <p className="text-sm font-semibold">
                                                    {purchaseOrder?.total_amount_po 
                                                        ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(purchaseOrder.total_amount_po)
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Item Description</p>
                                                <div>
                                                    {purchaseOrder?.item_description ? (
                                                        <ItemDescriptionBadge description={purchaseOrder.item_description} />
                                                    ) : (
                                                        <p className="text-sm font-semibold">N/A</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Operational Impact</p>
                                                <div>
                                                    {purchaseOrder?.operational_impact ? (
                                                        <OperationalImpactBadge impact={purchaseOrder.operational_impact} />
                                                    ) : (
                                                        <p className="text-sm font-semibold">N/A</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                                            <Field
                                                label="Date Received"
                                                name="po_received_date"
                                                type="date"
                                                value={data.po_received_date}
                                                onChange={handleChange}
                                                error={errors.po_received_date}
                                                required={true}
                                            />
                                            <SearchableSelect
                                                label="Item Description"
                                                value={data.item_description}
                                                onChange={(val) => {
                                                    setData((prev: any) => ({ ...prev, item_description: val }));
                                                    if (errors.item_description) {
                                                        clearErrors('item_description');
                                                    }
                                                }}
                                                error={errors.item_description}
                                                placeholder="Select or enter item description..."
                                                addNewLabel="item description"
                                                onAddNew={handleAddItemDescription}
                                                options={itemDescList.map((desc) => ({
                                                    value: desc,
                                                    label: desc,
                                                }))}
                                                renderTrigger={(selectedOpt) => (
                                                    selectedOpt ? (
                                                        <ItemDescriptionBadge description={selectedOpt.value} />
                                                    ) : (
                                                        <span className="text-muted-foreground">Select or enter item description...</span>
                                                    )
                                                )}
                                                renderOption={(opt) => (
                                                    <ItemDescriptionBadge description={opt.value} />
                                                )}
                                            />
                                            <SelectField
                                                label="Operational Impact"
                                                value={data.operational_impact}
                                                onChange={handleSelectChange('operational_impact')}
                                                error={errors.operational_impact}
                                                placeholder="Select impact..."
                                                options={(operationalImpacts && operationalImpacts.length > 0 ? operationalImpacts : OPERATIONAL_IMPACT_OPTIONS).map((val: any) => {
                                                    const rawVal = typeof val === 'object' && val !== null ? val.value : val;
                                                    return {
                                                        value: rawVal,
                                                        label: typeof val === 'object' && val !== null && val.label ? val.label : rawVal,
                                                    };
                                                })}
                                                renderTrigger={(selectedOpt: any) => (
                                                    selectedOpt ? (
                                                        <OperationalImpactBadge impact={selectedOpt.value} />
                                                    ) : (
                                                        <span className="text-muted-foreground">Select impact...</span>
                                                    )
                                                )}
                                                renderOption={(opt: any) => (
                                                    <OperationalImpactBadge impact={opt.value} />
                                                )}
                                            />
                                            <Field
                                                label="Forwarded By"
                                                name="po_vpad_forwarded_by"
                                                value={data.po_vpad_forwarded_by}
                                                onChange={handleChange}
                                                error={errors.po_vpad_forwarded_by}
                                                pattern={PATTERNS.nameOrOffice.source}
                                                title={MESSAGES.names}
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
                                                pattern={PATTERNS.contactInfo.source}
                                                title={MESSAGES.contactInfo}
                                            />
                                            <div className="flex flex-col justify-end">
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Email OVPAD</p>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    onClick={handleNotifyOffice}
                                                    disabled={processing}
                                                    className="w-full gap-2 h-9 border-border text-foreground hover:bg-muted"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                    Notify Office
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 1. End User */}
                                {activeTab === 'End User' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Date Forwarded to End User"
                                            name="date_forwarded_to_end_user"
                                            type="date"
                                            value={data.date_forwarded_to_end_user}
                                            onChange={handleChange}
                                            error={errors.date_forwarded_to_end_user}
                                            required={true}
                                        />
                                    </div>
                                )}

                                {/* 3. For COA Stamp */}
                                {activeTab === 'For COA Stamp' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Supplier Signature Date"
                                            name="supplier_signature_date"
                                            type="date"
                                            value={data.supplier_signature_date}
                                            onChange={handleChange}
                                            error={errors.supplier_signature_date}
                                            required={true}
                                        />
                                        <Field
                                            label="Date Forwarded to COA"
                                            name="date_forwarded_coa"
                                            type="date"
                                            value={data.date_forwarded_coa}
                                            onChange={handleChange}
                                            error={errors.date_forwarded_coa}
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
                                            required={true}
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
                                            label="Claim Date"
                                            name="claim_date"
                                            type="date"
                                            value={data.claim_date}
                                            onChange={handleChange}
                                            error={errors.claim_date}
                                        />
                                        <Field
                                            label="Claimed By (COA)"
                                            name="claimed_by_coa"
                                            value={data.claimed_by_coa}
                                            onChange={handleChange}
                                            error={errors.claimed_by_coa}
                                            pattern={PATTERNS.nameOrOffice.source}
                                            title={MESSAGES.names}
                                        />
                                        
                                        {/* Notification Block */}
                                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
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
                                                pattern={PATTERNS.contactInfo.source}
                                                title={MESSAGES.contactInfo}
                                            />
                                            <div className="flex flex-col justify-end">
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Email COA</p>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    onClick={handleNotifyCoa}
                                                    disabled={processing}
                                                    className="w-full gap-2 h-9 border-border text-foreground hover:bg-muted"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                    Notify Office
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 4. For Release */}
                                {activeTab === 'For Release' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Date Received by Supplier"
                                            name="date_received_by_supplier"
                                            type="date"
                                            value={data.date_received_by_supplier}
                                            onChange={handleChange}
                                            error={errors.date_received_by_supplier}
                                            required={true}
                                        />
                                        <Field
                                            label="Receipt Receiving Date"
                                            name="receipt_receiving_date"
                                            type="date"
                                            value={data.receipt_receiving_date}
                                            onChange={handleChange}
                                            error={errors.receipt_receiving_date}
                                        />
                                        <Field
                                            label="Receipt Claimed By"
                                            name="receipt_claimed_by"
                                            value={data.receipt_claimed_by}
                                            onChange={handleChange}
                                            error={errors.receipt_claimed_by}
                                            placeholder="Enter name"
                                            pattern={PATTERNS.nameOrOffice.source}
                                            title={MESSAGES.names}
                                        />
                                        <Field
                                            label="Items Receiving Date"
                                            name="items_receiving_date"
                                            type="date"
                                            value={data.items_receiving_date}
                                            onChange={handleChange}
                                            error={errors.items_receiving_date}
                                        />
                                        <Field
                                            label="Items Claimed By"
                                            name="items_claimed_by"
                                            value={data.items_claimed_by}
                                            onChange={handleChange}
                                            error={errors.items_claimed_by}
                                            placeholder="Enter name"
                                            pattern={PATTERNS.nameOrOffice.source}
                                            title={MESSAGES.names}
                                        />
                                        
                                        {/* Notification Block */}
                                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
                                            <Field
                                                label="Notified Date"
                                                name="receipt_claimed_notified_date"
                                                type="date"
                                                value={data.receipt_claimed_notified_date}
                                                onChange={handleChange}
                                                error={errors.receipt_claimed_notified_date}
                                            />
                                            <Field
                                                label="Notified via Email or Number"
                                                name="receipt_claimed_notified_via"
                                                value={data.receipt_claimed_notified_via}
                                                onChange={handleChange}
                                                error={errors.receipt_claimed_notified_via}
                                                placeholder="Enter email or number"
                                                pattern={PATTERNS.contactInfo.source}
                                                title={MESSAGES.contactInfo}
                                            />
                                            <div className="flex flex-col justify-end">
                                                <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Email Release</p>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    onClick={handleNotifyRelease}
                                                    disabled={processing}
                                                    className="w-full gap-2 h-9 border-border text-foreground hover:bg-muted"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                    Notify Office
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Inspection Details */}
                                        <div className="col-span-1 md:col-span-2 mt-4 space-y-4">
                                            <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                                                <h4 className="text-sm font-semibold text-foreground">
                                                    Inspection Details
                                                    {data.inspection_groups.length > 0 && (
                                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                            {data.inspection_groups.length} Group{data.inspection_groups.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </h4>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 border-dashed"
                                                    onClick={addInspectionGroup}
                                                    disabled={isStepLocked('For Release')}
                                                >
                                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                                    Add Inspection
                                                </Button>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {data.inspection_groups.map((group: any, groupIndex: number) => (
                                                    <div
                                                        key={groupIndex}
                                                        className="rounded-md border p-3 bg-muted/30 relative"
                                                    >
                                                        <div className="flex flex-wrap items-start gap-4 md:flex-nowrap">
                                                            {/* IAR Number */}
                                                            <div className="min-w-0 w-full md:w-1/4">
                                                                <Field
                                                                    label="IAR Number (Optional)"
                                                                    name={`inspection_groups.${groupIndex}.iar_number`}
                                                                    value={group.iar_number}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateInspectionGroup(groupIndex, e.target.value)}
                                                                    error={errors[`inspection_entries.${groupIndex}.iar_number`] || errors[`inspection_groups.${groupIndex}.iar_number`]}
                                                                    readOnly={isStepLocked('For Release')}
                                                                    placeholder="e.g. 202512200001"
                                                                    pattern={PATTERNS.iarNumber.source}
                                                                    title={MESSAGES.numbersOnly}
                                                                />
                                                            </div>

                                                            {/* Inspectors */}
                                                            <div className="min-w-0 flex-1 w-full md:w-auto">
                                                                <label className="mb-1 block text-xs text-muted-foreground">
                                                                    Inspected By
                                                                </label>
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {group.inspectors.map((inspector: string, inspectorIndex: number) => (
                                                                        <div
                                                                            key={`inspector-${groupIndex}-${inspectorIndex}`}
                                                                            className="flex items-center gap-1"
                                                                        >
                                                                            <div className="flex flex-col gap-1">
                                                                                <Input
                                                                                    name={`inspection_groups.${groupIndex}.inspectors.${inspectorIndex}`}
                                                                                    id={`inspection_groups.${groupIndex}.inspectors.${inspectorIndex}`}
                                                                                    value={inspector}
                                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateInspectionInspector(groupIndex, inspectorIndex, e.target.value)}
                                                                                    readOnly={isStepLocked('For Release')}
                                                                                    placeholder="Name"
                                                                                    pattern={PATTERNS.nameOrOffice.source}
                                                                                    title={MESSAGES.names}
                                                                                    className={cn(
                                                                                        "h-9 w-36", 
                                                                                        isStepLocked('For Release') && "bg-muted text-muted-foreground cursor-not-allowed",
                                                                                        (errors[`inspection_entries.${groupIndex}.inspected_by`] || errors[`inspection_groups.${groupIndex}.inspectors.${inspectorIndex}`]) && "border-red-500"
                                                                                    )}
                                                                                />
                                                                                {(errors[`inspection_entries.${groupIndex}.inspected_by`] || errors[`inspection_groups.${groupIndex}.inspectors.${inspectorIndex}`]) && (
                                                                                    <p className="mt-1 text-[11px] text-red-500 font-medium">
                                                                                        {errors[`inspection_entries.${groupIndex}.inspected_by`] || errors[`inspection_groups.${groupIndex}.inspectors.${inspectorIndex}`]}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            {group.inspectors.length > 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeInspectionInspector(groupIndex, inspectorIndex)}
                                                                                    disabled={isStepLocked('For Release')}
                                                                                    className="text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                                                        disabled={isStepLocked('For Release')}
                                                                        className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                        title="Add inspector"
                                                                    >
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Dates */}
                                                            <div className="min-w-0 flex-1 w-full md:w-auto">
                                                                <label className="mb-1 block text-xs text-muted-foreground">
                                                                    Inspection Date
                                                                </label>
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {group.inspection_dates.map((date: string, dateIndex: number) => (
                                                                        <div
                                                                            key={`date-${groupIndex}-${dateIndex}`}
                                                                            className="flex items-center gap-1"
                                                                        >
                                                                            <Input
                                                                                type="date"
                                                                                value={date}
                                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateInspectionDate(groupIndex, dateIndex, e.target.value)}
                                                                                readOnly={isStepLocked('For Release')}
                                                                                className={cn("h-9 w-[150px]", isStepLocked('For Release') && "bg-muted text-muted-foreground cursor-not-allowed")}
                                                                            />
                                                                            {group.inspection_dates.length > 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeInspectionDate(groupIndex, dateIndex)}
                                                                                    disabled={isStepLocked('For Release')}
                                                                                    className="text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                                                        disabled={isStepLocked('For Release')}
                                                                        className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                        title="Add date"
                                                                    >
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Remove whole IAR row */}
                                                            <div className="flex items-center pt-5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeInspectionGroup(groupIndex)}
                                                                    disabled={data.inspection_groups.length === 1 || isStepLocked('For Release')}
                                                                    className="h-9 w-9 text-muted-foreground hover:text-red-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                    title="Remove inspection row"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 5. Payment Processing */}
                                {activeTab === 'Payment Processing' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Invoice Number"
                                            name="invoice_number"
                                            value={data.invoice_number}
                                            onChange={handleChange}
                                            error={errors.invoice_number}
                                            placeholder="e.g. 3452 / SOA No.: 2026-0001"
                                            pattern={PATTERNS.invoiceDocumentRef.source}
                                            title={MESSAGES.invoiceDocumentRef}
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
                                            placeholder="e.g. ROXI26-00294"
                                            pattern={PATTERNS.deliveryReceiptRef.source}
                                            title={MESSAGES.deliveryReceiptRef}
                                        />
                                        <Field
                                            label="PAR/ICS Number"
                                            name="par_ics_number"
                                            value={data.par_ics_number}
                                            onChange={handleChange}
                                            error={errors.par_ics_number}
                                            placeholder="e.g. 2026060021"
                                            pattern={PATTERNS.parIcsMultiRef.source}
                                            title={MESSAGES.parIcsMultiRef}
                                        />
                                        <Field
                                            label="RIS Number"
                                            name="ris_number"
                                            value={data.ris_number}
                                            onChange={handleChange}
                                            error={errors.ris_number}
                                            placeholder="e.g. 2026070024"
                                            pattern={PATTERNS.risMultiRef.source}
                                            title={MESSAGES.risMultiRef}
                                        />
                                        <SelectField
                                            label="Payment Status"
                                            value={data.payment_status}
                                            onChange={handleSelectChange('payment_status')}
                                            error={errors.payment_status}
                                            placeholder="-- Select Status --"
                                            options={[
                                                { value: 'Pending', label: 'Pending' },
                                                { value: 'Processing', label: 'Processing' },
                                                { value: 'Paid', label: 'Paid' },
                                            ]}
                                        />
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2 mt-4 pt-4 border-t border-border/50">
                                            <Field
                                                label="Date Completed"
                                                name="date_completed"
                                                type="date"
                                                value={data.date_completed}
                                                onChange={handleChange}
                                                error={errors.date_completed}
                                                required={true}
                                            />
                                        </div>

                                        {/* Disbursement Voucher (DV) Section */}
                                        <div className="col-span-1 md:col-span-2 mt-2 pt-5 border-t border-border/60 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                        <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                                                        Disbursement Voucher (DV) Template
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {hasDeliveryRecord
                                                            ? "Choose a template configuration below."
                                                            : "A Delivery Monitoring record is required before accessing or configuring this voucher."}
                                                    </p>
                                                </div>
                                                {/* Edit DV in Excel Button */}
                                                {(dvTemplate === 'ld_only' || dvTemplate === 'neither' || dvTemplate === 'retention_only' || dvTemplate === 'ld_and_retention') && (
                                                    <Button
                                                        type="button"
                                                        onClick={handleExportDv}
                                                        disabled={!canExport}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                        id="edit-dv-excel-btn"
                                                        title={!hasDeliveryRecord ? (
                                                            "A Delivery Monitoring record is required before accessing or exporting the Disbursement Voucher"
                                                        ) : (!canExport ? (
                                                            dvTemplate === 'neither' || dvTemplate === 'retention_only'
                                                                ? "Complete Date Completed to export Excel"
                                                                : "Enter an LD amount and complete Date Completed to export Excel"
                                                        ) : "Export Disbursement Voucher in Excel")}
                                                    >
                                                        {!hasDeliveryRecord ? <Lock className="size-4" /> : <FileSpreadsheet className="size-4" />}
                                                        Edit DV in Excel
                                                    </Button>
                                                )}
                                            </div>

                                            {!hasDeliveryRecord && (
                                                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200">
                                                    <Lock className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <h5 className="text-xs font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                                                            <span>Disbursement Voucher Locked</span>
                                                            <span className="text-[11px] font-normal px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">Delivery Record Required</span>
                                                        </h5>
                                                        <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                                                            The selected Purchase Order (<strong>{purchaseOrder?.po_number}</strong>) must have an existing record in <strong>Delivery Monitoring</strong> before the Disbursement Voucher can be fully accessed, configured, or exported.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Checklist of Templates */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* 1. LD only */}
                                                <label
                                                    className={cn(
                                                        "relative flex items-start gap-3 p-3.5 rounded-lg border transition-all select-none",
                                                        !hasDeliveryRecord
                                                            ? "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                                                            : dvTemplate === 'ld_only'
                                                                ? "border-emerald-500/80 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30 cursor-pointer"
                                                                : "border-border/60 hover:border-border hover:bg-muted/40 cursor-pointer"
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="dv_template"
                                                        value="ld_only"
                                                        disabled={!hasDeliveryRecord}
                                                        checked={dvTemplate === 'ld_only'}
                                                        onChange={() => hasDeliveryRecord && handleTemplateChange('ld_only')}
                                                        className="mt-1 size-4 text-emerald-600 border-border focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-sm font-medium text-foreground">LD only</span>
                                                            <span className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                                                                !hasDeliveryRecord
                                                                    ? "bg-muted text-muted-foreground"
                                                                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                                            )}>
                                                                {!hasDeliveryRecord ? "Locked" : "Active"}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Generates Appendix 32 Disbursement Voucher with Liquidated Damages deduction format.
                                                        </p>
                                                    </div>
                                                </label>

                                                {/* 2. Retention only */}
                                                <label
                                                    className={cn(
                                                        "relative flex items-start gap-3 p-3.5 rounded-lg border transition-all select-none",
                                                        !hasDeliveryRecord
                                                            ? "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                                                            : dvTemplate === 'retention_only'
                                                                ? "border-emerald-500/80 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30 cursor-pointer"
                                                                : "border-border/60 hover:border-border hover:bg-muted/40 cursor-pointer"
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="dv_template"
                                                        value="retention_only"
                                                        disabled={!hasDeliveryRecord}
                                                        checked={dvTemplate === 'retention_only'}
                                                        onChange={() => hasDeliveryRecord && handleTemplateChange('retention_only')}
                                                        className="mt-1 size-4 text-emerald-600 border-border focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-sm font-medium text-foreground">Retention only</span>
                                                            <span className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                                                                !hasDeliveryRecord
                                                                    ? "bg-muted text-muted-foreground"
                                                                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                                            )}>
                                                                {!hasDeliveryRecord ? "Locked" : "Active"}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Disbursement Voucher with 1% retention deduction (Gross minus 1%).
                                                        </p>
                                                    </div>
                                                </label>

                                                {/* 3. LD and retention */}
                                                <label
                                                    className={cn(
                                                        "relative flex items-start gap-3 p-3.5 rounded-lg border transition-all select-none",
                                                        !hasDeliveryRecord
                                                            ? "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                                                            : dvTemplate === 'ld_and_retention'
                                                                ? "border-emerald-500/80 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30 cursor-pointer"
                                                                : "border-border/60 hover:border-border hover:bg-muted/40 cursor-pointer"
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="dv_template"
                                                        value="ld_and_retention"
                                                        disabled={!hasDeliveryRecord}
                                                        checked={dvTemplate === 'ld_and_retention'}
                                                        onChange={() => hasDeliveryRecord && handleTemplateChange('ld_and_retention')}
                                                        className="mt-1 size-4 text-emerald-600 border-border focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-sm font-medium text-foreground">LD and retention</span>
                                                            <span className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                                                                !hasDeliveryRecord
                                                                    ? "bg-muted text-muted-foreground"
                                                                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                                            )}>
                                                                {!hasDeliveryRecord ? "Locked" : "Active"}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Disbursement Voucher with both Liquidated Damages and 1% retention deductions.
                                                        </p>
                                                    </div>
                                                </label>

                                                {/* 4. Neither LD nor retention */}
                                                <label
                                                    className={cn(
                                                        "relative flex items-start gap-3 p-3.5 rounded-lg border transition-all select-none",
                                                        !hasDeliveryRecord
                                                            ? "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                                                            : dvTemplate === 'neither'
                                                                ? "border-emerald-500/80 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30 cursor-pointer"
                                                                : "border-border/60 hover:border-border hover:bg-muted/40 cursor-pointer"
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="dv_template"
                                                        value="neither"
                                                        disabled={!hasDeliveryRecord}
                                                        checked={dvTemplate === 'neither'}
                                                        onChange={() => hasDeliveryRecord && handleTemplateChange('neither')}
                                                        className="mt-1 size-4 text-emerald-600 border-border focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-sm font-medium text-foreground">Neither LD nor retention</span>
                                                            <span className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                                                                !hasDeliveryRecord
                                                                    ? "bg-muted text-muted-foreground"
                                                                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                                            )}>
                                                                {!hasDeliveryRecord ? "Locked" : "Active"}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Standard voucher without LD or retention deductions.
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>

                                            {/* LD Amount Input for LD-only and Both templates */}
                                            {(dvTemplate === 'ld_only' || dvTemplate === 'ld_and_retention') && (
                                                <div className={cn("p-4 rounded-lg border border-border/70 bg-card space-y-2", !hasDeliveryRecord && "opacity-60 cursor-not-allowed")}>
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div>
                                                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5" htmlFor="ld-amount-input">
                                                                Liquidated Damages (LD) Amount
                                                                <span className="text-[11px] font-normal text-muted-foreground">(₱)</span>
                                                            </label>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                Enter the penalty amount to deduct before tax calculations. Maximum: ₱{poTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                        <div className="w-full sm:w-48">
                                                            <Input
                                                                id="ld-amount-input"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                max={poTotal}
                                                                value={ldAmount}
                                                                disabled={!hasDeliveryRecord}
                                                                onChange={(e) => hasDeliveryRecord && handleLdChange(e.target.value)}
                                                                placeholder="0.00"
                                                                className={cn(
                                                                    "text-right font-medium",
                                                                    ldError && "border-red-500 focus-visible:ring-red-500"
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                    {ldError && (
                                                        <p className="text-xs text-red-500 font-medium">{ldError}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Retention Amount Input for Retention-only and Both templates */}
                                            {(dvTemplate === 'retention_only' || dvTemplate === 'ld_and_retention') && (
                                                <div className={cn("p-4 rounded-lg border border-border/70 bg-card space-y-2", !hasDeliveryRecord && "opacity-60 cursor-not-allowed")}>
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div>
                                                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5" htmlFor="retention-amount-input">
                                                                Retention Amount (1%)
                                                                <span className="text-[11px] font-normal text-muted-foreground">(₱)</span>
                                                            </label>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                Automatically calculated as 1% of gross PO amount (minus 1%). You may adjust if needed.
                                                            </p>
                                                        </div>
                                                        <div className="w-full sm:w-48">
                                                            <Input
                                                                id="retention-amount-input"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                max={poTotal}
                                                                value={retentionAmount}
                                                                disabled={!hasDeliveryRecord}
                                                                onChange={(e) => hasDeliveryRecord && handleRetentionChange(e.target.value)}
                                                                placeholder={poTotal > 0 ? (poTotal * 0.01).toFixed(2) : "0.00"}
                                                                className={cn(
                                                                    "text-right font-medium",
                                                                    retentionError && "border-red-500 focus-visible:ring-red-500"
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                    {retentionError && (
                                                        <p className="text-xs text-red-500 font-medium">{retentionError}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Hints only shown when eligible */}
                                            {hasDeliveryRecord && (
                                                <>
                                                    {/* Hint when LD amount is not yet inputted */}
                                                    {(dvTemplate === 'ld_only' || dvTemplate === 'ld_and_retention') && !isLdInputted && (
                                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                                                            <Info className="size-4 shrink-0" />
                                                            <span>Enter a value in the <strong>Liquidated Damages (LD) Amount</strong> field (e.g. 0.00 or penalty amount) to enable the <strong>Edit DV in Excel</strong> button.</span>
                                                        </div>
                                                    )}

                                                    {/* Hint when required information is not yet completed for LD template */}
                                                    {(dvTemplate === 'ld_only' || dvTemplate === 'ld_and_retention') && isLdInputted && !isDateCompletedFilled && (
                                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                                                            <Info className="size-4 shrink-0" />
                                                            <span>Complete the required <strong>Date Completed</strong> field above to enable the <strong>Edit DV in Excel</strong> button.</span>
                                                        </div>
                                                    )}

                                                    {/* Hint when required information is not yet completed for Retention template */}
                                                    {dvTemplate === 'retention_only' && !isDateCompletedFilled && (
                                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                                                            <Info className="size-4 shrink-0" />
                                                            <span>Complete the required <strong>Date Completed</strong> field above to enable the <strong>Edit DV in Excel</strong> button.</span>
                                                        </div>
                                                    )}

                                                    {/* Hint when Date Completed is not yet completed for Neither template */}
                                                    {dvTemplate === 'neither' && !isDateCompletedFilled && (
                                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                                                            <Info className="size-4 shrink-0" />
                                                            <span>Complete the required <strong>Date Completed</strong> field above to enable the <strong>Edit DV in Excel</strong> button.</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 6. Forwarded to Finance */}
                                {activeTab === 'Forwarded to Finance' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Date Forwarded to Finance"
                                            name="date_forwarded_to_finance"
                                            type="date"
                                            value={data.date_forwarded_to_finance}
                                            onChange={handleChange}
                                            error={errors.date_forwarded_to_finance}
                                            required={true}
                                        />
                                        </div>
                                    )}

                                </div>
                            
                            {/* Actions */}
                            <div className="flex justify-between items-center mt-8 pt-4 border-t border-border/50">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={processing}
                                >
                                    Cancel
                                </Button>
                                <div className="flex items-center gap-3">
                                    {STEPS.indexOf(activeTab) < STEPS.length - 1 && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleNextStep}
                                            className={cn(
                                                "transition-all duration-300",
                                                isStepDone(activeTab)
                                                    ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                                                    : "opacity-60 hover:bg-secondary cursor-not-allowed"
                                            )}
                                        >
                                            Next Step
                                        </Button>
                                    )}
                                    {(!isStepLocked(activeTab)) && (
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Saving...' : 'Save & Exit'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
