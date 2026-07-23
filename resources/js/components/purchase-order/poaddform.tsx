import { router } from '@inertiajs/react';
import { useState } from 'react';
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

    return safePo- safeAbc;
}

function calculateResponsibilityCenter(fundClusterId: string, endUser: string) {
    return [fundClusterId, endUser].filter(Boolean).join(' ');
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
                                />

                                {errors.item_description && (
                                    <p className="mt-1 text-xs text-red-500">{errors.item_description}</p>
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
                                />

                                <Field
                                    label="Total Amount PO"
                                    name="total_amount_po"
                                    type="number"
                                    value={data.total_amount_po}
                                    onChange={handleChange}
                                    error={errors.total_amount_po}
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
                                    placeholder="Select"
                                    options={fundClusters.map((fc) => ({
                                        value: fc.fund_cluster_id,
                                        label: fc.fund_cluster_id,
                                    }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Responsibility Center
                                    </label>

                                    <Input
                                        value={responsibilityCenter}
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
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <SelectField
                                    label="Supplier"
                                    value={data.supplier_id}
                                    onChange={handleSelectChange('supplier_id')}
                                    error={errors.supplier_id}
                                    placeholder="Select"
                                    options={suppliers.map((s) => ({
                                        value: String(s.supplier_id),
                                        label: s.supplier_name,
                                    }))}
                                />

                                <SelectField
                                    label="End User"
                                    value={data.end_user}
                                    onChange={handleSelectChange('end_user')}
                                    error={errors.end_user}
                                    placeholder="Select"
                                    options={offices.map((o) => ({
                                        value: o.office_code,
                                        label: o.office_code,
                                    }))}
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