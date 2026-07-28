import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <p className={valueClass}>{value}</p>
        </div>
    );
}

function formatBooleanValue(value: boolean | string): string {
    return value === true || value === 'true' || value === 1 || value === '1' ? 'Yes' : 'No';
}

export default function ClearanceViewForm({ open, onOpenChange, record }: Props) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Clearance Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Detail label="Name" value={record.name} />
                    <Detail label="Office" value={typeof record.office === 'string' ? record.office : record.office?.office_name ?? record.office_data?.office_name ?? '—'} />
                    <Detail label="Claim Date" value={new Date(record.claim_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} />
                    <Detail label="Received By" value={record.received_by} />
                    <Detail label="Status" value={record.status} />
                    <Detail label="Cleared" value={formatBooleanValue(record.cleared)} />
                    <Detail label="Pending" value={formatBooleanValue(record.pending)} />
                    <div className="md:col-span-2">
                        <Detail label="Remarks" value={record.remarks ?? '—'} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
