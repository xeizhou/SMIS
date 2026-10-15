import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
/* ---------- Date helpers (local time, no timezone shifting) ---------- */

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS_BACK = 50;
const YEARS_AHEAD = 10;
const NO_SCROLL_ARROWS = '[&>div:not([data-radix-select-viewport])]:hidden';

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

export function formatDate(dateString: string) {
    if (!dateString) return '—';
    const date = dateString.length === 10 ? parseISO(dateString) : new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/* ---------- Calendar month grid (shadcn look) ---------- */

interface MonthGridProps {
    year: number;
    month: number; // 0-11
    from: string;
    to: string;
    hover: string;
    onPick: (iso: string) => void;
    onHover: (iso: string) => void;
}

function MonthGrid({ year, month, from, to, hover, onPick, onHover }: MonthGridProps) {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayISO = toISO(new Date());

    // While picking the 2nd date, preview the range using the hovered day
    const previewEnd = to || (from && hover && hover > from ? hover : '');

    const cells: (number | null)[] = [
        ...Array(firstWeekday).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
        <div className="w-[252px]">
            <div className="grid grid-cols-7 mb-1">
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

                    const iso = toISO(new Date(year, month, day));
                    const isStart = iso === from;
                    const isEnd = iso === (to || '');
                    const isSelected = isStart || isEnd;
                    const inRange = !!from && !!previewEnd && iso > from && iso < previewEnd;
                    const hasRange = !!from && !!previewEnd && previewEnd !== from;
                    const isToday = iso === todayISO;

                    return (
                        <div
                            key={iso}
                            className={
                                'relative h-9 w-9 p-0 ' +
                                (inRange ? 'bg-accent ' : '') +
                                (isStart && hasRange ? 'bg-accent rounded-l-md ' : '') +
                                (iso === previewEnd && hasRange ? 'bg-accent rounded-r-md ' : '')
                            }
                        >
                            <button
                                type="button"
                                onClick={() => onPick(iso)}
                                onMouseEnter={() => onHover(iso)}
                                className={
                                    'h-9 w-9 rounded-md text-sm font-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                                    (isSelected
                                        ? 'bg-[#612A35] text-white hover:bg-[#612A35]/90 '
                                        : 'hover:bg-accent hover:text-accent-foreground ') +
                                    (isToday && !isSelected ? 'bg-accent text-accent-foreground font-semibold ' : '')
                                }
                            >
                                {day}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ---------- Date range picker (popover + 2 months) ---------- */

interface DateRangePickerProps {
    dateFrom: string;
    dateTo: string;
    setDateFrom: (v: string) => void;
    setDateTo: (v: string) => void;
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
    const [hover, setHover] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const selectBusy = useRef(false);

    const handleSelectOpen = (isOpen: boolean) => {
        if (isOpen) {
            selectBusy.current = true;
        } else {
            // keep it "busy" briefly so the same click that closed the dropdown doesn't close the picker
            setTimeout(() => {
                selectBusy.current = false;
            }, 150);
        }
    };

    const initial = dateFrom ? parseISO(dateFrom) : new Date();
    const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
        if (selectBusy.current) return;
        const target = e.target as HTMLElement;
        if (target.closest('[data-radix-popper-content-wrapper], [role="listbox"]')) return;
        if (ref.current && !ref.current.contains(target)) {
            setOpen(false);
        }
    }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const shiftMonth = (delta: number) => {
        setView((v) => {
            const d = new Date(v.year, v.month + delta, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    };

    const second = new Date(view.year, view.month + 1, 1);
    const currentYear = new Date().getFullYear();
    const minYear = Math.min(currentYear - YEARS_BACK, view.year);
    const maxYear = Math.max(currentYear + YEARS_AHEAD, view.year);
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

    const handlePick = (iso: string) => {
        // No start yet, or a full range already exists -> start a new range
        if (!dateFrom || (dateFrom && dateTo)) {
            setDateFrom(iso);
            setDateTo('');
            return;
        }
        // Picking the end date
        if (iso < dateFrom) {
            setDateTo(dateFrom);
            setDateFrom(iso);
        } else {
            setDateTo(iso);
        }
    };

    const label =
        dateFrom && dateTo
            ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
            : dateFrom
            ? `From ${formatDate(dateFrom)}`
            : dateTo
            ? `Until ${formatDate(dateTo)}`
            : 'Date range';

    return (
        <div className="relative" ref={ref}>
            <Button
                type="button"
                variant="outline"
                onClick={() => setOpen((v) => !v)}
                className="justify-start text-left font-normal text-black w-[240px] overflow-hidden"
            >
                <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{label}</span>
            </Button>

            {open && (
                <div className="absolute z-50 mt-2 w-max rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
                    {/* Month navigation */}
                    <div className="mb-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="size-8 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100"
                                onClick={() => shiftMonth(-1)}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>

                            <Select
                                value={String(view.month)}
                                onOpenChange={handleSelectOpen}
                                onValueChange={(v) => setView((prev) => ({ ...prev, month: Number(v) }))}
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
                                onOpenChange={handleSelectOpen}
                                onValueChange={(v) => setView((prev) => ({ ...prev, year: Number(v) }))}
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

                        <div className="flex items-center gap-2">
                            <span className="hidden text-sm font-medium sm:inline">
                                {MONTH_SHORT[second.getMonth()]} {second.getFullYear()}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                className="size-8 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100"
                                onClick={() => shiftMonth(1)}
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>

                    <div
                        className="flex flex-col gap-4 sm:flex-row"
                        onMouseLeave={() => setHover('')}
                    >
                        <MonthGrid
                            year={view.year}
                            month={view.month}
                            from={dateFrom}
                            to={dateTo}
                            hover={hover}
                            onPick={handlePick}
                            onHover={setHover}
                        />
                        <div className="hidden sm:block">
                            <MonthGrid
                                year={second.getFullYear()}
                                month={second.getMonth()}
                                from={dateFrom}
                                to={dateTo}
                                hover={hover}
                                onPick={handlePick}
                                onHover={setHover}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setDateFrom('');
                                setDateTo('');
                                setHover('');
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="bg-[#612A35] text-white hover:bg-[#612A35]/90"
                            onClick={() => {
                                setOpen(false);
                                onApply();
                            }}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}