import { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function parseDate(value: string) {
    if (!value) return undefined;
    const date = parseISO(value);
    return isValid(date) ? date : undefined;
}

function toISO(date: Date) {
    return format(date, 'yyyy-MM-dd');
}

export function formatDate(dateString: string) {
    const date = parseDate(dateString);
    if (!date) return dateString || '—';
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

interface DateRangePickerProps {
    dateFrom: string;
    dateTo: string;
    setDateFrom: (value: string) => void;
    setDateTo: (value: string) => void;
    onApply: () => void;
}

export default function DateRangePicker({
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    onApply,
}: DateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const from = parseDate(dateFrom);
    const to = parseDate(dateTo);
    const selectedRange: DateRange | undefined =
        from || to ? { from, to } : undefined;

    const label =
        dateFrom && dateTo
            ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
            : dateFrom
              ? `From ${formatDate(dateFrom)}`
              : dateTo
                ? `Until ${formatDate(dateTo)}`
                : 'Date range';

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn(
                        'w-[240px] justify-start overflow-hidden text-left font-normal text-black',
                        !dateFrom && !dateTo && 'text-muted-foreground',
                    )}
                >
                    <CalendarIcon className="mr-2 size-4 shrink-0" />
                    <span className="truncate">{label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={selectedRange}
                    defaultMonth={selectedRange?.from ?? selectedRange?.to ?? new Date()}
                    onSelect={(range) => {
                        setDateFrom(range?.from ? toISO(range.from) : '');
                        setDateTo(range?.to ? toISO(range.to) : '');
                    }}
                />
                <div className="flex items-center justify-between gap-2 border-t p-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setDateFrom('');
                            setDateTo('');
                        }}
                    >
                        Reset
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                            setOpen(false);
                            onApply();
                        }}
                    >
                        Apply
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
