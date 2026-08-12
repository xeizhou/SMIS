import { router } from '@inertiajs/react';
import { useState } from 'react';
import { RefreshCw, Check, ChevronsUpDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Alert } from '@/components/ui/alert';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preRepairs: any[];
}

interface FieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    type?: string;
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

interface LockedFieldProps {
    label: string;
    value: string;
    error?: string;
    placeholder?: string;
}

function LockedField({ label, value, error, placeholder = 'Auto-filled from Pre-Repair' }: LockedFieldProps) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <Input
                value={value}
                disabled
                placeholder={placeholder}
                className="bg-muted text-muted-foreground"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function LockedTextareaField({ label, value, error, placeholder = 'Auto-filled from Pre-Repair' }: LockedFieldProps) {
    return (
        <div className="md:col-span-2 lg:col-span-4">
            <label className={labelClass}>{label}</label>
            <Textarea
                value={value}
                disabled
                placeholder={placeholder}
                className="bg-muted text-muted-foreground"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

// Custom Searchable Dropdown with refresh support
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

const emptyForm = {
    transaction_no: '',
    pre_repair_no: '',
    from_accountable_officer: '',
    to_accountable_officer: '',
    property_no: '',
    description: '',
    amount: '',
    condition_of_ppe: '',
    remarks: '',
    location: '',
};

export default function ForDisposalAddForm({ open, onOpenChange, preRepairs }: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['preRepairs'],
            onFinish: () => setRefreshingField(null),
        });
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        setData({
            ...data,
            [name]: value,
        });
    };

    // Dedicated handler for SearchableSelect to trigger auto-fill bindings
    const handlePreRepairChange = (value: string) => {
        const selectedPre = preRepairs.find((pre) => pre.pre_repair_no === value);
        
        if (selectedPre) {
            let condition = selectedPre.condition_of_ppe || '';
            if (condition.toLowerCase() === 'serviceable') condition = 'SERVICEABLE';
            if (condition.toLowerCase() === 'unserviceable') condition = 'UNSERVICEABLE';

            setData({
                ...data,
                pre_repair_no: value,
                transaction_no: selectedPre.transaction_no || '',
                property_no: selectedPre.property_no || '',
                description: selectedPre.description || '',
                amount: selectedPre.amount ? selectedPre.amount.toString() : '',
                condition_of_ppe: condition,
                remarks: selectedPre.remarks || '',
                location: selectedPre.location || '',
                from_accountable_officer: selectedPre.from_accountable_officer || '',
                to_accountable_officer: selectedPre.to_accountable_officer || '',
            });
        } else {
            setData({
                ...data,
                pre_repair_no: value,
            });
        }
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post('/for-disposal-monitoring', data, {
            onSuccess: () => {
                onOpenChange(false);
                setData(emptyForm);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-h-[95vh] p-0 overflow-hidden"
                style={{ maxWidth: '1200px' }}
            >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Add For Disposal Record</DialogTitle>
                        </DialogHeader>

                        <Alert className="border-red-200 bg-red-50 text-red-800 mt-4 flex items-center gap-2 py-3 px-4 [&>svg]:text-red-800">
                            <Info className="size-4 shrink-0" />
                            <div className="text-sm flex flex-wrap items-center gap-1">
                                <span className="font-semibold">REMINDER:</span>
                                <span>needs an existing Pre-Repair No. to autofill some fields.</span>
                            </div>
                        </Alert>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                            {/* Section: General Information */}
                            <div>
                                <h3 className={sectionTitleClass}>General Information</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <LockedField
                                        label="Transaction No."
                                        value={data.transaction_no}
                                        error={errors.transaction_no}
                                    />
                                    
                                    <SearchableSelect
                                        label="Pre-Repair No."
                                        value={data.pre_repair_no}
                                        onChange={handlePreRepairChange}
                                        error={errors.pre_repair_no}
                                        required
                                        placeholder="Search Pre-Repair No..."
                                        options={preRepairs.map((pre) => ({
                                            value: pre.pre_repair_no,
                                            label: `${pre.pre_repair_no} - ${pre.property_no}`,
                                        }))}
                                        onRefresh={() => handleRefreshData('preRepairs')}
                                        isRefreshing={refreshingField === 'preRepairs'}
                                    />

                                    <LockedField
                                        label="Property No."
                                        value={data.property_no}
                                        error={errors.property_no}
                                    />
                                    <LockedTextareaField
                                        label="Description"
                                        value={data.description}
                                        error={errors.description}
                                    />
                                </div>
                            </div>

                            {/* Section: Assessment & Location */}
                            <div>
                                <h3 className={sectionTitleClass}>Assessment & Location</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <LockedField
                                        label="Location"
                                        value={data.location}
                                        error={errors.location}
                                    />
                                    <LockedField
                                        label="Amount"
                                        value={data.amount}
                                        error={errors.amount}
                                    />
                                    <div>
                                        <label className={labelClass}>
                                            Condition of PPE
                                            <span className="text-red-500"> *</span>
                                        </label>
                                        <Select value={data.condition_of_ppe} onValueChange={handleSelectChange('condition_of_ppe')}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select Condition" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SERVICEABLE">SERVICEABLE</SelectItem>
                                                <SelectItem value="UNSERVICEABLE">UNSERVICEABLE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.condition_of_ppe && <p className="mt-1 text-xs text-red-500">{errors.condition_of_ppe}</p>}
                                    </div>
                                    
                                    {data.condition_of_ppe === 'UNSERVICEABLE' && (
                                        <div className="md:col-span-2 lg:col-span-4">
                                            <TextareaField
                                                label="Remarks / Findings"
                                                name="remarks"
                                                value={data.remarks}
                                                onChange={handleChange}
                                                error={errors.remarks}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section: Accountability */}
                            <div>
                                <h3 className={sectionTitleClass}>Accountability</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <LockedField
                                        label="From Accountable Officer"
                                        value={data.from_accountable_officer}
                                        error={errors.from_accountable_officer}
                                    />
                                    <LockedField
                                        label="To Accountable Officer"
                                        value={data.to_accountable_officer}
                                        error={errors.to_accountable_officer}
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
                                    style={{ backgroundColor: '#370001' }}
                                    className="text-white"
                                >
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