import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import type { RRPPEMonitoring } from '@/pages/rrppe-monitoring/index';

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
                            <Detail label="RRPPE No." value={item.rrppe_no} />
                            <Detail label="Date Received" value={item.date_received} />
                            <div className="sm:col-span-3">
                                <Detail label="Item Description" value={item.item_description} />
                            </div>
                        </div>
                    </section>
                    <section>
                        <p className={sectionTitleClass}>Asset Details</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="Quantity" value={item.quantity} />
                            <Detail label="Property No." value={item.property_no} />
                            <Detail label="Cost" value={formatCurrency(item.cost)} />
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Assignment & Status</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="End User Name" value={item.end_user_name || '-'} />
                            <Detail label="Area" value={item.area || '-'} />
                            <Detail label="Status" value={
                                item.status ? (
                                    <span
                                        className={
                                            item.status === 'SERVICEABLE'
                                                ? 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
                                                : 'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
                                        }
                                    >
                                        {item.status}
                                    </span>
                                ) : (
                                    '-'
                                )
                            } />
                            <div className="sm:col-span-3">
                                <Detail label="Remarks" value={item.remarks || '-'} />
                            </div>
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
