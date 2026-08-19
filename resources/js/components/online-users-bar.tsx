import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface OnlineUser {
    id: number;
    name: string;
    role: string | null;
    avatar: string | null;
    online: boolean;
    last_seen: string | null;
}

export function OnlineUsersBar() {
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;

    const { props } = usePage();
    const isAuthed = Boolean((props.auth as any)?.user);

    const [users, setUsers] = useState<OnlineUser[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!isAuthed) {
            setUsers([]);
            setLoaded(false);
            return;
        }

        let cancelled = false;

        const fetchUsers = () => {
            if (document.hidden) return; // skip while tab isn't visible

            fetch('/api/online-users', { headers: { Accept: 'application/json' } })
                .then((res) => {
                    if (!res.ok) throw new Error('unauthenticated or error');
                    return res.json();
                })
                .then((data) => {
                    if (!cancelled) {
                        setUsers(data);
                        setLoaded(true);
                    }
                })
                .catch(() => {});
        };

        fetchUsers();
        const interval = setInterval(fetchUsers, 10000); // 10s instead of 5s

        // Also fetch immediately when the tab becomes visible again,
        // so the list isn't stale after being backgrounded
        const handleVisibility = () => {
            if (!document.hidden) fetchUsers();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [isAuthed]);

    if (!isAuthed) return null;

    const sorted = [...users].sort((a, b) => Number(b.online) - Number(a.online));
    const onlineCount = users.filter((u) => u.online).length;

    return (
        <div className="border-t border-white/10 px-3 py-2.5">
            {!isCollapsed && (
                <div className="mb-2 flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                        Team
                    </span>
                    {loaded && (
                        <span className="flex items-center gap-1 text-[11px] text-white/40">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            {onlineCount} online
                        </span>
                    )}
                </div>
            )}

            {!loaded ? (
                <div
                    className={cn(
                        'grid gap-1.5',
                        isCollapsed ? 'grid-cols-1 justify-items-center' : 'grid-cols-5',
                    )}
                >
                    {[...Array(isCollapsed ? 2 : 5)].map((_, i) => (
                        <div key={i} className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
                    ))}
                </div>
            ) : sorted.length === 0 ? (
                !isCollapsed && <p className="px-0.5 text-xs text-white/40">No team members yet</p>
            ) : (
                <div
                    className={cn(
                        'grid gap-1.5',
                        isCollapsed ? 'grid-cols-1 justify-items-center' : 'grid-cols-5 justify-items-center',
                    )}
                >
                    {sorted.map((u) => (
                        <HoverCard key={u.id} openDelay={150} closeDelay={100}>
                            <HoverCardTrigger asChild>
                                <button
                                    type="button"
                                    className="group relative rounded-full outline-none transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/40"
                                >
                                    <Avatar
                                        className={cn(
                                            'h-8 w-8 ring-2 ring-offset-2 ring-offset-[#3d0002] transition-all',
                                            u.online ? 'ring-green-500/70' : 'ring-white/10 opacity-60 grayscale-[30%]',
                                        )}
                                    >
                                        <AvatarImage src={u.avatar ?? undefined} />
                                        <AvatarFallback className="bg-white/10 text-xs text-white">
                                            {u.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span
                                        className={cn(
                                            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#3d0002]',
                                            u.online ? 'bg-green-500' : 'bg-gray-500',
                                        )}
                                    />
                                </button>
                            </HoverCardTrigger>
                            <HoverCardContent
                                side={isCollapsed ? 'right' : 'top'}
                                align="start"
                                className="w-64 border-white/10 bg-[#2a0002] text-white shadow-xl"
                            >
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-12 w-12 ring-2 ring-white/10">
                                        <AvatarImage src={u.avatar ?? undefined} />
                                        <AvatarFallback className="bg-white/10 text-white">
                                            {u.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-white">{u.name}</p>
                                        {u.role && (
                                            <p className="truncate text-xs capitalize text-white/50">{u.role}</p>
                                        )}
                                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                                            <span
                                                className={cn(
                                                    'h-2 w-2 rounded-full',
                                                    u.online ? 'bg-green-500' : 'bg-gray-500',
                                                )}
                                            />
                                            <span className="text-white/50">
                                                {u.online ? 'Online now' : u.last_seen ? `Last seen ${u.last_seen}` : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    ))}
                </div>
            )}
        </div>
    );
}