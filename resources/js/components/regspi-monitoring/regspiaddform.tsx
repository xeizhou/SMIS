import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, RefreshCw } from 'lucide-react';
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

function calculateBalance(values: Record<string, string>) {
    const issued = Number(values.issued_qty || 0);
    const returned = Number(values.returned_qty || 0);
    const reissued = Number(values.reissued_qty || 0);
    const disposed = Number(values.disposed_qty || 0);

    return issued - returned + reissued - disposed;
}

export default function RegSPIAddForm({ open, onOpenChange, rrsps = [], fundClusters = [] }: Props) {
    const [refreshingField, setRefreshingField] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string>('');

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
            setData(emptyForm);
            setErrors({});
            setSelectedItem('');
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
        
        if (selected && selected.items && selected.items.length === 1) {
            const item = selected.items[0];
            setData((prev) => ({
                ...prev,
                rrsp_no: value,
                item_description: item.item_description || prev.item_description,
                semi_expendable_property_no: item.property_no || prev.semi_expendable_property_no,
                amount: item.cost ? String(item.cost) : prev.amount,
            }));
            setSelectedItem(String(item.id));
        } else {
            setData((prev) => ({ 
                ...prev, 
                rrsp_no: value,
                item_description: '',
                semi_expendable_property_no: '',
                amount: ''
            }));
            setSelectedItem('');
        }
    };

    const handleItemChange = (value: string) => {
        setSelectedItem(value);
        const rrsp = rrsps.find((r) => r.rrsp_no === data.rrsp_no);
        const item = rrsp?.items?.find((i) => String(i.id) === value);
        if (item) {
            setData((prev) => ({
                ...prev,
                item_description: item.item_description || prev.item_description,
                semi_expendable_property_no: item.property_no || prev.semi_expendable_property_no,
                amount: item.cost ? String(item.cost) : prev.amount,
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post(
            '/regspi-monitoring',
            {
                ...data,
                balance_qty: calculateBalance(data),
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
                                        placeholder="e.g. ICS-05-IGF-2008020005"
                                    />
                                    
                                    <SearchableSelect
                                        label="RRSP No."
                                        value={data.rrsp_no}
                                        onChange={handleRrspChange}
                                        error={errors.rrsp_no}
                                        required
                                        placeholder="Search or select RRSP..."
                                        options={rrsps.map((rrsp) => ({
                                            value: rrsp.rrsp_no,
                                            label: rrsp.rrsp_no,
                                        }))}
                                        onRefresh={() => handleRefreshData('rrsps')}
                                        isRefreshing={refreshingField === 'rrsps'}
                                    />

                                    {(() => {
                                        const selectedRrsp = rrsps.find((r) => r.rrsp_no === data.rrsp_no);
                                        if (selectedRrsp && selectedRrsp.items && selectedRrsp.items.length > 1) {
                                            return (
                                                <SelectField
                                                    label="Select Item from RRSP"
                                                    value={selectedItem}
                                                    onChange={handleItemChange}
                                                    placeholder="Select item..."
                                                    options={selectedRrsp.items.map((item) => ({
                                                        value: String(item.id),
                                                        label: item.item_description || 'Unknown Item'
                                                    }))}
                                                />
                                            );
                                        }
                                        return null;
                                    })()}

                                    <SelectField
                                        label="Fund Cluster"
                                        value={data.fund_cluster_id}
                                        onChange={handleSelectChange('fund_cluster_id')}
                                        error={errors.fund_cluster_id}
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
                                        label="Semi-Expendable Property No."
                                        name="semi_expendable_property_no"
                                        value={data.semi_expendable_property_no}
                                        onChange={handleChange}
                                        error={errors.semi_expendable_property_no}
                                        required
                                        readOnly
                                        placeholder="Auto-filled from RRSP"
                                    />
                                    <Field
                                        label="Item Description"
                                        name="item_description"
                                        value={data.item_description}
                                        onChange={handleChange}
                                        error={errors.item_description}
                                        readOnly
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
                                        placeholder="e.g. 1"
                                    />
                                    <Field
                                        label="Issued Office / Officer"
                                        name="issued_office_officer"
                                        value={data.issued_office_officer}
                                        onChange={handleChange}
                                        error={errors.issued_office_officer}
                                        placeholder="e.g. Admin Office"
                                    />
                                    <Field
                                        label="Returned Qty"
                                        name="returned_qty"
                                        type="number"
                                        value={data.returned_qty}
                                        onChange={handleChange}
                                        error={errors.returned_qty}
                                        placeholder="e.g. 0"
                                    />
                                    <Field
                                        label="Returned Office / Officer"
                                        name="returned_office_officer"
                                        value={data.returned_office_officer}
                                        onChange={handleChange}
                                        error={errors.returned_office_officer}
                                        placeholder="e.g. Records Section"
                                    />
                                    <Field
                                        label="Reissued Qty"
                                        name="reissued_qty"
                                        type="number"
                                        value={data.reissued_qty}
                                        onChange={handleChange}
                                        error={errors.reissued_qty}
                                        placeholder="e.g. 0"
                                    />
                                    <Field
                                        label="Reissued Office / Officer"
                                        name="reissued_office_officer"
                                        value={data.reissued_office_officer}
                                        onChange={handleChange}
                                        error={errors.reissued_office_officer}
                                        placeholder="e.g. Records Section"
                                    />
                                    <Field
                                        label="Disposed Qty"
                                        name="disposed_qty"
                                        type="number"
                                        value={data.disposed_qty}
                                        onChange={handleChange}
                                        error={errors.disposed_qty}
                                        placeholder="e.g. 0"
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
                                        placeholder="e.g. 5"
                                    />
                                    <Field
                                        label="Amount"
                                        name="amount"
                                        type="number"
                                        value={data.amount}
                                        onChange={handleChange}
                                        error={errors.amount}
                                        required
                                        readOnly
                                        placeholder="Auto-filled from RRSP"
                                    />
                                    <Field
                                        label="Remarks"
                                        name="remarks"
                                        value={data.remarks}
                                        onChange={handleChange}
                                        error={errors.remarks}
                                        placeholder="e.g. Fully Depreciated / Beyond Useful Life"
                                    />
                                </div>
                            </div>

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