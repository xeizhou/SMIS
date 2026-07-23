import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface Office {
    office_code: string;
    office_name: string;
}

interface PurchaseOrder {
    po_number: string;
    item_description: string | null;
    po_date: string | null;
    po_received_date: string | null;
    inclusive_date: string | null;
    due_date: string | null;
    pr_number: string | null;
    pr_date: string | null;
    philgeps_reference_no: string | null;
    mode_of_procurement: string | null;
    total_amount_abc: string | number | null;
    total_amount_po: string | number | null;
    total_amount_diff?: string | number | null;
    fund_cluster_id: string | null;
    ors_burs_no: string | null;
    ors_burs_date: string | null;
    responsibility_center: string | null;
    uacs_object_code: string | null;
    supplier_id: number | null;
    end_user: string | null;
    date_forwarded_to_smu: string | null;
    coa_processed_date: string | null;
    date_forwarded_frontdesk: string | null;
    supplier: Supplier | null;
    fundCluster: FundCluster | null;
    office: Office | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrder: PurchaseOrder | null;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';
const sectionTitleClass =
    'text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-3 pb-2 border-b';

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

function formatDate(value: string | null) {
    if (!value) {
return '—';
}

    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function PurchaseOrderViewForm({
    open,
    onOpenChange,
    purchaseOrder,
}: Props) {
    if (!purchaseOrder) {
return null;
}

    const po = purchaseOrder;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-h-[90vh] overflow-y-auto"
                style={{ maxWidth: '800px' }}
            >
                <DialogHeader>
                    <DialogTitle>Purchase Order Details — {po.po_number}</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-6">
                    {/* Identifiers & Dates */}
                    <section>
                        <p className={sectionTitleClass}>Order Information</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="PO Number" value={po.po_number} />
                            <Detail label="PO Date" value={formatDate(po.po_date)} />
                            <Detail label="PO Received Date" value={formatDate(po.po_received_date)} />
                            <Detail label="Due Date" value={formatDate(po.due_date)} />
                            <Detail label="Inclusive Date" value={po.inclusive_date ?? '—'} />
                            <Detail label="Mode of Procurement" value={po.mode_of_procurement ?? '—'} />
                        </div>

                        <div className="mt-4">
                            <p className={labelClass}>Item Description</p>
                            <p className={valueClass + ' whitespace-pre-wrap'}>
                                {po.item_description ?? '—'}
                            </p>
                        </div>
                    </section>

                    {/* PR / PhilGEPS */}
                    <section>
                        <p className={sectionTitleClass}>Requisition & Reference</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="PR No." value={po.pr_number ?? '—'} />
                            <Detail label="PR Date" value={formatDate(po.pr_date)} />
                            <Detail label="Philgeps Reference No." value={po.philgeps_reference_no ?? '—'} />
                        </div>
                    </section>

                    {/* Financial */}
                    <section>
                        <p className={sectionTitleClass}>Financial Details</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="Total Amount ABC" value={formatCurrency(po.total_amount_abc)} />
                            <Detail label="Total Amount PO" value={formatCurrency(po.total_amount_po)} />
                            <Detail label="Total Amount Difference" value={formatCurrency(po.total_amount_diff)} />
                            <Detail label="Fund Cluster" value={po.fundCluster?.fund_cluster_id ?? po.fund_cluster_id ?? '—'} />
                            <Detail label="ORS/BURS No." value={po.ors_burs_no ?? '—'} />
                            <Detail label="ORS/BURS Date" value={formatDate(po.ors_burs_date)} />
                            <Detail label="Responsibility Center" value={po.responsibility_center ?? '—'} />
                            <Detail label="UACS Object Code" value={po.uacs_object_code ?? '—'} />
                        </div>
                    </section>

                    {/* Supplier / End User */}
                    <section>
                        <p className={sectionTitleClass}>Supplier & End User</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="Supplier" value={po.supplier?.supplier_name ?? '—'} />
                            <Detail label="End User" value={po.office?.office_name ?? po.end_user ?? '—'} />
                        </div>
                    </section>

                    {/* Processing Trail */}
                    <section>
                        <p className={sectionTitleClass}>Processing Trail</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Detail label="Date Forwarded to SMU" value={formatDate(po.date_forwarded_to_smu)} />
                            <Detail label="COA Processed Date" value={formatDate(po.coa_processed_date)} />
                            <Detail label="Date Forwarded to Frontdesk" value={formatDate(po.date_forwarded_frontdesk)} />
                        </div>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}