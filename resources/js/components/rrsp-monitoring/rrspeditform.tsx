import { useForm } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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
    const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';
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

        if (!rrsp) {
return;
}

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
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Edit RRSP Record — {rrsp?.id}, {rrsp?.rrspNo}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                    {/* Section: General Information */}
                    <div>
                        <h3 className={sectionTitleClass}>General Information</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                                    onChange={(e) => setData('dateReceived', e.target.value)}
                                />
                                {errors.dateReceived && (
                                    <p className="text-sm text-destructive">{errors.dateReceived}</p>
                                )}
                            </div>
                            <div className="space-y-1.5 md:col-span-3">
                                <Label htmlFor="edit-itemDescription">Item Description</Label>
                                <Input
                                    id="edit-itemDescription"
                                    value={data.itemDescription}
                                    onChange={(e) => setData('itemDescription', e.target.value)}
                                />
                                {errors.itemDescription && (
                                    <p className="text-sm text-destructive">{errors.itemDescription}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Asset Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Asset Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                                    <p className="text-sm text-destructive">{errors.quantity}</p>
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
                                <Label htmlFor="edit-kindOfSemiExpendable">Kind of Semi-Expendable</Label>
                                <Select
                                    value={data.kindOfSemiExpendable}
                                    onValueChange={(value) => setData('kindOfSemiExpendable', value)}
                                >
                                    <SelectTrigger id="edit-kindOfSemiExpendable" className="w-full">
                                        <SelectValue placeholder="Select kind" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low Value">Low Value</SelectItem>
                                        <SelectItem value="High Value">High Value</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Section: Assignment & Status */}
                    <div>
                        <h3 className={sectionTitleClass}>Assignment & Status</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-endUserName">End User</Label>
                                <Input
                                    id="edit-endUserName"
                                    value={data.endUserName}
                                    onChange={(e) => setData('endUserName', e.target.value)}
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
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value) => setData('status', value)}
                                >
                                    <SelectTrigger id="edit-status" className="w-full">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Serviceable">Serviceable</SelectItem>
                                        <SelectItem value="Unserviceable">Unserviceable</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
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
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}