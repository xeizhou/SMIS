import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OfficeRecord {
    office_code: string;
    office_name: string | null;
    entity_name: string | null;
    office_head: string | null;
    email: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    office: OfficeRecord | null;
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

export default function OfficeViewForm({ open, onOpenChange, office }: Props) {
    if (!office) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Office Details</DialogTitle>
                        </DialogHeader>

                        <div className="mt-4 space-y-6">
                            {/* Section: Office Identity */}
                            <section>
                                <p className={sectionTitleClass}>Office Identity</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Detail label="Office Code" value={office.office_code} />
                                    <Detail label="Office Name" value={office.office_name ?? '—'} />
                                    <Detail label="Entity Name" value={office.entity_name ?? '—'} />
                                </div>
                            </section>

                            {/* Section: Contact Details */}
                            <section>
                                <p className={sectionTitleClass}>Contact Details</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Detail label="Office Head" value={office.office_head ?? '—'} />
                                    <Detail label="Email" value={office.email ?? '—'} />
                                </div>
                            </section>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}