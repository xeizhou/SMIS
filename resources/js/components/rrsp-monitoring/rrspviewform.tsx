import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RrspItem {
    id: number;
    itemDescription: string;
    quantity: number;
    propertyNo: string | null;
    cost: number | null;
    kindOfSemiExpendable: string | null;
    status: string | null;
    area: string | null;
    remarks?: string | null;
}

interface RrspMonitoring {
    id: string;
    rrspNo: string;
    dateReceived: string | null;
    endUserName: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    items?: RrspItem[];
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

export default function RrspViewForm({
    open,
    onOpenChange,
    rrsp,
}: Props) {
    if (!rrsp) {
return null;
}

return (
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Detail label="RRSP No." value={rrsp.rrspNo} />
                        <Detail label="Date Received" value={formatDate(rrsp.dateReceived)} />
                        <Detail label="End User" value={rrsp.endUserName ?? '—'} />
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
                                        <Detail label="Item Description" value={item.itemDescription ?? '—'} />
                                    </div>
                                    <Detail label="Quantity" value={item.quantity?.toString() ?? '—'} />
                                    <Detail label="Property No." value={item.propertyNo ?? '—'} />
                                    <Detail label="Cost" value={formatCurrency(item.cost)} />
                                    <Detail label="Kind of Semi-Expendable" value={item.kindOfSemiExpendable ?? '—'} />
                                    <Detail label="Area" value={item.area ?? '—'} />
                                    <Detail label="Status" value={item.status ?? '—'} />
                                    {item.status === 'Unserviceable' && (
                                        <div className="sm:col-span-4 mt-2">
                                            <Detail label="Remarks / Findings" value={item.remarks ?? '—'} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
                </ScrollArea>
            </DialogContent>
    </Dialog>
);
}