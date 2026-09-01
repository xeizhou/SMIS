import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Send, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
    id: number;
    sender_id: number;
    receiver_id: number;
    body: string;
    created_at: string;
}

interface Props {
    userId: number;
    userName: string;
    userAvatar: string | null;
    onClose: () => void;
    onBack?: () => void; // shown instead of X when opened from a chat list
}

const CLOSE_ANIM_MS = 200;

function isSessionDead(res: Response) {
    // Only trust explicit auth-failure status codes — don't treat every
    // redirect as a logout, since redirects can happen for other reasons
    // (trailing slashes, HTTPS upgrades, etc.) and produce false positives.
    if (res.status === 401 || res.status === 419) {
        return true;
    }

    // A 200 that isn't actually JSON (e.g. it's the login page HTML)
    // is the other real signal of a dead session.
    const contentType = res.headers.get('content-type') ?? '';
    if (res.status === 200 && !contentType.includes('application/json')) {
        return true;
    }

    return false;
}

export function ChatPopover({ userId, userName, userAvatar, onClose, onBack }: Props) {
    const { props } = usePage();
    const myId = (props.auth as any)?.user?.id;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [visible, setVisible] = useState(false); // controls enter/exit transition state
    const [closing, setClosing] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // trigger enter animation on mount
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = (fn: () => void) => {
        setClosing(true);
        setVisible(false);
        setTimeout(fn, CLOSE_ANIM_MS);
    };

    const fetchMessages = () => {
        fetch(`/api/messages/${userId}`, { headers: { Accept: 'application/json' } })
            .then((res) => {
                if (isSessionDead(res)) {
                    setSessionExpired(true);
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (!data) return;
                setMessages(data);
                setLoaded(true);
            })
            .catch(() => {});
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(() => {
            if (document.hidden) return;
            fetchMessages();
        }, 3000);
        return () => clearInterval(interval);
    }, [userId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        const body = text.trim();
        if (!body) return;

        setText('');
        const optimisticId = Date.now();

        setMessages((prev) => [
            ...prev,
            { id: optimisticId, sender_id: myId, receiver_id: userId, body, created_at: new Date().toISOString() },
        ]);

        fetch(`/api/messages/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
            },
            body: JSON.stringify({ body }),
        })
            .then((res) => {
                if (isSessionDead(res)) {
                    setSessionExpired(true);
                    setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
                    return;
                }
                if (!res.ok) {
                    throw new Error(`Send failed: ${res.status}`);
                }
                return fetchMessages();
            })
            .catch((err) => {
                console.error(err);
                setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            });
    };

    return (
        <div
            className={cn(
                'fixed z-50 flex flex-col overflow-hidden border border-white/10 bg-[#2a0002] shadow-2xl',
                'transition-all duration-200 ease-out',
                // mobile: full-screen sheet, slides up from bottom
                'inset-0 rounded-none',
                visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                // desktop: floating card, bottom-right, slides+scales in
                'sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[28rem] sm:w-80 sm:rounded-lg',
                visible
                    ? 'sm:translate-y-0 sm:scale-100 sm:opacity-100'
                    : 'sm:translate-y-2 sm:scale-95 sm:opacity-0',
                closing && 'pointer-events-none',
            )}
        >
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 sm:py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    {onBack && (
                        <button
                            onClick={() => handleClose(onBack)}
                            className="text-white/60 hover:text-white transition-colors sm:hidden"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    <Avatar className="h-8 w-8 sm:h-7 sm:w-7 shrink-0">
                        <AvatarImage src={userAvatar ?? undefined} />
                        <AvatarFallback className="bg-white/10 text-xs text-white">{userName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium text-white">{userName}</span>
                </div>
                <button
                    onClick={() => handleClose(onClose)}
                    className="shrink-0 rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
            </div>

            {sessionExpired ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm text-white/70">Your session has expired.</p>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => (window.location.href = '/login')}
                    >
                        Log in again
                    </Button>
                </div>
            ) : (
                <>
                    <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
                        {!loaded ? (
                            <p className="text-xs text-white/40">Loading...</p>
                        ) : messages.length === 0 ? (
                            <p className="text-xs text-white/40">No messages yet. Say hi 👋</p>
                        ) : (
                            messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={cn(
                                        'flex animate-in fade-in slide-in-from-bottom-1 duration-200',
                                        m.sender_id === myId ? 'justify-end' : 'justify-start',
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'max-w-[80%] sm:max-w-[75%] rounded-lg px-3 py-2 sm:py-1.5 text-sm break-words',
                                            m.sender_id === myId ? 'bg-white/20 text-white' : 'bg-white/10 text-white/90',
                                        )}
                                    >
                                        {m.body}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="flex items-center gap-2 border-t border-white/10 px-3 py-3 sm:py-2.5 pb-[env(safe-area-inset-bottom)]">
                        <input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') sendMessage();
                            }}
                            placeholder="Type a message..."
                            className="flex-1 rounded bg-white/10 px-2.5 py-2 sm:py-1.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:bg-white/15"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={sendMessage}
                            className="shrink-0 text-white transition-transform active:scale-90"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}