import { RefreshCw } from 'lucide-react';
import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
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

interface RrspOption {
    rrsp_no: string;
}

interface RegSPIRecord {
    regspi_id: number;
    month_year: string;
    ics_no: string | null;
    rrsp_no: string | null;
    fund_cluster_id: string | null;
    semi_expendable_property_no: string;
    item_description: string;
    estimated_useful_life: number | string | null;
    issued_qty: number | string | null;
    issued_office_officer: string | null;
    returned_qty: number | string | null;
    returned_office_officer: string | null;
    reissued_qty: number | string | null;
    reissued_office_officer: string | null;
    disposed_qty: number | string | null;
    balance_qty: number | string | null;
    amount: number | string | null;
    remarks: string | null;
}

interface FundClusterOption {
    fund_cluster_id: string;
    fund_description: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    regspi: RegSPIRecord | null;
    rrsps: RrspOption[];
    fundClusters: FundClusterOption[];
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

const emptyForm = {
    month_year: '',
    ics_no: '',
    rrsp_no: '',
    fund_cluster_id: '',
    semi_expendable_property_no: '',
    item_description: '',
    estimated_useful_life: '',
    issued_qty: '',
    issued_office_officer: '',
    returned_qty: '',
    returned_office_officer: '',
    reissued_qty: '',
    reissued_office_officer: '',
    disposed_qty: '',
    balance_qty: '',
    amount: '',
    remarks: '',
};

function toFormData(regspi: RegSPIRecord | null) {
    if (!regspi) {
return emptyForm;
}

    return {
        month_year: regspi.month_year ?? '',
        ics_no: regspi.ics_no ?? '',
        rrsp_no: regspi.rrsp_no ?? '',
        fund_cluster_id: regspi.fund_cluster_id ?? '',
        semi_expendable_property_no: regspi.semi_expendable_property_no ?? '',
        item_description: regspi.item_description ?? '',
        estimated_useful_life:
            regspi.estimated_useful_life === null || regspi.estimated_useful_life === undefined
                ? ''
                : String(regspi.estimated_useful_life),
        issued_qty:
            regspi.issued_qty === null || regspi.issued_qty === undefined ? '' : String(regspi.issued_qty),
        issued_office_officer: regspi.issued_office_officer ?? '',
        returned_qty:
            regspi.returned_qty === null || regspi.returned_qty === undefined ? '' : String(regspi.returned_qty),
        returned_office_officer: regspi.returned_office_officer ?? '',
        reissued_qty:
            regspi.reissued_qty === null || regspi.reissued_qty === undefined ? '' : String(regspi.reissued_qty),
        reissued_office_officer: regspi.reissued_office_officer ?? '',
        disposed_qty:
            regspi.disposed_qty === null || regspi.disposed_qty === undefined ? '' : String(regspi.disposed_qty),
        balance_qty:
            regspi.balance_qty === null || regspi.balance_qty === undefined ? '' : String(regspi.balance_qty),
        amount:
            regspi.amount === null || regspi.amount === undefined ? '' : String(regspi.amount),
        remarks: regspi.remarks ?? '',
    };
}

function calculateBalance(values: Record<string, string>) {
    const issued = Number(values.issued_qty || 0);
    const returned = Number(values.returned_qty || 0);
    const reissued = Number(values.reissued_qty || 0);
    const disposed = Number(values.disposed_qty || 0);

    return issued - returned + reissued - disposed;
}

export default function RegSPIEditForm({ open, onOpenChange, regspi, rrsps, fundClusters }: Props) {

    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['rrsps', 'fundClusters'],
            onFinish: () => setRefreshingField(null),
        });
    };
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setData(toFormData(regspi));
            setErrors({});
        }
    }, [open, regspi]);

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

        if (!regspi) {
return;
}

        setProcessing(true);

        router.put(
            `/regspi-monitoring/${encodeURIComponent(String(regspi.regspi_id))}`,
            {
                ...data,
                balance_qty: calculateBalance(data),
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setErrors({});
                },
                onError: (errors) => setErrors(errors),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-hidden p-0 p-0 overflow-hidden" style={{ maxWidth: '1200px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <div className="p-6">
                    <DialogHeader>
                    <DialogTitle>Edit RegSPI Record — {regspi?.regspi_id}</DialogTitle>
                </DialogHeader>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                        {/* Section: General Information */}
                        <div>
                            <h3 className={sectionTitleClass}>General Information</h3>
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                <Field
                                    label="Month / Year"
                                    name="month_year"
                                    value={data.month_year}
                                    onChange={handleChange}
                                    error={errors.month_year}
                                    required
                                    placeholder="e.g. 2025-01"
                                />
                                <Field
                                    label="ICS No."
                                    name="ics_no"
                                    value={data.ics_no}
                                    onChange={handleChange}
                                    error={errors.ics_no}
                                    placeholder="ICS-001"
                                />
                                <SelectField
                                    label="RRSP No."
                                    value={data.rrsp_no}
                                    onChange={handleSelectChange('rrsp_no')}
                                    error={errors.rrsp_no}
                                    placeholder="Select RRSP"
                                    options={rrsps.map((rrsp) => ({
                                        value: rrsp.rrsp_no,
                                        label: rrsp.rrsp_no,
                                    }))}
                                />
                                <SelectField
                                    label="Fund Cluster"
                                    value={data.fund_cluster_id}
                                    onChange={handleSelectChange('fund_cluster_id')}
                                    error={errors.fund_cluster_id}
                                    placeholder="Select fund cluster"
                                    options={fundClusters.map((cluster) => ({
                                        value: cluster.fund_cluster_id,
                                        label: `${cluster.fund_cluster_id} - ${cluster.fund_description}`,
                                    }))}
                                />
                                <Field
                                    label="Semi-Expendable Property No."
                                    name="semi_expendable_property_no"
                                    value={data.semi_expendable_property_no}
                                    onChange={handleChange}
                                    error={errors.semi_expendable_property_no}
                                    required
                                />
                                <Field
                                    label="Item Description"
                                    name="item_description"
                                    value={data.item_description}
                                    onChange={handleChange}
                                    error={errors.item_description}
                                    placeholder="Auto-filled from RRSP"
                                />
                            </div>
                        </div>

                        {/* Section: Quantities & Offices */}
                        <div>
                            <h3 className={sectionTitleClass}>Quantities & Offices</h3>
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                                <Field
                                    label="Issued Qty"
                                    name="issued_qty"
                                    type="number"
                                    value={data.issued_qty}
                                    onChange={handleChange}
                                    error={errors.issued_qty}
                                />
                                <Field
                                    label="Issued Office / Officer"
                                    name="issued_office_officer"
                                    value={data.issued_office_officer}
                                    onChange={handleChange}
                                    error={errors.issued_office_officer}
                                />
                                <Field
                                    label="Returned Qty"
                                    name="returned_qty"
                                    type="number"
                                    value={data.returned_qty}
                                    onChange={handleChange}
                                    error={errors.returned_qty}
                                />
                                <Field
                                    label="Returned Office / Officer"
                                    name="returned_office_officer"
                                    value={data.returned_office_officer}
                                    onChange={handleChange}
                                    error={errors.returned_office_officer}
                                />
                                <Field
                                    label="Reissued Qty"
                                    name="reissued_qty"
                                    type="number"
                                    value={data.reissued_qty}
                                    onChange={handleChange}
                                    error={errors.reissued_qty}
                                />
                                <Field
                                    label="Reissued Office / Officer"
                                    name="reissued_office_officer"
                                    value={data.reissued_office_officer}
                                    onChange={handleChange}
                                    error={errors.reissued_office_officer}
                                />
                                <Field
                                    label="Disposed Qty"
                                    name="disposed_qty"
                                    type="number"
                                    value={data.disposed_qty}
                                    onChange={handleChange}
                                    error={errors.disposed_qty}
                                />
                                <div>
                                    <label className={labelClass}>Balance Qty</label>
                                    <Input
                                        value={calculateBalance(data)}
                                        disabled
                                        className="bg-muted text-muted-foreground"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Financial & Remarks */}
                        <div>
                            <h3 className={sectionTitleClass}>Financial & Remarks</h3>
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                <Field
                                    label="Estimated Useful Life"
                                    name="estimated_useful_life"
                                    type="number"
                                    value={data.estimated_useful_life}
                                    onChange={handleChange}
                                    error={errors.estimated_useful_life}
                                />
                                <Field
                                    label="Amount"
                                    name="amount"
                                    type="number"
                                    value={data.amount}
                                    onChange={handleChange}
                                    error={errors.amount}
                                    required
                                />
                                <Field
                                    label="Remarks"
                                    name="remarks"
                                    value={data.remarks}
                                    onChange={handleChange}
                                    error={errors.remarks}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing} style={{ backgroundColor: '#370001' }}>
                                {processing ? 'Saving...' : 'Update Data'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
