import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    fund_cluster_detail: FundCluster | null; // <-- Changed this line from ?: to | null
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
}

const labelClass = 'mb-1 block text-sm text-foreground';

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

// Custom Searchable Dropdown for Items
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
    const [search, setSearch] = useState('');

    const filtered = options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative">
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            <div
                className={`flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer ${
                    error ? 'border-red-500' : 'border-input'
                }`}
                onClick={() => setOpen(!open)}
            >
                <span className="truncate">
                    {options.find((o) => o.value === value)?.label || placeholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </div>
            {open && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                    ></div>
                    <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                        <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Search item..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto p-1">
                            {filtered.length === 0 ? (
                                <div className="py-6 text-center text-sm">No item found.</div>
                            ) : (
                                filtered.map((opt) => (
                                    <div
                                        key={opt.value}
                                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                            setSearch('');
                                        }}
                                    >
                                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                            {value === opt.value && <Check className="h-4 w-4" />}
                                        </span>
                                        {opt.label}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
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

    const isUnitDisabled = stockItems.some((s) => s.item_name === data.item_name);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-h-[90vh] overflow-y-auto"
                style={{ maxWidth: '700px' }}
            >
                <DialogHeader>
                    <DialogTitle>
                        Edit Transaction #{transaction.transactionID}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="grid grid-cols-2 gap-10 w-full">
                        {/* Left column */}
                        <div className="space-y-5">
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

                            <SearchableSelect
                                label="Item Name"
                                value={data.item_name}
                                onChange={(val) => {
                                    // Auto-fill logic updated for multiple units
                                    const selectedItem = stockItems.find((s) => s.item_name === val);
                                    
                                    let defaultUnitID = '';
                                    if (selectedItem?.units && selectedItem.units.length > 0) {
                                        // Find the default unit, or fallback to the first one
                                        const defUnit = selectedItem.units.find(u => u.pivot?.is_default) || selectedItem.units[0];
                                        defaultUnitID = String(defUnit.unitID);
                                    }

                                    setData((prev) => ({
                                        ...prev,
                                        item_name: val,
                                        ...(defaultUnitID ? { unitID: defaultUnitID } : {}),
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
                                disabled={isUnitDisabled}
                                placeholder="-- Select Unit --"
                                options={units.map((unit) => ({
                                    value: String(unit.unitID),
                                    label: `${unit.unit_name} (${unit.unit_short_name})`,
                                }))}
                            />
                        </div>

                        {/* Right column */}
                        <div className="space-y-5">
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

                            <Field
                                label="Reference"
                                name="reference"
                                value={data.reference}
                                onChange={handleChange}
                                error={errors.reference}
                                required
                                placeholder="e.g. RIS No. or PO No."
                            />

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

                            <SelectField
                                label="Office"
                                value={data.office_code}
                                onChange={handleSelectChange('office_code')}
                                error={errors.office_code}
                                required
                                placeholder="-- Select Office --"
                                options={offices.map((office) => ({
                                    value: office.office_code,
                                    label: `${office.office_code} - ${office.office_name}`,
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
            </DialogContent>
        </Dialog>
    );
}