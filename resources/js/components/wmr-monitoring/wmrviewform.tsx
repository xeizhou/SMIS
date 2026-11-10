import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WmrItem {
    item_number: number;
    quantity: string;
    unit: string;
    description: string;
    item_control_no: string;
}

interface WmrRecord {
    id: number;
    wmr_no: string;
    wmr_date: string;
    supplier?: { supplier_name: string } | null;
    job_order_no: string | null;
    job_order_date: string | null;
    inspection_date: string | null;
    vehicle_type: string | null;
    brand_name: string | null;
    model: string | null;
    serial_engine_no: string | null;
    inspector_name: string | null;
    invoice_no: string | null;
    invoice_date: string | null;
    property_no: string | null;
    acquisition_date: string | null;
    plate_no: string | null;
    labor_cost: string | null;
    items: WmrItem[];
    defects_complaints?: string | null;
    materials?: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: WmrRecord | null;
}

function Detail({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">
                {value || '—'}
            </p>
        </div>
    );
}

function fmtDate(value: string | null | undefined): string {
    if (!value) return '—';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Date(year, month - 1, day).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function fmtMoney(value: string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WmrViewForm({ open, onOpenChange, record }: Props) {
    if (!record) return null;
    const legacyDescriptions = (
        record.defects_complaints ||
        record.materials ||
        ''
    )
        .split(/\r?\n/)
        .map((description) => description.trim())
        .filter(Boolean);
    const items =
        record.items.length > 0
            ? record.items
            : legacyDescriptions.map((description, index) => ({
                  item_number: index + 1,
                  quantity: '1',
                  unit: 'PC',
                  description,
                  item_control_no: `${record.wmr_no}-${String(index + 1).padStart(2, '0')}`,
              }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[90vh] w-[95vw] overflow-hidden p-0"
                style={{ maxWidth: '1100px' }}
            >
                <ScrollArea className="max-h-[90vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>WMR Details</DialogTitle>
                        </DialogHeader>
                        <div className="mt-5 grid gap-8 md:grid-cols-2">
                            <section className="space-y-4">
                                <Detail
                                    label="Supplier"
                                    value={record.supplier?.supplier_name}
                                />
                                <Detail label="WMR No." value={record.wmr_no} />
                                <Detail
                                    label="Job Order No."
                                    value={record.job_order_no}
                                />
                                <Detail
                                    label="Brand Name"
                                    value={record.brand_name}
                                />
                                <Detail label="Model" value={record.model} />
                                <Detail
                                    label="Serial / Engine No."
                                    value={record.serial_engine_no}
                                />
                                <Detail
                                    label="Inspector Name"
                                    value={record.inspector_name}
                                />
                                <Detail
                                    label="Invoice No."
                                    value={record.invoice_no}
                                />
                            </section>
                            <section className="space-y-4">
                                <Detail
                                    label="Date"
                                    value={fmtDate(record.wmr_date)}
                                />
                                <Detail
                                    label="Job Order Date"
                                    value={fmtDate(record.job_order_date)}
                                />
                                <Detail
                                    label="Vehicle Type"
                                    value={record.vehicle_type}
                                />
                                <Detail
                                    label="Property No."
                                    value={record.property_no}
                                />
                                <Detail
                                    label="Acquisition Date"
                                    value={record.acquisition_date}
                                />
                                <Detail
                                    label="Plate No."
                                    value={record.plate_no}
                                />
                                <Detail
                                    label="Invoice Date"
                                    value={record.invoice_date}
                                />
                                <Detail
                                    label="Amount"
                                    value={fmtMoney(record.labor_cost)}
                                />
                            </section>
                        </div>

                        <section className="mt-8">
                            <h3 className="mb-3 border-b pb-2 text-sm font-semibold">
                                Defects / Complaints
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-left">
                                            <th className="border px-3 py-2">
                                                Item
                                            </th>
                                            <th className="border px-3 py-2">
                                                Quantity
                                            </th>
                                            <th className="border px-3 py-2">
                                                Unit
                                            </th>
                                            <th className="border px-3 py-2">
                                                Description
                                            </th>
                                            <th className="border px-3 py-2">
                                                Item Control No.
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.item_number}>
                                                <td className="border px-3 py-2">
                                                    {item.item_number}
                                                </td>
                                                <td className="border px-3 py-2">
                                                    {item.quantity}
                                                </td>
                                                <td className="border px-3 py-2">
                                                    {item.unit}
                                                </td>
                                                <td className="border px-3 py-2">
                                                    {item.description}
                                                </td>
                                                <td className="border px-3 py-2">
                                                    {item.item_control_no}
                                                </td>
                                            </tr>
                                        ))}
                                        {items.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="border px-3 py-4 text-center text-muted-foreground"
                                                >
                                                    No defects or complaints
                                                    recorded.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
