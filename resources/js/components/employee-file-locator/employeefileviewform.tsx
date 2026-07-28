import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface EmployeeFileRecord {
    efr_id: number;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    area: string;
    status: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: EmployeeFileRecord | null;
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

export default function EmployeeFileViewForm({ open, onOpenChange, record }: Props) {
    if (!record) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Employee File Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Detail label="Last Name" value={record.last_name} />
                    <Detail label="First Name" value={record.first_name} />
                    <Detail label="Middle Name" value={record.middle_name ?? '—'} />
                    <Detail label="Area" value={record.area} />
                    <div className="md:col-span-2">
                        <Detail label="Status" value={record.status} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
