import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';


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
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-3 pb-2 border-b';

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
            <DialogContent className="max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Bona Vida Record Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-6">
                    {/* Section: General Information */}
                    <section>
                        <p className={sectionTitleClass}>General Information</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Detail label="Date Received" value={record.date_received ? new Date(record.date_received).toLocaleDateString() : '—'} />
                            <Detail label="Office" value={record.office?.office_name ?? record.office_code} />
                            <div className="sm:col-span-2">
                                <Detail label="Remarks" value={record.remarks ?? '—'} />
                            </div>
                        </div>
                    </section>

                    {/* Section: Pricing Details */}
                    <section>
                        <p className={sectionTitleClass}>Pricing Details</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="Quantity" value={record.qty} />
                            <Detail label="Price" value={`₱${record.price}`} />
                            <Detail label="Total Amount" value={`₱${record.total_amount}`} />
                        </div>
                    </section>

                    {/* Section: Invoice Information */}
                    <section>
                        <p className={sectionTitleClass}>Invoice Information</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Detail label="Invoice No" value={record.invoice_no} />
                            <Detail label="Invoice Date" value={record.invoice_date ? new Date(record.invoice_date).toLocaleDateString() : '—'} />
                        </div>
                    </section>
                </div>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
