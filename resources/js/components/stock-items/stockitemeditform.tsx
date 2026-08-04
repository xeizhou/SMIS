import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
    pivot?: {
        is_default: boolean;
    };
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface StockItem {
    stock_no: string;
    item_name: string;
    description: string | null;
    on_hand_quantity: number;
    re_order_point: number;
    fund_cluster_id: string | null;
    remarks: string | null;
    units?: Unit[];
    fund_cluster: FundCluster | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stock: StockItem | null;
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

// Custom Searchable Dropdown (without refresh functionality)
interface SearchableSelectProps {
    label?: string; // Made optional for inline usage in dynamic rows
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    options: { value: string; label: string }[];
}

function SearchableSelect({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Search...',
    options,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);

    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
        <div className="w-full">
            {label && (
                <label className={labelClass}>
                    {label}
                    {required && <span className="text-red-500"> *</span>}
                </label>
            )}

            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            'w-full justify-between font-normal',
                            !selectedLabel && 'text-muted-foreground',
                            error && 'border-red-500'
                        )}
                    >
                        {selectedLabel || placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent 
                    className="p-0" 
                    style={{ width: 'var(--radix-popover-trigger-width)' }}
                >
                    <Command>
                        <CommandInput placeholder={placeholder} />
                        <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((opt) => (
                                    <CommandItem
                                        key={opt.value}
                                        value={opt.label}
                                        onSelect={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                value === opt.value ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        {opt.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export default function StockItemEditForm({
    open,
    onOpenChange,
    stock,
    units,
    fundClusters,
}: Props) {
    const [data, setData] = useState({
        item_name: '',
        description: '',
        on_hand_quantity: '0',
        re_order_point: '0',
        fund_cluster_id: '',
        remarks: '',
        units: [{ unitID: '', is_default: true }],
    });
    
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (stock) {
            // Transform the Eloquent relation array into our form's format
            const mappedUnits = stock.units && stock.units.length > 0 
                ? stock.units.map(u => ({
                    unitID: String(u.unitID),
                    is_default: Boolean(u.pivot?.is_default),
                }))
                : [{ unitID: '', is_default: true }]; // Fallback if somehow none

            setData({
                item_name: stock.item_name,
                description: stock.description ?? '',
                on_hand_quantity: String(stock.on_hand_quantity),
                re_order_point: String(stock.re_order_point),
                fund_cluster_id: stock.fund_cluster_id ?? '',
                remarks: stock.remarks ?? '',
                units: mappedUnits,
            });
            setErrors({});
        }
    }, [stock, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (type === 'number' && value !== '' && Number(value) < 0) return;
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
        if (!stock) return;

        router.put(`/stock-items/${stock.stock_no}`, data, {
            onSuccess: () => {
                onOpenChange(false);
            },
            onError: (errors) => setErrors(errors),
        });
    };

    if (!stock) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Stock Item — {stock.stock_no}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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

                    {/* Dynamic Units Section */}
                    <div className="rounded-lg border p-4 bg-muted/30">
                        <label className="mb-3 block text-sm font-semibold text-foreground">
                            Units Configuration <span className="text-red-500">*</span>
                        </label>
                        
                        <div className="space-y-3">
                            {data.units.map((unitObj, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="flex flex-col items-center justify-center gap-1">
                                        <input
                                            type="radio"
                                            name="edit_default_unit"
                                            checked={unitObj.is_default}
                                            onChange={() => handleSetDefaultUnit(index)}
                                            className="size-4 cursor-pointer accent-[#612A35]"
                                            title="Set as Default Table Unit"
                                        />
                                        {unitObj.is_default && <span className="text-[10px] text-muted-foreground font-semibold">Def.</span>}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <SearchableSelect
                                            value={unitObj.unitID}
                                            onChange={(val) => handleUnitChange(index, val)}
                                            placeholder="Search unit..."
                                            options={units.map((unit) => ({
                                                value: String(unit.unitID),
                                                label: `${unit.unit_name} (${unit.unit_short_name})`
                                            }))}
                                            error={errors[`units.${index}.unitID`] ? "Required" : undefined}
                                        />
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
                            Update Stock Item
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}