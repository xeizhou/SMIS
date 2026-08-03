import { RefreshCw, Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

interface Supplier {
    supplier_id: number;
    supplier_name: string;
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

interface PurchaseOrder {
    po_number: string;
    po_date: string | null;
    pr_number: string | null;
    pr_date: string | null;
    ors_burs_no: string | null;
    ors_burs_date: string | null;
    total_amount_po: number | string | null;
    fund_cluster_id: string | null;
    supplier_id: number | null;
    end_user: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    suppliers: Supplier[];
    fundClusters: FundCluster[];
    offices: Office[];
    purchaseOrders: PurchaseOrder[];
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
    disabled?: boolean;
}

const labelClass = 'mb-1 block text-sm text-foreground';
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
                disabled={disabled}
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
    options: { value: string; label: string }[];
    disabled?: boolean;
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
    disabled = false,
    onRefresh,
    isRefreshing = false,
}: SelectFieldProps) {
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

const STATUS_OPTIONS = [
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'CANCELLED', label: 'CANCELLED' },
];

const emptyForm = {
    po_number: '',
    supplier_id: '',
    unit_office: '',
    po_date: '',
    delivery_term: '',
    fund_cluster: '',
    pr_number: '',
    pr_date: '',
    ors_bur_number: '',
    ors_bur_date: '',
    po_amount: '',
    date_forwarded_supplier: '',
    forwarded_by_supplier: '',
    claimed_by_supplier: '',
    supplier_signature_date: '',
    date_forwarded_coa: '',
    forwarded_by_coa: '',
    date_returned_from_coa: '',
    coa_date: '',
    claim_date: '',
    claimed_by_coa: '',
    date_received_by_supplier: '',
    invoice_number: '',
    invoice_date: '',
    delivery_receipt: '',
    date_completed: '',
    par_ics_number: '',
    ris_number: '',
    inspected_by: '',
    inspection_date: '',
    iar_number: '',
    date_forwarded_to_finance: '',
    receipt_receiving_date: '',
    receipt_claimed_by: '',
    items_receiving_date: '',
    items_claimed_by: '',
    notify_receipt: '',
    notify_call: '',
    notify_email: '',
    status: '',
    remarks: '',
};

export default function PirAddForm({
    open,
    onOpenChange,
    suppliers,
    fundClusters,
    offices,
    purchaseOrders,
}: Props) {

    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['purchaseOrders', 'suppliers', 'offices', 'fundClusters'],
            onFinish: () => setRefreshingField(null),
        });
    };
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setData({ ...data, [name]: value });
    };

    // PO Number is selected first; everything inherited from the PO gets
    // auto-filled here. Fields stay editable afterward in case of corrections.
    const handlePoChange = (value: string) => {
        const po = purchaseOrders.find((p) => p.po_number === value);

        if (!po) {
            setData({ ...data, po_number: value });
            return;
        }

        setData({
            ...data,
            po_number: value,
            supplier_id: po.supplier_id ? String(po.supplier_id) : '',
            fund_cluster: po.fund_cluster_id ?? '',
            po_date: po.po_date ? po.po_date.slice(0, 10) : '',
            pr_number: po.pr_number ?? '',
            pr_date: po.pr_date ? po.pr_date.slice(0, 10) : '',
            ors_bur_number: po.ors_burs_no ?? '',
            ors_bur_date: po.ors_burs_date ? po.ors_burs_date.slice(0, 10) : '',
            po_amount: po.total_amount_po ? String(po.total_amount_po) : '',
            unit_office: po.end_user ?? '',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post('/iar', data, {
            onSuccess: () => {
                onOpenChange(false);
                setData(emptyForm);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    const poSelected = Boolean(data.po_number);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-h-[90vh] overflow-y-auto"
                style={{ maxWidth: '1200px' }}
            >
                <DialogHeader>
                    <DialogTitle>New PIR Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Section: PO Selection (always first) */}
                    <div>
                        <h3 className={sectionTitleClass}>Select Purchase Order</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <SearchableSelect
                                label="PO Number"
                                value={data.po_number}
                                onChange={handlePoChange}
                                error={errors.po_number}
                                required
                                placeholder="Search PO Number..."
                                options={purchaseOrders.map((po) => ({
                                    value: po.po_number,
                                    label: po.po_number,
                                }))}
                                onRefresh={() => handleRefreshData('purchaseOrders')}
                                isRefreshing={refreshingField === 'purchaseOrders'}
                            />
                        </div>
                    </div>

                    {/* Section: PO Information (auto-filled, still editable) */}
                    <div>
                        <h3 className={sectionTitleClass}>PO Information</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <SelectField
                                label="Supplier"
                                value={data.supplier_id}
                                onChange={handleSelectChange('supplier_id')}
                                error={errors.supplier_id}
                                required
                                disabled={!poSelected}
                                placeholder="-- Select Supplier --"
                                options={suppliers.map((s) => ({
                                    value: String(s.supplier_id),
                                    label: s.supplier_name,
                                }))}
                            />
                            <SelectField
                                label="Unit/Office"
                                value={data.unit_office}
                                onChange={handleSelectChange('unit_office')}
                                error={errors.unit_office}
                                required
                                disabled={!poSelected}
                                placeholder="-- Select Office --"
                                options={offices.map((o) => ({
                                    value: o.office_code,
                                    label: `${o.office_code} - ${o.office_name}`,
                                }))}
                            />
                            <Field
                                label="PO Date"
                                name="po_date"
                                type="date"
                                value={data.po_date}
                                onChange={handleChange}
                                error={errors.po_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Delivery Term (days)"
                                name="delivery_term"
                                type="number"
                                value={data.delivery_term}
                                onChange={handleChange}
                                error={errors.delivery_term}
                                disabled={!poSelected}
                                placeholder="Select Delivery Term"
                            />
                            <SelectField
                                label="Fund Cluster"
                                value={data.fund_cluster}
                                onChange={handleSelectChange('fund_cluster')}
                                error={errors.fund_cluster}
                                disabled={!poSelected}
                                placeholder="-- Select Fund Cluster --"
                                options={fundClusters.map((fc) => ({
                                    value: fc.fund_cluster_id,
                                    label: `${fc.fund_cluster_id} - ${fc.fund_description}`,
                                }))}
                            />
                            <Field
                                label="PR Number"
                                name="pr_number"
                                value={data.pr_number}
                                onChange={handleChange}
                                error={errors.pr_number}
                                disabled={!poSelected}
                                placeholder="Enter PR Number"
                            />
                            <Field
                                label="PR Date"
                                name="pr_date"
                                type="date"
                                value={data.pr_date}
                                onChange={handleChange}
                                error={errors.pr_date}
                                disabled={!poSelected}
                                placeholder="Select PR Date"
                            />
                            <Field
                                label="ORS/BUR Number"
                                name="ors_bur_number"
                                value={data.ors_bur_number}
                                onChange={handleChange}
                                error={errors.ors_bur_number}
                                disabled={!poSelected}
                                placeholder="Enter ORS/BUR Number"
                            />
                            <Field
                                label="ORS/BUR Date"
                                name="ors_bur_date"
                                type="date"
                                value={data.ors_bur_date}
                                onChange={handleChange}
                                error={errors.ors_bur_date}
                                disabled={!poSelected}
                                placeholder="Select ORS/BUR Date"
                            />
                            <Field
                                label="PO Amount"
                                name="po_amount"
                                type="number"
                                value={data.po_amount}
                                onChange={handleChange}
                                error={errors.po_amount}
                                disabled={!poSelected}
                                placeholder="Enter PO Amount"
                            />
                        </div>
                    </div>

                    {/* Section: Supplier Forwarding */}
                    <div>
                        <h3 className={sectionTitleClass}>Supplier Forwarding</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Date Forwarded to Supplier"
                                name="date_forwarded_supplier"
                                type="date"
                                value={data.date_forwarded_supplier}
                                onChange={handleChange}
                                error={errors.date_forwarded_supplier}
                                disabled={!poSelected}
                                placeholder="Select Date Forwarded to Supplier"
                            />
                            <Field
                                label="Forwarded By"
                                name="forwarded_by_supplier"
                                value={data.forwarded_by_supplier}
                                onChange={handleChange}
                                error={errors.forwarded_by_supplier}
                                disabled={!poSelected}
                                placeholder="Enter Forwarded By"
                            />
                            <Field
                                label="Claimed By (Supplier)"
                                name="claimed_by_supplier"
                                value={data.claimed_by_supplier}
                                onChange={handleChange}
                                error={errors.claimed_by_supplier}
                                disabled={!poSelected}
                                placeholder="Enter Claimed By (Supplier)"
                            />
                            <Field
                                label="Supplier Signature Date"
                                name="supplier_signature_date"
                                type="date"
                                value={data.supplier_signature_date}
                                onChange={handleChange}
                                error={errors.supplier_signature_date}
                                disabled={!poSelected}
                                placeholder="Select Supplier Signature Date"
                            />
                            <Field
                                label="Date Received by Supplier"
                                name="date_received_by_supplier"
                                type="date"
                                value={data.date_received_by_supplier}
                                onChange={handleChange}
                                error={errors.date_received_by_supplier}
                                disabled={!poSelected}
                                placeholder="Select Date Received by Supplier"
                            />
                        </div>
                    </div>

                    {/* Section: COA Processing */}
                    <div>
                        <h3 className={sectionTitleClass}>COA Processing</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Date Forwarded to COA"
                                name="date_forwarded_coa"
                                type="date"
                                value={data.date_forwarded_coa}
                                onChange={handleChange}
                                error={errors.date_forwarded_coa}
                                disabled={!poSelected}
                                placeholder="Select Date Forwarded to COA"
                            />
                            <Field
                                label="Forwarded By (COA)"
                                name="forwarded_by_coa"
                                value={data.forwarded_by_coa}
                                onChange={handleChange}
                                error={errors.forwarded_by_coa}
                                disabled={!poSelected}
                                placeholder="Enter Forwarded By (COA)"
                            />
                            <Field
                                label="Date Returned from COA"
                                name="date_returned_from_coa"
                                type="date"
                                value={data.date_returned_from_coa}
                                onChange={handleChange}
                                error={errors.date_returned_from_coa}
                                disabled={!poSelected}
                                placeholder="Select Date Returned from COA"
                            />
                            <Field
                                label="COA Date"
                                name="coa_date"
                                type="date"
                                value={data.coa_date}
                                onChange={handleChange}
                                error={errors.coa_date}
                                disabled={!poSelected}
                                placeholder="Select COA Date"
                            />
                            <Field
                                label="Claim Date"
                                name="claim_date"
                                type="date"
                                value={data.claim_date}
                                onChange={handleChange}
                                error={errors.claim_date}
                                disabled={!poSelected}
                                placeholder="Select Claim Date"
                            />
                            <Field
                                label="Claimed By (COA)"
                                name="claimed_by_coa"
                                value={data.claimed_by_coa}
                                onChange={handleChange}
                                error={errors.claimed_by_coa}
                                disabled={!poSelected}
                                placeholder="Enter Claimed By (COA)"
                            />
                        </div>
                    </div>

                    {/* Section: Delivery & Inspection */}
                    <div>
                        <h3 className={sectionTitleClass}>Delivery & Inspection</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Invoice Number"
                                name="invoice_number"
                                value={data.invoice_number}
                                onChange={handleChange}
                                error={errors.invoice_number}
                                disabled={!poSelected}
                                placeholder="Enter Invoice Number"
                            />
                            <Field
                                label="Invoice Date"
                                name="invoice_date"
                                type="date"
                                value={data.invoice_date}
                                onChange={handleChange}
                                error={errors.invoice_date}
                                disabled={!poSelected}
                                placeholder="Select Invoice Date"
                            />
                            <Field
                                label="Delivery Receipt"
                                name="delivery_receipt"
                                value={data.delivery_receipt}
                                onChange={handleChange}
                                error={errors.delivery_receipt}
                                disabled={!poSelected}
                                placeholder="Enter Delivery Receipt"
                            />
                            <Field
                                label="Date Completed"
                                name="date_completed"
                                type="date"
                                value={data.date_completed}
                                onChange={handleChange}
                                error={errors.date_completed}
                                disabled={!poSelected}
                                placeholder="Select Date Completed"
                            />
                            <Field
                                label="PAR/ICS Number"
                                name="par_ics_number"
                                value={data.par_ics_number}
                                onChange={handleChange}
                                error={errors.par_ics_number}
                                disabled={!poSelected}
                                placeholder="Enter PAR/ICS Number"
                            />
                            <Field
                                label="RIS Number"
                                name="ris_number"
                                value={data.ris_number}
                                onChange={handleChange}
                                error={errors.ris_number}
                                disabled={!poSelected}
                                placeholder="Enter RIS Number"
                            />
                            <Field
                                label="Inspected By"
                                name="inspected_by"
                                value={data.inspected_by}
                                onChange={handleChange}
                                error={errors.inspected_by}
                                disabled={!poSelected}
                                placeholder="Enter Inspected By"
                            />
                            <Field
                                label="Inspection Date"
                                name="inspection_date"
                                type="date"
                                value={data.inspection_date}
                                onChange={handleChange}
                                error={errors.inspection_date}
                                disabled={!poSelected}
                                placeholder="Select Inspection Date"
                            />
                            <Field
                                label="IAR Number"
                                name="iar_number"
                                value={data.iar_number}
                                onChange={handleChange}
                                error={errors.iar_number}
                                disabled={!poSelected}
                                placeholder="Enter IAR Number"
                            />
                        </div>
                    </div>

                    {/* Section: Finance & Claim */}
                    <div>
                        <h3 className={sectionTitleClass}>Finance & Claim</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Date Forwarded to Finance"
                                name="date_forwarded_to_finance"
                                type="date"
                                value={data.date_forwarded_to_finance}
                                onChange={handleChange}
                                error={errors.date_forwarded_to_finance}
                                disabled={!poSelected}
                                placeholder="Select Date Forwarded to Finance"
                            />
                            <Field
                                label="Receipt Receiving Date"
                                name="receipt_receiving_date"
                                type="date"
                                value={data.receipt_receiving_date}
                                onChange={handleChange}
                                error={errors.receipt_receiving_date}
                                disabled={!poSelected}
                                placeholder="Select Receipt Receiving Date"
                            />
                            <Field
                                label="Receipt Claimed By"
                                name="receipt_claimed_by"
                                value={data.receipt_claimed_by}
                                onChange={handleChange}
                                error={errors.receipt_claimed_by}
                                disabled={!poSelected}
                                placeholder="Enter Receipt Claimed By"
                            />
                            <Field
                                label="Items Receiving Date"
                                name="items_receiving_date"
                                type="date"
                                value={data.items_receiving_date}
                                onChange={handleChange}
                                error={errors.items_receiving_date}
                                disabled={!poSelected}
                                placeholder="Select Items Receiving Date"
                            />
                            <Field
                                label="Items Claimed By"
                                name="items_claimed_by"
                                value={data.items_claimed_by}
                                onChange={handleChange}
                                error={errors.items_claimed_by}
                                disabled={!poSelected}
                                placeholder="Enter Items Claimed By"
                            />
                        </div>
                    </div>

                    {/* Section: Notifications & Status */}
                    <div>
                        <h3 className={sectionTitleClass}>Notifications & Status</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Notify Receipt"
                                name="notify_receipt"
                                value={data.notify_receipt}
                                onChange={handleChange}
                                error={errors.notify_receipt}
                                disabled={!poSelected}
                                placeholder="Select Notify Receipt"
                            />
                            <Field
                                label="Notify Call"
                                name="notify_call"
                                value={data.notify_call}
                                onChange={handleChange}
                                error={errors.notify_call}
                                disabled={!poSelected}
                                placeholder="Select Notify Call"
                            />
                            <Field
                                label="Notify Email"
                                name="notify_email"
                                value={data.notify_email}
                                onChange={handleChange}
                                error={errors.notify_email}
                                disabled={!poSelected}
                                placeholder="Enter Notify Email"
                            />
                            <SelectField
                                label="Status"
                                value={data.status}
                                onChange={handleSelectChange('status')}
                                error={errors.status}
                                required
                                disabled={!poSelected}
                                placeholder="-- Select Status --"
                                options={STATUS_OPTIONS}
                            />
                            <div className="col-span-4">
                                <Field
                                    label="Remarks"
                                    name="remarks"
                                    value={data.remarks}
                                    onChange={handleChange}
                                    error={errors.remarks}
                                    placeholder="Optional notes"
                                    disabled={!poSelected}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || !poSelected}
                            style={{ backgroundColor: '#612A35' }}
                        >
                            {processing ? 'Saving...' : 'Save PIR'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}