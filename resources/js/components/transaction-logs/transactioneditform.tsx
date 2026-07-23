import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
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

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
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

interface Transaction {
    transactionID: number;
    transaction_type: string;
    // NOTE: this field gets clobbered server-side by the `fundCluster` relation
    // (Eloquent snake-cases the relation name to `fund_cluster`, overwriting the
    // raw FK column of the same name in the JSON payload). Don't read the id from
    // this field — use `fund_cluster_detail` instead.
    fund_cluster: string | FundCluster;
    fund_cluster_detail?: FundCluster;
    transaction_date: string;
    item_name: string;
    unitID: number;
    reference: string;
    quantity: number;
    office_code: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction | null;
    units: Unit[];
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
    min?: string;
}

const labelClass = 'mb-1 block text-sm text-foreground';

function Field({
    label,
    name,
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
    type = 'text',
    min,
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
                min={min}
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

const TRANSACTION_TYPE_OPTIONS = [
    { value: 'ISSUE', label: 'ISSUE' },
    { value: 'RECEIVE', label: 'RECEIVE' },
];

const emptyForm = {
    transaction_type: '',
    fund_cluster: '',
    transaction_date: '',
    item_name: '',
    unitID: '',
    reference: '',
    quantity: '0',
    office_code: '',
};

export default function TransactionEditForm({
    open,
    onOpenChange,
    transaction,
    units,
    fundClusters,
    offices,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (transaction) {
            // fund_cluster_detail is the safe copy of the relation; transaction.fund_cluster
            // itself may be clobbered (object) or, if the backend ever stops eager-loading
            // the relation, the plain string id — handle both defensively.
            const fundClusterId =
                transaction.fund_cluster_detail?.fund_cluster_id ??
                (typeof transaction.fund_cluster === 'string'
                    ? transaction.fund_cluster
                    : transaction.fund_cluster?.fund_cluster_id) ??
                '';

            setData({
                transaction_type: transaction.transaction_type,
                fund_cluster: fundClusterId,
                transaction_date: transaction.transaction_date?.slice(0, 10) ?? '',
                item_name: transaction.item_name,
                unitID: String(transaction.unitID),
                reference: transaction.reference,
                quantity: String(transaction.quantity),
                office_code: transaction.office_code,
            });
            setErrors({});
        }
    }, [transaction]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;

        if (type === 'number' && value !== '' && Number(value) < 0) {
            return;
        }

        setData({
            ...data,
            [name]: value,
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

        if (!transaction) {
return;
}

        setProcessing(true);

        router.put(`/transaction-logs/${transaction.transactionID}`, data, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    if (!transaction) {
return null;
}

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-h-[90vh] overflow-y-auto"
                style={{ maxWidth: '700px' }}
            >
                <DialogHeader>
                    <DialogTitle>
                        Edit Transaction #{transaction.transactionID}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="grid grid-cols-2 gap-10 w-full">
                        {/* Left column */}
                        <div className="space-y-5">
                            <SelectField
                                label="Transaction Type"
                                value={data.transaction_type}
                                onChange={handleSelectChange('transaction_type')}
                                error={errors.transaction_type}
                                required
                                placeholder="-- Select Type --"
                                options={TRANSACTION_TYPE_OPTIONS}
                            />

                            <Field
                                label="Transaction Date"
                                name="transaction_date"
                                type="date"
                                value={data.transaction_date}
                                onChange={handleChange}
                                error={errors.transaction_date}
                                required
                            />

                            <Field
                                label="Item Name"
                                name="item_name"
                                value={data.item_name}
                                onChange={handleChange}
                                error={errors.item_name}
                                required
                                placeholder="e.g. Bond Paper A4"
                            />

                            <SelectField
                                label="Unit"
                                value={data.unitID}
                                onChange={handleSelectChange('unitID')}
                                error={errors.unitID}
                                required
                                placeholder="-- Select Unit --"
                                options={units.map((unit) => ({
                                    value: String(unit.unitID),
                                    label: `${unit.unit_name} (${unit.unit_short_name})`,
                                }))}
                            />
                        </div>

                        {/* Right column */}
                        <div className="space-y-5">
                            <Field
                                label="Quantity"
                                name="quantity"
                                type="number"
                                min="0"
                                value={data.quantity}
                                onChange={handleChange}
                                error={errors.quantity}
                                required
                            />

                            <Field
                                label="Reference"
                                name="reference"
                                value={data.reference}
                                onChange={handleChange}
                                error={errors.reference}
                                required
                                placeholder="e.g. RIS No. or PO No."
                            />

                            <SelectField
                                label="Fund Cluster"
                                value={data.fund_cluster}
                                onChange={handleSelectChange('fund_cluster')}
                                error={errors.fund_cluster}
                                required
                                placeholder="-- Select Fund Cluster --"
                                options={fundClusters.map((fc) => ({
                                    value: fc.fund_cluster_id,
                                    label: `${fc.fund_cluster_id} - ${fc.fund_description}`,
                                }))}
                            />

                            <SelectField
                                label="Office"
                                value={data.office_code}
                                onChange={handleSelectChange('office_code')}
                                error={errors.office_code}
                                required
                                placeholder="-- Select Office --"
                                options={offices.map((office) => ({
                                    value: office.office_code,
                                    label: `${office.office_code} - ${office.office_name}`,
                                }))}
                            />
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
                            style={{ backgroundColor: '#612A35' }}
                        >
                            {processing ? 'Saving...' : 'Update Transaction'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}