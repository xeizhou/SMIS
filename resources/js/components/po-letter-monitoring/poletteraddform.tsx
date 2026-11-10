import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
}

interface PoNumberOption {
    po_number: string;
    po_date?: string | null;
    supplier_id?: number | string | null;
    po_received_date?: string | null;
    due_date?: string | null;
    end_user?: string | null;
    item_description?: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    suppliers: Supplier[];
    poNumbers: PoNumberOption[];
}

const TYPE_OPTIONS = [
    'EXTENSION',
    'WAIVER',
    'CANCELLATION',
    'REPLACEMENT/ALTERNATIVE OFFER',
    'RELEASE OF RETENTION',
];

function formatDate(value?: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          });
}

function deliveryTerm(received?: string | null, due?: string | null) {
    if (!received || !due) return '—';
    const from = new Date(received);
    const to = new Date(due);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '—';
    return `${Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000))} days`;
}

export default function PoLetterAddForm({
    open,
    onOpenChange,
    suppliers,
    poNumbers,
}: Props) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            po_number: '',
            type_of_letter: '',
        });

    useEffect(() => {
        if (open) {
            reset();
            clearErrors();
        }
    }, [open]);

    const selectedPo = poNumbers.find((po) => po.po_number === data.po_number);
    const selectedSupplier = suppliers.find(
        (supplier) =>
            String(supplier.supplier_id) === String(selectedPo?.supplier_id),
    );

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        post('/po-letter-monitoring', {
            onSuccess: () => {
                onOpenChange(false);
                reset();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add PO Letter</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-5">
                    <div className="space-y-2">
                        <label
                            className="text-sm font-medium"
                            htmlFor="po-number"
                        >
                            PO Number
                        </label>
                        <Select
                            value={data.po_number}
                            onValueChange={(value) => {
                                setData('po_number', value);
                                clearErrors('po_number');
                            }}
                        >
                            <SelectTrigger
                                id="po-number"
                                aria-invalid={Boolean(errors.po_number)}
                            >
                                <SelectValue placeholder="Select a purchase order" />
                            </SelectTrigger>
                            <SelectContent>
                                {poNumbers.map((po) => (
                                    <SelectItem
                                        key={po.po_number}
                                        value={po.po_number}
                                    >
                                        {po.po_number}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.po_number && (
                            <p className="text-xs text-destructive">
                                {errors.po_number}
                            </p>
                        )}
                    </div>

                    {selectedPo && (
                        <section className="space-y-3 rounded-md border p-4">
                            <h3 className="text-sm font-semibold">
                                Purchase Order Details
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Detail
                                    label="PO Date"
                                    value={formatDate(selectedPo.po_date)}
                                />
                                <Detail
                                    label="Supplier"
                                    value={
                                        selectedSupplier?.supplier_name ?? '—'
                                    }
                                />
                                <Detail
                                    label="Date Received by Supplier"
                                    value={formatDate(
                                        selectedPo.po_received_date,
                                    )}
                                />
                                <Detail
                                    label="Due Date"
                                    value={formatDate(selectedPo.due_date)}
                                />
                                <Detail
                                    label="Delivery Term"
                                    value={deliveryTerm(
                                        selectedPo.po_received_date,
                                        selectedPo.due_date,
                                    )}
                                />
                                <Detail
                                    label="End User"
                                    value={selectedPo.end_user ?? '—'}
                                />
                                <div className="sm:col-span-2">
                                    <Detail
                                        label="Item Description"
                                        value={
                                            selectedPo.item_description ?? '—'
                                        }
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    <div className="space-y-2">
                        <label
                            className="text-sm font-medium"
                            htmlFor="type-of-letter"
                        >
                            Type of Letter
                        </label>
                        <Select
                            value={data.type_of_letter}
                            onValueChange={(value) => {
                                setData('type_of_letter', value);
                                clearErrors('type_of_letter');
                            }}
                        >
                            <SelectTrigger
                                id="type-of-letter"
                                aria-invalid={Boolean(errors.type_of_letter)}
                            >
                                <SelectValue placeholder="Select letter type" />
                            </SelectTrigger>
                            <SelectContent>
                                {TYPE_OPTIONS.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.type_of_letter && (
                            <p className="text-xs text-destructive">
                                {errors.type_of_letter}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                processing ||
                                !data.po_number ||
                                !data.type_of_letter
                            }
                        >
                            {processing ? 'Saving...' : 'Add PO Letter'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="truncate text-sm font-medium">{value}</p>
        </div>
    );
}
