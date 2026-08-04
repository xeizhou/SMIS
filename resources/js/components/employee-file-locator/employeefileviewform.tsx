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
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-3 pb-2 border-b';

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
            <DialogContent className="max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Employee File Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-6">
                    {/* Section: Employee Name */}
                    <section>
                        <p className={sectionTitleClass}>Employee Name</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Detail label="First Name" value={record.first_name} />
                            <Detail label="Middle Name" value={record.middle_name ?? '—'} />
                            <Detail label="Last Name" value={record.last_name} />
                        </div>
                    </section>

                    {/* Section: Assignment Details */}
                    <section>
                        <p className={sectionTitleClass}>Assignment Details</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Detail label="Area" value={record.area} />
                            <Detail label="Status" value={record.status} />
                        </div>
                    </section>
                </div>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
