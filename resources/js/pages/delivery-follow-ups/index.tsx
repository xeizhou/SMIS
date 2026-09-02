import { Head, Link, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Phone, Mail, Trash2, Search, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

type FollowUp = {
    id: number;
    delivery_id: string;
    po_number: string;
    supplier_name: string;
    notice_type: string;
    remarks: string | null;
    user_name: string;
    follow_up_date: string;
    created_at: string;
};

type Props = {
    followUps: FollowUp[];
    filters: {
        search?: string;
        notice_type?: string;
    };
};

export default function DeliveryFollowUpsIndex({ followUps, filters }: Props) {
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [noticeType, setNoticeType] = useState(filters.notice_type || 'all');

    const handleSearch = () => {
        router.get('/delivery-follow-ups', {
            search: searchQuery,
            notice_type: noticeType === 'all' ? undefined : noticeType,
        }, { preserveState: true, replace: true });
    };

    const handleClear = () => {
        setSearchQuery('');
        setNoticeType('all');
        router.get('/delivery-follow-ups');
    };

    const confirmDelete = (id: number) => {
        setDeleteId(id);
    };

    const executeDelete = () => {
        if (deleteId) {
            router.delete(`/delivery-follow-ups/${deleteId}`, {
                preserveScroll: true,
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    return (
        <>
            <Head title="Delivery Follow-ups" />
            
            <div className="p-4 space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Delivery Monitoring</h1>
                        <p className="mt-1 text-sm text-muted-foreground">View and manage all supplier follow-ups for pending deliveries</p>
                    </div>
                    <div className="bg-muted/50 text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-lg p-1">
                        <Link
                            href="/deliveries"
                            className="text-muted-foreground hover:text-foreground inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            Deliveries
                        </Link>
                        <Link
                            href="/delivery-follow-ups"
                            preserveState
                            className="bg-background text-foreground shadow-sm inline-flex h-full items-center justify-center rounded-md px-8 py-1.5 text-sm font-medium transition-all"
                        >
                            Follow-ups
                        </Link>
                    </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search P.O Number or Supplier Name"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={noticeType} onValueChange={(value) => { setNoticeType(value); router.get('/delivery-follow-ups', { search: searchQuery, notice_type: value === 'all' ? undefined : value }, { preserveState: true, replace: true }); }}>
                            <SelectTrigger className={`w-[180px] ${noticeType === 'all' ? 'text-muted-foreground' : ''}`}>
                                <SelectValue placeholder="Filter by Notice Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Filter by Notice Type</SelectItem>
                                <SelectItem value="Phone">Phone</SelectItem>
                                <SelectItem value="Email">Email</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="secondary">Search</Button>
                        <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                    </div>
                </form>

                <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b" style={{ backgroundColor: '#370001' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">PO Number</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Supplier</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Notice Type</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Remarks</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Followed By</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Follow-up Date</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {followUps.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">No follow-ups recorded yet.</p>
                                    </td>
                                </tr>
                            ) : (
                                followUps.map((followUp, index) => (
                                    <AnimatedTableRow
                                        key={followUp.id}
                                        index={index}
                                        data-record-id={followUp.id}
                                        className="border-b transition-colors hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3 font-medium">{followUp.po_number}</td>
                                        <td className="px-4 py-3">{followUp.supplier_name}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {followUp.notice_type.toLowerCase() === 'phone' ? (
                                                    <Phone className="w-4 h-4 text-blue-500" />
                                                ) : followUp.notice_type.toLowerCase() === 'email' ? (
                                                    <Mail className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <MessageSquare className="w-4 h-4 text-purple-500" />
                                                )}
                                                {followUp.notice_type}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {followUp.remarks ? (
                                                <span className="text-muted-foreground">{followUp.remarks}</span>
                                            ) : (
                                                <span className="text-muted-foreground italic">No remarks</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {followUp.user_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {format(new Date(followUp.follow_up_date), 'MMM d, yyyy h:mm a')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center">
                                                <button 
                                                    type="button" 
                                                    onClick={() => confirmDelete(followUp.id)} 
                                                    className="text-red-600 hover:text-red-800" 
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </AnimatedTableRow>
                                ))
                            )}
                        </tbody>
                    </table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 font-bold">Delete Record</DialogTitle>
                        <DialogDescription className="py-4 text-foreground text-sm">
                            Are you sure you want to delete this record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={executeDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

DeliveryFollowUpsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Procurement',
            href: '#',
        },
        {
            title: 'Deliveries',
            href: '/deliveries',
        },
        {
            title: 'Delivery Follow-ups',
            href: '/delivery-follow-ups',
        },
    ],
};
