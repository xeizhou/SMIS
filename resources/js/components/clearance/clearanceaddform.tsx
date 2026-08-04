import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface OfficeOption {
    office_code: string;
    office_name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    offices: OfficeOption[];
}

const emptyForm: Record<string, string> = {
    name: '',
    office: '',
    claim_date: '',
    received_by: '',
    status: '',
    cleared: '',
    pending: '',
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

export default function ClearanceAddForm({ open, onOpenChange, offices }: Props) {
    const [data, setData] = useState<Record<string, string>>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) {
            setData(emptyForm);
            setErrors({});
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    const handleBooleanSelectChange = (value: string, name: 'cleared' | 'pending') => {
        const nextValue = value === 'true';

        setData((prev) => {
            if (name === 'cleared') {
                return {
                    ...prev,
                    cleared: nextValue ? 'true' : 'false',
                    pending: nextValue ? 'false' : prev.pending,
                };
            }

            return {
                ...prev,
                pending: nextValue ? 'true' : 'false',
                cleared: nextValue ? 'false' : prev.cleared,
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...data,
            cleared: data.cleared === 'true',
            pending: data.pending === 'true',
        };

        router.post('/clearance', payload, {
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
                    <DialogTitle>Add Clearance Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Section: Requester Information */}
                    <div>
                        <h3 className={sectionTitleClass}>Requester Information</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className={labelClass} htmlFor="name">Name <span className="text-red-500">*</span></label>
                                <Input id="name" name="name" value={data.name} onChange={handleChange} placeholder="Enter full name" />
                                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <SearchableSelect
                                label="Office"
                                value={data.office}
                                onChange={(value) => handleSelectChange(value, 'office')}
                                error={errors.office}
                                required
                                placeholder="Search office..."
                                options={offices.map((office) => ({
                                    value: office.office_code,
                                    label: office.office_code,
                                }))}
                            />

                            <div>
                                <label className={labelClass} htmlFor="claim_date">Claim Date <span className="text-red-500">*</span></label>
                                <Input id="claim_date" type="date" name="claim_date" value={data.claim_date} onChange={handleChange} />
                                {errors.claim_date && <p className="mt-1 text-xs text-red-500">{errors.claim_date}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section: Processing Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Processing Details</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={labelClass} htmlFor="received_by">Received By <span className="text-red-500">*</span></label>
                                <Input id="received_by" name="received_by" value={data.received_by} onChange={handleChange} placeholder="Enter receiver name" />
                                {errors.received_by && <p className="mt-1 text-xs text-red-500">{errors.received_by}</p>}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="status">Status <span className="text-red-500">*</span></label>
                                <Input id="status" name="status" value={data.status} onChange={handleChange} placeholder="e.g. Retired" />
                                {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status}</p>}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="cleared">Cleared <span className="text-red-500">*</span></label>
                                <Select value={data.cleared} onValueChange={(value) => handleBooleanSelectChange(value, 'cleared')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select cleared" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">True</SelectItem>
                                        <SelectItem value="false">False</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.cleared && <p className="mt-1 text-xs text-red-500">{errors.cleared}</p>}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="pending">Pending <span className="text-red-500">*</span></label>
                                <Select value={data.pending} onValueChange={(value) => handleBooleanSelectChange(value, 'pending')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select pending" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">True</SelectItem>
                                        <SelectItem value="false">False</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.pending && <p className="mt-1 text-xs text-red-500">{errors.pending}</p>}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="remarks">Remarks</label>
                        <textarea id="remarks" name="remarks" value={data.remarks} onChange={handleChange} rows={3} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Add any remarks or notes" />
                        {errors.remarks && <p className="mt-1 text-xs text-red-500">{errors.remarks}</p>}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" style={{ backgroundColor: '#612A35' }}>Save Record</Button>
                    </div>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}