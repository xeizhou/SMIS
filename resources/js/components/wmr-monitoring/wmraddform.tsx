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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

const emptyItems: WmrItemInput[] = [
    { quantity: '1', unit: 'PC', description: '' },
];

export default function WmrAddForm({ open, onOpenChange, suppliers }: Props) {
    const [data, setData] = useState<WmrFields>(emptyFields);
    const [items, setItems] = useState<WmrItemInput[]>(emptyItems);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!open) {
            setData(emptyFields);
            setItems(emptyItems);
            setErrors({});
            setProcessing(false);
        }
    }, [open]);

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
        setProcessing(true);

        router.post(
            '/wmr-monitoring',
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
                            <DialogTitle>Add WMR Record</DialogTitle>
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
                                    {processing ? 'Saving...' : 'Save Record'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
