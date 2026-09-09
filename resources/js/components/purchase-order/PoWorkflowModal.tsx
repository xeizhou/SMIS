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

function Field({ label, name, value, onChange, error, type = 'text', placeholder, required, readOnly }: any) {
    return (
        <div className="space-y-1 relative">
            <label className="text-sm font-medium text-foreground">{label} {required && <span className="text-red-500">*</span>}</label>
            <Input
                type={type}
                name={name}
                value={value ?? ''}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                readOnly={readOnly}
                className={cn(error && 'border-red-500', readOnly && 'bg-muted text-muted-foreground cursor-not-allowed')}
            />
            {error && <p className="text-xs text-red-500 mt-1 absolute -bottom-5 left-0">{error}</p>}
        </div>
    );
}

function SelectField({ label, value, onChange, error, options, placeholder }: any) {
    return (
        <div className="space-y-1 relative">
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
            {error && <p className="text-xs text-red-500 mt-1 absolute -bottom-5 left-0">{error}</p>}
        </div>
    );
}

const STEPS = [
    'PO From VPAD',
    'End User',
    'For Supplier\'s Signature',
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
            setActiveTab(purchaseOrder.po_step || 'PO From VPAD');
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const payload = {
            ...data,
            inspection_entries: data.inspection_groups.flatMap((group: any) => {
                const inspectors = group.inspectors.filter((value: string) => value.trim() !== '');
                const dates = group.inspection_dates.filter((value: string) => value.trim() !== '');

                if (inspectors.length > 0 && dates.length > 0) {
                    return inspectors.flatMap((inspector: string) =>
                        dates.map((date: string) => ({
                            iar_number: group.iar_number,
                            inspected_by: inspector,
                            inspection_date: date,
                        }))
                    );
                }

                if (inspectors.length > 0) {
                    return inspectors.map((inspector: string) => ({
                        iar_number: group.iar_number,
                        inspected_by: inspector,
                        inspection_date: '',
                    }));
                }

                if (dates.length > 0) {
                    return dates.map((date: string) => ({
                        iar_number: group.iar_number,
                        inspected_by: '',
                        inspection_date: date,
                    }));
                }

                if (group.iar_number.trim() !== '') {
                    return [{
                        iar_number: group.iar_number,
                        inspected_by: '',
                        inspection_date: '',
                    }];
                }

                return [];
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

    const isStepDone = (stepName: string) => {
        switch (stepName) {
            case 'PO From VPAD': return !!data.po_received_date;
            case 'End User': return !!data.date_forwarded_to_end_user;
            case 'For Supplier\'s Signature': return !!data.supplier_signature_date;
            case 'For COA Stamp': return !!data.coa_date;
            case 'For Release': return !!data.date_received_by_supplier;
            case 'Payment Processing': return !!data.date_completed;
            case 'Forwarded to Finance': return !!data.date_forwarded_to_finance;
            default: return false;
        }
    };

    const isStepSavedAsDone = (stepName: string) => {
        switch (stepName) {
            case 'PO From VPAD': return !!purchaseOrder?.po_received_date;
            case 'End User': return !!purchaseOrder?.date_forwarded_to_end_user;
            case 'For Supplier\'s Signature': return !!purchaseOrder?.supplier_signature_date;
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

                        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                            
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

                                {/* 2. For Supplier's Signature */}
                                {activeTab === "For Supplier's Signature" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Date Forwarded to Supplier"
                                            name="date_forwarded_supplier"
                                            type="date"
                                            value={data.date_forwarded_supplier}
                                            onChange={handleChange}
                                            error={errors.date_forwarded_supplier}
                                        />
                                        <Field
                                            label="Claimed By (Supplier)"
                                            name="claimed_by_supplier"
                                            value={data.claimed_by_supplier}
                                            onChange={handleChange}
                                            error={errors.claimed_by_supplier}
                                        />
                                        <Field
                                            label="Supplier Signature Date"
                                            name="supplier_signature_date"
                                            type="date"
                                            value={data.supplier_signature_date}
                                            onChange={handleChange}
                                            error={errors.supplier_signature_date}
                                            required={true}
                                        />
                                    </div>
                                )}

                                {/* 3. For COA Stamp */}
                                {activeTab === 'For COA Stamp' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        />
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
                                        />
                                    </div>
                                )}

                                {/* 5. Payment Processing */}
                                {activeTab === 'Payment Processing' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                                        <div className="col-span-1 md:col-span-2 mt-4 space-y-4">
                                            <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                                                <h4 className="text-sm font-semibold text-foreground">
                                                    Inspection Details
                                                    {data.inspection_groups.length > 0 && (
                                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                            {data.inspection_groups.length} IAR{data.inspection_groups.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </h4>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={addInspectionGroup}
                                                    disabled={isStepLocked('Payment Processing')}
                                                >
                                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                                    Add IAR
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
                                                                    label="IAR Number"
                                                                    name={`inspection_groups.${groupIndex}.iar_number`}
                                                                    value={group.iar_number}
                                                                    onChange={(e) => updateInspectionGroup(groupIndex, e.target.value)}
                                                                    error={errors[`inspection_entries.${groupIndex}.iar_number`]}
                                                                    readOnly={isStepLocked('Payment Processing')}
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
                                                                            <Input
                                                                                value={inspector}
                                                                                onChange={(e) => updateInspectionInspector(groupIndex, inspectorIndex, e.target.value)}
                                                                                readOnly={isStepLocked('Payment Processing')}
                                                                                placeholder="Name"
                                                                                className={cn("h-9 w-36", isStepLocked('Payment Processing') && "bg-muted text-muted-foreground cursor-not-allowed")}
                                                                            />
                                                                            {group.inspectors.length > 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeInspectionInspector(groupIndex, inspectorIndex)}
                                                                                    disabled={isStepLocked('Payment Processing')}
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
                                                                        disabled={isStepLocked('Payment Processing')}
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
                                                                                onChange={(e) => updateInspectionDate(groupIndex, dateIndex, e.target.value)}
                                                                                readOnly={isStepLocked('Payment Processing')}
                                                                                className={cn("h-9 w-[150px]", isStepLocked('Payment Processing') && "bg-muted text-muted-foreground cursor-not-allowed")}
                                                                            />
                                                                            {group.inspection_dates.length > 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeInspectionDate(groupIndex, dateIndex)}
                                                                                    disabled={isStepLocked('Payment Processing')}
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
                                                                        disabled={isStepLocked('Payment Processing')}
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
                                                                    disabled={data.inspection_groups.length === 1 || isStepLocked('Payment Processing')}
                                                                    className="h-9 w-9 text-muted-foreground hover:text-red-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                    title="Remove IAR row"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
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
                                            disabled={!isStepDone(activeTab)}
                                            onClick={() => {
                                                const nextStep = STEPS[STEPS.indexOf(activeTab) + 1];
                                                setActiveTab(nextStep);
                                                handleSelectChange('po_step')(nextStep);
                                            }}
                                            className={cn("transition-all duration-300", isStepDone(activeTab) && "bg-primary text-primary-foreground hover:bg-primary/90")}
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
