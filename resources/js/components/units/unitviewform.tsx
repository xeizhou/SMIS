import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UnitRecord {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unit: UnitRecord | null;
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

export default function UnitViewForm({ open, onOpenChange, unit }: Props) {
    if (!unit) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Unit Details</DialogTitle>
                        </DialogHeader>

                        <div className="mt-4 space-y-6">
                            {/* Section: Unit Identity */}
                            <section>
                                <p className={sectionTitleClass}>Unit Identity</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Detail label="Unit ID" value={String(unit.unitID)} />
                                    <Detail label="Unit Name" value={unit.unit_name} />
                                    <Detail label="Short Name" value={unit.unit_short_name} />
                                </div>
                            </section>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}