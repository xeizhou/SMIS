import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface Office {
    office_code: string;
    office_name: string | null;
}

interface StockItem {
    stock_no: string;
    item_name: string;
    description: string | null;
}

interface TransactionRecord {
    transactionID: number;
    transaction_type: string;
    fund_cluster: string | null;
    fund_cluster_detail?: FundCluster | null;
    transaction_date: string | null;
    stock_no: string | null;
    stockItem?: StockItem | null;
    item_name: string;
    description: string | null;
    unitID: number | null;
    unit?: Unit | null;
    reference: string;
    quantity: number;
    office_code: string;
    office?: Office | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: TransactionRecord | null;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-3 pb-2 border-b';

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <p className={`${valueClass} ${className || ''}`}>{value}</p>
        </div>
    );
}

function formatDate(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function TransactionViewForm({ open, onOpenChange, transaction }: Props) {
    if (!transaction) {
        return null;
    }

    const fundClusterLabel = transaction.fund_cluster_detail
        ? `${transaction.fund_cluster_detail.fund_cluster_id} - ${transaction.fund_cluster_detail.fund_description}`
        : transaction.fund_cluster ?? '—';

    const unitLabel = transaction.unit
        ? `${transaction.unit.unit_name} (${transaction.unit.unit_short_name})`
        : '—';

    const officeLabel = transaction.office?.office_name ?? transaction.office_code ?? '—';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Transaction Details — #{transaction.transactionID}</DialogTitle>
                        </DialogHeader>

                        <div className="mt-4 space-y-6">
                            {/* Section: Transaction Info */}
                            <section>
                                <p className={sectionTitleClass}>Transaction Info</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Detail label="Transaction Type" value={transaction.transaction_type} />
                                    <Detail label="Transaction Date" value={formatDate(transaction.transaction_date)} />
                                    <Detail label="Reference" value={transaction.reference} />
                                    <Detail label="Fund Cluster" value={fundClusterLabel} />
                                    <Detail label="Office" value={officeLabel} />
                                </div>
                            </section>

                            {/* Section: Item Details */}
                            <section>
                                <p className={sectionTitleClass}>Item Details</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Detail label="Stock No." value={transaction.stock_no ?? '—'} />
                                    <Detail label="Item Name" value={transaction.item_name} />
                                    <Detail label="Unit" value={unitLabel} />
                                    <Detail label="Quantity" value={String(transaction.quantity)} />
                                    <div className="sm:col-span-3">
                                        <Detail label="Description" value={transaction.description ?? '—'} className="whitespace-pre-wrap" />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}