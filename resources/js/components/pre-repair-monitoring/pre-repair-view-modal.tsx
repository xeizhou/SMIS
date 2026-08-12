import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import type { PreRepairMonitoring } from '@/pages/pre-repair-monitoring/index';
import { StatusBadge } from '@/components/ui/status-badge';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: PreRepairMonitoring | null;
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

export default function PreRepairViewModal({
    open,
    onOpenChange,
    item,
}: Props) {
    if (!item) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw]" style={{ maxWidth: '1000px' }}>
                <DialogHeader>
                    <DialogTitle>View Pre-Repair Record</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-6">
                    <section>
                        <p className={sectionTitleClass}>General Information</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="Transaction No." value={item.transaction_no} />
                            <Detail label="Pre-Repair No." value={item.pre_repair_no} />
                            <Detail label="Property No." value={item.property_no} />
                            <div className="sm:col-span-3">
                                <Detail label="Description" value={item.description} />
                            </div>
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Assessment & Location</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="Location" value={item.location} />
                            <Detail label="Amount" value={formatCurrency(item.amount)} />
                            <Detail label="Condition of PPE" value={<StatusBadge status={item.condition_of_ppe} />} />
                            
                            {item.condition_of_ppe === 'UNSERVICEABLE' && (
                                <div className="sm:col-span-3">
                                    <Detail label="Remarks / Findings" value={item.remarks || '-'} />
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Accountability</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
