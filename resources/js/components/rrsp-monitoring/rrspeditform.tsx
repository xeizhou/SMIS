import { useForm } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
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

interface RrspItem {
    id: number;
    itemDescription: string;
    quantity: number;
    propertyNo: string | null;
    cost: number | null;
    kindOfSemiExpendable: string | null;
    status: string | null;
    area: string | null;
}

interface RrspMonitoring {
    id: string;
    rrspNo: string;
    dateReceived: string;
    endUserName: string | null;
    items?: RrspItem[];
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
        endUserName: '',
        items: [
            {
                itemDescription: '',
                quantity: '',
                propertyNo: '',
                cost: '',
                kindOfSemiExpendable: '',
                status: '',
                area: '',
            }
        ]
    });

    useEffect(() => {
        if (rrsp) {
            setData({
                rrspNo: rrsp.rrspNo ?? '',
                dateReceived: rrsp.dateReceived ?? '',
                endUserName: rrsp.endUserName ?? '',
                items: rrsp.items && rrsp.items.length > 0 ? rrsp.items.map(item => ({
                    itemDescription: item.itemDescription ?? '',
                    quantity: item.quantity?.toString() ?? '',
                    propertyNo: item.propertyNo ?? '',
                    cost: item.cost?.toString() ?? '',
                    kindOfSemiExpendable: item.kindOfSemiExpendable ?? '',
                    status: item.status ?? '',
                    area: item.area ?? '',
                })) : [{
                    itemDescription: '',
                    quantity: '',
                    propertyNo: '',
                    cost: '',
                    kindOfSemiExpendable: '',
                    status: '',
                    area: '',
                }],
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rrsp]);

    const addItem = () => {
        setData('items', [
            ...data.items,
            {
                itemDescription: '',
                quantity: '',
                propertyNo: '',
                cost: '',
                kindOfSemiExpendable: '',
                status: '',
                area: '',
            }
        ]);
    };

    const removeItem = (index: number) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setData('items', newItems);
    };

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
            <DialogContent className="max-h-[95vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
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
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-endUserName">End User</Label>
                                <Input
                                    id="edit-endUserName"
                                    value={data.endUserName}
                                    onChange={(e) => setData('endUserName', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Items */}
                    <div>
                        <div className="flex items-center justify-between border-b pb-2 mb-4">
                            <h3 className="text-sm font-semibold text-foreground">Items</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 gap-1">
                                <Plus className="size-4" /> Add Item
                            </Button>
                        </div>
                        
                        <div className="space-y-6">
                            {data.items.map((item, index) => (
                                <div key={index} className="relative rounded-md border p-4 bg-muted/20">
                                    {data.items.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-2 top-2 h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => removeItem(index)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                    <h4 className="mb-3 text-sm font-medium">Item #{index + 1}</h4>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <Label htmlFor={`edit-item-${index}-desc`}>Item Description <span className="text-destructive">*</span></Label>
                                            <Input
                                                id={`edit-item-${index}-desc`}
                                                required
                                                value={item.itemDescription}
                                                onChange={(e) => updateItem(index, 'itemDescription', e.target.value)}
                                            />
                                            {(errors as any)[`items.${index}.itemDescription`] && (
                                                <p className="text-sm text-destructive">{(errors as any)[`items.${index}.itemDescription`]}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-qty`}>Quantity <span className="text-destructive">*</span></Label>
                                            <Input
                                                id={`edit-item-${index}-qty`}
                                                required
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            />
                                            {(errors as any)[`items.${index}.quantity`] && (
                                                <p className="text-sm text-destructive">{(errors as any)[`items.${index}.quantity`]}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-prop`}>Property No</Label>
                                            <Input
                                                id={`edit-item-${index}-prop`}
                                                value={item.propertyNo}
                                                onChange={(e) => updateItem(index, 'propertyNo', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-cost`}>Amount / Cost</Label>
                                            <Input
                                                id={`edit-item-${index}-cost`}
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={item.cost}
                                                onChange={(e) => updateItem(index, 'cost', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-kind`}>Kind of Semi-Expendable</Label>
                                            <Select
                                                value={item.kindOfSemiExpendable}
                                                onValueChange={(value) => updateItem(index, 'kindOfSemiExpendable', value)}
                                            >
                                                <SelectTrigger id={`edit-item-${index}-kind`} className="w-full">
                                                    <SelectValue placeholder="Select kind" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Low Value">Low Value</SelectItem>
                                                    <SelectItem value="High Value">High Value</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-area`}>Area</Label>
                                            <Input
                                                id={`edit-item-${index}-area`}
                                                value={item.area}
                                                onChange={(e) => updateItem(index, 'area', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-status`}>Status</Label>
                                            <Select
                                                value={item.status}
                                                onValueChange={(value) => updateItem(index, 'status', value)}
                                            >
                                                <SelectTrigger id={`edit-item-${index}-status`} className="w-full">
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
                            ))}
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