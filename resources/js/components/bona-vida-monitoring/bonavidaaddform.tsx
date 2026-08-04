import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Office {
    office_code: string;
    office_name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    offices: Office[];
}

const emptyForm: Record<string, string> = {
    date_received: '',
    office_code: '',
    qty: '',
    price: '',
    total_amount: '',
    invoice_no: '',
    invoice_date: '',
    remarks: '',
};

const labelClass = 'mb-1 block text-sm font-medium text-foreground';
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

// Custom Searchable Dropdown for Office
interface SearchableSelectProps {
    label: string;
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
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

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
                            <CommandEmpty>No office found.</CommandEmpty>
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

export default function BonaVidaAddForm({ open, onOpenChange, offices }: Props) {
    const [data, setData] = useState<Record<string, string>>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) {
            setData(emptyForm);
            setErrors({});
        }
    }, [open]);

    // Automatically calculate total amount when qty or price changes
    useEffect(() => {
        const qty = parseFloat(data.qty) || 0;
        const price = parseFloat(data.price) || 0;
        if (qty > 0 || price > 0) {
            setData((prev) => ({ ...prev, total_amount: (qty * price).toFixed(2) }));
        }
    }, [data.qty, data.price]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSelectChange = (value: string, name: string) => {
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        router.post('/bona-vida-monitoring', data, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Add Bona Vida Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Section: General Information */}
                    <div>
                        <h3 className={sectionTitleClass}>General Information</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={labelClass} htmlFor="date_received">
                                    Date Received <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="date_received"
                                    name="date_received"
                                    type="date"
                                    value={data.date_received}
                                    onChange={handleChange}
                                />
                                {errors.date_received && (
                                    <p className="mt-1 text-xs text-red-500">{errors.date_received}</p>
                                )}
                            </div>

                            <SearchableSelect
                                label="Office"
                                value={data.office_code}
                                onChange={(value) => handleSelectChange(value, 'office_code')}
                                error={errors.office_code}
                                required
                                placeholder="Search office..."
                                options={offices.map((office) => ({
                                    value: office.office_code,
                                    label: office.office_name,
                                }))}
                            />

                            <div className="md:col-span-2">
                                <label className={labelClass} htmlFor="remarks">
                                    Remarks
                                </label>
                                <Input
                                    id="remarks"
                                    name="remarks"
                                    value={data.remarks}
                                    onChange={handleChange}
                                    placeholder="Enter remarks"
                                />
                                {errors.remarks && (
                                    <p className="mt-1 text-xs text-red-500">{errors.remarks}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Pricing Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Pricing Details</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className={labelClass} htmlFor="qty">
                                    Quantity <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="qty"
                                    name="qty"
                                    type="number"
                                    min="1"
                                    value={data.qty}
                                    onChange={handleChange}
                                    placeholder="Enter quantity"
                                />
                                {errors.qty && (
                                    <p className="mt-1 text-xs text-red-500">{errors.qty}</p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="price">
                                    Price <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="price"
                                    name="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.price}
                                    onChange={handleChange}
                                    placeholder="Enter price"
                                />
                                {errors.price && (
                                    <p className="mt-1 text-xs text-red-500">{errors.price}</p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="total_amount">
                                    Total Amount <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="total_amount"
                                    name="total_amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.total_amount}
                                    onChange={handleChange}
                                    placeholder="Auto calculated"
                                />
                                {errors.total_amount && (
                                    <p className="mt-1 text-xs text-red-500">{errors.total_amount}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Invoice Information */}
                    <div>
                        <h3 className={sectionTitleClass}>Invoice Information</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={labelClass} htmlFor="invoice_no">
                                    Invoice No <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="invoice_no"
                                    name="invoice_no"
                                    value={data.invoice_no}
                                    onChange={handleChange}
                                    placeholder="Enter invoice number"
                                />
                                {errors.invoice_no && (
                                    <p className="mt-1 text-xs text-red-500">{errors.invoice_no}</p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="invoice_date">
                                    Invoice Date <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="invoice_date"
                                    name="invoice_date"
                                    type="date"
                                    value={data.invoice_date}
                                    onChange={handleChange}
                                />
                                {errors.invoice_date && (
                                    <p className="mt-1 text-xs text-red-500">{errors.invoice_date}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" style={{ backgroundColor: '#612A35' }}>
                            Save Record
                        </Button>
                    </div>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}