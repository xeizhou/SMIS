import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { RefreshCw, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { ForDisposalMonitoring } from '@/pages/for-disposal-monitoring/index';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: ForDisposalMonitoring | null;
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

export default function ForDisposalEditForm({
    open,
    onOpenChange,
    item,
    preRepairs,
}: Props) {
    const [data, setData] = useState({
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
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['preRepairs'],
            onFinish: () => setRefreshingField(null),
        });
    };

    useEffect(() => {
        if (open && item) {
            setErrors({});
            setData({
                transaction_no: item.transaction_no || '',
                pre_repair_no: item.pre_repair_no || '',
                from_accountable_officer: item.from_accountable_officer || '',
                to_accountable_officer: item.to_accountable_officer || '',
                property_no: item.property_no || '',
                description: item.description || '',
                amount: item.amount ? item.amount.toString() : '',
                condition_of_ppe: item.condition_of_ppe || '',
                remarks: item.remarks || '',
                location: item.location || '',
            });
        }
    }, [open, item]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        setData({
            ...data,
            [name]: value,
        });
    };

    // Dedicated handler for the SearchableSelect to auto-fill the form
    const handlePreRepairChange = (value: string) => {
        const selectedPre = preRepairs.find((pre) => pre.pre_repair_no === value);
        
        if (selectedPre) {
            let condition = selectedPre.condition_of_ppe || '';
            if (condition.toLowerCase() === 'serviceable') condition = 'Serviceable';
            if (condition.toLowerCase() === 'unserviceable') condition = 'Unserviceable';

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

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!item) {
            return;
        }

        // ALWAYS show modal since all fields cascade
        if (e) {
            setShowConfirmModal(true);
            return;
        }

        setProcessing(true);

        router.put(`/for-disposal-monitoring/${item.id}`, data, {
            onSuccess: () => {
                onOpenChange(false);
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit For Disposal Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field
                            label="Transaction No."
                            name="transaction_no"
                            value={data.transaction_no}
                            onChange={handleChange}
                            error={errors.transaction_no}
                            required
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

                        <TextareaField
                            label="Description"
                            name="description"
                            value={data.description}
                            onChange={handleChange}
                            error={errors.description}
                            required
                        />

                        <Field
                            label="Property No."
                            name="property_no"
                            value={data.property_no}
                            onChange={handleChange}
                            error={errors.property_no}
                            required
                        />
                        <Field
                            label="Amount"
                            name="amount"
                            type="number"
                            value={data.amount}
                            onChange={handleChange}
                            error={errors.amount}
                            required
                        />
                        <div>
                            <label className={labelClass}>
                                Condition of PPE
                                <span className="text-red-500"> *</span>
                            </label>
                            <select
                                name="condition_of_ppe"
                                value={data.condition_of_ppe}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select Condition</option>
                                <option value="Serviceable">Serviceable</option>
                                <option value="Unserviceable">Unserviceable</option>
                            </select>
                            {errors.condition_of_ppe && <p className="mt-1 text-xs text-red-500">{errors.condition_of_ppe}</p>}
                        </div>
                        
                        {data.condition_of_ppe === 'Unserviceable' && (
                            <TextareaField
                                label="Remarks / Findings"
                                name="remarks"
                                value={data.remarks}
                                onChange={handleChange}
                                error={errors.remarks}
                            />
                        )}
                        
                        <Field
                            label="Location"
                            name="location"
                            value={data.location}
                            onChange={handleChange}
                            error={errors.location}
                            required
                        />
                        <Field
                            label="From Accountable Officer"
                            name="from_accountable_officer"
                            value={data.from_accountable_officer}
                            onChange={handleChange}
                            error={errors.from_accountable_officer}
                            required
                        />
                        <Field
                            label="To Accountable Officer"
                            name="to_accountable_officer"
                            value={data.to_accountable_officer}
                            onChange={handleChange}
                            error={errors.to_accountable_officer}
                            required
                        />
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
                            disabled={processing}
                            style={{ backgroundColor: '#612A35' }}
                            className="text-white"
                        >
                            {processing ? 'Saving...' : 'Save Record'}
                        </Button>
                    </div>
                </form>
            </DialogContent>

            {/* Confirmation Modal */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Update</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-sm text-foreground">
                        <p className="font-semibold text-red-600">Warning:</p>
                        {item && (data.transaction_no !== item.transaction_no || data.pre_repair_no !== item.pre_repair_no || data.property_no !== item.property_no) ? (
                            <p>Changing the <strong>Transaction No.</strong>, <strong>Pre-Repair No.</strong> or <strong>Property No.</strong> will modify this record's primary identifiers.</p>
                        ) : (
                            <p>Updating this record will also modify the linked record in Pre-Repair.</p>
                        )}
                        <p className="mt-2">Are you sure you want to proceed with this change?</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowConfirmModal(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setShowConfirmModal(false);
                                handleSubmit();
                            }}
                            disabled={processing}
                            style={{ backgroundColor: '#612A35' }}
                            className="text-white"
                        >
                            {processing ? 'Updating...' : 'Yes, Proceed'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}   