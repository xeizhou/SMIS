import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
    pivot?: {
        is_default: boolean;
    };
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface StockItem {
    stock_no: string;
    item_name: string;
    description: string | null;
    on_hand_quantity: number;
    re_order_point: number;
    fund_cluster_id: string | null;
    remarks: string | null;
    units?: Unit[];
    fund_cluster: FundCluster | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stock: StockItem | null;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <p className={valueClass}>{value}</p>
        </div>
    );
}

export default function StockItemViewForm({ open, onOpenChange, stock }: Props) {
    if (!stock) {
return null;
}

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Stock Item Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4 grid grid-cols-2 gap-4">
                    <Detail label="Stock No." value={stock.stock_no} />
                    <Detail label="Item Name" value={stock.item_name} />
                    <div className="col-span-2">
                        <Detail label="Description" value={stock.description ?? '—'} />
                    </div>
                    <Detail label="Unit" value={(stock.units?.find(u => u.pivot?.is_default) || stock.units?.[0])?.unit_short_name ?? '—'} />
                    <Detail label="Fund Cluster" value={stock.fund_cluster?.fund_description ?? '—'} />
                    <Detail label="On Hand Qty" value={String(stock.on_hand_quantity)} />
                    <Detail label="Re-order Point" value={String(stock.re_order_point)} />
                    <div className="col-span-2">
                        <Detail label="Remarks" value={stock.remarks ?? '—'} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}