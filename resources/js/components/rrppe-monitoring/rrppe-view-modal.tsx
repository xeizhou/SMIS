import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import type { RRPPEMonitoring } from '@/pages/rrppe-monitoring/index';

import { StatusBadge } from '@/components/ui/status-badge';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: RRPPEMonitoring | null;
}

const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined || amount === '') {
        return '-';
    }

    const num = Number(amount);

    if (isNaN(num)) {
        return '-';
    }

    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(num);
};

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-3 pb-2 border-b';

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <div className={valueClass}>{value}</div>
        </div>
    );
}

export default function RrppeViewModal({ open, onOpenChange, item }: Props) {
    if (!item) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw]" style={{ maxWidth: '1000px' }}>
                <DialogHeader>
                    <DialogTitle>View RRPPE Record</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-6">
                    <section>
                        <p className={sectionTitleClass}>General Information</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="RRPPE No." value={item.rrppeNo} />
                            <Detail label="Date Received" value={item.dateReceived} />
                            <Detail label="End User Name" value={item.endUserName || '-'} />
                            <Detail label="Return By" value={item.returnBy || '-'} />
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Items</p>
                        <div className="space-y-6">
                            {item.items && item.items.length > 0 ? (
                                item.items.map((i, index) => (
                                    <div key={index} className="rounded-md border p-4 bg-muted/10">
                                        <h4 className="mb-3 text-sm font-medium">Item #{index + 1}</h4>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                            <Detail label="Item Name" value={i.itemName || '-'} />
                                            <Detail label="Item Description" value={i.itemDescription || '-'} />
                                            <Detail label="Quantity" value={i.quantity || '-'} />
                                            <Detail label="Property No." value={i.propertyNo || '-'} />
                                            <Detail label="Cost" value={formatCurrency(i.cost)} />
                                            <Detail label="Area" value={i.area || '-'} />
                                            <Detail label="Status" value={<StatusBadge status={i.status} />} />
                                            {i.status === 'UNSERVICEABLE' && (
                                                <div className="sm:col-span-3">
                                                    <Detail label="Remarks / Findings" value={i.remarks || '-'} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No items available.</p>
                            )}
                        </div>
                    </section>
                </div>
                <DialogFooter className="mt-6">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
