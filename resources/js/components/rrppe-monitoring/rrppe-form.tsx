import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RRPPEMonitoring } from '@/pages/rrppe-monitoring/index';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: RRPPEMonitoring | null;
}

export default function RrppeForm({ open, onOpenChange, item }: Props) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        rrppe_no: '',
        date_received: '',
        item_description: '',
        quantity: 1,
        property_no: '',
        end_user_name: '',
        cost: '',
        status: '',
        area: '',
        remarks: '',
    });

    useEffect(() => {
        if (open) {
            clearErrors();
            if (item) {
                setData({
                    rrppe_no: item.rrppe_no,
                    date_received: item.date_received,
                    item_description: item.item_description,
                    quantity: item.quantity,
                    property_no: item.property_no,
                    end_user_name: item.end_user_name || '',
                    cost: item.cost ? item.cost.toString() : '',
                    status: item.status || '',
                    area: item.area || '',
                    remarks: item.remarks || '',
                });
            } else {
                reset();
                setData({
                    rrppe_no: '',
                    date_received: '',
                    item_description: '',
                    quantity: 1,
                    property_no: '',
                    end_user_name: '',
                    cost: '',
                    status: '',
                    area: '',
                    remarks: '',
                });
            }
        }
    }, [open, item]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (item) {
            put(`/rrppe-monitoring/${item.id}`, {
                onSuccess: () => onOpenChange(false),
            });
        } else {
            post('/rrppe-monitoring', {
                onSuccess: () => onOpenChange(false),
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{item ? 'Edit' : 'Add'} RRPPE Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="rrppe_no">RRPPE No. <span className="text-red-500">*</span></Label>
                        <Input
                            id="rrppe_no"
                            value={data.rrppe_no}
                            onChange={(e) => setData('rrppe_no', e.target.value)}
                            required
                        />
                        {errors.rrppe_no && <p className="text-sm text-red-500">{errors.rrppe_no}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date_received">Date Received <span className="text-red-500">*</span></Label>
                        <Input
                            id="date_received"
                            type="date"
                            value={data.date_received}
                            onChange={(e) => setData('date_received', e.target.value)}
                            required
                        />
                        {errors.date_received && <p className="text-sm text-red-500">{errors.date_received}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="item_description">Item Description <span className="text-red-500">*</span></Label>
                        <Input
                            id="item_description"
                            value={data.item_description}
                            onChange={(e) => setData('item_description', e.target.value)}
                            required
                        />
                        {errors.item_description && <p className="text-sm text-red-500">{errors.item_description}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={data.quantity}
                            onChange={(e) => setData('quantity', parseInt(e.target.value))}
                            required
                        />
                        {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="property_no">Property No. <span className="text-red-500">*</span></Label>
                        <Input
                            id="property_no"
                            value={data.property_no}
                            onChange={(e) => setData('property_no', e.target.value)}
                            required
                        />
                        {errors.property_no && <p className="text-sm text-red-500">{errors.property_no}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="end_user_name">End User Name</Label>
                        <Input
                            id="end_user_name"
                            value={data.end_user_name}
                            onChange={(e) => setData('end_user_name', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cost">Cost</Label>
                        <Input
                            id="cost"
                            type="number"
                            step="0.01"
                            value={data.cost}
                            onChange={(e) => setData('cost', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select 
                            value={data.status} 
                            onValueChange={(value) => setData('status', value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                <SelectItem value="UNSERVICEABLE">UNSERVICEABLE</SelectItem>
                                <SelectItem value="SERVICEABLE">SERVICEABLE</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="area">Area</Label>
                        <Input
                            id="area"
                            value={data.area}
                            onChange={(e) => setData('area', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Input
                            id="remarks"
                            value={data.remarks}
                            onChange={(e) => setData('remarks', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} style={{ backgroundColor: '#612A35' }} className="text-white">
                            {item ? 'Update' : 'Save'} Record
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
