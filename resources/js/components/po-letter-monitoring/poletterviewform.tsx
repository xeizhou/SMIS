import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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

export default function PoLetterViewForm({ open, onOpenChange, poLetter }: Props) {
    if (!poLetter) {
return null;
}

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto" style={{ maxWidth: '800px' }}>
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
