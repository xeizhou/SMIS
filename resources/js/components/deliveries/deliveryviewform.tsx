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
    File,
    FileImage,
    FileText,
    FileSpreadsheet,
    FileArchive,
    ExternalLink,
    Download,
} from "lucide-react";

interface Attachment {
    id: number;
    original_name: string;
    url: string;
}

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
}

interface DeliveryDateRecord {
    delivery_date: string;
}

interface DeliveryRecord {
    delivery_id: string;
    po_number: string;
    supplier_id: number | null;
    supplier?: SupplierOption | null;
    delivery_date: string | null;
    delivery_dates?: DeliveryDateRecord[];
    po_date_received: string | null;
    delivery_term: string | null;
    due_date: string | null;
    no_of_days_ld: number | string | null;
    received_by_1: string | null;
    received_by_2: string | null;
    end_user: string | null;
    place_of_delivery: string | null;
    status: string | null;
    remarks: string | null;
    data_entry_timestamp: string | null;
    total_amount_delivered: string | number | null;
    po_total_amount: string | number | null;
    folder_link: string | null;
    serve_po?: {
        item_description: string | null;
    } | null;
    attachments?: Attachment[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    delivery: DeliveryRecord | null;
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

// Delivery dates render as a chip list rather than a single Detail value,
// since a delivery can now have multiple dates (see delivery_dates relation).
function DeliveryDatesDetail({ delivery }: { delivery: DeliveryRecord }) {
    const dates = delivery.delivery_dates && delivery.delivery_dates.length > 0
        ? delivery.delivery_dates.map((d) => d.delivery_date).filter(Boolean)
        : delivery.delivery_date
            ? [delivery.delivery_date]
            : [];

    return (
        <div>
            <p className={labelClass}>Date(s) of Delivery</p>
            {dates.length === 0 ? (
                <p className={valueClass}>—</p>
            ) : (
                <div className="mt-1 flex flex-wrap gap-1.5">
                    {dates.map((date, index) => (
                        <Badge key={`${date}-${index}`} variant="outline" className="text-xs font-normal">
                            {formatDate(date)}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

function getExtension(filename: string) {
    return filename.split(".").pop()?.toLowerCase() ?? "";
}

function getFileType(filename: string) {
    const ext = getExtension(filename);
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    if (["doc", "docx"].includes(ext)) return "word";
    if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
    if (["zip", "rar", "7z"].includes(ext)) return "archive";
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

/**
 * Unified attachment preview modal — images render inline, PDFs render in an
 * iframe, anything else falls back to an "Open file" action. Uses a Dialog
 * (not a raw div) so it portals and stacks correctly above the parent modal.
 */
function FilePreviewModal({ file, onClose }: { file: Attachment | null; onClose: () => void }) {
    if (!file) return null;

    const type = getFileType(file.original_name);
    const isImage = type === "image";
    const isPdf = type === "pdf";

    return (
        <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="w-[95vw] p-0 overflow-hidden" style={{ maxWidth: '900px' }}>
                <div className="flex items-center justify-between gap-3 border-b p-3 sm:p-4">
                    <p className="truncate text-sm font-medium pr-4">{file.original_name}</p>
                    <div className="flex shrink-0 items-center gap-1 mr-6">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={file.url} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={file.url} download={file.original_name} title="Download">
                                <Download className="h-3.5 w-3.5" />
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="bg-muted/30 flex items-center justify-center p-4 max-h-[80vh] overflow-auto">
                    {isImage ? (
                        <img
                            src={file.url}
                            alt={file.original_name}
                            className="max-w-full max-h-[75vh] object-contain rounded"
                        />
                    ) : isPdf ? (
                        <iframe
                            src={file.url}
                            title={file.original_name}
                            className="h-[75vh] w-full rounded-md border-0 bg-white"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                            <FileText className="text-muted-foreground h-12 w-12" />
                            <p className="text-muted-foreground text-sm">
                                No preview available for this file type.
                            </p>
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm"
                            >
                                Open file
                            </a>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function DeliveryViewForm({ open, onOpenChange, delivery }: Props) {
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

    if (!delivery) return null;

    const attachments = delivery.attachments ?? [];

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[95vw] max-h-[95vh] overflow-hidden p-0" style={{ maxWidth: '800px' }}>
                    <ScrollArea className="max-h-[95vh] w-full">
                        <div className="p-6">
                    <DialogHeader>
                        <DialogTitle>Delivery Details — {delivery.po_number}</DialogTitle>
                    </DialogHeader>

                    <div className="mt-2 space-y-6">
                        <section>
                            <p className={sectionTitleClass}>Delivery Information</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Detail label="PO Number" value={delivery.po_number} />
                                <Detail label="Supplier" value={delivery.supplier?.supplier_name ?? '—'} />
                                <DeliveryDatesDetail delivery={delivery} />
                                <Detail label="PO Date Received" value={formatDate(delivery.po_date_received)} />
                                <Detail label="Delivery Term" value={delivery.delivery_term ?? '—'} />
                                <Detail label="Due Date" value={formatDate(delivery.due_date)} />
                                <Detail label="No. of Days (LD)" value={delivery.no_of_days_ld ? String(delivery.no_of_days_ld) : '0'} />
                                <Detail label="Status" value={delivery.status ?? '—'} />
                            </div>

                            <div className="mt-4">
                                <p className={labelClass}>Item Description</p>
                                <p className={valueClass + ' whitespace-pre-wrap'}>{delivery.serve_po?.item_description ?? '—'}</p>
                            </div>
                        </section>

                        <section>
                            <p className={sectionTitleClass}>Receiving Details</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Detail label="Received By (1)" value={delivery.received_by_1 ?? '—'} />
                                <Detail label="Received By (2)" value={delivery.received_by_2 ?? '—'} />
                                <Detail label="End User" value={delivery.end_user ?? '—'} />
                                <Detail label="Place of Delivery" value={delivery.place_of_delivery ?? '—'} />
                            </div>
                        </section>

                        <section>
                            <p className={sectionTitleClass}>Financials</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Detail label="Total Amount Delivered" value={formatCurrency(delivery.total_amount_delivered)} />
                                <Detail label="PO Total Amount" value={formatCurrency(delivery.po_total_amount)} />
                                <Detail label="Data Entry Timestamp" value={formatDate(delivery.data_entry_timestamp)} />
                            </div>
                        </section>

                        <section>
                            <p className={sectionTitleClass}>Remarks & Links</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Detail label="Remarks" value={delivery.remarks ?? '—'} />
                                <Detail label="Folder Link" value={delivery.folder_link ?? '—'} />
                            </div>
                        </section>

                        {/* Attachments Section */}
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
                                                    onClick={() => setPreviewAttachment(att)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            setPreviewAttachment(att);
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

            <FilePreviewModal
                file={previewAttachment}
                onClose={() => setPreviewAttachment(null)}
            />
        </>
    );
}