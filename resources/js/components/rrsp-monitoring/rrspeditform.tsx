import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface RrspMonitoring {
    id: string;
    rrspNo: string;
    dateReceived: string;
    itemDescription: string;
    quantity: number;
    propertyNo: string | null;
    endUserName: string | null;
    cost: number | null;
    kindOfSemiExpendable: string | null;
    status: string | null;
    area: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rrsp: RrspMonitoring | null;
}

export default function RrspEditForm({ open, onOpenChange, rrsp }: Props) {
    const { data, setData, put, processing, errors, reset } = useForm({
        rrspNo: '',
        dateReceived: '',
        itemDescription: '',
        quantity: '',
        propertyNo: '',
        endUserName: '',
        cost: '',
        kindOfSemiExpendable: '',
        status: '',
        area: '',
    });

    useEffect(() => {
        if (rrsp) {
            setData({
                rrspNo: rrsp.rrspNo ?? '',
                dateReceived: rrsp.dateReceived ?? '',
                itemDescription: rrsp.itemDescription ?? '',
                quantity: rrsp.quantity?.toString() ?? '',
                propertyNo: rrsp.propertyNo ?? '',
                endUserName: rrsp.endUserName ?? '',
                cost: rrsp.cost?.toString() ?? '',
                kindOfSemiExpendable: rrsp.kindOfSemiExpendable ?? '',
                status: rrsp.status ?? '',
                area: rrsp.area ?? '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rrsp]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!rrsp) return;

        put(`/rrsp-monitoring/${rrsp.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit RRSP</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-rrspNo">RRSP No</Label>
                            <Input
                                id="edit-rrspNo"
                                value={data.rrspNo}
                                onChange={(e) => setData('rrspNo', e.target.value)}
                            />
                            {errors.rrspNo && (
                                <p className="text-sm text-destructive">{errors.rrspNo}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-dateReceived">Date Received</Label>
                            <Input
                                id="edit-dateReceived"
                                type="date"
                                value={data.dateReceived}
                                onChange={(e) =>
                                    setData('dateReceived', e.target.value)
                                }
                            />
                            {errors.dateReceived && (
                                <p className="text-sm text-destructive">
                                    {errors.dateReceived}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="edit-itemDescription">
                                Item Description
                            </Label>
                            <Input
                                id="edit-itemDescription"
                                value={data.itemDescription}
                                onChange={(e) =>
                                    setData('itemDescription', e.target.value)
                                }
                            />
                            {errors.itemDescription && (
                                <p className="text-sm text-destructive">
                                    {errors.itemDescription}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-quantity">Quantity</Label>
                            <Input
                                id="edit-quantity"
                                type="number"
                                min="0"
                                value={data.quantity}
                                onChange={(e) => setData('quantity', e.target.value)}
                            />
                            {errors.quantity && (
                                <p className="text-sm text-destructive">
                                    {errors.quantity}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-propertyNo">Property No</Label>
                            <Input
                                id="edit-propertyNo"
                                value={data.propertyNo}
                                onChange={(e) => setData('propertyNo', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-endUserName">End User</Label>
                            <Input
                                id="edit-endUserName"
                                value={data.endUserName}
                                onChange={(e) =>
                                    setData('endUserName', e.target.value)
                                }
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-area">Area</Label>
                            <Input
                                id="edit-area"
                                value={data.area}
                                onChange={(e) => setData('area', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-cost">Cost</Label>
                            <Input
                                id="edit-cost"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.cost}
                                onChange={(e) => setData('cost', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-kindOfSemiExpendable">
                                Kind of Semi-Expendable
                            </Label>
                            <Input
                                id="edit-kindOfSemiExpendable"
                                value={data.kindOfSemiExpendable}
                                onChange={(e) =>
                                    setData('kindOfSemiExpendable', e.target.value)
                                }
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-status">Status</Label>
                            <Input
                                id="edit-status"
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            style={{ backgroundColor: '#612A35' }}
                        >
                            Update RRSP
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}