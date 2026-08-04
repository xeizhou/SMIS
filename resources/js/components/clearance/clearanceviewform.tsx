import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OfficeOption {
    office_code: string;
    office_name: string;
}

interface ClearanceRecord {
    clearance_id: number;
    name: string;
    office: string | OfficeOption;
    claim_date: string;
    received_by: string;
    status: string;
    cleared: boolean | string;
    pending: boolean | string;
    remarks: string | null;
    office_data?: OfficeOption | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: ClearanceRecord | null;
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

function formatBooleanValue(value: boolean | string): string {
    return value === true || value === 'true' || value === '1' ? 'Yes' : 'No';
}

export default function ClearanceViewForm({ open, onOpenChange, record }: Props) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Clearance Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-6">
                    {/* Section: Requester Information */}
                    <section>
                        <p className={sectionTitleClass}>Requester Information</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="Name" value={record.name} />
                            <Detail label="Office" value={typeof record.office === 'string' ? record.office : record.office?.office_name ?? record.office_data?.office_name ?? '—'} />
                            <Detail label="Claim Date" value={new Date(record.claim_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} />
                        </div>
                    </section>

                    {/* Section: Processing Details */}
                    <section>
                        <p className={sectionTitleClass}>Processing Details</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Detail label="Received By" value={record.received_by} />
                            <Detail label="Status" value={record.status} />
                            <Detail label="Cleared" value={formatBooleanValue(record.cleared)} />
                            <Detail label="Pending" value={formatBooleanValue(record.pending)} />
                        </div>
                    </section>

                    {/* Section: Remarks */}
                    <section>
                        <p className={sectionTitleClass}>Remarks</p>
                        <Detail label="Remarks" value={record.remarks ?? '—'} />
                    </section>
                </div>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
