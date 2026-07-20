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

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    units: Unit[];
    fundClusters: FundCluster[];
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
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
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
    stock_no: '',
    item_name: '',
    description: '',
    unitID: '',
    on_hand_quantity: '0',
    re_order_point: '0',
    fund_cluster_id: '',
    remarks: '',
};

export default function StockItemAddForm({
    open,
    onOpenChange,
    units,
    fundClusters,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSelectChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/stock-items', data, {
            onSuccess: () => {
                onOpenChange(false);
                setData(emptyForm);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        New Stock Item
                    </DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit}
                    className="mt-4 space-y-4"
                >
                    <Field
                        label="Stock No."
                        name="stock_no"
                        value={data.stock_no}
                        onChange={handleChange}
                        error={errors.stock_no}
                        required
                        placeholder="e.g. STK-001"
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
                    <Field
                        label="Description"
                        name="description"
                        value={data.description}
                        onChange={handleChange}
                        error={errors.description}
                        placeholder="e.g. 70gsm, 500 sheets per ream"
                    />

                    <div>
                        <label className={labelClass}>
                            Unit
                        </label>
                        <select
                            name="unitID"
                            value={data.unitID}
                            onChange={handleSelectChange}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="">-- Select Unit --</option>
                            {units.map((unit) => (
                                <option key={unit.unitID} value={unit.unitID}>
                                    {unit.unit_name} ({unit.unit_short_name})
                                </option>
                            ))}
                        </select>
                        {errors.unitID && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.unitID}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            label="On Hand Qty"
                            name="on_hand_quantity"
                            type="number"
                            value={data.on_hand_quantity}
                            onChange={handleChange}
                            error={errors.on_hand_quantity}
                        />
                        <Field
                            label="Re-order Point"
                            name="re_order_point"
                            type="number"
                            value={data.re_order_point}
                            onChange={handleChange}
                            error={errors.re_order_point}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>
                            Fund Cluster
                        </label>
                        <select
                            name="fund_cluster_id"
                            value={data.fund_cluster_id}
                            onChange={handleSelectChange}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="">-- Select Fund Cluster --</option>
                            {fundClusters.map((fc) => (
                                <option key={fc.fund_cluster_id} value={fc.fund_cluster_id}>
                                    {fc.fund_cluster_id} - {fc.fund_description}
                                </option>
                            ))}
                        </select>
                        {errors.fund_cluster_id && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.fund_cluster_id}
                            </p>
                        )}
                    </div>

                    <Field
                        label="Remarks"
                        name="remarks"
                        value={data.remarks}
                        onChange={handleChange}
                        error={errors.remarks}
                        placeholder="Optional notes"
                    />

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
                            Save Stock Item
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}