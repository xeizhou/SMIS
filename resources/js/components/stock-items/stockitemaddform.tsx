import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    units: Unit[];
    fundClusters: FundCluster[]; // Added prop
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
    label?: string;
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
                            'w-full justify-between font-normal flex items-center', // Added flex constraints
                            !selectedLabel && 'text-muted-foreground',
                            error && 'border-red-500'
                        )}
                    >
                        {/* Truncate ensures long text cuts off with ... instead of expanding/overlapping */}
                        <span className="truncate flex-1 text-left mr-2">
                            {selectedLabel || placeholder}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
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
                                        value={`${opt.label} ${opt.value}`}
                                        onSelect={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4 shrink-0',
                                                value === opt.value ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        <span className="truncate">{opt.label}</span>
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

const getEmptyForm = () => ({
    stock_no: '',
    item_name: '',
    description: '',
    fund_cluster_id: '',
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
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setData(getEmptyForm());
            setErrors({});
            setIsProcessing(false);
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
        setIsProcessing(true);
        
        router.post('/stock-items', data, {
            onSuccess: () => {
                onOpenChange(false);
            },
            onError: (errors) => {
                setErrors(errors);
            },
            onFinish: () => {
                setIsProcessing(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <ScrollArea className="max-h-[90vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Add Stock Item Record</DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                            {/* Section: Item Details */}
                            <div>
                                <h3 className={sectionTitleClass}>Item Details</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                    
                                    {/* Fund Cluster Select Field */}
                                    <div className="md:col-span-1">
                                        <SearchableSelect
                                            label="Fund Cluster"
                                            value={data.fund_cluster_id}
                                            onChange={(val) => setData({ ...data, fund_cluster_id: val })}
                                            placeholder="Select Fund Cluster..."
                                            options={fundClusters.map((fc) => ({
                                                value: fc.fund_cluster_id,
                                                label: `${fc.fund_cluster_id} - ${fc.fund_description}`,
                                            }))}
                                            error={errors.fund_cluster_id}
                                        />
                                    </div>

                                    <div className="md:col-span-1">
                                        <Field
                                            label="Description"
                                            name="description"
                                            value={data.description}
                                            onChange={handleChange}
                                            error={errors.description}
                                            placeholder="Enter description"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Units Configuration */}
                            <div>
                                <h3 className={sectionTitleClass}>Units Configuration</h3>
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
                                                
                                                <div className="flex-1 w-0 min-w-0">
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
                            </div>

                            <div className="flex justify-end gap-3 pt-6 pb-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="w-full lg:w-auto bg-[#612A35] hover:bg-[#612A35]/90 text-white"
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Saving...' : 'Save Stock Item'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}