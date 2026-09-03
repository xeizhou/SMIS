import { useState, useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, RefreshCw, Check, ChevronsUpDown } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { RrppeItem, RRPPEMonitoring } from '@/pages/rrppe-monitoring/index';

interface StockItem {
    stock_no: string;
    item_name: string;
    description: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: RRPPEMonitoring | null;
    areas: string[];
    stockItems: StockItem[];
}

// Same as RrppeAddForm — searches item name + description
function SearchableSelect({
    value,
    onChange,
    error,
    placeholder = 'Search...',
    options,
}: {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
    options: { value: string; label: string }[];
}) {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
        <div className="w-full">
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            'w-full justify-between font-normal flex items-center',
                            !selectedLabel && 'text-muted-foreground',
                            error && 'border-red-500'
                        )}
                    >
                        <span className="truncate flex-1 text-left mr-2">
                            {selectedLabel || placeholder}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                        <CommandInput placeholder={placeholder} />
                        <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((opt) => (
                                    <CommandItem
                                        key={opt.value}
                                        value={opt.label}
                                        onSelect={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4 shrink-0',
                                                value === opt.value ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        <span className="truncate">{opt.label}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export default function RrppeEditForm({ open, onOpenChange, item, areas, stockItems }: Props) {
    const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';
    const { data, setData, put, processing, errors, reset } = useForm({
        rrppeNo: '',
        dateReceived: '',
        endUserName: '',
        returnBy: '',
        items: [
            {
                stockNo: '',
                itemName: '',
                itemDescription: '',
                quantity: '',
                propertyNo: '',
                cost: '',
                status: '',
                area: '',
                remarks: '',
            }
        ]
    });

    const stockOptions = stockItems.map((s) => ({
        value: s.stock_no,
        label: s.description ? `${s.item_name} — ${s.description}` : s.item_name,
    }));

    useEffect(() => {
        if (item) {
            setData({
                rrppeNo: item.rrppeNo ?? '',
                dateReceived: item.dateReceived ?? '',
                endUserName: item.endUserName ?? '',
                returnBy: item.returnBy ?? '',
                items: item.items && item.items.length > 0 ? item.items.map((i: any) => ({
                    stockNo: i.stockNo ?? '',
                    itemName: i.itemName ?? '',
                    itemDescription: i.itemDescription ?? '',
                    quantity: i.quantity?.toString() ?? '',
                    propertyNo: i.propertyNo ?? '',
                    cost: i.cost?.toString() ?? '',
                    status: i.status ?? '',
                    area: i.area ?? '',
                    remarks: i.remarks ?? '',
                })) : [{
                    stockNo: '',
                    itemName: '',
                    itemDescription: '',
                    quantity: '',
                    propertyNo: '',
                    cost: '',
                    status: '',
                    area: '',
                    remarks: '',
                }],
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item]);

    const addItem = () => {
        setData('items', [
            ...data.items,
            {
                stockNo: '',
                itemName: '',
                itemDescription: '',
                quantity: '',
                propertyNo: '',
                cost: '',
                status: '',
                area: '',
                remarks: '',
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

    const selectStockItem = (index: number, stockNo: string) => {
        const match = stockItems.find((s) => s.stock_no === stockNo);
        const newItems = [...data.items];
        newItems[index] = {
            ...newItems[index],
            stockNo,
            itemName: match?.item_name ?? '',
            itemDescription: match?.description ?? '',
        };
        setData('items', newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!item) {
            return;
        }

        put(`/rrppe-monitoring/${item.id}`, {
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
                    <DialogTitle>Edit RRPPE Record — {item?.id}, {item?.rrppeNo}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                    <div>
                        <h3 className={sectionTitleClass}>General Information</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-rrppeNo">RRPPE No <span className="text-destructive">*</span></Label>
                                <Input
                                    id="edit-rrppeNo"
                                    required
                                    value={data.rrppeNo}
                                    onChange={(e) => setData('rrppeNo', e.target.value)}
                                />
                                {errors.rrppeNo && (
                                    <p className="text-sm text-destructive">{errors.rrppeNo}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-dateReceived">Date Received <span className="text-destructive">*</span></Label>
                                <Input
                                    id="edit-dateReceived"
                                    required
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
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-returnBy">Return by</Label>
                                <Input
                                    id="edit-returnBy"
                                    placeholder="Name/Person"
                                    value={data.returnBy}
                                    onChange={(e) => setData('returnBy', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between border-b pb-2 mb-4">
                            <h3 className="text-sm font-semibold text-foreground">Items</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 gap-1">
                                <Plus className="size-4" /> Add Item
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {data.items.map((i, index) => (
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
                                            <Label>Stock Item <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                value={i.stockNo}
                                                onChange={(val) => selectStockItem(index, val)}
                                                placeholder="Search item name or description..."
                                                options={stockOptions}
                                                error={(errors as any)[`items.${index}.stockNo`]}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Item Name</Label>
                                            <Input value={i.itemName} disabled readOnly />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Item Description</Label>
                                            <Input value={i.itemDescription} disabled readOnly />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-qty`}>Quantity <span className="text-destructive">*</span></Label>
                                            <Input
                                                id={`edit-item-${index}-qty`}
                                                required
                                                type="number"
                                                min="1"
                                                value={i.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            />
                                            {(errors as any)[`items.${index}.quantity`] && (
                                                <p className="text-sm text-destructive">{(errors as any)[`items.${index}.quantity`]}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-prop`}>Property No <span className="text-destructive">*</span></Label>
                                            <Input
                                                id={`edit-item-${index}-prop`}
                                                required
                                                value={i.propertyNo}
                                                onChange={(e) => updateItem(index, 'propertyNo', e.target.value)}
                                            />
                                            {(errors as any)[`items.${index}.propertyNo`] && (
                                                <p className="text-sm text-destructive">{(errors as any)[`items.${index}.propertyNo`]}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-cost`}>Cost</Label>
                                            <Input
                                                id={`edit-item-${index}-cost`}
                                                type="number"
                                                step="0.01"
                                                value={i.cost}
                                                onChange={(e) => updateItem(index, 'cost', e.target.value)}
                                            />
                                            {(errors as any)[`items.${index}.cost`] && (
                                                <p className="text-sm text-destructive">{(errors as any)[`items.${index}.cost`]}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor={`edit-item-${index}-area`}>Area</Label>
                                                <button
                                                    type="button"
                                                    onClick={() => router.reload({ only: ['areas'] })}
                                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Refresh Areas"
                                                >
                                                    <RefreshCw className="size-3.5" />
                                                </button>
                                            </div>
                                            <Select
                                                value={i.area}
                                                onValueChange={(value) => updateItem(index, 'area', value)}
                                            >
                                                <SelectTrigger id={`edit-item-${index}-area`} className="w-full">
                                                    <SelectValue placeholder="Select Area" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {areas.map((a) => (
                                                        <SelectItem key={a} value={a}>{a}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`edit-item-${index}-status`}>Status</Label>
                                            <Select
                                                value={i.status}
                                                onValueChange={(value) => updateItem(index, 'status', value)}
                                            >
                                                <SelectTrigger id={`edit-item-${index}-status`} className="w-full">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SERVICEABLE">SERVICEABLE</SelectItem>
                                                    <SelectItem value="UNSERVICEABLE">UNSERVICEABLE</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {i.status === 'UNSERVICEABLE' && (
                                            <div className="space-y-1.5 md:col-span-4">
                                                <Label htmlFor={`edit-item-${index}-remarks`}>Remarks / Findings</Label>
                                                <Textarea
                                                    id={`edit-item-${index}-remarks`}
                                                    placeholder="Remarks or Findings..."
                                                    value={i.remarks || ''}
                                                    onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                                                />
                                            </div>
                                        )}
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
                            className="text-white"
                        >
                            Update RRPPE
                        </Button>
                    </DialogFooter>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}