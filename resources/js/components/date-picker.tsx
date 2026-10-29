import { useState } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const YEARS_BACK = 50;
const YEARS_AHEAD = 10;

// Hides the scroll up/down arrow buttons inside the select dropdown
const NO_SCROLL_ARROWS = '[&>div:not([data-radix-select-viewport])]:hidden';

// Hides the browser's own calendar icon (we show our own button instead)
const HIDE_NATIVE_ICON =
    '[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none';

function toISO(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseISO(s: string) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

interface DatePickerProps {
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    className?: string; // wrapper class, e.g. "w-[200px]"
    buttonClassName?: string;
    id?: string;
    name?: string;
    disabled?: boolean;
    ariaLabel?: string;
}

export default function DatePicker({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder,
    className,
    buttonClassName,
    id,
    name,
    disabled = false,
    ariaLabel,
}: DatePickerProps) {
    const [open, setOpen] = useState(false);

    const initial = value ? parseISO(value) : new Date();
    const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

    const shiftMonth = (delta: number) => {
        setView((v) => {
            const d = new Date(v.year, v.month + delta, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    };

    const currentYear = new Date().getFullYear();
    const minYear = Math.min(currentYear - YEARS_BACK, view.year);
    const maxYear = Math.max(currentYear + YEARS_AHEAD, view.year);
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const todayISO = toISO(new Date());

    const cells: (number | null)[] = [
        ...Array(firstWeekday).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
        <div className={className}>
            {label && (
                <label className="mb-1 block text-sm font-medium text-foreground">
                    {label}
                    {required && <span className="text-red-500"> *</span>}
                </label>
            )}

            <div className="relative">
                {/* Native date input: typing, clamping and segment editing are all browser-native */}
                <Input
                    type="date"
                    id={id}
                    name={name}
                    value={value}
                    min="1900-01-01"
                    max="9999-12-31"
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    onChange={(e) => onChange(e.target.value)}
                    className={cn('pr-10', HIDE_NATIVE_ICON, error && 'border-red-500')}
                />

                <Popover
                    open={disabled ? false : open}
                    onOpenChange={(o) => {
                        if (disabled) return;
                        setOpen(o);
                        if (o) {
                            const base = value ? parseISO(value) : new Date();
                            setView({ year: base.getFullYear(), month: base.getMonth() });
                        }
                    }}
                    modal={true}
                >
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={disabled}
                            tabIndex={-1}
                            className={cn(
                                "absolute right-0 top-0 size-9 text-muted-foreground hover:bg-transparent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed",
                                buttonClassName
                            )}
                            title="Open calendar"
                        >
                            <CalendarIcon className="size-4" />
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-3" align="end">
                        {/* Header: prev | month dropdown | year dropdown | next */}
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="size-8 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100"
                                onClick={() => shiftMonth(-1)}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>

                            <div className="flex items-center gap-2">
                                <Select
                                    value={String(view.month)}
                                    onValueChange={(v) =>
                                        setView((prev) => ({ ...prev, month: Number(v) }))
                                    }
                                >
                                    <SelectTrigger className="h-8 w-[78px] px-2.5 text-sm">
                                        <SelectValue>{MONTH_SHORT[view.month]}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className={cn('max-h-[240px]', NO_SCROLL_ARROWS)}>
                                        {MONTH_NAMES.map((name, i) => (
                                            <SelectItem key={name} value={String(i)}>
                                                {name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={String(view.year)}
                                    onValueChange={(v) =>
                                        setView((prev) => ({ ...prev, year: Number(v) }))
                                    }
                                >
                                    <SelectTrigger className="h-8 w-[88px] px-2.5 text-sm">
                                        <SelectValue>{view.year}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className={cn('max-h-[240px]', NO_SCROLL_ARROWS)}>
                                        {years.map((y) => (
                                            <SelectItem key={y} value={String(y)}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="size-8 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100"
                                onClick={() => shiftMonth(1)}
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>

                        <div className="w-[252px]">
                            <div className="mb-1 grid grid-cols-7">
                                {WEEKDAYS.map((w) => (
                                    <div
                                        key={w}
                                        className="flex h-8 w-9 items-center justify-center text-[0.8rem] font-normal text-muted-foreground"
                                    >
                                        {w}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {cells.map((day, i) => {
                                    if (day === null) return <div key={`e-${i}`} className="h-9 w-9" />;

                                    const iso = toISO(new Date(view.year, view.month, day));
                                    const isSelected = iso === value;
                                    const isToday = iso === todayISO;

                                    return (
                                        <button
                                            key={iso}
                                            type="button"
                                            onClick={() => {
                                                onChange(iso);
                                                setOpen(false);
                                            }}
                                            className={cn(
                                                'h-9 w-9 rounded-md text-sm font-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                isSelected
                                                    ? 'bg-[#612A35] text-white hover:bg-[#612A35]/90'
                                                    : 'hover:bg-accent hover:text-accent-foreground',
                                                isToday && !isSelected && 'bg-accent font-semibold text-accent-foreground'
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t pt-3">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    onChange(todayISO);
                                    setOpen(false);
                                }}
                            >
                                Today
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                disabled={!value}
                                onClick={() => onChange('')}
                            >
                                Clear
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
        </div>
    );
}