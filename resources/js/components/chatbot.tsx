import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';
import { Bot, X, Send, Trash2, Download, FileText, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auditLogsHighlight } from '@/pages/audit-logs/auditLogsHighlight';

type Msg = { role: 'user' | 'assistant'; content: string; error?: boolean };

const SUGGESTIONS = [
    'Give me an overview',
    'Which deliveries are overdue?',
    'Which stock items are low?',
    'Show pending inspections',
];

const STYLES = `
@keyframes smis-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: none; }
}
@keyframes smis-dot {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40%           { transform: translateY(-4px); opacity: 1; }
}
.smis-msg { animation: smis-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
.smis-dot { animation: smis-dot 1.1s infinite ease-in-out; }
@media (prefers-reduced-motion: reduce) {
    .smis-msg, .smis-dot { animation: none; }
}
`;

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|avif)$/i;
const PDF_EXT = /\.pdf$/i;

// Chat state survives page navigation (and refresh) for the life of the tab.
const STORAGE_KEY = 'smis-chatbot';
const MAX_SAVED_MESSAGES = 50;

// The AI disclaimer only needs to be accepted once per browser.
const ACK_KEY = 'smis-chatbot-ack';

function loadAcknowledged(): boolean {
    try {
        return localStorage.getItem(ACK_KEY) === '1';
    } catch {
        return false;
    }
}

function loadSaved(): { open: boolean; messages: Msg[] } {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const messages: Msg[] = Array.isArray(parsed.messages) ? parsed.messages : [];

            // Page changed while a reply was still loading -> that reply is gone
            if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
                messages.push({
                    role: 'assistant',
                    content: 'That reply was interrupted. Ask again.',
                    error: true,
                });
            }

            return { open: !!parsed.open, messages };
        }
    } catch {
        // ignore storage / parse errors
    }
    return { open: false, messages: [] };
}

function getXsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function AttachmentPreview({ name, href }: { name: string; href: string }) {
    const [open, setOpen] = useState(false);
    const [broken, setBroken] = useState(false);

    const isImg = IMAGE_EXT.test(name) && !broken;
    const isPdf = PDF_EXT.test(name);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const lightbox =
        open &&
        createPortal(
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
                onClick={() => setOpen(false)}
            >
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="absolute right-4 top-4 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close preview"
                >
                    <X className="h-5 w-5" />
                </button>

                {isImg ? (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex max-h-[85vh] max-w-full flex-col items-center gap-3"
                    >
                        <img src={href} alt={name} className="max-h-[75vh] max-w-full rounded-lg object-contain" />
                        <a
                            href={href}
                            download={name}
                            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/25"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </a>
                    </div>
                ) : (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-[85vh] w-full max-w-3xl flex-col gap-2 rounded-lg bg-[#2a0002] p-3"
                    >
                        <div className="flex items-center justify-between gap-2 px-1">
                            <p className="min-w-0 truncate text-sm text-white/80">{name}</p>
                            <a
                                href={href}
                                download={name}
                                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/25"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Download
                            </a>
                        </div>
                        <iframe src={href} title={name} className="w-full flex-1 rounded bg-white" />
                    </div>
                )}
            </div>,
            document.body,
        );

    // Image: show the actual picture inline
    if (isImg) {
        return (
            <>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="my-1 block max-w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700"
                    title={name}
                >
                    <img
                        src={href}
                        alt={name}
                        loading="lazy"
                        onError={() => setBroken(true)}
                        className="max-h-52 max-w-full object-cover transition-opacity hover:opacity-90"
                    />
                </button>
                {lightbox}
            </>
        );
    }

    const card = (
        <>
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-left text-xs font-medium">{name}</span>
            <Download className="size-3.5 shrink-0 opacity-60" />
        </>
    );
    const cardClass =
        'my-1 flex w-full min-w-0 items-center gap-2 rounded-lg border bg-background px-2.5 py-2 shadow-sm transition-colors hover:bg-muted';

    // PDF: card that opens an in-page viewer
    if (isPdf) {
        return (
            <>
                <button type="button" onClick={() => setOpen(true)} className={cardClass}>
                    {card}
                </button>
                {lightbox}
            </>
        );
    }

    // Anything else: straight download
    return (
        <a href={href} download={name} className={cardClass}>
            {card}
        </a>
    );
}

function renderInline(s: string) {
    return s.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g).map((part, i) => {
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
            try {
                const url = new URL(link[2], window.location.origin);
                if (url.origin === window.location.origin && (url.protocol === 'http:' || url.protocol === 'https:')) {
                    const attachmentName = link[1].match(/^Attachment:\s*(.*)$/);
                    if (attachmentName) {
                        return <AttachmentPreview key={i} name={attachmentName[1]} href={url.href} />;
                    }

                    const highlightId = url.searchParams.get('highlight_id');
                    if (highlightId) {
                        return (
                            <Link
                                key={i}
                                href={`${url.pathname}${url.search}${url.hash}`}
                                onClick={() => auditLogsHighlight(highlightId, url.pathname)}
                                className="font-medium text-red-700 underline underline-offset-2 dark:text-red-400"
                            >
                                {link[1]}
                            </Link>
                        );
                    }

                    return (
                        <a
                            key={i}
                            href={url.href}
                            className="font-medium text-red-700 underline underline-offset-2 dark:text-red-400"
                        >
                            {link[1]}
                        </a>
                    );
                }
            } catch {
                return <span key={i}>{part}</span>;
            }
        }

        return part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
            <span key={i}>{part}</span>
        );
    });
}

function Markdown({ text }: { text: string }) {
    return (
        <div className="space-y-1">
            {text.split('\n').map((line, i) => {
                const bullet = line.match(/^\s*[-*•]\s+(.*)/);
                if (bullet) {
                    const attachmentOnly = /^\[Attachment:[^\]]*\]\([^)]+\)$/.test(bullet[1].trim());
                    return (
                        <div key={i} className="flex min-w-0 gap-2">
                            {!attachmentOnly && <span>•</span>}
                            <span className="min-w-0 flex-1 break-words">{renderInline(bullet[1])}</span>
                        </div>
                    );
                }
                if (!line.trim()) return <div key={i} className="h-1" />;
                return (
                    <p key={i} className="break-words">
                        {renderInline(line)}
                    </p>
                );
            })}
        </div>
    );
}

function TypedText({
    text,
    animate,
    onTick,
    onDone,
}: {
    text: string;
    animate: boolean;
    onTick: () => void;
    onDone: () => void;
}) {
    const [shown, setShown] = useState(animate ? 0 : text.length);

    useEffect(() => {
        if (!animate || prefersReducedMotion()) {
            setShown(text.length);
            if (animate) onDone();
            return;
        }

        let raf = 0;
        const start = performance.now();
        // At least 90 chars/sec, but never longer than ~2.5s total.
        const charsPerSecond = Math.max(90, text.length / 2.5);

        const step = (now: number) => {
            const n = Math.min(text.length, Math.floor(((now - start) / 1000) * charsPerSecond));
            setShown(n);
            onTick();
            if (n < text.length) {
                raf = requestAnimationFrame(step);
            } else {
                onDone();
            }
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, animate]);

    return <Markdown text={text.slice(0, shown)} />;
}

function TypingDots() {
    return (
        <div className="smis-msg flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-neutral-200 bg-neutral-100 px-3 py-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="smis-dot size-1.5 rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </div>
    );
}

function Disclaimer({ onAccept }: { onAccept: () => void }) {
    return (
        <div className="smis-msg flex flex-1 flex-col items-center justify-center gap-4 bg-neutral-50/60 px-6 py-6 text-center dark:bg-black/20">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-700/10 text-red-700 dark:text-red-400">
                <TriangleAlert className="size-6" />
            </div>
            <div className="space-y-2">
                <p className="font-semibold">AI can make mistakes</p>
                <p className="text-sm text-muted-foreground">
                    The SMIS AI Assistant may give inaccurate or incomplete answers. Always double-check important
                    details like deliveries, stock levels and purchase orders against the actual records before acting
                    on them.
                </p>
            </div>
            <Button onClick={onAccept} className="rounded-xl bg-red-700 px-6 text-white hover:bg-red-800">
                I understand
            </Button>
        </div>
    );
}

export function Chatbot() {
    // Restored once on mount, so navigating between pages keeps the chat as it was
    const [saved] = useState(loadSaved);

    const [open, setOpen] = useState(saved.open);
    const [messages, setMessages] = useState<Msg[]>(saved.messages);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [typingIndex, setTypingIndex] = useState<number | null>(null);
    const [acked, setAcked] = useState(loadAcknowledged);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const stickRef = useRef(true); // true = follow new content

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth', force = false) => {
        const el = scrollRef.current;
        if (!el || (!force && !stickRef.current)) return;
        el.scrollTo({ top: el.scrollHeight, behavior });
    };

    const onScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    const acknowledge = () => {
        try {
            localStorage.setItem(ACK_KEY, '1');
        } catch {
            // storage unavailable: just won't be remembered across sessions
        }
        setAcked(true);
    };

    // Save open state + history whenever they change
    useEffect(() => {
        try {
            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ open, messages: messages.slice(-MAX_SAVED_MESSAGES) }),
            );
        } catch {
            // storage full / unavailable: chat still works, just won't persist
        }
    }, [open, messages]);

    // New message / loading state -> glide to bottom
    useEffect(() => {
        scrollToBottom('smooth');
    }, [messages, loading, open, acked]);

    // On first mount (e.g. after a page change) jump straight to the latest message
    useEffect(() => {
        scrollToBottom('auto', true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Focus the input once the window has started opening (and the disclaimer is accepted)
    useEffect(() => {
        if (!open || !acked) return;
        const t = setTimeout(() => inputRef.current?.focus(), 120);
        return () => clearTimeout(t);
    }, [open, acked]);

    // Auto-growing textarea (max ~4 lines)
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    }, [input, acked]);

    const send = async (override?: string) => {
        const text = (override ?? input).trim();
        if (!text || loading) return;

        stickRef.current = true;

        const next: Msg[] = [...messages, { role: 'user', content: text }];
        setMessages(next);
        setInput('');
        setLoading(true);

        // Only real conversation goes to the server (no error bubbles).
        const history = next
            .filter((m) => !m.error)
            .slice(-12)
            .map(({ role, content }) => ({ role, content }));

        const reply = (content: string, error = false) => {
            setMessages([...next, { role: 'assistant', content, error }]);
            if (!error) setTypingIndex(next.length);
        };

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 120000);

        try {
            const res = await fetch('/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ messages: history }),
                signal: controller.signal,
            });

            let data: { reply?: string } | null = null;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (res.ok && data?.reply) {
                reply(data.reply);
            } else if (res.status === 419) {
                reply('Session expired. Refresh the page and try again.', true);
            } else if (res.status === 429) {
                reply('Too many messages. Wait a minute and try again.', true);
            } else {
                reply(data?.reply ?? 'Something went wrong. Try again.', true);
            }
        } catch (e) {
            const aborted = e instanceof DOMException && e.name === 'AbortError';
            reply(
                aborted
                    ? 'That took too long. Try a simpler question.'
                    : 'Network error. Check your connection and try again.',
                true,
            );
        } finally {
            clearTimeout(timer);
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
        setTypingIndex(null);
        stickRef.current = true;
    };

    return (
        // Bottom-left. On desktop it shifts right to clear the sidebar (and follows it
        // when the sidebar collapses). Needs to be a sibling AFTER <AppSidebar /> so the
        // peer-data-[state] selectors can see the sidebar's state.
        <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-3 transition-[left] duration-200 ease-linear md:peer-data-[state=collapsed]:left-[calc(var(--sidebar-width-icon)+1.5rem)] md:peer-data-[state=expanded]:left-[calc(var(--sidebar-width)+1.5rem)]">
            <style>{STYLES}</style>

            {/* Chat window: always mounted so open/close can animate */}
            <div
                aria-hidden={!open}
                className={`flex h-[min(32rem,calc(100vh-7rem))] w-[calc(100vw-2rem)] origin-bottom-left flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl transition-all duration-200 ease-out sm:w-96 ${
                    open
                        ? 'visible translate-y-0 scale-100 opacity-100'
                        : 'invisible translate-y-3 scale-95 opacity-0'
                }`}
            >
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="leading-tight">
                        <p className="font-semibold">SMIS AI Assistant</p>
                        <p className="text-xs text-muted-foreground">Ask about your system data</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={clearChat}
                            disabled={messages.length === 0}
                            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
                            aria-label="Clear chat"
                            title="Clear chat"
                        >
                            <Trash2 className="size-4" />
                        </button>
                        <button
                            onClick={() => setOpen(false)}
                            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label="Close chat"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                {!acked ? (
                    <Disclaimer onAccept={acknowledge} />
                ) : (
                    <>
                        <div
                            ref={scrollRef}
                            onScroll={onScroll}
                            onLoadCapture={() => scrollToBottom('auto')}
                            aria-live="polite"
                            className="flex-1 space-y-2 overflow-y-auto scroll-smooth bg-neutral-50/60 px-3 py-3 text-sm dark:bg-black/20"
                        >
                            {messages.length === 0 && (
                                <div className="space-y-3">
                                    <p className="smis-msg text-muted-foreground">
                                        Ask me about your deliveries, purchase orders, stock and more.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {SUGGESTIONS.map((s, i) => (
                                            <button
                                                key={s}
                                                onClick={() => send(s)}
                                                style={{ animationDelay: `${80 + i * 60}ms` }}
                                                className="smis-msg rounded-full border px-3 py-1.5 text-xs transition hover:-translate-y-0.5 hover:bg-muted active:scale-95"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`smis-msg w-fit min-w-0 max-w-[88%] break-words px-3.5 py-2 ${
                                        m.role === 'user'
                                            ? 'ml-auto whitespace-pre-wrap rounded-2xl rounded-br-md bg-red-700 text-white'
                                            : m.error
                                              ? 'rounded-2xl rounded-bl-md bg-destructive/10 text-destructive'
                                              : 'rounded-2xl rounded-bl-md border border-neutral-200 bg-neutral-100 text-foreground shadow-sm dark:border-neutral-700 dark:bg-neutral-800'
                                    }`}
                                >
                                    {m.role === 'user' || m.error ? (
                                        m.content
                                    ) : (
                                        <TypedText
                                            text={m.content}
                                            animate={typingIndex === i}
                                            onTick={() => scrollToBottom('auto')}
                                            onDone={() => setTypingIndex(null)}
                                        />
                                    )}
                                </div>
                            ))}

                            {loading && <TypingDots />}
                        </div>

                        <div className="border-t p-2.5 pb-1.5">
                            <div className="flex items-end gap-2">
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                            e.preventDefault();
                                            send();
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    className="max-h-24 flex-1 resize-none rounded-xl border bg-transparent px-3 py-2 text-sm outline-none transition focus-visible:border-red-700/60 focus-visible:ring-2 focus-visible:ring-red-700/20"
                                />
                                <Button
                                    onClick={() => send()}
                                    disabled={loading || !input.trim()}
                                    size="icon"
                                    className="shrink-0 rounded-xl bg-red-700 text-white transition active:scale-90 hover:bg-red-800"
                                    aria-label="Send message"
                                >
                                    <Send className="size-4" />
                                </Button>
                            </div>
                            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                                This AI chatbot can make mistakes
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Floating button: icons swap with a rotate/scale */}
            <Button
                onClick={() => setOpen(!open)}
                size="icon"
                className="relative size-12 rounded-full bg-red-700 text-white shadow-lg transition duration-200 hover:scale-105 hover:bg-red-800 active:scale-95"
                aria-label="Toggle chat"
            >
                <Bot
                    className={`absolute size-5 transition-all duration-200 ${
                        open ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                    }`}
                />
                <X
                    className={`absolute size-5 transition-all duration-200 ${
                        open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                    }`}
                />
            </Button>
        </div>
    );
}