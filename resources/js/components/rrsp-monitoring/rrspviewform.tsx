import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { File, FileImage, FileText, FileSpreadsheet, FileArchive, ExternalLink } from 'lucide-react';

interface RrspItem {
    id: number;
    itemName: string;
    itemDescription: string;
    quantity: number;
    propertyNo: string | null;
    kindOfSemiExpendable: string | null;
    status: string | null;
    area: string | null;
    cost?: number | null;
    remarks?: string | null;
}

interface RrspAttachment {
    id: number;
    originalName: string;
    url: string;
    mimeType: string | null;
    fileSize: number | null;
}

interface RrspMonitoring {
    id: string;
    rrspNo: string;
    poNumber: string | null;
    dateReceived: string | null;
    endUserName: string | null;
    returnBy: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    items?: RrspItem[];
    attachments?: RrspAttachment[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rrsp: RrspMonitoring | null;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';
const sectionTitleClass =
    'text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-3 pb-2 border-b';

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <div className={valueClass}>{value}</div>
        </div>
    );
}

function formatCurrency(value: string | number | null | undefined) {
    if (value === null || value === undefined) {
return '—';
}

    const numeric = typeof value === 'string'
        ? parseFloat(value)
        : value;

    if (Number.isNaN(numeric)) {
return '—';
}

    return numeric.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });
}

function formatDate(value: string | null) {
    if (!value) {
return '—';
}

    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
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

function FileTypeIcon({ type }: { type: string }) {
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

interface PreviewTarget {
    name: string;
    url: string;
}

export default function RrspViewForm({
    open,
    onOpenChange,
    rrsp,
}: Props) {
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

    if (!rrsp) {
return null;
}

    const openAttachmentPreview = (att: RrspAttachment) => {
        const type = getFileType(att.originalName);
        if (type === 'image') {
            setPreviewTarget({ name: att.originalName, url: att.url });
        } else {
            window.open(att.url, '_blank', 'noopener,noreferrer');
        }
    };

return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
            className="w-[95vw] max-h-[95vh] overflow-hidden p-0"
            style={{ maxWidth: '1000px' }}
        >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
            <DialogHeader>
                <DialogTitle>
                    RRSP Details — {rrsp.rrspNo}
                </DialogTitle>
            </DialogHeader>

            <div className="mt-2 space-y-6">
                <section>
                    <p className={sectionTitleClass}>General Information</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <Detail label="RRSP No." value={rrsp.rrspNo} />
                        <Detail label="PO No." value={rrsp.poNumber} />
                        <Detail label="Date Received" value={formatDate(rrsp.dateReceived)} />
                        <Detail label="End User" value={rrsp.endUserName ?? '—'} />
                        <Detail label="Return By" value={rrsp.returnBy ?? '—'} />
                    </div>
                </section>

                <section>
                    <p className={sectionTitleClass}>Items ({rrsp.items?.length ?? 0})</p>
                    <div className="space-y-4">
                        {rrsp.items?.map((item, index) => (
                            <div key={item.id} className="rounded-md border p-4 bg-muted/20">
                                <h4 className="mb-3 text-sm font-medium border-b pb-2">Item #{index + 1}</h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                    <div className="sm:col-span-2">
                                        <Detail label="Item Name" value={item.itemName ?? '—'} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Detail label="Item Description" value={item.itemDescription ?? '—'} />
                                    </div>
                                    <Detail label="Quantity" value={item.quantity?.toString() ?? '—'} />
                                    <Detail label="Property No." value={item.propertyNo ?? '—'} />
                                    <Detail label="Kind of Semi-Expendable" value={item.kindOfSemiExpendable ?? '—'} />
                                    <Detail label="Cost" value={formatCurrency(item.cost)} />
                                    <Detail label="Area" value={item.area ?? '—'} />
                                    <Detail label="Status" value={<StatusBadge status={item.status} />} />
                                    {item.status === 'UNSERVICEABLE' && (
                                        <div className="sm:col-span-4 mt-2">
                                            <Detail label="Remarks / Findings" value={item.remarks ?? '—'} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <p className={sectionTitleClass}>Attachments ({rrsp.attachments?.length ?? 0})</p>
                    {rrsp.attachments && rrsp.attachments.length > 0 ? (
                        <ScrollArea className="max-h-[220px]">
                            <div className="space-y-1.5">
                                {rrsp.attachments.map((att) => {
                                    const type = getFileType(att.originalName);
                                    return (
                                        <div
                                            key={att.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => openAttachmentPreview(att)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    openAttachmentPreview(att);
                                                }
                                            }}
                                            className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
                                        >
                                            <div className="h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                {type === 'image' ? (
                                                    <img
                                                        src={att.url}
                                                        alt={att.originalName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <FileTypeIcon type={type} />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm">{att.originalName}</p>
                                                {att.fileSize != null && (
                                                    <p className="text-[11px] text-muted-foreground">{formatBytes(att.fileSize)}</p>
                                                )}
                                            </div>
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                {getExtension(att.originalName).toUpperCase()}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="text-sm text-muted-foreground">No attachments.</p>
                    )}
                </section>
            </div>
        </div>
                </ScrollArea>
            </DialogContent>
    </Dialog>

    {/* Image Lightbox */}
    <Dialog open={!!previewTarget} onOpenChange={(o) => !o && setPreviewTarget(null)}>
        <DialogContent className="w-[95vw] p-0 overflow-hidden" style={{ maxWidth: '900px' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <p className="text-sm font-medium truncate pr-4">
                    {previewTarget?.name}
                </p>
                <Button variant="ghost" size="icon" className="h-7 w-7 mr-6" asChild>
                    <a
                        href={previewTarget?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in new tab"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </Button>
            </div>
            <div className="flex items-center justify-center bg-muted/30 p-4 max-h-[80vh] overflow-auto">
                {previewTarget && (
                    <img
                        src={previewTarget.url}
                        alt={previewTarget.name}
                        className="max-w-full max-h-[75vh] object-contain rounded"
                    />
                )}
            </div>
        </DialogContent>
    </Dialog>
    </>
);
}