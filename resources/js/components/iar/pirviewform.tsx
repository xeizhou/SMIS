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
} from 'lucide-react';
import type { Pir } from '@/pages/iar/index';

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
    if (!pir) return null;

    const fundClusterLabel =
        pir.fund_cluster_detail?.fund_description ??
        (typeof pir.fund_cluster === 'object' ? pir.fund_cluster?.fund_description : null) ??
        pir.fund_cluster_raw ??
        '—';

    const attachments = pir.attachments ?? [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-h-[90vh] overflow-y-auto"
                style={{ maxWidth: '1200px' }}
            >
                <DialogHeader>
                    <DialogTitle>PIR Details — {pir.po_number}</DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-8">
                    {/* Section: PO Information */}
                    <div>
                        <h3 className={sectionTitleClass}>PO Information</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Detail label="Supplier" value={pir.supplier?.supplier_name ?? '—'} />
                            <Detail label="PO Number" value={pir.po_number} />
                            <Detail label="Unit/Office" value={pir.unit_office ?? '—'} />
                            <Detail label="PO Date" value={formatDate(pir.po_date)} />
                            <Detail label="Delivery Term (days)" value={pir.delivery_term ? String(pir.delivery_term) : '—'} />
                            <Detail label="Fund Cluster" value={fundClusterLabel} />
                            <Detail label="PR Number" value={pir.pr_number ?? '—'} />
                            <Detail label="PR Date" value={formatDate(pir.pr_date)} />
                            <Detail label="ORS/BUR Number" value={pir.ors_bur_number ?? '—'} />
                            <Detail label="ORS/BUR Date" value={formatDate(pir.ors_bur_date)} />
                            <Detail label="PO Amount" value={formatCurrency(pir.po_amount)} />
                        </div>
                    </div>

                    {/* Section: Supplier Forwarding */}
                    <div>
                        <h3 className={sectionTitleClass}>Supplier Forwarding</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Detail label="Date Forwarded to Supplier" value={formatDate(pir.date_forwarded_supplier)} />
                            <Detail label="Forwarded By" value={pir.forwarded_by_supplier ?? '—'} />
                            <Detail label="Claimed By (Supplier)" value={pir.claimed_by_supplier ?? '—'} />
                            <Detail label="Supplier Signature Date" value={formatDate(pir.supplier_signature_date)} />
                            <Detail label="Date Received by Supplier" value={formatDate(pir.date_received_by_supplier)} />
                        </div>
                    </div>

                    {/* Section: COA Processing */}
                    <div>
                        <h3 className={sectionTitleClass}>COA Processing</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Detail label="Date Forwarded to COA" value={formatDate(pir.date_forwarded_coa)} />
                            <Detail label="Forwarded By (COA)" value={pir.forwarded_by_coa ?? '—'} />
                            <Detail label="Date Returned from COA" value={formatDate(pir.date_returned_from_coa)} />
                            <Detail label="COA Date" value={formatDate(pir.coa_date)} />
                            <Detail label="Claim Date" value={formatDate(pir.claim_date)} />
                            <Detail label="Claimed By (COA)" value={pir.claimed_by_coa ?? '—'} />
                        </div>
                    </div>

                    {/* Section: Delivery & Inspection */}
                    <div>
                        <h3 className={sectionTitleClass}>Delivery & Inspection</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Detail label="Invoice Number" value={pir.invoice_number ?? '—'} />
                            <Detail label="Invoice Date" value={formatDate(pir.invoice_date)} />
                            <Detail label="Delivery Receipt" value={pir.delivery_receipt ?? '—'} />
                            <Detail label="Date Completed" value={formatDate(pir.date_completed)} />
                            <Detail label="PAR/ICS Number" value={pir.par_ics_number ?? '—'} />
                            <Detail label="RIS Number" value={pir.ris_number ?? '—'} />
                            <Detail label="Inspected By" value={pir.inspected_by ?? '—'} />
                            <Detail label="Inspection Date" value={formatDate(pir.inspection_date)} />
                            <Detail label="IAR Number" value={pir.iar_number ?? '—'} />
                        </div>
                    </div>

                    {/* Section: Finance & Claim */}
                    <div>
                        <h3 className={sectionTitleClass}>Finance & Claim</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Detail label="Date Forwarded to Finance" value={formatDate(pir.date_forwarded_to_finance)} />
                            <Detail label="Receipt Receiving Date" value={formatDate(pir.receipt_receiving_date)} />
                            <Detail label="Receipt Claimed By" value={pir.receipt_claimed_by ?? '—'} />
                            <Detail label="Items Receiving Date" value={formatDate(pir.items_receiving_date)} />
                            <Detail label="Items Claimed By" value={pir.items_claimed_by ?? '—'} />
                        </div>
                    </div>

                    {/* Section: Notifications & Status */}
                    <div>
                        <h3 className={sectionTitleClass}>Notifications & Status</h3>
                        <div className="grid grid-cols-4 gap-6">
                            <Detail label="Notify Receipt" value={pir.notify_receipt ?? '—'} />
                            <Detail label="Notify Call" value={pir.notify_call ?? '—'} />
                            <Detail label="Notify Email" value={pir.notify_email ?? '—'} />
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
                            <div className="col-span-4">
                                <Detail label="Remarks" value={pir.remarks ?? '—'} />
                            </div>
                        </div>
                    </div>

                    {/* Section: Attachments (compact list) */}
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

                                        return (
                                            <div
                                                key={att.id}
                                                className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                    {type === 'image' ? (
                                                        <img
                                                            src={att.url}
                                                            alt={att.original_name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <FileIcon type={type} />
                                                    )}
                                                </div>

                                                <p className="flex-1 truncate text-sm">
                                                    {att.original_name}
                                                </p>

                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                                                    {getExtension(att.original_name).toUpperCase()}
                                                </Badge>

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
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}