import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface BonaVidaRecord {
    bvm_id: number;
    date_received: string;
    office_code: string;
    qty: number;
    price: string;
    total_amount: string;
    invoice_no: number;
    invoice_date: string;
    remarks: string | null;
    office?: {
        office_name: string;
    };
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: BonaVidaRecord | null;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';

function Detail({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <p className={valueClass}>{value}</p>
        </div>
    );
}

export default function BonaVidaViewForm({ open, onOpenChange, record }: Props) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Bona Vida Record Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Detail label="Date Received" value={record.date_received ? new Date(record.date_received).toLocaleDateString() : '—'} />
                    <Detail label="Office" value={record.office?.office_name ?? record.office_code} />
                    <Detail label="Quantity" value={record.qty} />
                    <Detail label="Price" value={`₱${record.price}`} />
                    <Detail label="Total Amount" value={`₱${record.total_amount}`} />
                    <Detail label="Invoice No" value={record.invoice_no} />
                    <Detail label="Invoice Date" value={record.invoice_date ? new Date(record.invoice_date).toLocaleDateString() : '—'} />
                    <div className="md:col-span-2">
                        <Detail label="Remarks" value={record.remarks ?? '—'} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
