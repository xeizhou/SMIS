import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { 
    ListTodo, 
    Truck, 
    Info, 
    ArrowUpRight, 
    CheckCircle2, 
    FileText, 
    Phone,
    Plus,
    Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssignedTasks } from '@/components/assigned-tasks';
import type { AssignedTask } from '@/components/assigned-tasks';
import { DueDeliveries } from '@/components/due-deliveries';
import type { DueDelivery } from '@/components/due-deliveries';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
    deliveries?: DueDelivery[];
    assignedTasks?: AssignedTask[];
    usersList?: Array<{ id: number; name: string; role: string }>;
    poNumbers?: string[];
    onOpenFollowUp?: (deliveryId: string) => void;
    activeTab?: 'tasks' | 'deliveries';
    onTabChange?: (tab: 'tasks' | 'deliveries') => void;
}

export function ActionCenterCard({
    deliveries,
    assignedTasks,
    usersList = [],
    poNumbers = [],
    onOpenFollowUp,
    activeTab = 'tasks',
    onTabChange,
}: Props) {
    const [currentTab, setCurrentTab] = useState<'tasks' | 'deliveries'>(activeTab);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [infoTab, setInfoTab] = useState<'tasks' | 'deliveries'>('tasks');

    useEffect(() => {
        if (activeTab) {
            setCurrentTab(activeTab);
        }
    }, [activeTab]);

    const handleTabChange = (newTab: 'tasks' | 'deliveries') => {
        setCurrentTab(newTab);
        onTabChange?.(newTab);
    };

    const handleOpenInfo = (tab?: 'tasks' | 'deliveries') => {
        setInfoTab(tab ?? currentTab);
        setIsInfoOpen(true);
    };

    const { auth } = usePage<any>().props;
    const currentUserId = auth?.user?.id;

    // Calculate count of active (non-completed) tasks assigned to current user for tab badge
    const tasksCount = assignedTasks?.filter(t => t.assigned_to?.id === currentUserId && t.status !== 'completed').length ?? 0;
    const deliveriesCount = deliveries?.length ?? 0;

    return (
        <div className="relative flex h-full flex-col rounded-xl border border-sidebar-border/70 bg-white p-3.5 sm:p-4 dark:border-sidebar-border dark:bg-neutral-900 overflow-hidden shadow-xs">
            {/* Tab Navigation Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                <div className="flex items-center gap-1 rounded-lg bg-neutral-100/90 p-0.5 dark:bg-neutral-800">
                    <button
                        type="button"
                        onClick={() => handleTabChange('tasks')}
                        className={cn(
                            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                            currentTab === 'tasks'
                                ? "bg-white text-indigo-700 shadow-sm dark:bg-neutral-900 dark:text-indigo-400"
                                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        )}
                    >
                        <ListTodo className="size-3.5" />
                        <span>Assigned Tasks</span>
                        <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {tasksCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('deliveries')}
                        className={cn(
                            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                            currentTab === 'deliveries'
                                ? "bg-white text-red-700 shadow-sm dark:bg-neutral-900 dark:text-red-400"
                                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        )}
                    >
                        <Truck className="size-3.5" />
                        <span>Due Deliveries</span>
                        <span className="rounded-full bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                            {deliveriesCount}
                        </span>
                    </button>
                </div>

                {/* Section Information Button ⓘ */}
                <button
                    type="button"
                    onClick={() => handleOpenInfo()}
                    className="flex size-6.5 items-center justify-center rounded-lg border border-neutral-200/80 bg-neutral-50/60 text-neutral-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-indigo-400 transition-colors cursor-pointer shadow-2xs"
                    title={`About ${currentTab === 'tasks' ? 'Assigned Tasks' : 'Due Deliveries'} (ⓘ)`}
                    aria-label="Section Information"
                >
                    <Info className="size-3" />
                </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 min-h-0 pt-2 flex flex-col">
                {currentTab === 'tasks' ? (
                    <AssignedTasks
                        embedded
                        tasks={assignedTasks}
                        usersList={usersList}
                        poNumbers={poNumbers}
                        onOpenInfo={() => handleOpenInfo('tasks')}
                    />
                ) : (
                    <DueDeliveries
                        embedded
                        deliveries={deliveries}
                        onOpenInfo={() => handleOpenInfo('deliveries')}
                    />
                )}
            </div>

            {/* Information Dialog (ⓘ) */}
            <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-5 pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                <Info className="size-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                    Action Center Reference
                                </DialogTitle>
                                <DialogDescription className="text-xs text-neutral-500 font-medium">
                                    Operational specifications and workflow guidelines
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Switch between tabs inside the info dialog */}
                        <div className="mt-3.5 flex items-center gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                            <button
                                type="button"
                                onClick={() => setInfoTab('tasks')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                                    infoTab === 'tasks'
                                        ? "bg-white text-neutral-900 font-semibold shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                                        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                <ListTodo className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Assigned Tasks</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setInfoTab('deliveries')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                                    infoTab === 'deliveries'
                                        ? "bg-white text-neutral-900 font-semibold shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                                        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                <Truck className="size-3.5 text-red-600 dark:text-red-400" />
                                <span>Due Deliveries</span>
                            </button>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 p-5 text-xs text-neutral-600 dark:text-neutral-300">
                        {infoTab === 'tasks' ? (
                            <div className="space-y-4">
                                <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                        Assigned Tasks coordinates operational responsibilities across personnel, tracking pending actions tied to purchase orders, supplier follow-ups, and document processing.
                                    </p>
                                </div>

                                <div className="space-y-3.5">
                                    <div className="flex gap-3 items-start">
                                        <CheckCircle2 className="size-4 text-neutral-500 dark:text-neutral-400 mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                                Ownership & Access Control
                                            </h5>
                                            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                                                <strong className="text-neutral-700 dark:text-neutral-300">Assigned to Me:</strong> Displays actionable items assigned to your account. Selecting the checkbox toggles completion status.<br />
                                                <strong className="text-neutral-700 dark:text-neutral-300">Assigned by Me:</strong> Displays items delegated to team members. For audit integrity, status updates are read-only for assigners; completion must be confirmed by the designated assignee.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-start">
                                        <ArrowUpRight className="size-4 text-neutral-500 dark:text-neutral-400 mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                                Direct Record Navigation
                                            </h5>
                                            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                                                Selecting <strong className="text-neutral-700 dark:text-neutral-300">Go to task</strong> navigates directly to the associated Purchase Order in the Purchase Orders module and applies a temporary highlight flash to the target table row.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-start">
                                        <FileText className="size-4 text-neutral-500 dark:text-neutral-400 mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                                Task Inspection Dialog
                                            </h5>
                                            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                                                Clicking anywhere on a task row opens the full task specification, including instructions, due dates, priority rating, and attribution metadata.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-start">
                                        <Plus className="size-4 text-neutral-500 dark:text-neutral-400 mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                                Task Delegation
                                            </h5>
                                            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                                                Administrators and staff can dispatch new tasks by clicking <strong className="text-neutral-700 dark:text-neutral-300">Assign Task</strong>, selecting an assignee, and specifying optional PO references and deadlines.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-start">
                                        <Archive className="size-4 text-neutral-500 dark:text-neutral-400 mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                                Task Archiving & Archives
                                            </h5>
                                            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                                                Completed tasks can be explicitly archived using the <strong className="text-neutral-700 dark:text-neutral-300">Archive</strong> button to keep your daily dashboard tidy. Click <strong className="text-neutral-700 dark:text-neutral-300">View Archives</strong> in the filter bar to search past archived records, restore them if needed, and export audit logs to CSV.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                        Due Deliveries monitors delivery schedule compliance for active purchase orders to prevent supply chain bottlenecks and expedite receiving procedures.
                                    </p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs mb-2">
                                        Timeline Classifications
                                    </h5>
                                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
                                        <div className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-neutral-900/50">
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400">
                                                <span className="size-2 rounded-full bg-red-600" />
                                                Overdue
                                            </span>
                                            <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                                                Delivery deadline has elapsed without complete delivery receipt.
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-neutral-900/50">
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                                                <span className="size-2 rounded-full bg-amber-500" />
                                                Due Today / Soon
                                            </span>
                                            <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                                                Delivery expected today or within the next 6 calendar days.
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-neutral-900/50">
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                                <span className="size-2 rounded-full bg-emerald-600" />
                                                Upcoming
                                            </span>
                                            <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                                                Scheduled delivery with 7 or more calendar days remaining.
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3.5 pt-1">
                                    <div className="flex gap-3 items-start">
                                        <Phone className="size-4 text-neutral-500 dark:text-neutral-400 mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                                Supplier Follow-Up Logging
                                            </h5>
                                            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                                                Selecting <strong className="text-neutral-700 dark:text-neutral-300">Follow Up</strong> opens the communication dialog to record supplier interactions (telephone, email, or written notice) directly into the activity log.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-start">
                                        <ArrowUpRight className="size-4 text-neutral-500 dark:text-neutral-400 mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                                Delivery Verification
                                            </h5>
                                            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                                                Selecting any delivery item redirects to the Deliveries module and flashes the corresponding record for receiving and inspection verification.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ScrollArea>

                    <DialogFooter className="p-3.5 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsInfoOpen(false)}
                            className="w-full sm:w-auto h-8 text-xs cursor-pointer ml-auto"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}