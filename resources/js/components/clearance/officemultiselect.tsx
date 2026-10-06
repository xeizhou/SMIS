import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Option {
    id: number;
    clearance_office_name: string;
}

interface Props {
    value: number[];
    onChange: (value: number[]) => void;
    options: Option[];
    error?: string;
    required?: boolean;
    onAddNew?: (query: string) => void;
}

export default function OfficeMultiSelect({ value, onChange, options, error, required, onAddNew }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const sortedOptions = useMemo(
        () =>
            [...options].sort((a, b) =>
                a.clearance_office_name.localeCompare(b.clearance_office_name, undefined, {
                    sensitivity: 'base',
                    numeric: true,
                })
            ),
        [options]
    );

    const toggle = (id: number) =>
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

    const selected = options.filter((o) => value.includes(o.id));

    const trimmedQuery = query.trim();
    const hasExactMatch = options.some(
        (o) => o.clearance_office_name.trim().toLowerCase() === trimmedQuery.toLowerCase()
    );
    const showAddNew = !!onAddNew && trimmedQuery !== '' && !hasExactMatch;

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (!next) setQuery('');
    };

    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
                Offices{required && <span className="text-red-500"> *</span>}
            </label>

            <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            'w-full justify-between font-normal',
                            !selected.length && 'text-muted-foreground',
                            error && 'border-red-500'
                        )}
                    >
                        {selected.length ? `${selected.length} selected` : 'Search offices...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command
                        filter={(value, search) =>
                            value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
                        }
                    >
                        <CommandInput
                            placeholder="Search offices..."
                            value={query}
                            onValueChange={setQuery}
                        />
                        <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <CommandEmpty>
                                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                                    No office found.
                                </p>
                            </CommandEmpty>

                            {showAddNew && (
                                <CommandGroup>
                                    <CommandItem
                                        // contains the query so the custom filter never hides it
                                        value={`__add_new__${trimmedQuery}`}
                                        onSelect={() => {
                                            onAddNew!(trimmedQuery);
                                            handleOpenChange(false);
                                        }}
                                        className="text-primary"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add "{trimmedQuery}" as new office
                                    </CommandItem>
                                </CommandGroup>
                            )}

                            <CommandGroup>
                                {sortedOptions.map((opt) => (
                                    <CommandItem
                                        key={opt.id}
                                        value={opt.clearance_office_name}
                                        onSelect={() => {
                                            toggle(opt.id);
                                            handleOpenChange(false);
                                        }}
                                    >
                                        <Check className={cn('mr-2 h-4 w-4', value.includes(opt.id) ? 'opacity-100' : 'opacity-0')} />
                                        {opt.clearance_office_name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {selected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.map((o) => (
                        <Badge key={o.id} variant="secondary" className="gap-1">
                            {o.clearance_office_name}
                            <button type="button" onClick={() => toggle(o.id)} title="Remove">
                                <X className="size-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}