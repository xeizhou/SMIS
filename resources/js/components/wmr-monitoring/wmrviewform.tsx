import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
}

interface OfficeOption {
    office_code: string;
    office_name: string | null;
}

interface FundClusterOption {
    fund_cluster_id: string;
    fund_description: string | null;
}

interface WmrRecord {
    id: number;
    wmr_no: string;
    wmr_date: string;
    supplier_id: number;
    iar_no: string | null;
    iar_date: string | null;
    item_vehicle: string;
    job_order_no: string | null;
    job_order_date: string | null;
    fund_cluster_id: string | null;
    vehicle_type: string | null;
    brand_name: string | null;
    model: string | null;
    plate_no: string | null;
    serial_engine_no: string | null;
    acquisition_date: string | null;
    property_no: string | null;
    inspector_name: string | null;
    inspection_date: string | null;
    invoice_no: string | null;
    invoice_date: string | null;
    defects_complaints: string | null;
    materials: string | null;
    labor_cost: string | null;
    office_code: string | null;
    requested_by: string | null;
    received_by: string | null;
    received_date: string | null;
    remarks: string | null;
    supplier?: SupplierOption | null;
    office?: OfficeOption | null;
    fund_cluster?: FundClusterOption | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: WmrRecord | null;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5 whitespace-pre-wrap';
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-3 pb-2 border-b';

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <p className={valueClass}>{value}</p>
        </div>
    );
}

// 'YYYY-MM-DD' -> local date string without the timezone shift new Date('YYYY-MM-DD') causes
function fmtDate(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const [year, month, day] = value.slice(0, 10).split('-').map(Number);

    if (!year || !month || !day) {
        return value;
    }

    return new Date(year, month - 1, day).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtMoney(value: string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WmrViewForm({ open, onOpenChange, record }: Props) {
    if (!record) {
        return null;
    }

    const fundLabel = record.fund_cluster
        ? record.fund_cluster.fund_description
            ? `${record.fund_cluster.fund_cluster_id} — ${record.fund_cluster.fund_description}`
            : record.fund_cluster.fund_cluster_id
        : record.fund_cluster_id ?? '—';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1200px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>WMR Details</DialogTitle>
                        </DialogHeader>

                        <div className="mt-4 space-y-6">
                            <section>
                                <p className={sectionTitleClass}>WMR Details</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Detail label="WMR No." value={record.wmr_no} />
                                    <Detail label="WMR Date" value={fmtDate(record.wmr_date)} />
                                    <Detail label="Supplier" value={record.supplier?.supplier_name ?? '—'} />
                                    <Detail label="IAR No." value={record.iar_no ?? '—'} />
                                    <Detail label="IAR Date" value={fmtDate(record.iar_date)} />
                                    <Detail label="Item / Vehicle" value={record.item_vehicle} />
                                </div>
                            </section>

                            <section>
                                <p className={sectionTitleClass}>Job Order</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Detail label="Job Order No." value={record.job_order_no ?? '—'} />
                                    <Detail label="Job Order Date" value={fmtDate(record.job_order_date)} />
                                    <Detail label="Fund" value={fundLabel} />
                                </div>
                            </section>

                            <section>
                                <p className={sectionTitleClass}>Item / Vehicle Details</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Detail label="Type" value={record.vehicle_type ?? '—'} />
                                    <Detail label="Brand Name" value={record.brand_name ?? '—'} />
                                    <Detail label="Model" value={record.model ?? '—'} />
                                    <Detail label="Plate No." value={record.plate_no ?? '—'} />
                                    <Detail label="Serial / Engine No." value={record.serial_engine_no ?? '—'} />
                                    <Detail label="Acquisition Date" value={record.acquisition_date ?? '—'} />
                                    <Detail label="Property No." value={record.property_no ?? '—'} />
                                </div>
                            </section>

                            <section>
                                <p className={sectionTitleClass}>Inspection &amp; Invoice</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Detail label="Inspector Name" value={record.inspector_name ?? '—'} />
                                    <Detail label="Inspection Date" value={fmtDate(record.inspection_date)} />
                                    <Detail label="Invoice No." value={record.invoice_no ?? '—'} />
                                    <Detail label="Invoice Date" value={record.invoice_date ?? '—'} />
                                </div>
                            </section>

                            <section>
                                <p className={sectionTitleClass}>Replacement &amp; Cost</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Detail label="Defects / Complaints" value={record.defects_complaints ?? '—'} />
                                    <Detail label="Replaced Materials" value={record.materials ?? '—'} />
                                    <Detail label="Labor Cost" value={fmtMoney(record.labor_cost)} />
                                </div>
                            </section>

                            <section>
                                <p className={sectionTitleClass}>Request &amp; Receipt</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Detail label="Office" value={record.office?.office_name ?? record.office_code ?? '—'} />
                                    <Detail label="Requested By" value={record.requested_by ?? '—'} />
                                    <Detail label="Received By" value={record.received_by ?? '—'} />
                                    <Detail label="Date Received" value={fmtDate(record.received_date)} />
                                </div>
                            </section>

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