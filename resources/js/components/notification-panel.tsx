import { useState, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { notificationsHighlight } from '../pages/notificationsHighlight';

export type NotificationPanelProps = {
    userNotifications?: any[];
    deliveries?: any[];
    recentDeliveries?: any[];
};

export function NotificationPanel({ userNotifications, deliveries, recentDeliveries }: NotificationPanelProps) {
    const [readIds, setReadIds] = useState<string[]>([]);
    const [clearedIds, setClearedIds] = useState<string[]>([]);
    const [clearingIds, setClearingIds] = useState<string[]>([]);
    const [isClearingAll, setIsClearingAll] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('read_notifs');
            if (saved) {
                setReadIds(JSON.parse(saved));
            }
            const savedCleared = localStorage.getItem('cleared_notifs');
            if (savedCleared) {
                setClearedIds(JSON.parse(savedCleared));
            }
        } catch {}
        setIsLoaded(true);
    }, []);

    // Sync notifications when recentDeliveries or deliveries updates
    useEffect(() => {
        if (!isLoaded) return;

        setNotifications(prev => {
            const notifMap = new Map<string, any>();
            const prevMap = new Map(prev.map(n => [String(n.id), n]));

            const formatItem = (d: any) => {
                const idStr = `del-${d.delivery_id}-${d.due_date || 'none'}-${d.status || 'none'}`;
                const prevItem = prevMap.get(idStr);

                let text = `Incoming Delivery ${d.po_number}`;
                let time = d.time_ago || (d.due_date ? `Due ${d.due_date_formatted || d.due_date}` : '');
                let isOverdue = !!d.is_overdue;
                let daysOverdue = d.days_overdue || 0;
                let isDueToday = false;
                let isDueSoon = false;

                if (d.due_date) {
                    if (d.is_overdue) {
                        text = `Delivery ${d.po_number} is OVERDUE (${daysOverdue}d)`;
                    } else if (d.diff_days === 0) {
                        text = `Delivery ${d.po_number} is DUE TODAY`;
                        isDueToday = true;
                    } else if (d.diff_days === 1) {
                        text = `Delivery ${d.po_number} is DUE TOMORROW`;
                        isDueSoon = true;
                    } else {
                        text = `Delivery ${d.po_number} is due on ${d.due_date_formatted || d.due_date}`;
                        if (d.diff_days !== undefined && d.diff_days !== null && d.diff_days <= 7 && d.diff_days > 1) {
                            isDueSoon = true;
                        }
                    }
                    if (d.time_ago) {
                        time = d.time_ago;
                    }
                }

                if (d.status) {
                    text += ` (${d.status})`;
                }

                return {
                    id: idStr,
                    text,
                    target_url: `/deliveries?highlight_id=${d.delivery_id}`,
                    time,
                    isOverdue,
                    daysOverdue,
                    isDueToday,
                    isDueSoon,
                    dueDate: d.due_date,
                    isRead: readIds.includes(idStr) || (prevItem ? prevItem.isRead : false),
                };
            };

            // 1. Process backend userNotifications
            if (userNotifications) {
                userNotifications.forEach((dbNotif: any) => {
                    const idStr = `db_${dbNotif.id}`;
                    const prevItem = prevMap.get(idStr);
                    
                    const notifData = dbNotif.data || {};
                    const msg = notifData.message || 'Notification';
                    const targetUrl = notifData.target_url || '#';
                    
                    const dateObj = new Date(dbNotif.created_at);
                    const isToday = dateObj.toDateString() === new Date().toDateString();
                    const timeStr = isToday ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : dateObj.toLocaleDateString();

                    const item = {
                        id: idStr,
                        text: msg,
                        target_url: targetUrl,
                        time: timeStr,
                        isOverdue: false,
                        daysOverdue: 0,
                        isDueToday: false,
                        isDueSoon: false,
                        isSystem: true,
                        isRead: readIds.includes(idStr) || (prevItem ? prevItem.isRead : false),
                    };
                    notifMap.set(item.id, item);
                });
            }

            // 2. Process recent deliveries
            if (recentDeliveries) {
                recentDeliveries.forEach(d => {
                    // Only show deliveries due within 14 days (or overdue ones)
                    if (d.diff_days !== undefined && d.diff_days !== null && d.diff_days > 14 && !d.is_overdue) return;
                    
                    const item = formatItem(d);
                    notifMap.set(item.id, item);
                });
            }

            // 2. Process due deliveries (add any missing or enrich)
            if (deliveries) {
                deliveries.forEach(d => {
                    // Only show deliveries due within 14 days (or overdue ones)
                    if (d.diff_days !== undefined && d.diff_days !== null && d.diff_days > 14 && !d.is_overdue) return;
                    
                    const item = formatItem(d);
                    if (notifMap.has(item.id)) {
                        const existing = notifMap.get(item.id);
                        notifMap.set(item.id, {
                            ...existing,
                            text: (item.isOverdue || item.isDueToday || item.isDueSoon) ? item.text : existing.text,
                            time: item.time || existing.time,
                            isOverdue: existing.isOverdue || item.isOverdue,
                            isDueToday: existing.isDueToday || item.isDueToday,
                            isDueSoon: existing.isDueSoon || item.isDueSoon,
                        });
                    } else {
                        notifMap.set(item.id, item);
                    }
                });
            }

            return Array.from(notifMap.values())
                .filter((item: any) => !clearedIds.includes(String(item.id)))
                .sort((a, b) => {
                // simple sort to put newer notifications roughly first if needed
                // but deliveries don't have exact timestamps, so let's keep it mostly appended,
                // or put unread system notifications first
                if (!a.isRead && b.isRead) return -1;
                if (a.isRead && !b.isRead) return 1;
                return 0;
            });
        });
    }, [recentDeliveries, deliveries, userNotifications, isLoaded, readIds, clearedIds]);

    const markAsRead = (id: string | number) => {
        const stringId = String(id);
        setNotifications(prev => prev.map(n => String(n.id) === stringId ? { ...n, isRead: true } : n));
        setReadIds(prev => {
            if (prev.includes(stringId)) return prev;
            const next = [...prev, stringId];
            localStorage.setItem('read_notifs', JSON.stringify(next));
            return next;
        });
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setReadIds(prev => {
            const next = [...prev, ...notifications.map(n => String(n.id))];
            const unique = Array.from(new Set(next));
            localStorage.setItem('read_notifs', JSON.stringify(unique));
            return unique;
        });
    };

    const clearAllNotifications = async () => {
        if (isClearingAll || notifications.length === 0) return;
        setIsClearingAll(true);
        
        const currentIds = notifications.map(n => String(n.id));
        
        // Sequentially add items to clearingIds to trigger slide-out animations
        for (const id of currentIds) {
            setClearingIds(prev => [...prev, id]);
            // Rapid staggered effect like phone clear all
            await new Promise(resolve => setTimeout(resolve, 40));
        }
        
        // Wait for the final animation to finish
        await new Promise(resolve => setTimeout(resolve, 250));
        
        setClearedIds(prev => {
            const next = Array.from(new Set([...prev, ...currentIds]));
            localStorage.setItem('cleared_notifs', JSON.stringify(next));
            return next;
        });

        router.post('/notifications/clear', {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['userNotifications']
        });
        
        setClearingIds([]);
        setIsClearingAll(false);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const filteredNotifs = notifFilter === 'all' ? notifications : notifications.filter(n => !n.isRead);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="relative cursor-pointer">
                    <Button
                        variant="outline"
                        size="icon"
                        className="relative"
                        aria-label="Notifications"
                        title="Incoming Deliveries"
                    >
                        <Bell className="size-4" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
                                {unreadCount}
                            </span>
                        )}
                    </Button>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px]">
                <div className="flex items-center justify-between p-3 pb-2">
                    <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                    <div className="flex gap-3">
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                Mark all as read
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button 
                                onClick={clearAllNotifications}
                                disabled={isClearingAll}
                                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                {isClearingAll ? 'Clearing...' : 'Clear all'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4 px-3 pb-2 border-b">
                    <button
                        onClick={() => setNotifFilter('all')}
                        className={`text-sm pb-2 border-b-2 transition-colors ${notifFilter === 'all' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setNotifFilter('unread')}
                        className={`text-sm pb-2 border-b-2 transition-colors ${notifFilter === 'unread' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        Unread
                    </button>
                </div>
                <ScrollArea className="h-[300px] pt-1">
                        {filteredNotifs.length > 0 ? (
                        filteredNotifs.map((notif) => {
                            const isClearing = clearingIds.includes(String(notif.id));
                            return (
                                <DropdownMenuItem 
                                    key={notif.id} 
                                    asChild 
                                    className={`cursor-pointer items-start transition-all duration-[500ms] ease-out block ${
                                        isClearing 
                                            ? 'opacity-0 translate-x-full' 
                                            : 'opacity-100 translate-x-0'
                                    }`}
                                >
                                <Link 
                                    href={notif.target_url} 
                                    onClick={() => {
                                        markAsRead(notif.id);
                                        try {
                                            const url = new URL(notif.target_url, window.location.origin);
                                            const highlightId = url.searchParams.get('highlight_id');
                                            const highlightSearch = url.searchParams.get('highlight_search');
                                            if (highlightId) {
                                                notificationsHighlight(highlightId, url.pathname);
                                            } else if (highlightSearch) {
                                                notificationsHighlight(highlightSearch, url.pathname);
                                            }
                                        } catch (e) {
                                            console.error("Failed to parse notification URL for highlight", e);
                                        }
                                    }} 
                                    className="flex gap-2 w-full p-3"
                                >
                                    {!notif.isRead && (
                                        <span className={`mt-1.5 flex h-2 w-2 shrink-0 rounded-full ${notif.isOverdue ? 'bg-rose-600' : notif.isDueToday ? 'bg-amber-500' : 'bg-blue-600'}`} />
                                    )}
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-sm ${!notif.isRead ? 'font-semibold' : 'font-medium'} ${notif.isOverdue ? 'text-rose-600 dark:text-rose-400' : notif.isDueToday ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                                {notif.text}
                                            </span>
                                            {notif.isOverdue ? (
                                                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                                                    Overdue
                                                </span>
                                            ) : notif.isDueToday ? (
                                                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                                                    Due Today
                                                </span>
                                            ) : notif.isDueSoon ? (
                                                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 shrink-0">
                                                    Due Soon
                                                </span>
                                            ) : null}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{notif.time}</span>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                        );
                    })
                ) : (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            No {notifFilter === 'unread' ? 'unread ' : ''}notifications
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
