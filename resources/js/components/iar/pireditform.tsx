import { Eye, Paperclip, RefreshCw, Trash2, X, File, FileImage, FileText, FileSpreadsheet, FileArchive } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Pir } from '@/pages/iar/index';

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
    pir: Pir | null;
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

interface Attachment {
    id: number;
    original_name: string;
    file_size?: number;
    url: string;
}

function getExtension(filename: string) {
    return filename.split('.').pop()?.toLowerCase() ?? '';
}

function getFileType(filename: string) {
    const ext = getExtension(filename);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    return 'file';
}

function FileIconDisplay({ type }: { type: string }) {
    switch (type) {
        case 'image':
            return <FileImage className="h-5 w-5 text-blue-500" />;
        case 'pdf':
            return <FileText className="h-5 w-5 text-red-500" />;
        case 'word':
            return <FileText className="h-5 w-5 text-blue-600" />;
        case 'excel':
            return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
        case 'archive':
            return <FileArchive className="h-5 w-5 text-yellow-600" />;
        default:
            return <File className="h-5 w-5 text-muted-foreground" />;
    }
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

function d(value: string | null) {
    return value ? value.slice(0, 10) : '';
}

export default function PirEditForm({
    open,
    onOpenChange,
    pir,
    suppliers,
    fundClusters,
    offices,
    purchaseOrders,
}: Props) {

    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: ['suppliers', 'offices', 'fundClusters'],
            onFinish: () => setRefreshingField(null),
        });
    };

    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [files, setFiles] = useState<{ id: string; file: File }[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);

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

    const removeExistingAttachment = (attachmentId: number) => {
        setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        setDeletedAttachmentIds((prev) => [...prev, attachmentId]);
    };

    useEffect(() => {
        if (pir) {
            // fund_cluster_detail is the safe copy of the relation; pir.fund_cluster
            // itself may be clobbered by the relation, so prefer fund_cluster_raw / detail.
            const fundClusterId =
                pir.fund_cluster_detail?.fund_cluster_id ??
                pir.fund_cluster_raw ??
                (typeof pir.fund_cluster === 'string' ? pir.fund_cluster : '') ??
                '';

            setData({
                po_number: pir.po_number ?? '',
                supplier_id: String(pir.supplier_id ?? ''),
                unit_office: pir.unit_office ?? '',
                po_date: d(pir.po_date),
                delivery_term: pir.delivery_term ? String(pir.delivery_term) : '',
                fund_cluster: fundClusterId,
                pr_number: pir.pr_number ?? '',
                pr_date: d(pir.pr_date),
                ors_bur_number: pir.ors_bur_number ?? '',
                ors_bur_date: d(pir.ors_bur_date),
                po_amount: pir.po_amount ? String(pir.po_amount) : '',
                date_forwarded_supplier: d(pir.date_forwarded_supplier),
                forwarded_by_supplier: pir.forwarded_by_supplier ?? '',
                claimed_by_supplier: pir.claimed_by_supplier ?? '',
                supplier_signature_date: d(pir.supplier_signature_date),
                date_forwarded_coa: d(pir.date_forwarded_coa),
                forwarded_by_coa: pir.forwarded_by_coa ?? '',
                date_returned_from_coa: d(pir.date_returned_from_coa),
                coa_date: d(pir.coa_date),
                claim_date: d(pir.claim_date),
                claimed_by_coa: pir.claimed_by_coa ?? '',
                date_received_by_supplier: d(pir.date_received_by_supplier),
                invoice_number: pir.invoice_number ?? '',
                invoice_date: d(pir.invoice_date),
                delivery_receipt: pir.delivery_receipt ?? '',
                date_completed: d(pir.date_completed),
                par_ics_number: pir.par_ics_number ?? '',
                ris_number: pir.ris_number ?? '',
                inspected_by: pir.inspected_by ?? '',
                inspection_date: d(pir.inspection_date),
                iar_number: pir.iar_number ?? '',
                date_forwarded_to_finance: d(pir.date_forwarded_to_finance),
                receipt_receiving_date: d(pir.receipt_receiving_date),
                receipt_claimed_by: pir.receipt_claimed_by ?? '',
                items_receiving_date: d(pir.items_receiving_date),
                items_claimed_by: pir.items_claimed_by ?? '',
                notify_receipt: pir.notify_receipt ?? '',
                notify_call: pir.notify_call ?? '',
                notify_email: pir.notify_email ?? '',
                status: pir.status ?? '',
                remarks: pir.remarks ?? '',
            });
            setErrors({});
            setFiles([]);
            setExistingAttachments(pir.attachments ?? []);
            setDeletedAttachmentIds([]);
        }
    }, [pir]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setData({ ...data, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pir) return;

        setProcessing(true);

        router.put(`/iar/${pir.pir_id}`, { ...data, deleted_attachment_ids: deletedAttachmentIds }, {
            onSuccess: () => {
                const finishSubmission = () => {
                    router.reload({
                        only: ['pirs'],
                        onFinish: () => {
                            onOpenChange(false);
                            setFiles([]);
                            setDeletedAttachmentIds([]);
                        },
                    });
                };

                if (files.length > 0) {
                    const formData = new FormData();
                    files.forEach(({ file }) => formData.append('files[]', file));

                    router.post(
                        `/iar/${encodeURIComponent(pir.po_number)}/attachments`,
                        formData,
                        {
                            forceFormData: true,
                            onFinish: () => finishSubmission(),
                        }
                    );
                } else {
                    finishSubmission();
                }
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    if (!pir) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-h-[90vh] overflow-hidden p-0"
                style={{ maxWidth: '1200px' }}
            >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Edit PIR Record — {pir?.pir_id}, {pir?.po_number}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Group: PO FROM VPAD — csv cols 1-13 (SUPPLIER through FORWARDED BY) */}
                    <div>
                        <h3 className={sectionTitleClass}>PO From VPAD</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Field
                                label="PO Number"
                                name="po_number"
                                value={data.po_number}
                                onChange={handleChange}
                                error={errors.po_number}
                                disabled
                            />
                            <SelectField
                                label="Supplier"
                                value={data.supplier_id}
                                onChange={handleSelectChange('supplier_id')}
                                error={errors.supplier_id}
                                required
                                placeholder="-- Select Supplier --"
                                options={suppliers.map((s) => ({
                                    value: String(s.supplier_id),
                                    label: s.supplier_name,
                                }))}
                                onRefresh={() => handleRefreshData('suppliers')}
                                isRefreshing={refreshingField === 'suppliers'}
                            />
                            <SelectField
                                label="Unit/Office"
                                value={data.unit_office}
                                onChange={handleSelectChange('unit_office')}
                                error={errors.unit_office}
                                required
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
                            />
                            <Field
                                label="Delivery Term (days)"
                                name="delivery_term"
                                type="number"
                                value={data.delivery_term}
                                onChange={handleChange}
                                error={errors.delivery_term}
                            />
                            <SelectField
                                label="Fund Cluster"
                                value={data.fund_cluster}
                                onChange={handleSelectChange('fund_cluster')}
                                error={errors.fund_cluster}
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
                            />
                            <Field
                                label="PR Date"
                                name="pr_date"
                                type="date"
                                value={data.pr_date}
                                onChange={handleChange}
                                error={errors.pr_date}
                            />
                            <Field
                                label="ORS/BUR Number"
                                name="ors_bur_number"
                                value={data.ors_bur_number}
                                onChange={handleChange}
                                error={errors.ors_bur_number}
                            />
                            <Field
                                label="ORS/BUR Date"
                                name="ors_bur_date"
                                type="date"
                                value={data.ors_bur_date}
                                onChange={handleChange}
                                error={errors.ors_bur_date}
                            />
                            <Field
                                label="PO Amount"
                                name="po_amount"
                                type="number"
                                value={data.po_amount}
                                onChange={handleChange}
                                error={errors.po_amount}
                            />
                            <Field
                                label="Date Forwarded"
                                name="date_forwarded_supplier"
                                type="date"
                                value={data.date_forwarded_supplier}
                                onChange={handleChange}
                                error={errors.date_forwarded_supplier}
                            />
                            <Field
                                label="Forwarded By"
                                name="forwarded_by_supplier"
                                value={data.forwarded_by_supplier}
                                onChange={handleChange}
                                error={errors.forwarded_by_supplier}
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
                            />
                            <Field
                                label="Date"
                                name="supplier_signature_date"
                                type="date"
                                value={data.supplier_signature_date}
                                onChange={handleChange}
                                error={errors.supplier_signature_date}
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
                            />
                            <Field
                                label="Forwarded By"
                                name="forwarded_by_coa"
                                value={data.forwarded_by_coa}
                                onChange={handleChange}
                                error={errors.forwarded_by_coa}
                            />
                            <Field
                                label="Date Returned from COA"
                                name="date_returned_from_coa"
                                type="date"
                                value={data.date_returned_from_coa}
                                onChange={handleChange}
                                error={errors.date_returned_from_coa}
                            />
                            <Field
                                label="COA Date"
                                name="coa_date"
                                type="date"
                                value={data.coa_date}
                                onChange={handleChange}
                                error={errors.coa_date}
                            />
                            <Field
                                label="Claim Date"
                                name="claim_date"
                                type="date"
                                value={data.claim_date}
                                onChange={handleChange}
                                error={errors.claim_date}
                            />
                            <Field
                                label="Claimed By"
                                name="claimed_by_coa"
                                value={data.claimed_by_coa}
                                onChange={handleChange}
                                error={errors.claimed_by_coa}
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
                            />
                            <Field
                                label="Invoice Number"
                                name="invoice_number"
                                value={data.invoice_number}
                                onChange={handleChange}
                                error={errors.invoice_number}
                            />
                            <Field
                                label="Invoice Date"
                                name="invoice_date"
                                type="date"
                                value={data.invoice_date}
                                onChange={handleChange}
                                error={errors.invoice_date}
                            />
                            <Field
                                label="Delivery Receipt"
                                name="delivery_receipt"
                                value={data.delivery_receipt}
                                onChange={handleChange}
                                error={errors.delivery_receipt}
                            />
                            <Field
                                label="Date Completed"
                                name="date_completed"
                                type="date"
                                value={data.date_completed}
                                onChange={handleChange}
                                error={errors.date_completed}
                            />
                            <Field
                                label="PAR/ICS Number"
                                name="par_ics_number"
                                value={data.par_ics_number}
                                onChange={handleChange}
                                error={errors.par_ics_number}
                            />
                            <Field
                                label="RIS Number"
                                name="ris_number"
                                value={data.ris_number}
                                onChange={handleChange}
                                error={errors.ris_number}
                            />
                            <Field
                                label="Inspected By"
                                name="inspected_by"
                                value={data.inspected_by}
                                onChange={handleChange}
                                error={errors.inspected_by}
                            />
                            <Field
                                label="Inspection Date"
                                name="inspection_date"
                                type="date"
                                value={data.inspection_date}
                                onChange={handleChange}
                                error={errors.inspection_date}
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
                            />
                            <Field
                                label="Date Forwarded to Finance"
                                name="date_forwarded_to_finance"
                                type="date"
                                value={data.date_forwarded_to_finance}
                                onChange={handleChange}
                                error={errors.date_forwarded_to_finance}
                            />
                        </div>
                    </div>

                    {/* Group: ATTACHMENTS */}
                    <div>
                        <h3 className={sectionTitleClass}>Attachments</h3>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40"
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

                        {/* Existing Attachments */}
                        {existingAttachments.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Existing Files</p>
                                <ScrollArea className="max-h-[180px]">
                                    <div className="space-y-1.5">
                                        {existingAttachments.map((att) => {
                                            const type = getFileType(att.original_name);
                                            return (
                                                <div
                                                    key={att.id}
                                                    className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                        <FileIconDisplay type={type} />
                                                    </div>

                                                    <p className="min-w-0 flex-1 truncate text-sm">
                                                        {att.original_name}
                                                    </p>

                                                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                                        {getExtension(att.original_name).toUpperCase()}
                                                    </Badge>

                                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                                                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </a>
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                                                        onClick={() => removeExistingAttachment(att.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {/* New Files */}
                        {files.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">New Files</p>
                                <ScrollArea className="max-h-[180px]">
                                    <div className="space-y-1.5">
                                        {files.map(({ id, file }) => {
                                            const type = getFileType(file.name);
                                            return (
                                                <div
                                                    key={id}
                                                    className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                        {type === 'image' ? (
                                                            <img
                                                                src={URL.createObjectURL(file)}
                                                                alt={file.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <FileIconDisplay type={type} />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm">{file.name}</p>
                                                        <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
                                                    </div>

                                                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                                        {getExtension(file.name).toUpperCase()}
                                                    </Badge>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                                                        onClick={() => removeFile(id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
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
                            disabled={processing}
                            style={{ backgroundColor: '#612A35' }}
                        >
                            {processing ? 'Saving...' : 'Update PIR'}
                        </Button>
                    </div>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}