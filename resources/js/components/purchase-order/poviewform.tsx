import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
    Eye,
    File,
    FileImage,
    FileText,
    FileSpreadsheet,
    FileArchive,
    ExternalLink,
} from "lucide-react";

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface Office {
    office_code: string;
    office_name: string;
}

interface Attachment {
    id: number;
    original_name: string;
    url: string;
}

interface PurchaseOrder {
    po_number: string;
    item_description: string | null;
    po_date: string | null;
    po_received_date: string | null;
    inclusive_date: string | null;
    due_date: string | null;
    pr_number: string | null;
    pr_date: string | null;
    philgeps_reference_no: string | null;
    procurement_type: string | null; 
    mode_of_procurement: string | null;
    total_amount_abc: string | number | null;
    total_amount_po: string | number | null;
    total_amount_diff?: string | number | null;
    fund_cluster_id: string | null;
    ors_burs_no: string | null;
    ors_burs_date: string | null;
    responsibility_center: string | null;
    uacs_object_code: string | null;
    supplier_id: number | null;
    end_user: string | null;
    date_forwarded_to_smu: string | null;
    coa_processed_date: string | null;
    date_forwarded_frontdesk: string | null;
    supplier: Supplier | null;
    fundCluster: FundCluster | null;
    office: Office | null;
    attachments?: Attachment[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrder: PurchaseOrder | null;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-3 pb-2 border-b';

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <p className={valueClass}>{value}</p>
        </div>
    );
}

function getExtension(filename: string) {
    return filename.split(".").pop()?.toLowerCase() ?? "";
}

function getFileType(filename: string) {
    const ext = getExtension(filename);

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
        return "image";

    if (ext === "pdf")
        return "pdf";

    if (["doc", "docx"].includes(ext))
        return "word";

    if (["xls", "xlsx", "csv"].includes(ext))
        return "excel";

    if (["zip", "rar", "7z"].includes(ext))
        return "archive";

    return "file";
}

function FileIcon({ type }: { type: string }) {
    switch (type) {
        case "image":
            return <FileImage className="h-5 w-5 text-blue-500" />;

        case "pdf":
            return <FileText className="h-5 w-5 text-red-500" />;

        case "word":
            return <FileText className="h-5 w-5 text-blue-600" />;

        case "excel":
            return <FileSpreadsheet className="h-5 w-5 text-green-600" />;

        case "archive":
            return <FileArchive className="h-5 w-5 text-yellow-600" />;

        default:
            return <File className="h-5 w-5 text-muted-foreground" />;
    }
}

function formatCurrency(value: string | number | null | undefined) {
    if (value === null || value === undefined) return '—';
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(numeric)) return '—';
    return numeric.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

function formatDate(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PurchaseOrderViewForm({ open, onOpenChange, purchaseOrder }: Props) {
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

    if (!purchaseOrder) return null;

    const po = purchaseOrder;
    const attachments = po.attachments ?? [];

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[95vw] max-h-[95vh] overflow-hidden p-0" style={{ maxWidth: '800px' }}>
                    <ScrollArea className="max-h-[95vh] w-full">
                        <div className="p-6">
                    <DialogHeader>
                        <DialogTitle>Purchase Order Details — {po.po_number}</DialogTitle>
                    </DialogHeader>

                    <div className="mt-2 space-y-6">
                        <section>
                            <p className={sectionTitleClass}>Order Information</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Detail label="PO Number" value={po.po_number} />
                                <Detail label="PO Date" value={formatDate(po.po_date)} />
                                <Detail label="PO Received Date" value={formatDate(po.po_received_date)} />
                                <Detail label="Due Date" value={formatDate(po.due_date)} />
                                <Detail label="Type of Procurement" value={po.procurement_type === 'Items' ? 'Item/s' : po.procurement_type ?? '—'} />
                                {po.procurement_type === 'Services' && (
                                    <Detail label="Inclusive Date" value={po.inclusive_date ?? '—'} />
                                )}
                                <Detail label="Mode of Procurement" value={po.mode_of_procurement ?? '—'} />
                            </div>
                            <div className="mt-4">
                                <p className={labelClass}>Item Description</p>
                                <p className={valueClass + ' whitespace-pre-wrap'}>{po.item_description ?? '—'}</p>
                            </div>
                        </section>

                        <section>
                            <p className={sectionTitleClass}>Requisition & Reference</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Detail label="PR No." value={po.pr_number ?? '—'} />
                                <Detail label="PR Date" value={formatDate(po.pr_date)} />
                                <Detail label="Philgeps Reference No." value={po.philgeps_reference_no ?? '—'} />
                            </div>
                        </section>

                        <section>
                            <p className={sectionTitleClass}>Financial Details</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Detail label="Total Amount ABC" value={formatCurrency(po.total_amount_abc)} />
                                <Detail label="Total Amount PO" value={formatCurrency(po.total_amount_po)} />
                                <Detail label="Total Amount Difference" value={formatCurrency(po.total_amount_diff)} />
                                <Detail label="Fund Cluster" value={po.fundCluster?.fund_cluster_id ?? po.fund_cluster_id ?? '—'} />
                                <Detail label="ORS/BURS No." value={po.ors_burs_no ?? '—'} />
                                <Detail label="ORS/BURS Date" value={formatDate(po.ors_burs_date)} />
                                <Detail label="Responsibility Center" value={po.responsibility_center ?? '—'} />
                                <Detail label="UACS Object Code" value={po.uacs_object_code ?? '—'} />
                            </div>
                        </section>

                        <section>
                            <p className={sectionTitleClass}>Supplier & End User</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Detail label="Supplier" value={po.supplier?.supplier_name ?? '—'} />
                                <Detail label="End User" value={po.office?.office_name ?? po.end_user ?? '—'} />
                            </div>
                        </section>

                        <section>
                            <p className={sectionTitleClass}>Processing Trail</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Detail label="Date Forwarded to SMU" value={formatDate(po.date_forwarded_to_smu)} />
                                <Detail label="COA Processed Date" value={formatDate(po.coa_processed_date)} />
                                <Detail label="Date Forwarded to Frontdesk" value={formatDate(po.date_forwarded_frontdesk)} />
                            </div>
                        </section>

                        <section className="border-t pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
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
                                        const isImage = type === "image";

                                        return (
                                            <div
                                                key={att.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => (isImage ? setPreviewAttachment(att) : window.open(att.url, '_blank', 'noopener,noreferrer'))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        isImage ? setPreviewAttachment(att) : window.open(att.url, '_blank', 'noopener,noreferrer');
                                                    }
                                                }}
                                                className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
                                            >
                                                <div className="h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                    {isImage ? (
                                                        <img src={att.url} alt={att.original_name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <FileIcon type={type} />
                                                    )}
                                                </div>

                                                <p className="flex-1 truncate text-sm">{att.original_name}</p>

                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                                                    {getExtension(att.original_name).toUpperCase()}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                    </div>
                                </ScrollArea>
                            )}

                            <Separator className="mt-4" />
                        </section>
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