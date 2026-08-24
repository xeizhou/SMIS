import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
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

export interface StockItemOption {
    stock_no: string;
    item_name: string;
    description: string | null;
}

interface Props {
    label?: string;
    value: string[];
    onChange: (value: string[]) => void;
    options: StockItemOption[];
    error?: string;
    onAddNew?: (query: string) => void;
}

export default function ItemMultiSelect({
    label = 'Items',
    value,
    onChange,
    options,
    error,
    onAddNew,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = options.filter((o) => value.includes(o.stock_no));
    const available = options.filter((o) => !value.includes(o.stock_no));

    const trimmedQuery = query.trim();
    const hasExactMatch = available.some(
        (o) => o.item_name.trim().toLowerCase() === trimmedQuery.toLowerCase()
    );
    // Always show "Add new" once onAddNew is provided — pre-filled with
    // the current query if there's no exact match, otherwise just opens
    // the modal blank (or with the query, if they want to add a near-dup).
    const showAddNew = !!onAddNew && !hasExactMatch;

    const toggleItem = (stockNo: string) => {
        onChange(
            value.includes(stockNo)
                ? value.filter((v) => v !== stockNo)
                : [...value, stockNo]
        );
    };

    const removeItem = (stockNo: string) => {
        onChange(value.filter((v) => v !== stockNo));
    };

    return (
        <div>
            <label className="mb-1 block text-sm text-foreground">{label}</label>

                        {selected.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                                {selected.map((item) => (
                                    <div
                                        key={item.stock_no}
                                        className="group flex items-center gap-2 rounded-lg border bg-muted/50 pl-3 pr-2 py-1.5 text-sm shadow-sm transition-colors hover:bg-muted"
                                    >
                                        <div className="flex flex-col leading-tight">
                                            <span className="font-medium text-foreground">{item.item_name}</span>
                                            <span className="text-[11px] text-muted-foreground">{item.stock_no}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.stock_no)}
                                            className="ml-1 rounded-full p-0.5 text-muted-foreground opacity-70 hover:bg-red-100 hover:text-red-600 hover:opacity-100 transition-colors"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            'w-full justify-between font-normal text-muted-foreground',
                            error && 'border-red-500'
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <Plus className="size-3.5" />
                            Add items
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                        <CommandInput
                            placeholder="Search stock items..."
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
                                        onSelect={() => {
                                            toggleItem(item.stock_no);
                                            setQuery('');
                                            setOpen(false);
                                        }}
                                    >
                                        <Check className="mr-2 h-4 w-4 opacity-0" />
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

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}