import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Eye,
    File,
    FileImage,
    FileText,
    FileSpreadsheet,
    FileArchive,
} from 'lucide-react';

interface Attachment {
    id: number;
    original_name: string;
    url: string;
}

interface PoLetterRecord {
    id: number;
    reference_no: string | null;
    supplier_id: number | null;
    po_number: string;
    po_date: string | null;
    date_received_by_supplier: string | null;
    delivery_term: string | null;
    due_date: string | null;
    office_end_user: string;
    type_of_letter: string;
    date_received_by_smu: string | null;
    date_forwarded_to_ovpad: string | null;
    received_by: string | null;
    status_of_the_letter: string;
    document_link: string | null;
    date_forwarded_to_end_user: string | null;
    remarks: string | null;
    supplier?: {
        supplier_name?: string | null;
    } | null;
    serve_po?: {
        item_description?: string | null;
    } | null;
    attachments?: Attachment[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    poLetter: PoLetterRecord | null;
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

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
        return 'image';
    if (ext === 'pdf')
        return 'pdf';
    if (['doc', 'docx'].includes(ext))
        return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext))
        return 'excel';
    if (['zip', 'rar', '7z'].includes(ext))
        return 'archive';
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

export default function PoLetterViewForm({ open, onOpenChange, poLetter }: Props) {
    if (!poLetter) {
        return null;
    }

    const attachments = poLetter.attachments ?? [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-hidden p-0" style={{ maxWidth: '800px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>PO Letter Details — {poLetter.reference_no ?? poLetter.po_number}</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-6">
                    <section>
                        <p className={sectionTitleClass}>Letter Information</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="Reference No." value={poLetter.reference_no ?? '—'} />
                            <Detail label="Supplier" value={poLetter.supplier?.supplier_name ?? '—'} />
                            <Detail label="PO Number" value={poLetter.po_number ?? '—'} />
                            <Detail label="PO Date" value={formatDate(poLetter.po_date)} />
                            <Detail label="Date Received by Supplier" value={formatDate(poLetter.date_received_by_supplier)} />
                            <Detail label="Delivery Term" value={poLetter.delivery_term ?? '—'} />
                            <Detail
                                label="Item Description"
                                value={poLetter.serve_po?.item_description ?? '—'}
                            />
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Tracking & Status</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="Due Date" value={formatDate(poLetter.due_date)} />
                            <Detail label="Office End User" value={poLetter.office_end_user ?? '—'} />
                            <Detail label="Type of Letter" value={poLetter.type_of_letter ?? '—'} />
                            <Detail label="Date Received by SMU" value={formatDate(poLetter.date_received_by_smu)} />
                            <Detail label="Date Forwarded to OVPAD" value={formatDate(poLetter.date_forwarded_to_ovpad)} />
                            <Detail label="Status of the Letter" value={poLetter.status_of_the_letter ?? '—'} />
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Additional Details</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="Received By" value={poLetter.received_by ?? '—'} />
                            <Detail label="Document Link" value={poLetter.document_link ?? '—'} />
                            <Detail label="Date Forwarded to End User" value={formatDate(poLetter.date_forwarded_to_end_user)} />
                            <Detail label="Remarks" value={poLetter.remarks ?? '—'} />
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
                        <Separator className="mt-4" />
                    </section>
                </div>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}