import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
}

interface DeliveryRecord {
    delivery_id: string;
    po_number: string;
    supplier_id: number | null;
    supplier?: SupplierOption | null;
    delivery_date: string | null;
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
    if (value === null || value === undefined) {
return '—';
}

    const numeric = typeof value === 'string' ? parseFloat(value) : value;

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

export default function DeliveryViewForm({ open, onOpenChange, delivery }: Props) {
    if (!delivery) {
return null;
}

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto" style={{ maxWidth: '800px' }}>
                <DialogHeader>
                    <DialogTitle>Delivery Details — {delivery.po_number}</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-6">
                    <section>
                        <p className={sectionTitleClass}>Delivery Information</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="PO Number" value={delivery.po_number} />
                            <Detail label="Supplier" value={delivery.supplier?.supplier_name ?? '—'} />
                            <Detail label="Date of Delivery" value={formatDate(delivery.delivery_date)} />
                            <Detail label="PO Date Received" value={formatDate(delivery.po_date_received)} />
                            <Detail label="Delivery Term" value={delivery.delivery_term ?? '—'} />
                            <Detail label="Due Date" value={formatDate(delivery.due_date)} />
                            <Detail label="No. of Days (LD)" value={delivery.no_of_days_ld ? String(delivery.no_of_days_ld) : '—'} />
                            <Detail label="Status" value={delivery.status ?? '—'} />
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
