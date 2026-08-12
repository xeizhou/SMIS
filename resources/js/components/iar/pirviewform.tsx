import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Eye,
    File,
    FileImage,
    FileText,
    FileSpreadsheet,
    FileArchive,
    ExternalLink,
} from 'lucide-react';
import type { Pir } from '@/pages/iar/index';

interface Attachment {
    id: number;
    original_name: string;
    url: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pir: Pir | null;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <p className={valueClass}>{value}</p>
        </div>
    );
}

function formatDate(value: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatCurrency(amount: number | string | null | undefined) {
    if (amount === null || amount === undefined || amount === '') return '—';
    const num = Number(amount);
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(num);
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

function FileIcon({ type }: { type: string }) {
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

const statusColors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
};

export default function PirViewForm({ open, onOpenChange, pir }: Props) {
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

    if (!pir) return null;

    const fundClusterLabel =
        pir.fund_cluster_detail?.fund_description ??
        (typeof pir.fund_cluster === 'object' ? pir.fund_cluster?.fund_description : null) ??
        pir.fund_cluster_raw ??
        '—';

    const attachments = pir.attachments ?? [];

    const inspectionGroups = (() => {
        const entries = Array.isArray(pir.inspection_entries) ? pir.inspection_entries : [];
        const groups = new Map<string, { iar_number: string; inspectors: string[]; inspection_dates: string[] }>();

        entries.forEach((entry) => {
            const iarNumber = entry.iar_number ?? '';
            const group = groups.get(iarNumber) ?? { iar_number: iarNumber, inspectors: [], inspection_dates: [] };

            if (entry.inspected_by && !group.inspectors.includes(entry.inspected_by)) {
                group.inspectors.push(entry.inspected_by);
            }

            if (entry.inspection_date && !group.inspection_dates.includes(entry.inspection_date)) {
                group.inspection_dates.push(entry.inspection_date);
            }

            groups.set(iarNumber, group);
        });

        return Array.from(groups.values()).filter((group) => group.iar_number || group.inspectors.length > 0 || group.inspection_dates.length > 0);
    })();

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="w-[95vw] max-h-[95vh] overflow-hidden p-0"
                    style={{ maxWidth: '1200px' }}
                >
                    <ScrollArea className="max-h-[95vh] w-full">
                        <div className="p-6">
                    <DialogHeader>
                        <DialogTitle>PIR Details — {pir.po_number}</DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 space-y-8">
                        {/* Group: PO FROM VPAD */}
                        <div>
                            <h3 className={sectionTitleClass}>PO From VPAD</h3>
                            <div className="grid grid-cols-4 gap-6">
                                <Detail label="PO Number" value={pir.po_number} />
                                <Detail label="Supplier" value={pir.supplier?.supplier_name ?? '—'} />
                                <Detail label="Unit/Office" value={pir.unit_office ?? '—'} />
                                <Detail label="PO Date" value={formatDate(pir.po_date)} />
                                <Detail label="Delivery Term (days)" value={pir.delivery_term ? String(pir.delivery_term) : '—'} />
                                <Detail label="Fund Cluster" value={fundClusterLabel} />
                                <Detail label="PR Number" value={pir.pr_number ?? '—'} />
                                <Detail label="PR Date" value={formatDate(pir.pr_date)} />
                                <Detail label="ORS/BUR Number" value={pir.ors_bur_number ?? '—'} />
                                <Detail label="ORS/BUR Date" value={formatDate(pir.ors_bur_date)} />
                                <Detail label="PO Amount" value={formatCurrency(pir.po_amount)} />
                                <Detail label="Date Forwarded" value={formatDate(pir.date_forwarded_supplier)} />
                                <Detail label="Forwarded By" value={pir.forwarded_by_supplier ?? '—'} />
                                <Detail label="Notified Date" value={formatDate(pir.po_vpad_notified_date)} />
                                <Detail label="Notified via Email or Number" value={pir.po_vpad_notified_via ?? '—'} />
                            </div>
                        </div>

                        {/* Group: FOR SUPPLIER'S SIGNATURE */}
                        <div>
                            <h3 className={sectionTitleClass}>For Supplier's Signature</h3>
                            <div className="grid grid-cols-4 gap-6">
                                <Detail label="Claimed By" value={pir.claimed_by_supplier ?? '—'} />
                                <Detail label="Date" value={formatDate(pir.supplier_signature_date)} />
                                <Detail label="Date Received by Supplier" value={formatDate(pir.date_received_by_supplier)} />
                            </div>
                        </div>

                        {/* Group: FOR COA STAMP */}
                        <div>
                            <h3 className={sectionTitleClass}>For COA Stamp</h3>
                            <div className="grid grid-cols-4 gap-6">
                                <Detail label="Date Forwarded" value={formatDate(pir.date_forwarded_coa)} />
                                <Detail label="Forwarded By" value={pir.forwarded_by_coa ?? '—'} />
                                <Detail label="Date Returned from COA" value={formatDate(pir.date_returned_from_coa)} />
                                <Detail label="COA Date" value={formatDate(pir.coa_date)} />
                                <Detail label="Claim Date" value={formatDate(pir.claim_date)} />
                                <Detail label="Claimed By" value={pir.claimed_by_coa ?? '—'} />
                                <Detail label="Notified Date" value={formatDate(pir.coa_stamp_notified_date)} />
                                <Detail label="Notified via Email or Number" value={pir.coa_stamp_notified_via ?? '—'} />
                            </div>
                        </div>

                        {/* Group: FOR RELEASE */}
                        <div>
                            <h3 className={sectionTitleClass}>For Release</h3>
                            <div className="grid grid-cols-4 gap-6">
                                <Detail label="Invoice Number" value={pir.invoice_number ?? '—'} />
                                <Detail label="Invoice Date" value={formatDate(pir.invoice_date)} />
                                <Detail label="Delivery Receipt" value={pir.delivery_receipt ?? '—'} />
                                <Detail label="Date Completed" value={formatDate(pir.date_completed)} />
                                <Detail label="PAR/ICS Number" value={pir.par_ics_number ?? '—'} />
                                <Detail label="RIS Number" value={pir.ris_number ?? '—'} />
                            </div>

                            <div className="mt-4 rounded-md border p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-sm font-medium text-foreground">Inspection Entries</p>
                                    {inspectionGroups.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            {inspectionGroups.length} IAR{inspectionGroups.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {inspectionGroups.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No inspection entries added yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {inspectionGroups.map((group, index) => (
                                            <div
                                                key={`${group.iar_number}-${index}`}
                                                className="flex flex-wrap items-start gap-4 rounded-md border bg-background/50 p-3 md:flex-nowrap"
                                            >
                                                <div className="w-full shrink-0 md:w-40">
                                                    <p className={labelClass}>IAR Number</p>
                                                    <p className={valueClass + ' font-medium'}>{group.iar_number || '—'}</p>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className={labelClass}>Inspected By</p>
                                                    <p className={valueClass}>
                                                        {group.inspectors.length > 0 ? group.inspectors.join(', ') : '—'}
                                                    </p>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className={labelClass}>Inspection Date</p>
                                                    <p className={valueClass}>
                                                        {group.inspection_dates.length > 0
                                                            ? group.inspection_dates.map((d) => formatDate(d)).join(', ')
                                                            : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Group: RECEIPT AND ITEM/S CLAIMED BY END-USER */}
                        <div>
                            <h3 className={sectionTitleClass}>Receipt and Item/s Claimed by End-User</h3>
                            <div className="grid grid-cols-4 gap-6">
                                <Detail label="Receipt Receiving Date" value={formatDate(pir.receipt_receiving_date)} />
                                <Detail label="Claimed By" value={pir.receipt_claimed_by ?? '—'} />
                                <Detail label="Item/s Receiving Date" value={formatDate(pir.items_receiving_date)} />
                                <Detail label="Claimed By" value={pir.items_claimed_by ?? '—'} />
                                <Detail label="Notified Date" value={formatDate(pir.receipt_claimed_notified_date)} />
                                <Detail label="Notified via Email or Number" value={pir.receipt_claimed_notified_via ?? '—'} />
                            </div>
                        </div>

                        {/* Group: FOR PAYMENT (FINANCE) */}
                        <div>
                            <h3 className={sectionTitleClass}>For Payment (Finance)</h3>
                            <div className="grid grid-cols-4 gap-6">
                                <Detail label="IAR Number" value={pir.iar_number ?? '—'} />
                                <Detail label="Date Forwarded to Finance" value={formatDate(pir.date_forwarded_to_finance)} />
                            </div>
                        </div>

                        {/* Group: STATUS & REMARKS */}
                        <div>
                            <h3 className={sectionTitleClass}>Status & Remarks</h3>
                            <div className="grid grid-cols-4 gap-6">
                                <div>
                                    <p className={labelClass}>Status</p>
                                    <span
                                        className={
                                            'inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ' +
                                            (statusColors[pir.status] ?? 'bg-muted text-muted-foreground')
                                        }
                                    >
                                        {pir.status}
                                    </span>
                                </div>
                                <div className="col-span-3">
                                    <Detail label="Remarks" value={pir.remarks ?? '—'} />
                                </div>
                            </div>
                        </div>

                        {/* Group: ATTACHMENTS */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className={sectionTitleClass.replace(' border-b pb-2 mb-4', '')}>
                                    Attachments
                                </h3>

                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                    {attachments.length}
                                </Badge>
                            </div>

                            {attachments.length === 0 ? (
                                <div className="flex items-center gap-2 rounded-md border border-dashed py-4 px-3 text-sm text-muted-foreground">
                                    <File className="h-4 w-4" />
                                    No attachments uploaded.
                                </div>
                            ) : (
                                <ScrollArea className="max-h-[220px]">
                                    <div className="space-y-1.5 pr-2">
                                        {attachments.map((att) => {
                                            const type = getFileType(att.original_name);
                                            const isImage = type === 'image';

                                            return (
                                                <div
                                                    key={att.id}
                                                    className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => isImage && setPreviewAttachment(att)}
                                                        className={`h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden ${isImage ? 'cursor-pointer' : 'cursor-default'}`}
                                                        disabled={!isImage}
                                                    >
                                                        {isImage ? (
                                                            <img
                                                                src={att.url}
                                                                alt={att.original_name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <FileIcon type={type} />
                                                        )}
                                                    </button>

                                                    <p className="flex-1 truncate text-sm">
                                                        {att.original_name}
                                                    </p>

                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                                                        {getExtension(att.original_name).toUpperCase()}
                                                    </Badge>

                                                    {isImage ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 shrink-0"
                                                            onClick={() => setPreviewAttachment(att)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 shrink-0"
                                                            asChild
                                                        >
                                                            <a
                                                                href={att.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Image Lightbox */}
            <Dialog open={!!previewAttachment} onOpenChange={(o) => !o && setPreviewAttachment(null)}>
                <DialogContent className="w-[95vw] p-0 overflow-hidden" style={{ maxWidth: '900px' }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <p className="text-sm font-medium truncate pr-4">
                            {previewAttachment?.original_name}
                        </p>
                        <Button variant="ghost" size="icon" className="h-7 w-7 mr-6" asChild>
                            <a
                                href={previewAttachment?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in new tab"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </Button>
                    </div>
                    <div className="flex items-center justify-center bg-muted/30 p-4 max-h-[80vh] overflow-auto">
                        {previewAttachment && (
                            <img
                                src={previewAttachment.url}
                                alt={previewAttachment.original_name}
                                className="max-w-full max-h-[75vh] object-contain rounded"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}