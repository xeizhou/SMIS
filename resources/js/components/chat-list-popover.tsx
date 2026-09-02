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

const CLOSE_ANIM_MS = 300;

export function ChatListButton({ isCollapsed }: { isCollapsed: boolean }) {
    const [open, setOpen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [activeChat, setActiveChat] = useState<Conversation | null>(null);

    const [shouldRender, setShouldRender] = useState(false);
    const [visible, setVisible] = useState(false);
    const [closing, setClosing] = useState(false);

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
        fetchConversations();
        const interval = setInterval(fetchConversations, 15000);
        return () => clearInterval(interval);
    }, []);

    // FIX: single rAF fires too early — often before the browser has
    // painted the `visible=false` (closed) frame at all, so the CSS
    // transition has nothing to animate from and just snaps to the end
    // state. Nesting two rAFs guarantees a full paint happens in between:
    // the first rAF callback runs right before the *next* paint (which
    // renders the closed state), and only the second rAF callback —
    // scheduled from inside the first — runs after that paint has
    // actually happened, so flipping `visible` there animates for real.
    useEffect(() => {
        if (!open) return;
        setShouldRender(true);
        setClosing(false);
        setVisible(false); // ensure we start closed even if reopened quickly
        const raf1 = requestAnimationFrame(() => {
            const raf2 = requestAnimationFrame(() => setVisible(true));
            // no cleanup path needed for raf2 in practice here since this
            // effect only reruns when `open` toggles, but if you want to
            // be extra safe you can track raf2 in a ref and cancel it too
        });
        return () => cancelAnimationFrame(raf1);
    }, [open]);

    function handleClose(fn: () => void) {
        setClosing(true);
        setVisible(false);
        setTimeout(() => {
            setShouldRender(false);
            fn();
        }, CLOSE_ANIM_MS);
    }

    function openChat(c: Conversation) {
        setConversations((prev) =>
            prev.map((conv) => (conv.id === c.id ? { ...conv, unread: 0 } : conv)),
        );
        handleClose(() => setActiveChat(c));
    }

    const hasUnread = conversations.some((c) => c.unread > 0);

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
                        {hasUnread && (
                            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#3d0002]" />
                        )}
                    </span>
                    {!isCollapsed && <span className="text-[11px] font-medium uppercase tracking-wide">Chats</span>}
                </button>
            </div>

            {shouldRender && !activeChat && (
                <>
                    <div
                        onClick={() => handleClose(() => setOpen(false))}
                        className={cn(
                            'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out',
                            'sm:hidden',
                            visible ? 'opacity-100' : 'opacity-0',
                            closing ? 'pointer-events-none' : '',
                        )}
                    />
                    <div
                        style={{ transformOrigin: 'bottom right' }}
                        className={cn(
                            'fixed z-50 flex flex-col overflow-hidden border border-white/10 bg-[#2a0002] shadow-2xl',
                            'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                            'inset-0 rounded-none',
                            visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-95 opacity-0',
                            'sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[28rem] sm:w-80 sm:rounded-lg',
                            visible ? 'sm:translate-y-0 sm:scale-100 sm:opacity-100' : 'sm:translate-y-2 sm:scale-75 sm:opacity-0',
                            closing ? 'pointer-events-none' : '',
                        )}
                    >
                        <div
                            className={cn(
                                'flex items-center justify-between border-b border-white/10 px-3 py-3 sm:py-2.5',
                                'transition-all duration-200 ease-out delay-[80ms]',
                                visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
                            )}
                        >
                            <span className="text-sm font-medium text-white">Chats</span>
                            <button
                                onClick={() => handleClose(() => setOpen(false))}
                                className="text-white/50 hover:text-white p-1"
                            >
                                <X className="h-5 w-5 sm:h-4 sm:w-4" />
                            </button>
                        </div>

                        <div
                            className={cn(
                                'flex-1 overflow-y-auto',
                                'transition-all duration-200 ease-out delay-[120ms]',
                                visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
                            )}
                        >
                            {!loaded ? (
                                <p className="px-3 py-4 text-xs text-white/40">Loading...</p>
                            ) : conversations.length === 0 ? (
                                <p className="px-3 py-4 text-xs text-white/40">No conversations yet.</p>
                            ) : (
                                conversations.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => openChat(c)}
                                        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-white/5 transition-colors"
                                    >
                                        <span className="relative shrink-0">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={c.avatar ?? undefined} />
                                                <AvatarFallback className="bg-white/10 text-xs text-white">{c.name[0]}</AvatarFallback>
                                            </Avatar>
                                            {c.unread > 0 && (
                                                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#2a0002]" />
                                            )}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={cn('truncate text-sm', c.unread > 0 ? 'font-semibold text-white' : 'font-medium text-white')}>
                                                    {c.name}
                                                </p>
                                                {c.last_at && <span className="shrink-0 text-[10px] text-white/40">{c.last_at}</span>}
                                            </div>
                                            {c.last_message && (
                                                <p className={cn('truncate text-xs', c.unread > 0 ? 'text-white/80' : 'text-white/50')}>
                                                    {c.last_message}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
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