import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import type { ITRPTRMonitoring } from '@/pages/itr-ptr-monitoring/index';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: ITRPTRMonitoring | null;
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

export default function ItrPtrViewModal({ open, onOpenChange, item }: Props) {
    if (!item) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw]" style={{ maxWidth: '1000px' }}>
                <DialogHeader>
                    <DialogTitle>View ITR/PTR Record</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-6">
                    <section>
                        <p className={sectionTitleClass}>General Information</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Detail label="Transaction No." value={item.transaction_no} />
                            <Detail label="Property No." value={item.property_no} />
                            <Detail label="Date Release" value={item.date_release} />
                            <Detail label="Date Received" value={item.date_received} />
                            <div className="sm:col-span-2">
                                <Detail label="Description" value={item.description} />
                            </div>
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Assessment & Location</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="Location" value={item.location} />
                            <Detail label="Amount" value={formatCurrency(item.amount)} />
                            <Detail label="Condition of PPE" value={item.condition_of_ppe} />
                            {item.condition_of_ppe === 'Unserviceable' && (
                                <div className="sm:col-span-3 mt-2">
                                    <Detail label="Remarks / Findings" value={item.remarks || '-'} />
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Accountability</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="Claimed By" value={item.claimed_by} />
                            <Detail label="From Accountable Officer" value={item.from_accountable_officer} />
                            <Detail label="To Accountable Officer" value={item.to_accountable_officer} />
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
