import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
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
}

export default function OfficeMultiSelect({ value, onChange, options, error, required }: Props) {
    const [open, setOpen] = useState(false);

    const toggle = (id: number) =>
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

    const selected = options.filter((o) => value.includes(o.id));

    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
                Offices{required && <span className="text-red-500"> *</span>}
            </label>

            <Popover open={open} onOpenChange={setOpen} modal={true}>
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
                        <CommandInput placeholder="Search offices..." />
                        <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <CommandEmpty>No office found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((opt) => (
                                    <CommandItem
                                        key={opt.id}
                                        value={opt.clearance_office_name}
                                        onSelect={() => toggle(opt.id)}
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