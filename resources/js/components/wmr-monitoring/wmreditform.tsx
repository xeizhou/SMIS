import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import WmrFormFields, {
    type WmrFields,
    type WmrItemInput,
} from './wmrformfields';

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
}

interface WmrRecord {
    id: number;
    wmr_no: string;
    wmr_date: string;
    supplier_id: number | null;
    job_order_no: string | null;
    job_order_date: string | null;
    vehicle_type: string | null;
    brand_name: string | null;
    model: string | null;
    serial_engine_no: string | null;
    inspector_name: string | null;
    inspection_date: string | null;
    invoice_no: string | null;
    invoice_date: string | null;
    property_no: string | null;
    acquisition_date: string | null;
    plate_no: string | null;
    labor_cost: string | null;
    items?: { quantity: string; unit: string; description: string }[];
    defects_complaints: string | null;
    materials: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: WmrRecord | null;
    suppliers: SupplierOption[];
}

const emptyFields: WmrFields = {
    wmr_no: '',
    wmr_date: '',
    supplier_id: '',
    job_order_no: '',
    job_order_date: '',
    vehicle_type: '',
    brand_name: '',
    model: '',
    serial_engine_no: '',
    inspector_name: '',
    inspection_date: '',
    invoice_no: '',
    invoice_date: '',
    property_no: '',
    acquisition_date: '',
    plate_no: '',
    labor_cost: '',
};

function legacyItems(value: string | null): WmrItemInput[] {
    const descriptions =
        value
            ?.split(/\r?\n/)
            .map((description) => description.trim())
            .filter(Boolean) ?? [];
    return descriptions.map((description) => ({
        quantity: '1',
        unit: 'PC',
        description,
    }));
}

export default function WmrEditForm({
    open,
    onOpenChange,
    record,
    suppliers,
}: Props) {
    const [data, setData] = useState<WmrFields>(emptyFields);
    const [items, setItems] = useState<WmrItemInput[]>([
        { quantity: '1', unit: 'PC', description: '' },
    ]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open && record) {
            setData({
                wmr_no: record.wmr_no ?? '',
                wmr_date: record.wmr_date?.slice(0, 10) ?? '',
                supplier_id: record.supplier_id
                    ? String(record.supplier_id)
                    : '',
                job_order_no: record.job_order_no ?? '',
                job_order_date: record.job_order_date?.slice(0, 10) ?? '',
                vehicle_type: record.vehicle_type ?? '',
                brand_name: record.brand_name ?? '',
                model: record.model ?? '',
                serial_engine_no: record.serial_engine_no ?? '',
                inspector_name: record.inspector_name ?? '',
                inspection_date: record.inspection_date?.slice(0, 10) ?? '',
                invoice_no: record.invoice_no ?? '',
                invoice_date: record.invoice_date ?? '',
                property_no: record.property_no ?? '',
                acquisition_date: record.acquisition_date ?? '',
                plate_no: record.plate_no ?? '',
                labor_cost: record.labor_cost ?? '',
            });
            setItems(
                record.items?.length
                    ? record.items.map((item) => ({
                          quantity: item.quantity,
                          unit: item.unit,
                          description: item.description,
                      }))
                    : legacyItems(
                          record.defects_complaints || record.materials,
                      ),
            );
            if (
                !record.items?.length &&
                !record.defects_complaints &&
                !record.materials
            ) {
                setItems([{ quantity: '1', unit: 'PC', description: '' }]);
            }
            setErrors({});
            setProcessing(false);
        }
    }, [open, record]);

    const handleChange = (field: keyof WmrFields, value: string) => {
        setData((current) => ({ ...current, [field]: value }));
        setErrors((current) => {
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const handleItemsChange = (nextItems: WmrItemInput[]) => {
        setItems(nextItems);
        setErrors((current) =>
            Object.fromEntries(
                Object.entries(current).filter(
                    ([field]) =>
                        field !== 'items' && !field.startsWith('items.'),
                ),
            ),
        );
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!record) return;

        setProcessing(true);
        router.put(
            `/wmr-monitoring/${record.id}`,
            {
                ...data,
                items: items.map((item) => ({
                    quantity: item.quantity,
                    unit: item.unit,
                    description: item.description,
                })),
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setErrors({});
                    setProcessing(false);
                },
                onError: (validationErrors) => {
                    setErrors(validationErrors);
                    setProcessing(false);
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[95vh] w-[95vw] overflow-hidden p-0"
                style={{ maxWidth: '1100px' }}
            >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>
                                Edit WMR Record — {record?.wmr_no}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="mt-4">
                            <WmrFormFields
                                data={data}
                                errors={errors}
                                suppliers={suppliers}
                                items={items}
                                onChange={handleChange}
                                onItemsChange={handleItemsChange}
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    style={{ backgroundColor: '#612A35' }}
                                >
                                    {processing ? 'Saving...' : 'Update Record'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
