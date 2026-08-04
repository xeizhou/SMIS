import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, RefreshCw } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
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

interface Office {
    office_code: string;
    office_name: string;
    entity_name: string;
}

interface StockItem {
    stock_no: string;
    item_name: string;
    units?: {
        unitID: number;
        pivot?: {
            is_default: boolean;
        };
    }[];
}

interface Transaction {
    transactionID: number;
    transaction_type: string;
    fund_cluster: string | FundCluster;
    fund_cluster_detail: FundCluster | null;
    transaction_date: string;
    item_name: string;
    unitID: number;
    reference: string;
    quantity: number;
    office_code: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction | null;
    units: Unit[];
    fundClusters: FundCluster[];
    offices: Office[];
    stockItems: StockItem[];
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
    onRefresh?: () => void;
    isRefreshing?: boolean;
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
    onRefresh,
    isRefreshing = false,
}: FieldProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-foreground">
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

            <Input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                min={min}
            />

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
    disabled?: boolean;
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
    disabled = false,
    options,
    onRefresh,
    isRefreshing = false,
}: SelectFieldProps) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <Select value={value} onValueChange={onChange} disabled={disabled}>
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

// Custom Searchable Dropdown
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

const TRANSACTION_TYPE_OPTIONS = [
    { value: 'ISSUE', label: 'ISSUE' },
    { value: 'RECEIVE', label: 'RECEIVE' },
];

const emptyForm = {
    transaction_type: '',
    fund_cluster: '',
    transaction_date: '',
    item_name: '',
    unitID: '',
    reference: '',
    quantity: '0',
    office_code: '',
};

export default function TransactionEditForm({
    open,
    onOpenChange,
    transaction,
    units,
    fundClusters,
    offices,
    stockItems,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (transaction) {
            const fundClusterId =
                transaction.fund_cluster_detail?.fund_cluster_id ??
                (typeof transaction.fund_cluster === 'string'
                    ? transaction.fund_cluster
                    : transaction.fund_cluster?.fund_cluster_id) ??
                '';

            setData({
                transaction_type: transaction.transaction_type,
                fund_cluster: fundClusterId,
                transaction_date: transaction.transaction_date?.slice(0, 10) ?? '',
                item_name: transaction.item_name,
                unitID: String(transaction.unitID),
                reference: transaction.reference,
                quantity: String(transaction.quantity),
                office_code: transaction.office_code,
            });
            setErrors({});
        }
    }, [transaction]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;

        if (type === 'number' && value !== '' && Number(value) < 0) {
            return;
        }

        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!transaction) {
            return;
        }

        setProcessing(true);

        router.put(`/transaction-logs/${transaction.transactionID}`, data, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    if (!transaction) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Edit Transaction Log Record — {transaction?.transactionID}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Section: General Information */}
                    <div>
                        <h3 className={sectionTitleClass}>General Information</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <SelectField
                                label="Transaction Type"
                                value={data.transaction_type}
                                onChange={handleSelectChange('transaction_type')}
                                error={errors.transaction_type}
                                required
                                placeholder="-- Select Type --"
                                options={TRANSACTION_TYPE_OPTIONS}
                            />
                            <Field
                                label="Transaction Date"
                                name="transaction_date"
                                type="date"
                                value={data.transaction_date}
                                onChange={handleChange}
                                error={errors.transaction_date}
                                required
                            />
                            <Field
                                label="Reference"
                                name="reference"
                                value={data.reference}
                                onChange={handleChange}
                                error={errors.reference}
                                required
                                placeholder="e.g. RIS No. or PO No."
                            />
                        </div>
                    </div>

                    {/* Section: Item Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Item Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <SearchableSelect
                                label="Item Name"
                                value={data.item_name}
                                onChange={(val) => {
                                    const selectedItem = stockItems.find((s) => s.item_name === val);

                                    let defaultUnitID = '';
                                    if (selectedItem?.units && selectedItem.units.length > 0) {
                                        const defUnit =
                                            selectedItem.units.find((u) => u.pivot?.is_default) ||
                                            selectedItem.units[0];
                                        defaultUnitID = String(defUnit.unitID);
                                    }

                                    setData((prev) => ({
                                        ...prev,
                                        item_name: val,
                                        unitID: defaultUnitID,
                                    }));
                                }}
                                error={errors.item_name}
                                required
                                placeholder="Search & Select Item..."
                                options={stockItems.map((item) => ({
                                    value: item.item_name,
                                    label: item.item_name,
                                }))}
                            />
                            <SelectField
                                label="Unit"
                                value={data.unitID}
                                onChange={handleSelectChange('unitID')}
                                error={errors.unitID}
                                required
                                disabled
                                placeholder="-- Select Unit --"
                                options={Array.from(
                                    new Map(
                                        units.map((unit) => [
                                            String(unit.unitID),
                                            {
                                                value: String(unit.unitID),
                                                label: `${unit.unit_name} (${unit.unit_short_name})`,
                                            },
                                        ])
                                    ).values()
                                )}
                            />
                            <Field
                                label="Quantity"
                                name="quantity"
                                type="number"
                                min="0"
                                value={data.quantity}
                                onChange={handleChange}
                                error={errors.quantity}
                                required
                            />
                        </div>
                    </div>

                    {/* Section: Allocation */}
                    <div>
                        <h3 className={sectionTitleClass}>Allocation</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <SelectField
                                label="Fund Cluster"
                                value={data.fund_cluster}
                                onChange={handleSelectChange('fund_cluster')}
                                error={errors.fund_cluster}
                                required
                                placeholder="-- Select Fund Cluster --"
                                options={fundClusters.map((fc) => ({
                                    value: fc.fund_cluster_id,
                                    label: `${fc.fund_cluster_id} - ${fc.fund_description}`,
                                }))}
                            />
                            <SearchableSelect
                                label="Office"
                                value={data.office_code}
                                onChange={handleSelectChange('office_code')}
                                error={errors.office_code}
                                required
                                placeholder="Search office..."
                                options={offices.map((office) => ({
                                    value: office.office_code,
                                    label: `${office.office_code}`,
                                }))}
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
                            style={{ backgroundColor: '#612A35' }}
                        >
                            {processing ? 'Saving...' : 'Update Transaction'}
                        </Button>
                    </div>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}