import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

import { RrspItem, RrspOption, FundClusterOption } from '@/types/regspi';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rrsps?: RrspOption[];
    fundClusters?: FundClusterOption[];
}

interface FieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    type?: string;
    readOnly?: boolean;
    disabled?: boolean;
}

const labelClass = 'mb-1 block text-sm font-medium text-foreground';
const sectionTitleClass =
    'text-sm font-semibold text-foreground border-b pb-2 mb-4';

function Field({
    label,
    name,
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
    type = 'text',
    readOnly = false,
    disabled = false,
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
                readOnly={readOnly}
                disabled={disabled}
                className={readOnly ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
            />

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function TextareaField({
    label,
    name,
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
}: FieldProps) {
    return (
        <div className="md:col-span-2">
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <Textarea
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

// Custom Searchable Dropdown for RRSP No.
interface SearchableSelectProps {
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

function SearchableSelect({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Search...',
    options,
    onRefresh,
    isRefreshing = false,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);

    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className={labelClass}>
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

                <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                        <CommandInput placeholder={placeholder} />
                        <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <CommandEmpty>No record found.</CommandEmpty>
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
                <label className={labelClass}>
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
    rrsp_no: '',
    items: [{
        ics_no: '',
        fund_cluster_id: '',
        semi_expendable_property_no: '',
        item_description: '',
        amount: '',
        estimated_useful_life: '',
        issued_qty: '',
        issued_office_officer: '',
        returned_qty: '',
        returned_office_officer: '',
        reissued_qty: '',
        reissued_office_officer: '',
        disposed_qty: '',
        balance_qty: '',
        remarks: '',
    }],
};

function calculateBalance(values: Record<string, string>) {
    const issued = Number(values.issued_qty || 0);
    const returned = Number(values.returned_qty || 0);
    const reissued = Number(values.reissued_qty || 0);
    const disposed = Number(values.disposed_qty || 0);

    return issued - returned + reissued - disposed;
}

export default function RegSPIAddForm({ open, onOpenChange, rrsps = [], fundClusters = [] }: Props) {
    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['rrsps', 'fundClusters'],
            onFinish: () => setRefreshingField(null),
        });
    };

    const [data, setData] = useState<{
        month_year: string;
        rrsp_no: string;
        items: Record<string, string>[];
    }>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setData(emptyForm);
            setErrors({});
        }
    }, [open]);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
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

    const handleRrspChange = (value: string) => {
        const selected = rrsps.find((r) => r.rrsp_no === value);
        
        if (selected && selected.items && selected.items.length > 0) {
            const newItems = selected.items.map((item: any) => ({
                ics_no: '',
                fund_cluster_id: '',
                semi_expendable_property_no: item.property_no || '',
                item_description: item.item_description || '',
                amount: item.cost ? String(item.cost) : '',
                estimated_useful_life: '',
                issued_qty: '',
                issued_office_officer: selected.end_user_name || '',
                returned_qty: '',
                returned_office_officer: '',
                reissued_qty: '',
                reissued_office_officer: '',
                disposed_qty: '',
                balance_qty: '',
                remarks: '',
            }));
            
            setData((prev) => ({
                ...prev,
                rrsp_no: value,
                items: newItems,
            }));
        } else {
            setData((prev) => ({ 
                ...prev, 
                rrsp_no: value,
            }));
        }
    };

    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setData({ ...data, items: newItems });
    };

    const addItem = () => {
        setData(prev => ({
            ...prev,
            items: [...prev.items, {
                ics_no: '',
                fund_cluster_id: '',
                semi_expendable_property_no: '',
                item_description: '',
                amount: '',
                estimated_useful_life: '',
                issued_qty: '',
                issued_office_officer: '',
                returned_qty: '',
                returned_office_officer: '',
                reissued_qty: '',
                reissued_office_officer: '',
                disposed_qty: '',
                balance_qty: '',
                remarks: '',
            }]
        }));
    };

    const removeItem = (index: number) => {
        setData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const payload = {
            ...data,
            items: data.items.map(item => ({
                ...item,
                balance_qty: String(calculateBalance(item)),
            }))
        };

        router.post(
            '/regspi-monitoring',
            payload,
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
                className="w-[95vw] max-h-[95vh] overflow-hidden p-0"
                style={{ maxWidth: '1200px' }}
            >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Add RegSPI Record</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                            {/* Section: General Information */}
                            <div>
                                <h3 className={sectionTitleClass}>General Information</h3>
                                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
                                    <Field
                                        label="Month / Year"
                                        name="month_year"
                                        value={data.month_year}
                                        onChange={handleChange}
                                        error={errors.month_year}
                                        required
                                        placeholder="e.g. 2025-01"
                                    />
                                    
                                    <SearchableSelect
                                        label="RRSP No."
                                        value={data.rrsp_no}
                                        onChange={handleRrspChange}
                                        error={errors.rrsp_no}
                                        
                                        placeholder="Search or select RRSP..."
                                        options={rrsps.map((rrsp) => ({
                                            value: rrsp.rrsp_no,
                                            label: rrsp.rrsp_no,
                                        }))}
                                        onRefresh={() => handleRefreshData('rrsps')}
                                        isRefreshing={refreshingField === 'rrsps'}
                                    />
                                </div>
                            </div>

                            {/* Dynamic Items */}
                            {data.items.length > 0 && (
                                <div className="space-y-6">
                                    {data.items.map((item, index) => (
                                        <div key={index} className="border rounded-md p-5 bg-card space-y-6">
                                            <div className="flex justify-between items-center border-b pb-2">
                                                <h3 className="text-sm font-semibold text-foreground">
                                                    Item {index + 1}: {item.item_description || 'Unknown'}
                                                </h3>
                                                {data.items.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeItem(index)}
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                                                <SelectField
                                                    label="Fund Cluster"
                                                    value={item.fund_cluster_id}
                                                    onChange={(value) => handleItemChange(index, 'fund_cluster_id', value)}
                                                    error={errors[`items.${index}.fund_cluster_id`]}
                                                    required
                                                    placeholder="Select fund cluster"
                                                    options={fundClusters.map((cluster) => ({
                                                        value: cluster.fund_cluster_id,
                                                        label: `${cluster.fund_cluster_id} - ${cluster.fund_description}`,
                                                    }))}
                                                    onRefresh={() => handleRefreshData('fundClusters')}
                                                    isRefreshing={refreshingField === 'fundClusters'}
                                                />
                                                <Field
                                                    label="ICS No."
                                                    name={`items[${index}].ics_no`}
                                                    value={item.ics_no}
                                                    onChange={(e) => handleItemChange(index, 'ics_no', e.target.value)}
                                                    error={errors[`items.${index}.ics_no`]}
                                                    placeholder="e.g. ICS-05-IGF-2008020005"
                                                />
                                                <Field
                                                    label="Semi-Expendable Property No."
                                                    name={`items[${index}].semi_expendable_property_no`}
                                                    value={item.semi_expendable_property_no}
                                                    onChange={(e) => handleItemChange(index, 'semi_expendable_property_no', e.target.value)}
                                                    error={errors[`items.${index}.semi_expendable_property_no`]}
                                                    required
                                                    readOnly={!!data.rrsp_no}
                                                    placeholder={data.rrsp_no ? "Auto-filled from RRSP" : "Enter Property No."}
                                                />
                                                <Field
                                                    label="Item Description"
                                                    name={`items[${index}].item_description`}
                                                    value={item.item_description}
                                                    onChange={(e) => handleItemChange(index, 'item_description', e.target.value)}
                                                    error={errors[`items.${index}.item_description`]}
                                                    readOnly={!!data.rrsp_no}
                                                    placeholder={data.rrsp_no ? "Auto-filled from RRSP" : "Enter Item Description"}
                                                />
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-medium text-muted-foreground mb-3">Quantities & Offices</h4>
                                                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                                                    <Field
                                                        label="Issued Qty"
                                                        name={`items[${index}].issued_qty`}
                                                        type="number"
                                                        value={item.issued_qty}
                                                        onChange={(e) => handleItemChange(index, 'issued_qty', e.target.value)}
                                                        error={errors[`items.${index}.issued_qty`]}
                                                        placeholder="e.g. 1"
                                                    />
                                                    <Field
                                                        label="Issued Office / Officer"
                                                        name={`items[${index}].issued_office_officer`}
                                                        value={item.issued_office_officer}
                                                        onChange={(e) => handleItemChange(index, 'issued_office_officer', e.target.value)}
                                                        error={errors[`items.${index}.issued_office_officer`]}
                                                        readOnly={!!data.rrsp_no}
                                                        placeholder={data.rrsp_no ? "Auto-filled from RRSP" : "Enter Issued Office/Officer"}
                                                    />
                                                    <Field
                                                        label="Returned Qty"
                                                        name={`items[${index}].returned_qty`}
                                                        type="number"
                                                        value={item.returned_qty}
                                                        onChange={(e) => handleItemChange(index, 'returned_qty', e.target.value)}
                                                        error={errors[`items.${index}.returned_qty`]}
                                                        placeholder="e.g. 0"
                                                    />
                                                    <Field
                                                        label="Returned Office / Officer"
                                                        name={`items[${index}].returned_office_officer`}
                                                        value={item.returned_office_officer}
                                                        onChange={(e) => handleItemChange(index, 'returned_office_officer', e.target.value)}
                                                        error={errors[`items.${index}.returned_office_officer`]}
                                                        placeholder="e.g. Records Section"
                                                    />
                                                    <Field
                                                        label="Reissued Qty"
                                                        name={`items[${index}].reissued_qty`}
                                                        type="number"
                                                        value={item.reissued_qty}
                                                        onChange={(e) => handleItemChange(index, 'reissued_qty', e.target.value)}
                                                        error={errors[`items.${index}.reissued_qty`]}
                                                        placeholder="e.g. 0"
                                                    />
                                                    <Field
                                                        label="Reissued Office / Officer"
                                                        name={`items[${index}].reissued_office_officer`}
                                                        value={item.reissued_office_officer}
                                                        onChange={(e) => handleItemChange(index, 'reissued_office_officer', e.target.value)}
                                                        error={errors[`items.${index}.reissued_office_officer`]}
                                                        placeholder="e.g. Records Section"
                                                    />
                                                    <Field
                                                        label="Disposed Qty"
                                                        name={`items[${index}].disposed_qty`}
                                                        type="number"
                                                        value={item.disposed_qty}
                                                        onChange={(e) => handleItemChange(index, 'disposed_qty', e.target.value)}
                                                        error={errors[`items.${index}.disposed_qty`]}
                                                        placeholder="e.g. 0"
                                                    />
                                                    <div>
                                                        <label className={labelClass}>Balance Qty</label>
                                                        <Input
                                                            value={calculateBalance(item)}
                                                            disabled
                                                            className="bg-muted text-muted-foreground"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-medium text-muted-foreground mb-3">Financial & Remarks</h4>
                                                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                                    <Field
                                                        label="Estimated Useful Life"
                                                        name={`items[${index}].estimated_useful_life`}
                                                        type="number"
                                                        value={item.estimated_useful_life}
                                                        onChange={(e) => handleItemChange(index, 'estimated_useful_life', e.target.value)}
                                                        error={errors[`items.${index}.estimated_useful_life`]}
                                                        placeholder="e.g. 5"
                                                    />
                                                    <Field
                                                        label="Amount"
                                                        name={`items[${index}].amount`}
                                                        type="number"
                                                        value={item.amount}
                                                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                                        error={errors[`items.${index}.amount`]}
                                                        required
                                                        readOnly={!!data.rrsp_no}
                                                        placeholder={data.rrsp_no ? "Auto-filled from RRSP" : "Enter Amount"}
                                                    />
                                                    <Field
                                                        label="Remarks"
                                                        name={`items[${index}].remarks`}
                                                        value={item.remarks}
                                                        onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                                                        error={errors[`items.${index}.remarks`]}
                                                        placeholder="e.g. Fully Depreciated / Beyond Useful Life"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!data.rrsp_no && (
                                <div className="flex justify-center pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addItem}
                                        className="w-full md:w-auto"
                                    >
                                        + Add Another Item
                                    </Button>
                                </div>
                            )}

                            {data.items.length === 0 && data.rrsp_no && (
                                <div className="p-4 text-center border rounded-md bg-muted/50">
                                    <p className="text-sm text-muted-foreground">No items found for this RRSP.</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-8">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing} style={{ backgroundColor: '#370001' }}>
                                    {processing ? 'Saving...' : 'Save New Data'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}