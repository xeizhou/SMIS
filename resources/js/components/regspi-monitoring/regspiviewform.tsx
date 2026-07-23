import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface RegSPIRecord {
    regspi_id: number;
    month_year: string;
    ics_no: string | null;
    rrsp_no: string | null;
    semi_expendable_property_no: string;
    item_description: string;
    estimated_useful_life: number | string | null;
    issued_qty: number | string | null;
    issued_office_officer: string | null;
    returned_qty: number | string | null;
    returned_office_officer: string | null;
    reissued_qty: number | string | null;
    reissued_office_officer: string | null;
    disposed_qty: number | string | null;
    balance_qty: number | string | null;
    amount: number | string | null;
    remarks: string | null;
    rrspMonitoring?: {
        rrsp_no?: string | null;
        item_description?: string | null;
    } | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    regspi: RegSPIRecord | null;
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

function formatCurrency(value: string | number | null | undefined) {
    if (value === null || value === undefined) {
return '—';
}

    const numeric = typeof value === 'string' ? parseFloat(value) : value;

    if (Number.isNaN(numeric)) {
return '—';
}

    return numeric.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });
}

export default function RegSPIViewForm({ open, onOpenChange, regspi }: Props) {
    if (!regspi) {
return null;
}

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto" style={{ maxWidth: '800px' }}>
                <DialogHeader>
                    <DialogTitle>RegSPI Details — {regspi.semi_expendable_property_no}</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-6">
                    <section>
                        <p className={sectionTitleClass}>RegSPI Information</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="Month / Year" value={regspi.month_year ?? '—'} />
                            <Detail label="ICS No." value={regspi.ics_no ?? '—'} />
                            <Detail label="RRSP No." value={regspi.rrsp_no ?? regspi.rrspMonitoring?.rrsp_no ?? '—'} />
                            <Detail label="Semi-Expendable Property No." value={regspi.semi_expendable_property_no ?? '—'} />
                            <Detail label="Item Description" value={regspi.item_description ?? '—'} />
                            <Detail label="Estimated Useful Life" value={regspi.estimated_useful_life ? String(regspi.estimated_useful_life) : '—'} />
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Quantity Tracking</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="Issued Qty" value={String(regspi.issued_qty ?? '—')} />
                            <Detail label="Issued Office / Officer" value={regspi.issued_office_officer ?? '—'} />
                            <Detail label="Returned Qty" value={String(regspi.returned_qty ?? '—')} />
                            <Detail label="Returned Office / Officer" value={regspi.returned_office_officer ?? '—'} />
                            <Detail label="Reissued Qty" value={String(regspi.reissued_qty ?? '—')} />
                            <Detail label="Reissued Office / Officer" value={regspi.reissued_office_officer ?? '—'} />
                            <Detail label="Disposed Qty" value={String(regspi.disposed_qty ?? '—')} />
                            <Detail label="Balance Qty" value={String(regspi.balance_qty ?? '—')} />
                        </div>
                    </section>

                    <section>
                        <p className={sectionTitleClass}>Financial & Remarks</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="Amount" value={formatCurrency(regspi.amount)} />
                            <Detail label="Remarks" value={regspi.remarks ?? '—'} />
                        </div>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}
