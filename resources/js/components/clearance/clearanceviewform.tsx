import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { ExternalLink, File, FileImage, FileText, FileSpreadsheet, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OfficeOption {
    office_code: string;
    office_name: string;
}


interface Attachment {
    id: number;
    original_name: string;
    file_size: number;
    created_at: string;
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

function FileIcon({ type }: { type: string }) {
    switch (type) {
        case 'image': return <FileImage className="h-5 w-5 text-blue-500" />;
        case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
        case 'word': return <FileText className="h-5 w-5 text-blue-600" />;
        case 'excel': return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
        case 'archive': return <FileArchive className="h-5 w-5 text-yellow-600" />;
        default: return <File className="h-5 w-5 text-muted-foreground" />;
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

interface ClearanceRecord {
    clearance_id: number;
    name: string;
    office: string | OfficeOption;
    claim_date: string;
    received_by: string;
    status: string;
    cleared: boolean | string;
    pending: boolean | string;
    remarks: string | null;
    office_data?: OfficeOption | null;
    attachments?: Attachment[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: ClearanceRecord | null;
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

function formatBooleanValue(value: boolean | string): string {
    return value === true || value === 'true' || value === '1' ? 'Yes' : 'No';
}


export default function ClearanceViewForm({ open, onOpenChange, record }: Props) {
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

    const openExistingAttachmentPreview = (att: Attachment) => {
        const type = getFileType(att.original_name);
        if (type === 'image') {
            setPreviewTarget({ name: att.original_name, url: att.url });
        } else {
            window.open(att.url, '_blank', 'noopener,noreferrer');
        }
    };

    if (!record) {
        return null;
    }

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Clearance Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-6">
                    {/* Section: Requester Information */}
                    <section>
                        <p className={sectionTitleClass}>Requester Information</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="Name" value={record.name} />
                            <Detail label="Office" value={typeof record.office === 'string' ? record.office : record.office?.office_name ?? record.office_data?.office_name ?? '—'} />
                            <Detail label="Claim Date" value={new Date(record.claim_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} />
                        </div>
                    </section>

                    {/* Section: Processing Details */}
                    <section>
                        <p className={sectionTitleClass}>Processing Details</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Detail label="Received By" value={record.received_by} />
                            <Detail label="Status" value={record.status} />
                            <Detail label="Cleared" value={formatBooleanValue(record.cleared)} />
                            <Detail label="Pending" value={formatBooleanValue(record.pending)} />
                        </div>
                    </section>

                    {/* Section: Remarks */}
                    <section>
                        <p className={sectionTitleClass}>Remarks</p>
                        <Detail label="Remarks" value={record.remarks ?? '—'} />
                    </section>

                    {/* Section: Attachments */}
                    {record.attachments && record.attachments.length > 0 && (
                        <section>
                            <p className={sectionTitleClass}>Attachments</p>
                            <ScrollArea className="max-h-[180px]">
                                <div className="space-y-1.5">
                                    {record.attachments.map((att) => {
                                        const type = getFileType(att.original_name);
                                        return (
                                            <div
                                                key={att.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => openExistingAttachmentPreview(att)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        openExistingAttachmentPreview(att);
                                                    }
                                                }}
                                                className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
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
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm">{att.original_name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{formatBytes(att.file_size)}</p>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] h-5">
                                                    {getExtension(att.original_name).toUpperCase()}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </section>
                    )}
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

