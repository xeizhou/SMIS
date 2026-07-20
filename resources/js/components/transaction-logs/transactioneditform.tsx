import { useState, useEffect } from 'react';
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
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
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
    fund_cluster: string;
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

const labelClass = 'mb-1 block text-sm font-medium text-foreground';

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
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                min={min}
            />
            {error && (
                <p className="mt-1 text-xs text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}

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

    useEffect(() => {
        if (transaction) {
            setData({
                transaction_type: transaction.transaction_type,
                fund_cluster: transaction.fund_cluster,
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

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value, type } = e.target;

        if (type === 'number' && value !== '' && Number(value) < 0) {
            return;
        }

        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!transaction) return;

        router.put(`/transaction-logs/${transaction.transactionID}`, data, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    if (!transaction) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Edit Transaction #{transaction.transactionID}
                    </DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit}
                    className="mt-4 space-y-4"
                >
                    <div>
                        <label className={labelClass}>
                            Transaction Type
                            <span className="text-red-500"> *</span>
                        </label>
                        <Select
                            value={data.transaction_type}
                            onValueChange={(value) =>
                                setData({ ...data, transaction_type: value })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="-- Select Type --" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ISSUE">ISSUE</SelectItem>
                                <SelectItem value="RECEIVE">RECEIVE</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.transaction_type && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.transaction_type}
                            </p>
                        )}
                    </div>

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

                    <div>
                        <label className={labelClass}>
                            Unit
                            <span className="text-red-500"> *</span>
                        </label>
                        <Select
                            value={data.unitID}
                            onValueChange={(value) =>
                                setData({ ...data, unitID: value })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="-- Select Unit --" />
                            </SelectTrigger>
                            <SelectContent>
                                {units.map((unit) => (
                                    <SelectItem key={unit.unitID} value={String(unit.unitID)}>
                                        {unit.unit_name} ({unit.unit_short_name})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.unitID && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.unitID}
                            </p>
                        )}
                    </div>

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

                    <div>
                        <label className={labelClass}>
                            Fund Cluster
                            <span className="text-red-500"> *</span>
                        </label>
                        <Select
                            value={data.fund_cluster}
                            onValueChange={(value) =>
                                setData({ ...data, fund_cluster: value })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="-- Select Fund Cluster --" />
                            </SelectTrigger>
                            <SelectContent>
                                {fundClusters.map((fc) => (
                                    <SelectItem key={fc.fund_cluster_id} value={fc.fund_cluster_id}>
                                        {fc.fund_cluster_id} - {fc.fund_description}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.fund_cluster && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.fund_cluster}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className={labelClass}>
                            Office
                            <span className="text-red-500"> *</span>
                        </label>
                        <Select
                            value={data.office_code}
                            onValueChange={(value) =>
                                setData({ ...data, office_code: value })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="-- Select Office --" />
                            </SelectTrigger>
                            <SelectContent>
                                {offices.map((office) => (
                                    <SelectItem key={office.office_code} value={office.office_code}>
                                        {office.office_code} - {office.office_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.office_code && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.office_code}
                            </p>
                        )}
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
                            style={{ backgroundColor: '#612A35' }}
                        >
                            Update Transaction
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}