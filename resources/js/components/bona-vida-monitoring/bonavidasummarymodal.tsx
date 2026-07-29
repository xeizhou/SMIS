import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle as CardTitleUI } from '@/components/ui/card';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfficeConsumption {
    office_code: string;
    office_name: string;
    total_qty: number;
    total_amount: number;
}

interface BonaVidaRecord {
    bvm_id: number;
    date_received: string;
    office_code: string;
    qty: number;
    price: string;
    total_amount: string;
    invoice_no: string;
    invoice_date: string;
    remarks: string | null;
    office?: {
        office_name: string;
    };
}

interface SummaryData {
    date: string;
    consumptions: OfficeConsumption[];
    billing_statements: BonaVidaRecord[];
    total_panels: number;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function BonaVidaSummaryModal({ open, onOpenChange }: Props) {
    const [date, setDate] = useState<Date>(new Date());
    const [data, setData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchSummary(date);
        }
    }, [open, date]);

    const fetchSummary = async (selectedDate: Date) => {
        setLoading(true);
        try {
            const y = selectedDate.getFullYear();
            const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const d = String(selectedDate.getDate()).padStart(2, '0');
            const formattedDateParam = `${y}-${m}-${d}`;
            
            const response = await fetch(`/bona-vida-monitoring/summary?date=${formattedDateParam}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const responseData = await response.json();
            setData(responseData);
        } catch (error) {
            console.error('Failed to fetch summary data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateSelect = (selected: Date | undefined) => {
        if (selected) {
            setDate(selected);
        }
    };

    const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto p-6">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <DialogTitle className="text-xl font-bold">Bona Vida Summary</DialogTitle>
                    <div className="flex items-center gap-2 pr-6">
                        <label className="text-sm font-medium whitespace-nowrap">Select Date:</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-[240px] justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formattedDate}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                                className="w-auto p-0" 
                                align="end"
                                onInteractOutside={(e) => {
                                    if (e.target instanceof Element && e.target.closest('[data-radix-popper-content-wrapper]')) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={handleDateSelect}
                                    initialFocus
                                    captionLayout="dropdown"
                                    fromYear={2020}
                                    toYear={new Date().getFullYear() + 2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </DialogHeader>

                {!data ? (
                    <div className="flex h-40 items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className={cn("grid gap-6 md:grid-cols-3 pb-4", loading && "opacity-50 pointer-events-none transition-opacity")}>
                        {/* Panel 1: Number of panels delivered per month */}
                        <Card className="md:col-span-3 lg:col-span-1 shadow-none border-muted">
                            <CardHeader className="pb-2">
                                <CardTitleUI className="text-lg font-medium">Total Water Bottles Delivered</CardTitleUI>
                                <CardDescription>Overall quantity for {formattedDate}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-[#612A35]">{data.total_panels}</div>
                            </CardContent>
                        </Card>

                        {/* Panel 2: Consumption of each office */}
                        <Card className="md:col-span-3 lg:col-span-2 shadow-none border-muted">
                            <CardHeader className="pb-2">
                                <CardTitleUI className="text-lg font-medium">Office Consumption</CardTitleUI>
                                <CardDescription>Breakdown by office for {formattedDate}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="border-b bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium">Office</th>
                                                <th className="px-4 py-2 text-right font-medium">Quantity</th>
                                                <th className="px-4 py-2 text-right font-medium">Total Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.consumptions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                                        No consumption data for this month.
                                                    </td>
                                                </tr>
                                            ) : (
                                                data.consumptions.map((c) => (
                                                    <tr key={c.office_code} className="border-b last:border-0">
                                                        <td className="px-4 py-2">{c.office_name}</td>
                                                        <td className="px-4 py-2 text-right">{c.total_qty}</td>
                                                        <td className="px-4 py-2 text-right">₱{c.total_amount.toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Panel 3: Billing statement (per month) */}
                        <Card className="md:col-span-3 shadow-none border-muted">
                            <CardHeader className="pb-2">
                                <CardTitleUI className="text-lg font-medium">Billing Statement</CardTitleUI>
                                <CardDescription>Detailed deliveries for {formattedDate}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="border-b bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium">Date Received</th>
                                                <th className="px-4 py-2 text-left font-medium">Invoice No</th>
                                                <th className="px-4 py-2 text-left font-medium">Office</th>
                                                <th className="px-4 py-2 text-right font-medium">Quantity</th>
                                                <th className="px-4 py-2 text-right font-medium">Price</th>
                                                <th className="px-4 py-2 text-right font-medium">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.billing_statements.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                                        No billing statements for this month.
                                                    </td>
                                                </tr>
                                            ) : (
                                                data.billing_statements.map((b) => (
                                                    <tr key={b.bvm_id} className="border-b last:border-0">
                                                        <td className="px-4 py-2">{b.date_received ? new Date(b.date_received).toLocaleDateString() : '—'}</td>
                                                        <td className="px-4 py-2">{b.invoice_no}</td>
                                                        <td className="px-4 py-2">{b.office?.office_name ?? b.office_code}</td>
                                                        <td className="px-4 py-2 text-right">{b.qty}</td>
                                                        <td className="px-4 py-2 text-right">₱{b.price}</td>
                                                        <td className="px-4 py-2 text-right font-medium">₱{b.total_amount}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
