import { Paperclip, RefreshCw, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    po_received_date: string | null;
    due_date: string | null;
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

interface LockedFieldProps {
    label: string;
    value: string;
    error?: string;
    placeholder?: string;
}

// Read-only display for values derived from the selected PO — still
// submitted in the payload (via `data`), just not directly editable.
function LockedField({ label, value, error, placeholder }: LockedFieldProps) {
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

function daysBetween(startDate: string, endDate: string) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatBytes(bytes: number) {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

// crypto.randomUUID() requires a secure context (localhost/HTTPS). When
// serving over a plain-HTTP LAN IP (e.g. php artisan serve --host=192.168.x.x)
// it's undefined, so we roll our own simple unique id instead.
let fileIdCounter = 0;
function generateFileId() {
    fileIdCounter += 1;
    return `file-${Date.now()}-${fileIdCounter}`;
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
    const [files, setFiles] = useState<{ id: string; file: File }[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files).map((file) => ({
            file,
            id: generateFileId(),
        }));
        setFiles((prev) => [...prev, ...newFiles]);
        e.target.value = '';
    };

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setData({ ...data, [name]: value });
    };

    // PO Number is selected first; everything inherited from the PO gets
    // auto-filled here, including delivery_term (calculated from the PO's
    // own po_received_date/due_date, same daysBetween() logic used in
    // DeliveryAddForm). These auto-filled fields are now LOCKED (read-only)
    // to prevent accidental edits — same pattern as PoLetterAddForm.
    const handlePoChange = (value: string) => {
        const po = purchaseOrders.find((p) => p.po_number === value);

        if (!po) {
            setData({ ...data, po_number: value });
            return;
        }

        const poDateReceived = po.po_received_date ? po.po_received_date.slice(0, 10) : '';
        const dueDate = po.due_date ? po.due_date.slice(0, 10) : '';

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
            delivery_term: String(daysBetween(poDateReceived, dueDate)),
        });
    };

    const resetForm = () => {
        setData(emptyForm);
        setErrors({});
        setFiles([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post('/iar', data, {
            onSuccess: () => {
                // PIR created successfully — po_number now has a PIR record
                // behind it, so any selected files can be uploaded against it.
                const finishSubmission = () => {
                    router.reload({
                        only: ['pirs'],
                        onFinish: () => {
                            onOpenChange(false);
                            resetForm();
                        },
                    });
                };

                if (files.length > 0) {
                    const formData = new FormData();
                    files.forEach(({ file }) => formData.append('files[]', file));

                    router.post(
                        `/iar/${data.po_number}/attachments`,
                        formData,
                        {
                            forceFormData: true,
                            onFinish: () => {
                                finishSubmission();
                            },
                        }
                    );
                } else {
                    finishSubmission();
                }
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    const poSelected = Boolean(data.po_number);

    const supplierName = suppliers.find(
        (s) => String(s.supplier_id) === data.supplier_id
    )?.supplier_name ?? '';

    const officeLabel = (() => {
        const office = offices.find((o) => o.office_code === data.unit_office);
        return office ? `${office.office_code} - ${office.office_name}` : data.unit_office;
    })();

    const fundClusterLabel = (() => {
        const fc = fundClusters.find((f) => f.fund_cluster_id === data.fund_cluster);
        return fc ? `${fc.fund_cluster_id} - ${fc.fund_description}` : data.fund_cluster;
    })();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-h-[95vh] overflow-hidden p-0"
                style={{ maxWidth: '1200px' }}
            >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Add PIR Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Group: PO FROM VPAD — csv cols 1-13 (SUPPLIER through FORWARDED BY) */}
                    <div>
                        <h3 className={sectionTitleClass}>PO From VPAD</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <SelectField
                                label="PO Number"
                                value={data.po_number}
                                onChange={handlePoChange}
                                error={errors.po_number}
                                required
                                placeholder="-- Select PO Number --"
                                options={purchaseOrders.map((po) => ({
                                    value: po.po_number,
                                    label: po.po_number,
                                }))}
                                onRefresh={() => handleRefreshData('purchaseOrders')}
                                isRefreshing={refreshingField === 'purchaseOrders'}
                            />
                            <LockedField
                                label="Supplier"
                                value={supplierName}
                                error={errors.supplier_id}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="Unit/Office"
                                value={officeLabel}
                                error={errors.unit_office}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="PO Date"
                                value={data.po_date}
                                error={errors.po_date}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="Delivery Term (days)"
                                value={data.delivery_term}
                                error={errors.delivery_term}
                                placeholder="Auto-calculated from PO dates"
                            />
                            <LockedField
                                label="Fund Cluster"
                                value={fundClusterLabel}
                                error={errors.fund_cluster}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="PR Number"
                                value={data.pr_number}
                                error={errors.pr_number}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="PR Date"
                                value={data.pr_date}
                                error={errors.pr_date}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="ORS/BUR Number"
                                value={data.ors_bur_number}
                                error={errors.ors_bur_number}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="ORS/BUR Date"
                                value={data.ors_bur_date}
                                error={errors.ors_bur_date}
                                placeholder="Auto-filled from PO Number"
                            />
                            <LockedField
                                label="PO Amount"
                                value={data.po_amount}
                                error={errors.po_amount}
                                placeholder="Auto-filled from PO Number"
                            />
                            <Field
                                label="Date Forwarded"
                                name="date_forwarded_supplier"
                                type="date"
                                value={data.date_forwarded_supplier}
                                onChange={handleChange}
                                error={errors.date_forwarded_supplier}
                                disabled={!poSelected}
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
                        </div>
                    </div>

                    {/* Group: FOR SUPPLIER'S SIGNATURE — csv cols 14-15 */}
                    <div>
                        <h3 className={sectionTitleClass}>For Supplier's Signature</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Claimed By"
                                name="claimed_by_supplier"
                                value={data.claimed_by_supplier}
                                onChange={handleChange}
                                error={errors.claimed_by_supplier}
                                disabled={!poSelected}
                                placeholder="Enter Claimed By"
                            />
                            <Field
                                label="Date"
                                name="supplier_signature_date"
                                type="date"
                                value={data.supplier_signature_date}
                                onChange={handleChange}
                                error={errors.supplier_signature_date}
                                disabled={!poSelected}
                            />
                        </div>
                    </div>

                    {/* Group: FOR COA STAMP — csv cols 16-21 */}
                    <div>
                        <h3 className={sectionTitleClass}>For COA Stamp</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Date Forwarded"
                                name="date_forwarded_coa"
                                type="date"
                                value={data.date_forwarded_coa}
                                onChange={handleChange}
                                error={errors.date_forwarded_coa}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Forwarded By"
                                name="forwarded_by_coa"
                                value={data.forwarded_by_coa}
                                onChange={handleChange}
                                error={errors.forwarded_by_coa}
                                disabled={!poSelected}
                                placeholder="Enter Forwarded By"
                            />
                            <Field
                                label="Date Returned from COA"
                                name="date_returned_from_coa"
                                type="date"
                                value={data.date_returned_from_coa}
                                onChange={handleChange}
                                error={errors.date_returned_from_coa}
                                disabled={!poSelected}
                            />
                            <Field
                                label="COA Date"
                                name="coa_date"
                                type="date"
                                value={data.coa_date}
                                onChange={handleChange}
                                error={errors.coa_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Claim Date"
                                name="claim_date"
                                type="date"
                                value={data.claim_date}
                                onChange={handleChange}
                                error={errors.claim_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Claimed By"
                                name="claimed_by_coa"
                                value={data.claimed_by_coa}
                                onChange={handleChange}
                                error={errors.claimed_by_coa}
                                disabled={!poSelected}
                                placeholder="Enter Claimed By"
                            />
                        </div>
                    </div>

                    {/* Group: FOR RELEASE — csv cols 22-30 */}
                    <div>
                        <h3 className={sectionTitleClass}>For Release</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Date Received by Supplier"
                                name="date_received_by_supplier"
                                type="date"
                                value={data.date_received_by_supplier}
                                onChange={handleChange}
                                error={errors.date_received_by_supplier}
                                disabled={!poSelected}
                            />
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
                            />
                        </div>
                    </div>

                    {/* Group: FOR PAYMENT (FINANCE) — csv cols 31-32 */}
                    <div>
                        <h3 className={sectionTitleClass}>For Payment (Finance)</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="IAR Number"
                                name="iar_number"
                                value={data.iar_number}
                                onChange={handleChange}
                                error={errors.iar_number}
                                disabled={!poSelected}
                                placeholder="Enter IAR Number"
                            />
                            <Field
                                label="Date Forwarded to Finance"
                                name="date_forwarded_to_finance"
                                type="date"
                                value={data.date_forwarded_to_finance}
                                onChange={handleChange}
                                error={errors.date_forwarded_to_finance}
                                disabled={!poSelected}
                            />
                        </div>
                    </div>

                    {/* Group: RECEIPT AND ITEM/S CLAIMED BY END-USER — csv cols 33-36 */}
                    <div>
                        <h3 className={sectionTitleClass}>Receipt and Item/s Claimed by End-User</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Receipt Receiving Date"
                                name="receipt_receiving_date"
                                type="date"
                                value={data.receipt_receiving_date}
                                onChange={handleChange}
                                error={errors.receipt_receiving_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Claimed By"
                                name="receipt_claimed_by"
                                value={data.receipt_claimed_by}
                                onChange={handleChange}
                                error={errors.receipt_claimed_by}
                                disabled={!poSelected}
                                placeholder="Enter Claimed By"
                            />
                            <Field
                                label="Item/s Receiving Date"
                                name="items_receiving_date"
                                type="date"
                                value={data.items_receiving_date}
                                onChange={handleChange}
                                error={errors.items_receiving_date}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Claimed By"
                                name="items_claimed_by"
                                value={data.items_claimed_by}
                                onChange={handleChange}
                                error={errors.items_claimed_by}
                                disabled={!poSelected}
                                placeholder="Enter Claimed By"
                            />
                        </div>
                    </div>

                    {/* Group: NOTIFICATION LOGS — csv cols 37-39 */}
                    <div>
                        <h3 className={sectionTitleClass}>Notification Logs</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="Notify to Claim the Item/s & Receipt"
                                name="notify_receipt"
                                value={data.notify_receipt}
                                onChange={handleChange}
                                error={errors.notify_receipt}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Notify the End-User (via Call)"
                                name="notify_call"
                                value={data.notify_call}
                                onChange={handleChange}
                                error={errors.notify_call}
                                disabled={!poSelected}
                            />
                            <Field
                                label="Notify the End-User (via Email)"
                                name="notify_email"
                                value={data.notify_email}
                                onChange={handleChange}
                                error={errors.notify_email}
                                disabled={!poSelected}
                                placeholder="Enter Notify Email"
                            />
                        </div>
                    </div>

                    {/* Group: STATUS, REMARKS — csv cols 40-41 (standalone columns) */}
                    <div>
                        <h3 className={sectionTitleClass}>Status & Remarks</h3>
                        <div className="grid grid-cols-4 gap-6">
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
                            <div className="col-span-3">
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

                    {/* Group: ATTACHMENTS */}
                    <div>
                        <h3 className={sectionTitleClass}>Attachments</h3>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!poSelected}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Paperclip className="size-4" />
                            Click to select files (PDF, JPG, PNG)
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        {files.length > 0 && (
                            <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                                {files.map(({ id, file }) => (
                                    <li
                                        key={id}
                                        className="flex items-center justify-between gap-3 px-3 py-2"
                                    >
                                        <span className="min-w-0 truncate text-sm">
                                            {file.name}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {formatBytes(file.size)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(id)}
                                            className="shrink-0 text-red-600 hover:text-red-800"
                                            title="Remove"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
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
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}