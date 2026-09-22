import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
}

interface OfficeOption {
    office_code: string;
    office_name: string | null;
}

interface FundClusterOption {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    suppliers: SupplierOption[];
    offices: OfficeOption[];
    fundClusters: FundClusterOption[];
}

const emptyForm: Record<string, string> = {
    wmr_no: '',
    wmr_date: '',
    supplier_id: '',
    iar_no: '',
    iar_date: '',
    item_vehicle: '',
    job_order_no: '',
    job_order_date: '',
    fund_cluster_id: '',
    vehicle_type: '',
    brand_name: '',
    model: '',
    plate_no: '',
    serial_engine_no: '',
    acquisition_date: '',
    property_no: '',
    inspector_name: '',
    inspection_date: '',
    invoice_no: '',
    invoice_date: '',
    defects_complaints: '',
    materials: '',
    labor_cost: '',
    office_code: '',
    requested_by: '',
    received_by: '',
    received_date: '',
    remarks: '',
};

const labelClass = 'mb-1 block text-sm font-medium text-foreground';
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

// Custom Searchable Dropdown (Supplier / Fund / Office)
interface SearchableSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    clearable?: boolean;
    placeholder?: string;
    emptyText?: string;
    options: { value: string; label: string }[];
}

function SearchableSelect({
    label,
    value,
    onChange,
    error,
    required = false,
    clearable = false,
    placeholder = 'Search...',
    emptyText = 'No results found.',
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
                        <span className="truncate">{selectedLabel || placeholder}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                        <CommandInput placeholder={placeholder} />
                        <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <CommandEmpty>{emptyText}</CommandEmpty>
                            <CommandGroup>
                                {clearable && (
                                    <CommandItem
                                        value="__none__"
                                        onSelect={() => {
                                            onChange('');
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                value === '' ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        <span className="text-muted-foreground">None</span>
                                    </CommandItem>
                                )}
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

export default function WmrAddForm({ open, onOpenChange, suppliers, offices, fundClusters }: Props) {
    const [data, setData] = useState<Record<string, string>>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!open) {
            setData(emptyForm);
            setErrors({});
            setProcessing(false);
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post('/wmr-monitoring', data, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
                setData(emptyForm);
                setProcessing(false);
            },
            onError: (errors) => {
                setErrors(errors);
                setProcessing(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[95vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Add WMR Record</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                            <div>
                                <h3 className={sectionTitleClass}>WMR Details</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="wmr_no">WMR No. <span className="text-red-500">*</span></label>
                                        <Input id="wmr_no" name="wmr_no" value={data.wmr_no} onChange={handleChange} placeholder="e.g. 2026010001" />
                                        {errors.wmr_no && <p className="mt-1 text-xs text-red-500">{errors.wmr_no}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="wmr_date">WMR Date <span className="text-red-500">*</span></label>
                                        <Input id="wmr_date" name="wmr_date" type="date" value={data.wmr_date} onChange={handleChange} />
                                        {errors.wmr_date && <p className="mt-1 text-xs text-red-500">{errors.wmr_date}</p>}
                                    </div>
                                    <SearchableSelect
                                        label="Supplier"
                                        value={data.supplier_id}
                                        onChange={(value) => handleSelectChange(value, 'supplier_id')}
                                        error={errors.supplier_id}
                                        clearable
                                        placeholder="Search supplier..."
                                        emptyText="No supplier found."
                                        options={suppliers.map((supplier) => ({
                                            value: String(supplier.supplier_id),
                                            label: supplier.supplier_name,
                                        }))}
                                    />
                                    <div>
                                        <label className={labelClass} htmlFor="iar_no">IAR No.</label>
                                        <Input id="iar_no" name="iar_no" value={data.iar_no} onChange={handleChange} placeholder="e.g. FOR REFERENCE ONLY" />
                                        {errors.iar_no && <p className="mt-1 text-xs text-red-500">{errors.iar_no}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="iar_date">IAR Date</label>
                                        <Input id="iar_date" name="iar_date" type="date" value={data.iar_date} onChange={handleChange} />
                                        {errors.iar_date && <p className="mt-1 text-xs text-red-500">{errors.iar_date}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="item_vehicle">Item / Vehicle <span className="text-red-500">*</span></label>
                                        <Input id="item_vehicle" name="item_vehicle" value={data.item_vehicle} onChange={handleChange} placeholder="e.g. ISUZU EXTREME SHA 157" />
                                        {errors.item_vehicle && <p className="mt-1 text-xs text-red-500">{errors.item_vehicle}</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className={sectionTitleClass}>Job Order</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="job_order_no">Job Order No.</label>
                                        <Input id="job_order_no" name="job_order_no" value={data.job_order_no} onChange={handleChange} placeholder="e.g. M0-47-12-25" />
                                        {errors.job_order_no && <p className="mt-1 text-xs text-red-500">{errors.job_order_no}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="job_order_date">Job Order Date</label>
                                        <Input id="job_order_date" name="job_order_date" type="date" value={data.job_order_date} onChange={handleChange} />
                                        {errors.job_order_date && <p className="mt-1 text-xs text-red-500">{errors.job_order_date}</p>}
                                    </div>
                                    <SearchableSelect
                                        label="Fund"
                                        value={data.fund_cluster_id}
                                        onChange={(value) => handleSelectChange(value, 'fund_cluster_id')}
                                        error={errors.fund_cluster_id}
                                        clearable
                                        placeholder="Search fund..."
                                        emptyText="No fund cluster found."
                                        options={fundClusters.map((fund) => ({
                                            value: fund.fund_cluster_id,
                                            label: fund.fund_description
                                                ? `${fund.fund_cluster_id} — ${fund.fund_description}`
                                                : fund.fund_cluster_id,
                                        }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <h3 className={sectionTitleClass}>Item / Vehicle Details</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="vehicle_type">Type</label>
                                        <Input id="vehicle_type" name="vehicle_type" value={data.vehicle_type} onChange={handleChange} placeholder="e.g. PICK UP, SUV, WAGON" />
                                        {errors.vehicle_type && <p className="mt-1 text-xs text-red-500">{errors.vehicle_type}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="brand_name">Brand Name</label>
                                        <Input id="brand_name" name="brand_name" value={data.brand_name} onChange={handleChange} placeholder="e.g. ISUZU" />
                                        {errors.brand_name && <p className="mt-1 text-xs text-red-500">{errors.brand_name}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="model">Model</label>
                                        <Input id="model" name="model" value={data.model} onChange={handleChange} placeholder="e.g. Isuzu Extreme" />
                                        {errors.model && <p className="mt-1 text-xs text-red-500">{errors.model}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="plate_no">Plate No.</label>
                                        <Input id="plate_no" name="plate_no" value={data.plate_no} onChange={handleChange} placeholder="e.g. SHA 157" />
                                        {errors.plate_no && <p className="mt-1 text-xs text-red-500">{errors.plate_no}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="serial_engine_no">Serial / Engine No.</label>
                                        <Input id="serial_engine_no" name="serial_engine_no" value={data.serial_engine_no} onChange={handleChange} placeholder="e.g. EN-PA2942" />
                                        {errors.serial_engine_no && <p className="mt-1 text-xs text-red-500">{errors.serial_engine_no}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="acquisition_date">Acquisition Date</label>
                                        <Input id="acquisition_date" name="acquisition_date" value={data.acquisition_date} onChange={handleChange} placeholder="e.g. 2018 or 04/10/1996" />
                                        {errors.acquisition_date && <p className="mt-1 text-xs text-red-500">{errors.acquisition_date}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="property_no">Property No.</label>
                                        <Input id="property_no" name="property_no" value={data.property_no} onChange={handleChange} placeholder="e.g. 164-2018070044" />
                                        {errors.property_no && <p className="mt-1 text-xs text-red-500">{errors.property_no}</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className={sectionTitleClass}>Inspection &amp; Invoice</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="inspector_name">Inspector Name</label>
                                        <Input id="inspector_name" name="inspector_name" value={data.inspector_name} onChange={handleChange} placeholder="e.g. Orvil M. Basug" />
                                        {errors.inspector_name && <p className="mt-1 text-xs text-red-500">{errors.inspector_name}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="inspection_date">Inspection Date</label>
                                        <Input id="inspection_date" name="inspection_date" type="date" value={data.inspection_date} onChange={handleChange} />
                                        {errors.inspection_date && <p className="mt-1 text-xs text-red-500">{errors.inspection_date}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="invoice_no">Invoice No.</label>
                                        <Input id="invoice_no" name="invoice_no" value={data.invoice_no} onChange={handleChange} placeholder="Separate multiple with commas" />
                                        {errors.invoice_no && <p className="mt-1 text-xs text-red-500">{errors.invoice_no}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="invoice_date">Invoice Date</label>
                                        <Input id="invoice_date" name="invoice_date" value={data.invoice_date} onChange={handleChange} placeholder="Separate multiple with commas" />
                                        {errors.invoice_date && <p className="mt-1 text-xs text-red-500">{errors.invoice_date}</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className={sectionTitleClass}>Replacement &amp; Cost</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="defects_complaints">Defects / Complaints</label>
                                        <textarea id="defects_complaints" name="defects_complaints" value={data.defects_complaints} onChange={handleChange} rows={3} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. OIL FILTER, FUEL FILTER" />
                                        {errors.defects_complaints && <p className="mt-1 text-xs text-red-500">{errors.defects_complaints}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="materials">Replaced Materials</label>
                                        <textarea id="materials" name="materials" value={data.materials} onChange={handleChange} rows={3} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="One item per line" />
                                        {errors.materials && <p className="mt-1 text-xs text-red-500">{errors.materials}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="labor_cost">Labor Cost (₱)</label>
                                        <Input id="labor_cost" name="labor_cost" type="number" step="0.01" min="0" value={data.labor_cost} onChange={handleChange} placeholder="0.00" />
                                        {errors.labor_cost && <p className="mt-1 text-xs text-red-500">{errors.labor_cost}</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className={sectionTitleClass}>Request &amp; Receipt</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SearchableSelect
                                        label="Office"
                                        value={data.office_code}
                                        onChange={(value) => handleSelectChange(value, 'office_code')}
                                        error={errors.office_code}
                                        clearable
                                        placeholder="Search office..."
                                        emptyText="No office found."
                                        options={offices.map((office) => ({
                                            value: office.office_code,
                                            label: office.office_name ?? office.office_code,
                                        }))}
                                    />
                                    <div>
                                        <label className={labelClass} htmlFor="requested_by">Requested By</label>
                                        <Input id="requested_by" name="requested_by" value={data.requested_by} onChange={handleChange} placeholder="e.g. Rhum June Alaba" />
                                        {errors.requested_by && <p className="mt-1 text-xs text-red-500">{errors.requested_by}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="received_by">Received By</label>
                                        <Input id="received_by" name="received_by" value={data.received_by} onChange={handleChange} />
                                        {errors.received_by && <p className="mt-1 text-xs text-red-500">{errors.received_by}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="received_date">Date Received</label>
                                        <Input id="received_date" name="received_date" type="date" value={data.received_date} onChange={handleChange} />
                                        {errors.received_date && <p className="mt-1 text-xs text-red-500">{errors.received_date}</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="remarks">Remarks</label>
                                <textarea id="remarks" name="remarks" value={data.remarks} onChange={handleChange} rows={2} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                {errors.remarks && <p className="mt-1 text-xs text-red-500">{errors.remarks}</p>}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                                <Button type="submit" disabled={processing} style={{ backgroundColor: '#612A35' }}>
                                    {processing ? 'Saving...' : 'Save Record'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}