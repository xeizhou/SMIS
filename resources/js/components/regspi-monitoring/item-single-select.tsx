import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { StockItemOption } from '../purchase-order/item-multi-select';

interface Props {
    label?: string;
    value: string | null; // This will hold the stock_no
    onChange: (stockNo: string | null, itemName: string | null) => void;
    options: StockItemOption[];
    error?: string;
    onAddNew?: (query: string) => void;
    readOnly?: boolean;
    placeholder?: string;
    fallbackLabel?: string | null;
}

export default function ItemSingleSelect({
    label = 'Item',
    value,
    onChange,
    options,
    error,
    onAddNew,
    readOnly = false,
    placeholder = 'Search items...',
    fallbackLabel,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selectedItem = options.find((o) => o.stock_no === value);
    const available = options;

    const trimmedQuery = query.trim();
    const hasExactMatch = available.some(
        (o) => o.item_name.trim().toLowerCase() === trimmedQuery.toLowerCase()
    );
    const showAddNew = !!onAddNew && !hasExactMatch && !readOnly;

    const handleSelect = (item: StockItemOption) => {
        onChange(item.stock_no, item.item_name);
        setQuery('');
        setOpen(false);
    };

    const handleRemove = () => {
        if (!readOnly) {
            onChange(null, null);
        }
    };

    // Determine if we should show the "card" view
    const showCard = selectedItem || fallbackLabel;

    return (
        <div>
            <label className="mb-1 block text-sm text-foreground">{label}</label>

            {showCard ? (
                readOnly && !selectedItem ? (
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                        <span className="truncate">{fallbackLabel}</span>
                    </div>
                ) : (
                    <div className={cn(
                        "group flex items-center justify-between rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors",
                        readOnly ? "bg-muted cursor-not-allowed" : "bg-card"
                    )}>
                        <div className="flex flex-col leading-tight overflow-hidden">
                            <span className="font-medium text-foreground truncate">
                                {selectedItem ? selectedItem.item_name : fallbackLabel}
                            </span>
                            {selectedItem && (
                                <span className="text-xs text-muted-foreground truncate">{selectedItem.stock_no}</span>
                            )}
                        </div>
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="ml-2 shrink-0 rounded-full p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                )
            ) : (
                <Popover open={open} onOpenChange={setOpen} modal={true}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            disabled={readOnly}
                            className={cn(
                                'w-full justify-between font-normal',
                                !value && 'text-muted-foreground',
                                error && 'border-red-500',
                                readOnly && 'bg-muted text-muted-foreground cursor-not-allowed'
                            )}
                        >
                            <span className="flex items-center gap-1.5">
                                {readOnly ? (
                                    placeholder
                                ) : (
                                    <>
                                        <Plus className="size-3.5" />
                                        Select item
                                    </>
                                )}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                        <Command>
                            <CommandInput
                                placeholder={placeholder}
                                value={query}
                                onValueChange={setQuery}
                            />
                            <CommandList style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                <CommandEmpty>
                                    <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                                        No item found.
                                    </p>
                                </CommandEmpty>

                                {showAddNew && (
                                    <CommandGroup>
                                        <CommandItem
                                            value={`__add_new__${trimmedQuery}`}
                                            onSelect={() => {
                                                onAddNew(trimmedQuery);
                                                setOpen(false);
                                            }}
                                            className="text-primary"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            {trimmedQuery
                                                ? `Add "${trimmedQuery}" as new item`
                                                : 'Add new item'}
                                        </CommandItem>
                                    </CommandGroup>
                                )}

                                <CommandGroup>
                                    {available.map((item) => (
                                        <CommandItem
                                            key={item.stock_no}
                                            value={`${item.item_name} ${item.stock_no} ${item.description ?? ''}`}
                                            onSelect={() => handleSelect(item)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === item.stock_no ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span>{item.item_name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {item.stock_no}
                                                    {item.description ? ` · ${item.description}` : ''}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
