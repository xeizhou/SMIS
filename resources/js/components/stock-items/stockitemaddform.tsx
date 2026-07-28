import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
        </div>
    );
}

const getEmptyForm = () => ({
    stock_no: '',
    item_name: '',
    description: '',
    on_hand_quantity: '0',
    re_order_point: '0',
    fund_cluster_id: '',
    remarks: '',
    units: [{ unitID: '', is_default: true }], // Initialize with 1 empty default unit
});

export default function StockItemAddForm({
    open,
    onOpenChange,
    units,
    fundClusters,
}: Props) {
    const [data, setData] = useState(getEmptyForm());
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            setData(getEmptyForm());
            setErrors({});
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;

        if (type === 'number' && value !== '' && Number(value) < 0) {
            return;
        }

        setData((prev) => ({ ...prev, [name]: value }));
    };

    // Functions for handling the dynamic units array
    const handleUnitChange = (index: number, newUnitID: string) => {
        const newUnits = [...data.units];
        newUnits[index].unitID = newUnitID;
        setData({ ...data, units: newUnits });
    };

    const handleSetDefaultUnit = (index: number) => {
        const newUnits = data.units.map((u, i) => ({
            ...u,
            is_default: i === index,
        }));
        setData({ ...data, units: newUnits });
    };

    const addUnitRow = () => {
        setData({
            ...data,
            units: [...data.units, { unitID: '', is_default: false }],
        });
    };

    const removeUnitRow = (index: number) => {
        const newUnits = [...data.units];
        const removed = newUnits.splice(index, 1)[0];
        
        // If we removed the default unit, assign default to the first remaining one
        if (removed.is_default && newUnits.length > 0) {
            newUnits[0].is_default = true;
        }
        
        setData({ ...data, units: newUnits });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/stock-items', data, {
            onSuccess: () => {
                onOpenChange(false);
            },
            onError: (errors) => setErrors(errors),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Stock Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <Field
                        label="Stock No."
                        name="stock_no"
                        value={data.stock_no}
                        onChange={handleChange}
                        error={errors.stock_no}
                        required
                        placeholder="Enter stock number"
                    />
                    <Field
                        label="Item Name"
                        name="item_name"
                        value={data.item_name}
                        onChange={handleChange}
                        error={errors.item_name}
                        required
                        placeholder="Enter item name"
                    />
                    <Field
                        label="Description"
                        name="description"
                        value={data.description}
                        onChange={handleChange}
                        error={errors.description}
                        placeholder="Enter description"
                    />

                    {/* Dynamic Units Section */}
                    <div className="rounded-lg border p-4 bg-muted/30">
                        <label className="mb-3 block text-sm font-semibold text-foreground">
                            Units <span className="text-red-500">*</span>
                        </label>
                        
                        <div className="space-y-3">
                            {data.units.map((unitObj, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="flex flex-col items-center justify-center gap-1">
                                        <input
                                            type="radio"
                                            name="default_unit"
                                            checked={unitObj.is_default}
                                            onChange={() => handleSetDefaultUnit(index)}
                                            className="size-4 cursor-pointer accent-[#612A35]"
                                            title="Set as Default Table Unit"
                                        />
                                        {unitObj.is_default && <span className="text-[10px] text-muted-foreground font-semibold">Def.</span>}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <Select
                                            value={unitObj.unitID}
                                            onValueChange={(val) => handleUnitChange(index, val)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select Unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {units.map((unit) => (
                                                    <SelectItem key={unit.unitID} value={String(unit.unitID)}>
                                                        {unit.unit_name} ({unit.unit_short_name})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors[`units.${index}.unitID`] && (
                                            <p className="mt-1 text-xs text-red-500">Required</p>
                                        )}
                                    </div>

                                    {data.units.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeUnitRow(index)}
                                            className="text-red-500 hover:bg-red-50 hover:text-red-700 h-10 w-10 shrink-0"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {errors.units && (
                            <p className="mt-2 text-xs text-red-500">{errors.units}</p>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addUnitRow}
                            className="mt-4 w-full border-dashed"
                        >
                            <Plus className="mr-2 size-4" />
                            Add Another Unit
                        </Button>
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
                        <label className={labelClass}>Fund Cluster</label>
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
                            <p className="mt-1 text-xs text-red-500">{errors.fund_cluster_id}</p>
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