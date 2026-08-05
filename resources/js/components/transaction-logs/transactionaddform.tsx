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
    description: string | null;
    units?: {
        unitID: number;
        pivot?: {
            is_default: boolean;
        };
    }[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

const getEmptyForm = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return {
        transaction_type: '',
        fund_cluster: '',
        transaction_date: `${year}-${month}-${day}`,
        item_name: '',
        description: '',
        unitID: '',
        reference: '',
        quantity: '0',
        office_code: '',
    };
};

export default function TransactionAddForm({
    open,
    onOpenChange,
    units,
    fundClusters,
    offices,
    stockItems,
}: Props) {
    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['stockItems', 'fundClusters', 'offices'],
            onFinish: () => setRefreshingField(null),
        });
    };

    const [data, setData] = useState(getEmptyForm());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    // Tracks the selected stock item by its unique stock_no, since
    // item_name alone can collide (e.g. two "RTX 3060" variants with
    // different descriptions). Never sent to the backend — item_name
    // and description are what's actually submitted.
    const [selectedStockNo, setSelectedStockNo] = useState('');

    // States for consecutive saves
    const [submitAction, setSubmitAction] = useState<'close' | 'continue'>('close');
    const [savedCount, setSavedCount] = useState(0);

    useEffect(() => {
        if (open) {
            setData(getEmptyForm());
            setErrors({});
            setSubmitAction('close');
            setSavedCount(0); // Reset the count every time the modal opens
            setSelectedStockNo('');
        }
    }, [open]);

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
        setProcessing(true);

        router.post('/transaction-logs', data, {
            onSuccess: () => {
                setSavedCount((prev) => prev + 1); // Increment count on success

                if (submitAction === 'close') {
                    onOpenChange(false);
                    setData(getEmptyForm());
                    setSelectedStockNo('');
                } else {
                    setData((prev) => ({
                        ...prev,
                        item_name: '',
                        description: '',
                        unitID: '',
                        quantity: '0',
                    }));
                    setSelectedStockNo('');
                }
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Add Transaction Log Record</DialogTitle>
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
                                        value={selectedStockNo}
                                        onChange={(val) => {
                                            const selectedItem = stockItems.find((s) => s.stock_no === val);

                                            let defaultUnitID = '';
                                            if (selectedItem?.units && selectedItem.units.length > 0) {
                                                const defUnit =
                                                    selectedItem.units.find((u) => u.pivot?.is_default) ||
                                                    selectedItem.units[0];
                                                defaultUnitID = String(defUnit.unitID);
                                            }

                                            setSelectedStockNo(val);
                                            setData((prev) => ({
                                                ...prev,
                                                item_name: selectedItem?.item_name ?? '',
                                                description: selectedItem?.description ?? '',
                                                unitID: defaultUnitID,
                                            }));
                                        }}
                                        error={errors.item_name}
                                        required
                                        placeholder="Search & Select Item..."
                                        options={stockItems.map((item) => ({
                                            value: item.stock_no,
                                            label: item.description
                                                ? `${item.item_name} - ${item.description}`
                                                : item.item_name,
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

                            {/* Footer / Actions */}
                            <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    {savedCount > 0 && (
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-md">
                                            <Check className="size-4" />
                                            {savedCount} transaction(s) saved.
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Cancel
                                    </Button>

                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={processing}
                                        onClick={() => setSubmitAction('continue')}
                                        className="border-[#612A35] text-[#612A35] hover:bg-[#612A35] hover:text-white"
                                    >
                                        {processing && submitAction === 'continue' ? 'Saving...' : '+ Save Transaction'}
                                    </Button>

                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        style={{ backgroundColor: '#612A35' }}
                                        onClick={() => setSubmitAction('close')}
                                    >
                                        {processing && submitAction === 'close' ? 'Saving...' : 'Save Transaction'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}