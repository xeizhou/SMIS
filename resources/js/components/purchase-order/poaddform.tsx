import { useState } from 'react';
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

const labelClass = 'mb-1 block text-sm font-medium text-foreground';

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
}

function SelectField({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Select...',
    options,
}: SelectFieldProps) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

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

const emptyForm = {
    po_number: '',
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

    const diff = calculateDiff(data.total_amount_abc, data.total_amount_po);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post(
            '/purchase-orders',
            {
                ...data,
                total_amount_diff: diff,
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setData(emptyForm);
                    setErrors({});
                },
                onError: (errors) => setErrors(errors),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Purchase Order</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                    {/* Basic Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">
                            Basic Details
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field
                                label="PO Number"
                                name="po_number"
                                value={data.po_number}
                                onChange={handleChange}
                                error={errors.po_number}
                                required
                                placeholder="e.g. PO-2026-001"
                            />

                            <SelectField
                                label="Supplier"
                                value={data.supplier_id}
                                onChange={handleSelectChange('supplier_id')}
                                error={errors.supplier_id}
                                placeholder="Select supplier"
                                options={suppliers.map((s) => ({
                                    value: String(s.supplier_id),
                                    label: s.supplier_name,
                                }))}
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
                                label="Inclusive Date"
                                name="inclusive_date"
                                value={data.inclusive_date}
                                onChange={handleChange}
                                error={errors.inclusive_date}
                                placeholder="e.g. Jan 1 - Jan 15, 2026"
                            />

                            <Field
                                label="Due Date"
                                name="due_date"
                                type="date"
                                value={data.due_date}
                                onChange={handleChange}
                                error={errors.due_date}
                            />

                            <Field
                                label="Mode of Procurement"
                                name="mode_of_procurement"
                                value={data.mode_of_procurement}
                                onChange={handleChange}
                                error={errors.mode_of_procurement}
                                placeholder="e.g. Small Value Procurement"
                            />

                            <SelectField
                                label="End User (Office)"
                                value={data.end_user}
                                onChange={handleSelectChange('end_user')}
                                error={errors.end_user}
                                placeholder="Select office"
                                options={offices.map((o) => ({
                                    value: o.office_code,
                                    label: o.office_code,
                                }))}
                            />
                        </div>
                    </div>

                    {/* Reference Numbers */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">
                            Reference Numbers
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field
                                label="PR Number"
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
                                label="PhilGEPS Reference No."
                                name="philgeps_reference_no"
                                value={data.philgeps_reference_no}
                                onChange={handleChange}
                                error={errors.philgeps_reference_no}
                            />
                        </div>
                    </div>

                    {/* Amounts */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">
                            Amounts
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Field
                                label="ABC Amount"
                                name="total_amount_abc"
                                type="number"
                                value={data.total_amount_abc}
                                onChange={handleChange}
                                error={errors.total_amount_abc}
                                placeholder="0.00"
                            />

                            <Field
                                label="PO Amount"
                                name="total_amount_po"
                                type="number"
                                value={data.total_amount_po}
                                onChange={handleChange}
                                error={errors.total_amount_po}
                                placeholder="0.00"
                            />

                            <div>
                                <label className={labelClass}>
                                    Difference (ABC − PO)
                                </label>

                                <Input
                                    value={diff.toFixed(2)}
                                    disabled
                                    className="bg-muted text-muted-foreground"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fund & Accounting */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">
                            Fund &amp; Accounting
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <SelectField
                                label="Fund Cluster"
                                value={data.fund_cluster_id}
                                onChange={handleSelectChange('fund_cluster_id')}
                                error={errors.fund_cluster_id}
                                placeholder="Select fund cluster"
                                options={fundClusters.map((fc) => ({
                                    value: fc.fund_cluster_id,
                                    label: fc.fund_description
                                        ? `${fc.fund_cluster_id} — ${fc.fund_description}`
                                        : fc.fund_cluster_id,
                                }))}
                            />

                            <Field
                                label="ORS/BURS No."
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

                            <Field
                                label="Responsibility Center"
                                name="responsibility_center"
                                value={data.responsibility_center}
                                onChange={handleChange}
                                error={errors.responsibility_center}
                            />

                            <Field
                                label="UACS Object Code"
                                name="uacs_object_code"
                                value={data.uacs_object_code}
                                onChange={handleChange}
                                error={errors.uacs_object_code}
                            />
                        </div>
                    </div>

                    {/* Routing */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">
                            Routing
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Field
                                label="Forwarded to SMU"
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
                                label="Forwarded to Frontdesk"
                                name="date_forwarded_frontdesk"
                                type="date"
                                value={data.date_forwarded_frontdesk}
                                onChange={handleChange}
                                error={errors.date_forwarded_frontdesk}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
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
                            {processing ? 'Saving...' : 'Save Purchase Order'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}