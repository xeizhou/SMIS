// resources/js/components/chat-list-popover.tsx
import { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatPopover } from '@/components/chat-popover';

interface Conversation {
    id: number;
    name: string;
    avatar: string | null;
    last_message: string | null;
    last_at: string | null;
    unread: number;
}

export function ChatListButton({ isCollapsed }: { isCollapsed: boolean }) {
    const [open, setOpen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [activeChat, setActiveChat] = useState<Conversation | null>(null);

    const fetchConversations = () => {
        fetch('/api/messages', { headers: { Accept: 'application/json' } })
            .then((res) => res.json())
            .then((data) => {
                setConversations(data);
                setLoaded(true);
            })
            .catch(() => {});
    };

    useEffect(() => {
        if (!open) return;
        fetchConversations();
        const interval = setInterval(fetchConversations, 8000);
        return () => clearInterval(interval);
    }, [open]);

    const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

    return (
        <>
            <div className="border-t border-white/10 px-3 py-2.5">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-white/70 hover:bg-white/5 hover:text-white transition-colors w-full',
                        isCollapsed && 'justify-center',
                    )}
                >
                    <span className="relative">
                        <MessageCircle className="h-4 w-4" />
                        {totalUnread > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-medium text-white">
                                {totalUnread > 9 ? '9+' : totalUnread}
                            </span>
                        )}
                    </span>
                    {!isCollapsed && <span className="text-[11px] font-medium uppercase tracking-wide">Chats</span>}
                </button>
            </div>

            {open && !activeChat && (
                <div
                    className={cn(
                        'fixed z-50 flex flex-col overflow-hidden border border-white/10 bg-[#2a0002] shadow-2xl',
                        'inset-0 rounded-none',
                        'sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[28rem] sm:w-80 sm:rounded-lg',
                    )}
                >
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 sm:py-2.5">
                        <span className="text-sm font-medium text-white">Chats</span>
                        <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1">
                            <X className="h-5 w-5 sm:h-4 sm:w-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {!loaded ? (
                            <p className="px-3 py-4 text-xs text-white/40">Loading...</p>
                        ) : conversations.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-white/40">No conversations yet.</p>
                        ) : (
                            conversations.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setActiveChat(c)}
                                    className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-white/5 transition-colors"
                                >
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarImage src={c.avatar ?? undefined} />
                                        <AvatarFallback className="bg-white/10 text-xs text-white">{c.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="truncate text-sm font-medium text-white">{c.name}</p>
                                            {c.last_at && <span className="shrink-0 text-[10px] text-white/40">{c.last_at}</span>}
                                        </div>
                                        {c.last_message && (
                                            <p className="truncate text-xs text-white/50">{c.last_message}</p>
                                        )}
                                    </div>
                                    {c.unread > 0 && (
                                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                                            {c.unread}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeChat && (
                <ChatPopover
                    userId={activeChat.id}
                    userName={activeChat.name}
                    userAvatar={activeChat.avatar}
                    onBack={() => setActiveChat(null)}
                    onClose={() => {
                        setActiveChat(null);
                        setOpen(false);
                    }}
                />
            )}
        </>
    );
}