import { useForm } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function RrspAddForm({ open, onOpenChange }: Props) {
    const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';
    const { data, setData, post, processing, errors, reset } = useForm({
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post('/rrsp-monitoring', {
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
                    <DialogTitle>Add RRSP Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                    {/* Section: General Information */}
                    <div>
                        <h3 className={sectionTitleClass}>General Information</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="rrspNo">RRSP No</Label>
                                <Input
                                    required
                                    id="rrspNo"
                                    placeholder="e.g. 2025-03-0001"
                                    value={data.rrspNo}
                                    onChange={(e) => setData('rrspNo', e.target.value)}
                                />
                                {errors.rrspNo && (
                                    <p className="text-sm text-destructive">{errors.rrspNo}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="dateReceived">Date Received</Label>
                                <Input
                                    required
                                    id="dateReceived"
                                    type="date"
                                    value={data.dateReceived}
                                    onChange={(e) => setData('dateReceived', e.target.value)}
                                />
                                {errors.dateReceived && (
                                    <p className="text-sm text-destructive">{errors.dateReceived}</p>
                                )}
                            </div>
                            <div className="space-y-1.5 md:col-span-3">
                                <Label htmlFor="itemDescription">Item Description</Label>
                                <Input
                                    id="itemDescription"
                                    placeholder="e.g. Dual Core CPU, AOC Motherboard, 2pcs 256 Memory Card w/ HDD & DVD Writer"
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
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 1"
                                    value={data.quantity}
                                    onChange={(e) => setData('quantity', e.target.value)}
                                />
                                {errors.quantity && (
                                    <p className="text-sm text-destructive">{errors.quantity}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="propertyNo">Property No</Label>
                                <Input
                                    id="propertyNo"
                                    placeholder="e.g. 223-01-08-00-0000"
                                    value={data.propertyNo}
                                    onChange={(e) => setData('propertyNo', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cost">Cost</Label>
                                <Input
                                    id="cost"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 15000.00"
                                    value={data.cost}
                                    onChange={(e) => setData('cost', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="kindOfSemiExpendable">Kind of Semi-Expendable</Label>
                                <Select
                                    value={data.kindOfSemiExpendable}
                                    onValueChange={(value) => setData('kindOfSemiExpendable', value)}
                                >
                                    <SelectTrigger id="kindOfSemiExpendable" className="w-full">
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
                                <Label htmlFor="endUserName">End User</Label>
                                <Input
                                    id="endUserName"
                                    placeholder="e.g. Pier Lolita D. Sy"
                                    value={data.endUserName}
                                    onChange={(e) => setData('endUserName', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="area">Area</Label>
                                <Input
                                    id="area"
                                    placeholder="e.g. Records Section"
                                    value={data.area}
                                    onChange={(e) => setData('area', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value) => setData('status', value)}
                                >
                                    <SelectTrigger id="status" className="w-full">
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
                            Save RRSP
                        </Button>
                    </DialogFooter>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}