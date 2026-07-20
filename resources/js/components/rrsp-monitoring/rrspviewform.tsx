import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface RrspMonitoring {
    id: string;
    rrspNo: string;
    dateReceived: string | null;
    itemDescription: string;
    quantity: number;
    propertyNo: string | null;
    endUserName: string | null;
    cost: number | null;
    kindOfSemiExpendable: string | null;
    status: string | null;
    area: string | null;
    createdAt: string | null;
    updatedAt: string | null;
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

    const numeric = typeof value === 'string'
        ? parseFloat(value)
        : value;

    if (Number.isNaN(numeric)) return '—';

    return numeric.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });
}

function formatDate(value: string | null) {
    if (!value) return '—';

    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function RrspViewForm({
    open,
    onOpenChange,
    rrsp,
}: Props) {
    if (!rrsp) return null;

return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
            className="w-[95vw] max-h-[90vh] overflow-y-auto"
            style={{ maxWidth: '800px' }}
        >
            <DialogHeader>
                <DialogTitle>
                    RRSP Details — {rrsp.rrspNo}
                </DialogTitle>
            </DialogHeader>

            <div className="mt-2 space-y-6">
                {/* RRSP Information */}
                <section>
                    <p className={sectionTitleClass}>
                        RRSP Information
                    </p>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Detail
                            label="RRSP Number"
                            value={rrsp.rrspNo}
                        />

                        <Detail
                            label="Date Received"
                            value={formatDate(rrsp.dateReceived)}
                        />

                        <Detail
                            label="Status"
                            value={rrsp.status ?? '—'}
                        />

                        <Detail
                            label="Area"
                            value={rrsp.area ?? '—'}
                        />

                        <Detail
                            label="Kind of Semi-Expendable"
                            value={rrsp.kindOfSemiExpendable ?? '—'}
                        />
                    </div>
                </section>

                {/* Item Details */}
                <section>
                    <p className={sectionTitleClass}>
                        Item Details
                    </p>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Detail
                            label="Item Description"
                            value={rrsp.itemDescription ?? '—'}
                        />

                        <Detail
                            label="Quantity"
                            value={rrsp.quantity.toString()}
                        />

                        <Detail
                            label="Property Number"
                            value={rrsp.propertyNo ?? '—'}
                        />

                        <Detail
                            label="Cost"
                            value={formatCurrency(rrsp.cost)}
                        />
                    </div>
                </section>

                {/* Assignment */}
                <section>
                    <p className={sectionTitleClass}>
                        Assignment
                    </p>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Detail
                            label="End User"
                            value={rrsp.endUserName ?? '—'}
                        />
                    </div>
                </section>
            </div>
        </DialogContent>
    </Dialog>
);
}