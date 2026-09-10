import { useForm, router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, RefreshCw, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SearchableSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    options: { value: string; label: string }[];
}

function SearchableSelect({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Search...',
    options,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-foreground">
                    {label}
                    {required && <span className="text-destructive"> *</span>}
                </label>
            </div>
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            'w-full justify-between font-normal',
                            !selectedLabel && 'text-muted-foreground',
                            error && 'border-destructive'
                        )}
                    >
                        {selectedLabel || placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                                                'mr-2 h-4 w-4',
                                                value === opt.value ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        {opt.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
}

interface RrspItem {
    id: number;
    itemName: string;
    itemDescription: string;
    quantity: number;
    propertyNo: string | null;
    kindOfSemiExpendable: string | null;
    status: string | null;
    area: string | null;
    cost?: number | null;
    remarks?: string | null;
}

interface RrspMonitoring {
    id: string;
    rrspNo: string;
    dateReceived: string;
    endUserName: string | null;
    returnBy: string | null;
    poNumber?: string | null;
    items?: RrspItem[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rrsp: RrspMonitoring | null;
    areas: string[];
}

export default function RrspEditForm({ open, onOpenChange, rrsp, areas }: Props) {
    const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

    const [pos, setPos] = useState<any[]>([]);
    const [loadingPos, setLoadingPos] = useState(false);

    useEffect(() => {
        if (open) {
            setLoadingPos(true);
            fetch('/api/rrsp-monitoring/purchase-orders')
                .then(res => res.json())
                .then(data => {
                    setPos(data);
                    setLoadingPos(false);
                })
                .catch(err => {
                    console.error('Failed to fetch POs', err);
                    setLoadingPos(false);
                });
        }
    }, [open]);

    const { data, setData, put, processing, errors, reset } = useForm({
        rrspNo: '',
        poNumber: '',
        dateReceived: '',
        endUserName: '',
        returnBy: '',
        items: [
            {
                itemName: '',
                itemDescription: '',
                quantity: '',
                propertyNo: '',
                kindOfSemiExpendable: '',
                status: '',
                area: '',
                cost: '',
                remarks: '',
            }
        ]
    });

    useEffect(() => {
        if (rrsp) {
            setData({
                rrspNo: rrsp.rrspNo ?? '',
                poNumber: rrsp.poNumber ?? '',
                dateReceived: rrsp.dateReceived ?? '',
                endUserName: rrsp.endUserName ?? '',
                returnBy: rrsp.returnBy ?? '',
                items: rrsp.items && rrsp.items.length > 0 ? rrsp.items.map(item => ({
                    itemName: item.itemName ?? '',
                    itemDescription: item.itemDescription ?? '',
                    quantity: item.quantity?.toString() ?? '',
                    propertyNo: item.propertyNo ?? '',
                    kindOfSemiExpendable: item.kindOfSemiExpendable ?? '',
                    status: item.status ?? '',
                    area: item.area ?? '',
                    cost: item.cost?.toString() ?? '',
                    remarks: item.remarks ?? '',
                })) : [{
                    itemName: '',
                    itemDescription: '',
                    quantity: '',
                    propertyNo: '',
                    kindOfSemiExpendable: '',
                    status: '',
                    area: '',
                    cost: '',
                    remarks: '',
                }],
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rrsp]);

    const addItem = () => {
        setData('items', [
            ...data.items,
            {
                itemName: '',
                itemDescription: '',
                quantity: '',
                propertyNo: '',
                kindOfSemiExpendable: '',
                status: '',
                area: '',
                cost: '',
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
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-rrspNo">RRSP No <span className="text-destructive">*</span></Label>
                                <Input
                                    id="edit-rrspNo"
                                    required
                                    value={data.rrspNo}
                                    onChange={(e) => setData('rrspNo', e.target.value)}
                                />
                                {errors.rrspNo && (
                                    <p className="text-sm text-destructive">{errors.rrspNo}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <SearchableSelect
                                    label="Purchase Order (P.O.)"
                                    value={data.poNumber}
                                    onChange={(value) => {
                                        setData('poNumber', value);
                                        const selectedPo = pos.find(p => p.po_number === value);
                                        const availableItems = selectedPo?.items || [];
                                        
                                        if (availableItems.length > 0) {
                                            const newItems = availableItems.map((ai: any) => {
                                                const desc = ai.description ? `${ai.item_name} - ${ai.description}` : ai.item_name;
                                                return {
                                                    itemName: ai.item_name,
                                                    itemDescription: desc,
                                                    quantity: '',
                                                    propertyNo: '',
                                                    kindOfSemiExpendable: '',
                                                    status: '',
                                                    area: '',
                                                    cost: '',
                                                    remarks: '',
                                                };
                                            });
                                            setData('items', newItems);
                                        } else {
                                            setData('items', [
                                                {
                                                    itemName: '',
                                                    itemDescription: '',
                                                    quantity: '',
                                                    propertyNo: '',
                                                    kindOfSemiExpendable: '',
                                                    status: '',
                                                    area: '',
                                                    cost: '',
                                                    remarks: '',
                                                }
                                            ]);
                                        }
                                    }}
                                    error={errors.poNumber}
                                    required={true}
                                    placeholder={loadingPos ? "Loading..." : "Search P.O."}
                                    options={pos.map(po => ({ value: po.po_number, label: po.po_number }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-dateReceived">Date Received <span className="text-destructive">*</span></Label>
                                <Input
                                    required
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

                    {/* Section: Items */}
                    <div>
                        <div className="flex items-center justify-between border-b pb-2 mb-4">
                            <h3 className="text-sm font-semibold text-foreground">Items</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 gap-1">
                                <Plus className="size-4" /> Add Item
                            </Button>
                        </div>
                        
                        <div className="space-y-6">
                            {data.items.map((item, index) => {
                                const selectedPo = pos.find(p => p.po_number === data.poNumber);
                                const availableItems = selectedPo?.items || [];
                                
                                return (
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
                                            <Label htmlFor={`edit-item-${index}-name`}>Item Name <span className="text-destructive">*</span></Label>
                                            <Input
                                                id={`edit-item-${index}-name`}
                                                required
                                                placeholder="Enter Item Name"
                                                value={item.itemName}
                                                onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                                            />
                                            {(errors as any)[`items.${index}.itemName`] && (
                                                <p className="text-sm text-destructive">{(errors as any)[`items.${index}.itemName`]}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <Label htmlFor={`item-${index}-desc`}>Item Description (from P.O.) <span className="text-destructive">*</span></Label>
                                            <Input
                                                id={`item-${index}-desc`}
                                                required
                                                readOnly
                                                className="bg-muted text-muted-foreground"
                                                placeholder="Auto-filled from P.O."
                                                value={item.itemDescription}
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
                                            <Label htmlFor={`edit-item-${index}-cost`}>Cost</Label>
                                            <Input
                                                id={`edit-item-${index}-cost`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="e.g. 1500.00"
                                                value={item.cost}
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
                                                value={item.area}
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
                                                value={item.status}
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
                                        {item.status === 'UNSERVICEABLE' && (
                                            <div className="space-y-1.5 md:col-span-4">
                                                <Label htmlFor={`edit-item-${index}-remarks`}>Remarks / Findings</Label>
                                                <Textarea
                                                    id={`edit-item-${index}-remarks`}
                                                    placeholder="Remarks or Findings..."
                                                    value={item.remarks || ''}
                                                    onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
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