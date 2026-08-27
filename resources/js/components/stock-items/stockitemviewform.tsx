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
    fund_cluster_id: string | null;
    fund_cluster?: FundCluster | null;
    units?: Unit[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stock: StockItem | null;
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

export default function StockItemViewForm({ open, onOpenChange, stock }: Props) {
    if (!stock) {
        return null;
    }

    const fundClusterLabel = stock.fund_cluster
        ? `${stock.fund_cluster.fund_cluster_id} - ${stock.fund_cluster.fund_description}`
        : stock.fund_cluster_id ?? '—';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Stock Item Details</DialogTitle>
                        </DialogHeader>

                        <div className="mt-4 space-y-6">
                            {/* Section: Item Details */}
                            <section>
                                <p className={sectionTitleClass}>Item Details</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Detail label="Stock No." value={stock.stock_no} />
                                    <Detail label="Item Name" value={stock.item_name} />
                                    <div className="sm:col-span-2">
                                        <Detail label="Description" value={stock.description ?? '—'} />
                                    </div>
                                    <Detail label="Fund Cluster" value={fundClusterLabel} />
                                </div>
                            </section>

                            {/* Section: Units Configuration */}
                            <section>
                                <p className={sectionTitleClass}>Units Configuration</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Detail label="Default Unit" value={(stock.units?.find(u => u.pivot?.is_default) || stock.units?.[0])?.unit_short_name ?? '—'} />
                                    <Detail label="All Units" value={stock.units?.map(u => u.unit_short_name).join(', ') ?? '—'} />
                                </div>
                            </section>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}