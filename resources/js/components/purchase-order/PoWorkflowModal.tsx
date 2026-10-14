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
import { Plus, Trash2, Mail, Lock, X } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

function SelectField({ label, value, onChange, error, options, placeholder }: any) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{label}</label>
            <Select value={value || ''} onValueChange={onChange}>
                <SelectTrigger className={error ? 'border-red-500' : ''}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt: any) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
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
}

export default function PoWorkflowModal({ open, onOpenChange, purchaseOrder }: Props) {
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

    useEffect(() => {
        if (open && purchaseOrder) {
            setData({
                po_number: purchaseOrder.po_number || '',
                po_step: purchaseOrder.po_step || 'PO From VPAD',
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
            const stepToSet = purchaseOrder.po_step === "For Supplier's Signature" 
                ? "For COA Stamp" 
                : (STEPS.includes(purchaseOrder.po_step) ? purchaseOrder.po_step : 'PO From VPAD');
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

        setProcessing(true);

        const payload = {
            ...data,
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
        const savedCurrentStepIndex = STEPS.indexOf(purchaseOrder?.po_step || 'PO From VPAD');
        const targetStepIndex = STEPS.indexOf(stepName);
        
        // 1. Sequential Unlocking: Cannot edit a step if the previous step is not done in the form.
        // This applies to ALL roles to enforce workflow progression.
        if (targetStepIndex > 0) {
            const previousStep = STEPS[targetStepIndex - 1];
            if (!isStepDone(previousStep)) {
                return true;
            }
        }

        if (isAdmin) return false;

        // 2. Lock if it's already finished in the database
        if (isStepSavedAsDone(stepName)) {
            return true;
        }

        // 3. Staff Restriction: Cannot edit ANY step that is BEFORE the saved current step.
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
                                            disabled={isLocked && !isActive}
                                            onClick={() => {
                                                if (isLocked) return;
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
                                                    : isLocked
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
                                    <span>This step is currently locked because the previous workflow step has not been completed yet.</span>
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
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
                                            <Field
                                                label="Date Received"
                                                name="po_received_date"
                                                type="date"
                                                value={data.po_received_date}
                                                onChange={handleChange}
                                                error={errors.po_received_date}
                                                required={true}
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
                                            label="RIS Number"
                                            name="ris_number"
                                            value={data.ris_number}
                                            onChange={handleChange}
                                            error={errors.ris_number}
                                            placeholder="Enter RIS number"
                                        />
                                        <Field
                                            label="Invoice Number"
                                            name="invoice_number"
                                            value={data.invoice_number}
                                            onChange={handleChange}
                                            error={errors.invoice_number}
                                            placeholder="Enter invoice number"
                                            placeholder="3453; 3452/SOA No.: 2026-0001"
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
                                            placeholder="Enter delivery receipt"
                                            placeholder="ROXI26-00294/OD-26-3774065"
                                            pattern={PATTERNS.deliveryReceiptRef.source}
                                            title={MESSAGES.deliveryReceiptRef}
                                        />
                                        <Field
                                            label="PAR/ICS Number"
                                            name="par_ics_number"
                                            value={data.par_ics_number}
                                            onChange={handleChange}
                                            error={errors.par_ics_number}
                                            placeholder="Enter PAR/ICS number"
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
                                            placeholder="2026060021/2026070036; 2026070037"
                                            pattern={PATTERNS.parIcsMultiRef.source}
                                            title={MESSAGES.parIcsMultiRef}
                                        />
                                        <Field
                                            label="RIS Number"
                                            name="ris_number"
                                            value={data.ris_number}
                                            onChange={handleChange}
                                            error={errors.ris_number}
                                            placeholder="2026070024/2026070063; 2026080022"
                                            pattern={PATTERNS.risMultiRef.source}
                                            title={MESSAGES.risMultiRef}
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
