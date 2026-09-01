import { router, Link, useForm } from '@inertiajs/react';
import { RefreshCw, User, CalendarDays, ClipboardList, Package, ArrowRight, MessageSquarePlus, Phone, Mail, Loader2, CheckCircle2, Filter, ArrowDownWideNarrow, ArrowUpNarrowWide, Check, Plus, X } from 'lucide-react';
import { dueDeliveriesHighlight } from './dueDeliveriesHighlight';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DueDelivery = {
    delivery_id: string;
    po_number: string;
    due_date: string; // ISO date string, e.g. "2026-07-23"
    due_date_formatted?: string | null;
    is_overdue?: boolean;
    days_overdue?: number;
    diff_days?: number;
    status?: string | null;
    end_user?: string | null;
    has_follow_up?: boolean;
    supplier?: { supplier_name: string } | null;
};

type Props = {
    deliveries?: DueDelivery[];
};

// Fallback mock data — shown only if no real `deliveries` prop is passed yet
const MOCK_DELIVERIES: DueDelivery[] = [
    { delivery_id: '1', po_number: 'PO-2026-0317', due_date: '2026-07-20', supplier: { supplier_name: 'Fine Dining Davao Food Services' } },
    { delivery_id: '2', po_number: 'PO-2026-0318', due_date: '2026-07-23', supplier: { supplier_name: 'Fine Dining Davao Food Services' } },
    { delivery_id: '3', po_number: 'PO-2026-0319', due_date: '2026-07-25', supplier: { supplier_name: 'Fine Dining Davao Food Services' } },
    { delivery_id: '4', po_number: 'PO-2026-0320', due_date: '2026-07-29', supplier: { supplier_name: 'Fine Dining Davao Food Services' } },
];

function formatDayMonth(dateStr: string) {
    const date = new Date(dateStr);

    return {
        day: date.getDate().toString().padStart(2, '0'),
        month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    };
}

function daysUntil(dateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

    if (diff < 0) {
        return { 
            text: `${Math.abs(diff)}d overdue`, 
            cardStyle: 'border-l-red-500 bg-red-50/70 dark:bg-red-950/30',
            textStyle: 'text-red-600 dark:text-red-400 font-medium'
        };
    }

    if (diff === 0) {
        return { 
            text: 'Due today', 
            cardStyle: 'border-l-orange-500 bg-orange-50/70 dark:bg-orange-950/30',
            textStyle: 'text-orange-600 dark:text-orange-400 font-medium'
        };
    }

    if (diff === 1) {
        return { 
            text: 'Due tomorrow', 
            cardStyle: 'border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/30',
            textStyle: 'text-amber-600 dark:text-amber-400 font-medium'
        };
    }

    // Due within 7 days
    if (diff <= 7) {
        return { 
            text: `Due in ${diff} days`, 
            cardStyle: 'border-l-yellow-500 bg-yellow-50/70 dark:bg-yellow-950/30',
            textStyle: 'text-yellow-600 dark:text-yellow-400 font-medium'
        };
    }

    // Due within 14 days
    if (diff <= 14) {
        return {
            text: `Due in ${diff} days`,
            cardStyle: 'border-l-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30',
            textStyle: 'text-emerald-600 dark:text-emerald-400 font-medium'
        };
    }

    // More than 14 days away
    return null;
}

export function DueDeliveries({ deliveries }: Props) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'due_today' | 'due_soon'>('all');
    
    const rawData = deliveries ?? MOCK_DELIVERIES;

    const data = useMemo(() => {
        let result = [...rawData];

        // Filter
        if (filterStatus !== 'all') {
            result = result.filter(item => {
                const diff = item.diff_days ?? 0;
                const isOverdue = item.is_overdue ?? false;
                
                if (filterStatus === 'overdue') return isOverdue;
                if (filterStatus === 'due_today') return !isOverdue && diff === 0;
                if (filterStatus === 'due_soon') return !isOverdue && diff > 0 && diff <= 7;
                return true;
            });
        }

        // Sort
        result.sort((a, b) => {
            const dateA = new Date(a.due_date).getTime();
            const dateB = new Date(b.due_date).getTime();
            // Ascending: earliest first. Descending: latest first.
            // Note: diff_days is from today, so larger diff_days = later in the future.
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        return result;
    }, [rawData, filterStatus, sortOrder]);

    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
    const [isCustomNoticeType, setIsCustomNoticeType] = useState(false);
    const [recentFollowUps, setRecentFollowUps] = useState<any[]>([]);
    const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
    
    const { data: formData, setData: setFormData, post, processing, reset } = useForm({
        delivery_id: '',
        notice_type: 'Phone',
        follow_up_date: '',
        remarks: '',
        custom_message: '',
    });

    const openFollowUpModal = async (deliveryId: string) => {
        setFormData({
            delivery_id: deliveryId,
            notice_type: 'Phone',
            follow_up_date: '',
            remarks: '',
            custom_message: '',
        });
        
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
        setFormData('follow_up_date', localISOTime);
        setIsCustomNoticeType(false);
        setFollowUpModalOpen(true);
        
        setIsLoadingFollowUps(true);
        try {
            const response = await fetch(`/deliveries/${deliveryId}/recent-follow-ups`);
            const data = await response.json();
            setRecentFollowUps(data);
        } catch (error) {
            console.error('Failed to fetch recent follow-ups', error);
        } finally {
            setIsLoadingFollowUps(false);
        }
    };

    const submitFollowUp = (e: React.FormEvent) => {
        e.preventDefault();
        const url = formData.notice_type === 'Email' 
            ? `/deliveries/${formData.delivery_id}/send-follow-up` 
            : '/delivery-follow-ups';
            
        post(url, {
            preserveScroll: true,
            onSuccess: () => {
                setFollowUpModalOpen(false);
                reset();
            },
        });
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['deliveries'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const renderList = (isModalView = false) => (
        <div className={`pb-2 ${isModalView ? 'flex flex-col gap-4' : 'space-y-2'}`}>
            {data.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-400 col-span-full">
                    No upcoming deliveries.
                </p>
            )}

            <TooltipProvider delayDuration={200}>
                {data.map((item) => {
                    const status = daysUntil(item.due_date);
                    if (!status) return null;

                    const { text, cardStyle, textStyle } = status;
                    const { day, month } = formatDayMonth(item.due_date);

                    return (
                        <Tooltip key={item.delivery_id}>
                            <TooltipTrigger asChild>
                                <div
                                    className={`flex items-center rounded-lg border-l-4 cursor-pointer transition-colors ${cardStyle} ${isModalView ? 'p-4 gap-4 hover:bg-neutral-100 dark:hover:bg-neutral-800 border shadow-sm' : 'p-2.5 gap-3'}`}
                                >
                                    <div className={`flex shrink-0 flex-col items-center leading-none ${isModalView ? 'w-16' : 'w-12'}`}>
                                        <span className={`font-medium text-neutral-500 ${isModalView ? 'text-xs' : 'text-[10px]'}`}>{month}</span>
                                        <span className={`font-bold text-neutral-800 dark:text-neutral-100 ${isModalView ? 'text-2xl' : 'text-lg'}`}>
                                            {day}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate font-bold text-neutral-800 dark:text-neutral-100 ${isModalView ? 'text-base' : 'text-sm'}`}>
                                            {item.po_number}
                                        </p>
                                        {(item.supplier?.supplier_name || item.end_user) && (
                                            <p className={`truncate text-neutral-500 ${isModalView ? 'text-sm' : 'text-xs'}`}>
                                                {item.supplier?.supplier_name ?? item.end_user}
                                            </p>
                                        )}
                                        <p className={`mt-0.5 ${textStyle} ${isModalView ? 'text-sm' : 'text-xs'}`}>{text}</p>
                                    </div>
                                    {isModalView && (
                                        <div className="shrink-0 ml-4">
                                            <Button 
                                                variant="outline" 
                                                size={isModalView ? "default" : "sm"}
                                                className={`gap-2 border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800 ${isModalView ? 'text-sm px-4' : 'h-8 text-xs'} ${item.has_follow_up ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 cursor-default opacity-80' : ''}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!item.has_follow_up) {
                                                        openFollowUpModal(item.delivery_id);
                                                    }
                                                }}
                                            >
                                                {item.has_follow_up ? (
                                                    <CheckCircle2 className="size-4" />
                                                ) : (
                                                    <MessageSquarePlus className="size-4" />
                                                )}
                                                <span className="hidden sm:inline">{item.has_follow_up ? 'Followed up' : 'Follow Up Supplier'}</span>
                                                <span className="sm:hidden">{item.has_follow_up ? 'Logged' : 'Log'}</span>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent 
                                side="left" 
                                sideOffset={15}
                                className="w-84 p-5 shadow-xl rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="border-b border-neutral-100 pb-3 dark:border-neutral-800">
                                        <h4 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{item.po_number}</h4>
                                        <p className="text-xs text-neutral-500 font-medium">View delivery details</p>
                                    </div>

                                    <div className="grid gap-3 text-sm">
                                        <div className="flex gap-3 items-start">
                                            <User className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Supplier</p>
                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.supplier?.supplier_name ?? '—'}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 items-start">
                                            <CalendarDays className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Due Date</p>
                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.due_date} ({text})</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 items-start">
                                            <ClipboardList className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Status</p>
                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.status ?? '—'}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-3 items-start">
                                            <Package className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">End User</p>
                                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.end_user ?? '—'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Link 
                                            href={`/deliveries?highlight_id=${item.delivery_id}`}
                                            onClick={() => dueDeliveriesHighlight(item.delivery_id.toString(), '/deliveries')}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus-visible:outline-none"
                                        >
                                            Go to <ArrowRight className="size-4" />
                                        </Link>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </TooltipProvider>
        </div>
    );

    return (
        <>
            <Dialog>
                <div className="relative flex h-full flex-col rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-neutral-900 overflow-hidden">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                            Due Deliveries
                        </h3>
                        <div className="flex items-center gap-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className="relative rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 focus:outline-none"
                                        aria-label="Filter deliveries"
                                    >
                                        <Filter className="size-4" />
                                        {filterStatus !== 'all' && (
                                            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-red-600 border border-white dark:border-neutral-900" />
                                        )}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setSortOrder('desc')} className="flex items-center justify-between cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <ArrowDownWideNarrow className="size-4" />
                                            <span>Latest Due</span>
                                        </div>
                                        {sortOrder === 'desc' && <Check className="size-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortOrder('asc')} className="flex items-center justify-between cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <ArrowUpNarrowWide className="size-4" />
                                            <span>Earliest Due</span>
                                        </div>
                                        {sortOrder === 'asc' && <Check className="size-4" />}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Filter By Status</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setFilterStatus('all')} className="flex items-center justify-between cursor-pointer">
                                        <span>All Due</span>
                                        {filterStatus === 'all' && <Check className="size-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setFilterStatus('overdue')} className="flex items-center justify-between cursor-pointer">
                                        <span className="text-red-600 dark:text-red-400 font-medium">Overdue</span>
                                        {filterStatus === 'overdue' && <Check className="size-4 text-red-600 dark:text-red-400" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setFilterStatus('due_today')} className="flex items-center justify-between cursor-pointer">
                                        <span className="text-orange-600 dark:text-orange-400 font-medium">Due Today</span>
                                        {filterStatus === 'due_today' && <Check className="size-4 text-orange-600 dark:text-orange-400" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setFilterStatus('due_soon')} className="flex items-center justify-between cursor-pointer">
                                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">Due Next 7 Days</span>
                                        {filterStatus === 'due_soon' && <Check className="size-4 text-yellow-600 dark:text-yellow-400" />}
                                    </DropdownMenuItem>

                                    {/* Clear Filters */}
                                    {(filterStatus !== 'all' || sortOrder !== 'desc') && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                onClick={() => {
                                                    setFilterStatus('all');
                                                    setSortOrder('desc');
                                                }} 
                                                className="flex items-center justify-center cursor-pointer text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                                            >
                                                Clear Filters
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 focus:outline-none"
                                aria-label="Refresh due deliveries"
                            >
                                <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 pr-3">
                        {renderList(false)}
                    </ScrollArea>

                    <div className="relative mt-2 border-t border-neutral-200 dark:border-neutral-800 pt-3 text-center">
                        <div className="pointer-events-none absolute bottom-[100%] left-[-16px] right-[-16px] h-8 z-10 bg-gradient-to-t from-white to-white/0 dark:from-neutral-900 dark:to-neutral-900/0" />
                        <DialogTrigger className="text-sm font-semibold text-red-700 dark:text-red-500 hover:underline focus:outline-none">
                            View all due deliveries
                        </DialogTrigger>
                    </div>
                </div>

                <DialogContent className="sm:max-w-4xl" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
                        <DialogTitle>All Due Deliveries</DialogTitle>
                        <Button asChild variant="outline" size="sm" className="h-8">
                            <Link href="/delivery-follow-ups">
                                View Follow-ups
                            </Link>
                        </Button>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] -mx-6 px-6 mt-2">
                        <div className="pb-4">
                            {renderList(true)}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Follow Up Modal */}
            <Dialog open={followUpModalOpen} onOpenChange={setFollowUpModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Log Supplier Follow-up</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitFollowUp} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="notice_type">Communication Method</Label>
                            <div className="flex items-center gap-2">
                                {isCustomNoticeType ? (
                                    <div className="flex flex-1 items-center gap-2">
                                        <Input
                                            id="notice_type"
                                            type="text"
                                            placeholder="Enter custom method..."
                                            value={formData.notice_type}
                                            onChange={(e) => setFormData('notice_type', e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 rounded-md w-10 h-10 border border-neutral-200 dark:border-neutral-800"
                                            onClick={() => {
                                                setIsCustomNoticeType(false);
                                                setFormData('notice_type', 'Phone');
                                            }}
                                            aria-label="Back to predefined choices"
                                        >
                                            <X className="w-4 h-4 text-neutral-500" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-1 items-center gap-2">
                                        <Select 
                                            value={formData.notice_type} 
                                            onValueChange={(value) => setFormData('notice_type', value)}
                                        >
                                            <SelectTrigger id="notice_type" className="flex-1">
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Phone">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-blue-500" />
                                                        Phone Call
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="Email">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-4 h-4 text-emerald-500" />
                                                        Email Notice
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0 w-10 h-10 border-neutral-200 dark:border-neutral-800 border"
                                            onClick={() => {
                                                setIsCustomNoticeType(true);
                                                setFormData('notice_type', '');
                                            }}
                                            aria-label="Add custom method"
                                        >
                                            <Plus className="w-4 h-4 text-neutral-500" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="follow_up_date">Date & Time</Label>
                            <Input
                                id="follow_up_date"
                                type="datetime-local"
                                value={formData.follow_up_date}
                                onChange={(e) => setFormData('follow_up_date', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="remarks">Remarks (Optional)</Label>
                            <Input
                                id="remarks"
                                type="text"
                                placeholder={formData.notice_type === 'Email' ? "Internal notes..." : "Any additional notes..."}
                                value={formData.remarks}
                                onChange={(e) => setFormData('remarks', e.target.value)}
                            />
                        </div>
                        
                        {formData.notice_type === 'Email' && (
                            <div className="grid gap-2 border-t pt-4 mt-2 border-neutral-100 dark:border-neutral-800">
                                <Label htmlFor="custom_message" className="text-blue-600 dark:text-blue-400">Custom Email Message (Optional)</Label>
                                <p className="text-xs text-neutral-500">This will be injected into the automated email sent to the supplier.</p>
                                <textarea
                                    id="custom_message"
                                    className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300"
                                    placeholder="e.g. Please call me back at 555-1234..."
                                    value={formData.custom_message}
                                    onChange={(e) => setFormData('custom_message', e.target.value)}
                                />
                            </div>
                        )}
                        
                        {recentFollowUps.length > 0 && (
                            <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                                <h4 className="text-xs font-semibold uppercase text-neutral-500 mb-3">Recent Follow-ups</h4>
                                <div className="space-y-3 max-h-32 overflow-y-auto pr-2 text-sm">
                                    {recentFollowUps.map((log) => (
                                        <div key={log.id} className="flex gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 mt-1.5 shrink-0" />
                                            <div>
                                                <p className="text-neutral-900 dark:text-neutral-100 font-medium text-xs">
                                                    {log.notice_type} <span className="text-neutral-500 font-normal">by {log.user_name} on {format(new Date(log.follow_up_date), 'MMM d, h:mm a')}</span>
                                                </p>
                                                {log.remarks && <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-0.5">{log.remarks}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setFollowUpModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing} className={formData.notice_type === 'Email' ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-red-700 hover:bg-red-800 text-white"}>
                                {processing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    formData.notice_type === 'Email' ? 'Send Email & Save' : 'Save Record'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}