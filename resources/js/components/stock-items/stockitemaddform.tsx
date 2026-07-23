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
        const { name, value, type } = e.target;

        // Prevent negative numbers for quantity/threshold fields
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

                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            label="On Hand Qty"
                            name="on_hand_quantity"
                            type="number"
                            min="0"
                            value={data.on_hand_quantity}
                            onChange={handleChange}
                            error={errors.on_hand_quantity}
                        />
                        <Field
                            label="Re-order Point"
                            name="re_order_point"
                            type="number"
                            min="0"
                            value={data.re_order_point}
                            onChange={handleChange}
                            error={errors.re_order_point}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>
                            Fund Cluster
                        </label>
                        <Select
                            value={data.fund_cluster_id}
                            onValueChange={(value) =>
                                setData({ ...data, fund_cluster_id: value })
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