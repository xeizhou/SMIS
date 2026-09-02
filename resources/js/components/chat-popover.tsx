import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePage } from '@inertiajs/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Send, ArrowLeft, Smile, Paperclip, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
    id: number;
    sender_id: number;
    receiver_id: number;
    body: string | null;
    attachment_url: string | null;
    attachment_name: string | null;
    attachment_type: string | null;
    attachment_size: number | null;
    created_at: string;
}

interface Props {
    userId: number;
    userName: string;
    userAvatar: string | null;
    onClose: () => void;
    onBack?: () => void;
}

const CLOSE_ANIM_MS = 200;

const EMOJIS = [
    '😀', '😂', '😅', '😊', '😍', '🤔', '😎', '😢',
    '😡', '😴', '🥳', '😱', '🙌', '👍', '👎', '👏',
    '🙏', '💪', '🔥', '✨', '🎉', '❤️', '💯', '👀',
    '🤝', '😭', '😆', '🥺', '🤯', '🫡', '😏', '🙄',
];

function isSessionDead(res: Response): boolean {
    if (res.status === 401 || res.status === 419) {
        return true;
    }

    const contentType = res.headers.get('content-type') || '';
    if (res.status === 200 && contentType.indexOf('application/json') === -1) {
        return true;
    }

    return false;
}

function isImageType(type: string | null): boolean {
    return !!type && type.indexOf('image/') === 0;
}

function isPdfType(type: string | null, name: string | null): boolean {
    if (type === 'application/pdf') return true;
    return !!name && name.toLowerCase().endsWith('.pdf');
}

function formatFileSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Reads the CSRF token from the XSRF-TOKEN cookie instead of the
// <meta name="csrf-token"> tag. The meta tag is only written into the
// document once, at full page load — after an Inertia SPA transition
// (e.g. right after login, which regenerates the session/token) it goes
// stale and causes the very next manual fetch() here to 419. The cookie,
// on the other hand, gets refreshed by Laravel on every response, so
// it's never stale regardless of client-side navigation. Sent back as
// X-XSRF-TOKEN (not X-CSRF-TOKEN) since Laravel's VerifyCsrfToken
// middleware decrypts that specific header automatically.
function getCsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function formatDayLabel(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = function (a: Date, b: Date) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    };

    if (sameDay(date, today)) return 'Today';
    if (sameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// Start of yesterday (local time), ISO string. Used as the `since`
// cutoff so the popover only ever loads today + yesterday's messages
// on the initial/poll fetch — older days are excluded to keep the
// payload small on chats with long history. Not a "load earlier"
// feature; older messages simply aren't fetched by this component.
function getTwoDayCutoffISO(): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);
    cutoff.setHours(0, 0, 0, 0);
    return cutoff.toISOString();
}

export function ChatPopover(props: Props) {
    const userId = props.userId;
    const userName = props.userName;
    const userAvatar = props.userAvatar;
    const onClose = props.onClose;
    const onBack = props.onBack;

    const page = usePage();
    const auth: any = (page.props as any).auth;
    const myId = auth && auth.user ? auth.user.id : null;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [visible, setVisible] = useState(false);
    const [closing, setClosing] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreview, setPendingPreview] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [revealedId, setRevealedId] = useState<number | null>(null);
    const [previewAttachment, setPreviewAttachment] = useState<{
        url: string;
        name: string | null;
        type: string | null;
        size: number | null;
    } | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const hasScrolledInitially = useRef(false);

    useEffect(function () {
        const raf = requestAnimationFrame(function () {
            setVisible(true);
        });
        return function () {
            cancelAnimationFrame(raf);
        };
    }, []);

    useEffect(function () {
        if (!showEmojiPicker) return;

        function handleClickOutside(e: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return function () {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    function handleClose(fn: () => void) {
        setClosing(true);
        setVisible(false);
        setTimeout(fn, CLOSE_ANIM_MS);
    }

    function fetchMessages() {
        const since = getTwoDayCutoffISO();

        fetch('/api/messages/' + userId + '?since=' + encodeURIComponent(since), {
            headers: { Accept: 'application/json' },
        })
            .then(function (res) {
                if (isSessionDead(res)) {
                    setSessionExpired(true);
                    return null;
                }
                return res.json();
            })
            .then(function (data) {
                if (!data) return;

                // Defensive client-side filter in case the backend
                // hasn't been updated to honor `since` yet, or sends
                // extra rows — never render anything older than
                // yesterday from this component.
                const cutoffTime = new Date(since).getTime();
                const filtered = (data as ChatMessage[]).filter(function (m) {
                    return new Date(m.created_at).getTime() >= cutoffTime;
                });

                setMessages(filtered);
                setLoaded(true);
            })
            .catch(function () {});
    }

    useEffect(function () {
        hasScrolledInitially.current = false;
        setLoaded(false);
        fetchMessages();
        const interval = setInterval(function () {
            if (document.hidden) return;
            fetchMessages();
        }, 3000);
        return function () {
            clearInterval(interval);
        };
    }, [userId]);

    useEffect(function () {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: hasScrolledInitially.current ? 'smooth' : 'auto' });
            hasScrolledInitially.current = true;
        }
    }, [messages]);

    useEffect(function () {
        return function () {
            if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        };
    }, [pendingPreview]);

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files ? e.target.files[0] : null;
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('File is too large. Max size is 10MB.');
            return;
        }

        setPendingFile(file);
        setPendingPreview(file.type.indexOf('image/') === 0 ? URL.createObjectURL(file) : null);
        e.target.value = '';
    }

    function clearPendingFile() {
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        setPendingFile(null);
        setPendingPreview(null);
    }

    function sendMessage() {
        const body = text.trim();
        if (!body && !pendingFile) return;
        if (sending) return;

        setSending(true);
        setText('');
        setShowEmojiPicker(false);
        const fileToSend = pendingFile;
        clearPendingFile();

        const optimisticId = Date.now();
        setMessages(function (prev) {
            return prev.concat([{
                id: optimisticId,
                sender_id: myId,
                receiver_id: userId,
                body: body || null,
                attachment_url: fileToSend ? URL.createObjectURL(fileToSend) : null,
                attachment_name: fileToSend ? fileToSend.name : null,
                attachment_type: fileToSend ? fileToSend.type : null,
                attachment_size: fileToSend ? fileToSend.size : null,
                created_at: new Date().toISOString(),
            }]);
        });

        const formData = new FormData();
        if (body) formData.append('body', body);
        if (fileToSend) formData.append('attachment', fileToSend);

        const csrfToken = getCsrfToken();

        fetch('/api/messages/' + userId, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'X-XSRF-TOKEN': csrfToken,
            },
            body: formData,
        })
            .then(function (res) {
                if (isSessionDead(res)) {
                    setSessionExpired(true);
                    setMessages(function (prev) {
                        return prev.filter(function (m) { return m.id !== optimisticId; });
                    });
                    return null;
                }
                if (!res.ok) {
                    throw new Error('Send failed: ' + res.status);
                }
                return fetchMessages();
            })
            .catch(function (err) {
                console.error(err);
                setMessages(function (prev) {
                    return prev.filter(function (m) { return m.id !== optimisticId; });
                });
            })
            .finally(function () {
                setSending(false);
            });
    }

    function insertEmoji(emoji: string) {
        setText(function (prev) { return prev + emoji; });
        if (inputRef.current) inputRef.current.focus();
    }

    function toggleRevealed(id: number) {
        setRevealedId(function (prev) { return prev === id ? null : id; });
    }

    function openPreview(m: ChatMessage, e: React.MouseEvent) {
        e.stopPropagation();
        setPreviewAttachment({
            url: m.attachment_url as string,
            name: m.attachment_name,
            type: m.attachment_type,
            size: m.attachment_size,
        });
    }

    useEffect(function () {
        if (!previewAttachment) return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setPreviewAttachment(null);
        }

        document.addEventListener('keydown', handleKeyDown);
        return function () {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [previewAttachment]);

    let lastDayLabel = '';

    return (
        <>
        <div
            className={cn(
                'fixed z-50 flex flex-col overflow-hidden border border-white/10 bg-[#2a0002] shadow-2xl',
                'transition-all duration-200 ease-out',
                'inset-0 rounded-none',
                visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                'sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[28rem] sm:w-80 sm:rounded-lg',
                visible ? 'sm:translate-y-0 sm:scale-100 sm:opacity-100' : 'sm:translate-y-2 sm:scale-95 sm:opacity-0',
                closing ? 'pointer-events-none' : '',
            )}
        >
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 sm:py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    {onBack ? (
                        <button
                            onClick={function () { handleClose(onBack); }}
                            className="shrink-0 text-white/60 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
                        </button>
                    ) : null}
                    <Avatar className="h-8 w-8 sm:h-7 sm:w-7 shrink-0">
                        <AvatarImage src={userAvatar || undefined} />
                        <AvatarFallback className="bg-white/10 text-xs text-white">{userName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium text-white">{userName}</span>
                </div>
                <button
                    onClick={function () { handleClose(onClose); }}
                    className="shrink-0 rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
            </div>

            {sessionExpired ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm text-white/70">Your session has expired.</p>
                    <Button size="sm" variant="secondary" onClick={function () { window.location.href = '/login'; }}>
                        Log in again
                    </Button>
                </div>
            ) : (
                <>
                    <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2.5">
                        {!loaded ? (
                            <p className="text-xs text-white/40">Loading...</p>
                        ) : messages.length === 0 ? (
                            <p className="text-xs text-white/40">No messages yet. Say hi</p>
                        ) : (
                            messages.map(function (m) {
                                const dayLabel = formatDayLabel(m.created_at);
                                const showDaySeparator = dayLabel !== lastDayLabel;
                                lastDayLabel = dayLabel;
                                const isMine = m.sender_id === myId;
                                const isImg = isImageType(m.attachment_type);
                                const isRevealed = revealedId === m.id;

                                return (
                                    <div key={m.id}>
                                        {showDaySeparator ? (
                                            <div className="my-3 flex items-center justify-center">
                                                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-white/40">
                                                    {dayLabel}
                                                </span>
                                            </div>
                                        ) : null}

                                        <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                                            <div
                                                onClick={function () { toggleRevealed(m.id); }}
                                                className={cn(
                                                    'flex max-w-[80%] sm:max-w-[75%] flex-col gap-1 cursor-pointer',
                                                    isMine ? 'items-end' : 'items-start',
                                                )}
                                            >
                                                {m.attachment_url && isImg ? (
                                                    <button
                                                        type="button"
                                                        onClick={function (e) { openPreview(m, e); }}
                                                        className="block overflow-hidden rounded-lg border border-white/10"
                                                    >
                                                        <img
                                                            src={m.attachment_url}
                                                            alt={m.attachment_name || 'attachment'}
                                                            className="max-h-52 object-cover transition-opacity hover:opacity-90"
                                                        />
                                                    </button>
                                                ) : null}

                                                {m.attachment_url && !isImg ? (
                                                    <button
                                                        type="button"
                                                        onClick={function (e) { openPreview(m, e); }}
                                                        className={cn(
                                                            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                                                            isMine ? 'bg-white/20 text-white hover:bg-white/25' : 'bg-white/10 text-white/90 hover:bg-white/15',
                                                        )}
                                                    >
                                                        <FileText className="h-4 w-4 shrink-0" />
                                                        <div className="min-w-0 text-left">
                                                            <p className="truncate">{m.attachment_name}</p>
                                                            {m.attachment_size != null ? (
                                                                <p className="text-[10px] text-white/50">{formatFileSize(m.attachment_size)}</p>
                                                            ) : null}
                                                        </div>
                                                        <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                                    </button>
                                                ) : null}

                                                {m.body ? (
                                                    <div className={cn('rounded-lg px-3 py-2 sm:py-1.5 text-sm break-words', isMine ? 'bg-white/20 text-white' : 'bg-white/10 text-white/90')}>
                                                        {m.body}
                                                    </div>
                                                ) : null}

                                                {isRevealed ? (
                                                    <span className="px-1 text-[10px] text-white/35">{formatTime(m.created_at)}</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="border-t border-white/10">
                        {pendingFile ? (
                            <div className="flex items-center gap-2 px-3 pt-2.5">
                                <div className="flex flex-1 items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
                                    {pendingPreview ? (
                                        <button
                                            type="button"
                                            onClick={function () {
                                                setPreviewAttachment({
                                                    url: pendingPreview,
                                                    name: pendingFile ? pendingFile.name : null,
                                                    type: pendingFile ? pendingFile.type : null,
                                                    size: pendingFile ? pendingFile.size : null,
                                                });
                                            }}
                                        >
                                            <img src={pendingPreview} alt="preview" className="h-8 w-8 rounded object-cover" />
                                        </button>
                                    ) : (
                                        <FileText className="h-4 w-4 shrink-0 text-white/60" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs text-white/80">{pendingFile.name}</p>
                                        <p className="text-[10px] text-white/40">{formatFileSize(pendingFile.size)}</p>
                                    </div>
                                    <button onClick={clearPendingFile} className="shrink-0 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="relative flex items-center gap-2 pl-3 pr-4 py-3 sm:py-2.5 pb-[env(safe-area-inset-bottom)]">
                            {showEmojiPicker ? (
                                <div
                                    ref={emojiPickerRef}
                                    className="absolute bottom-full left-3 right-3 mb-2 grid grid-cols-8 gap-1 rounded-lg border border-white/10 bg-[#2a0002] p-2 shadow-xl sm:left-3 sm:right-auto sm:w-64"
                                >
                                    {EMOJIS.map(function (emoji) {
                                        return (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={function () { insertEmoji(emoji); }}
                                                className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-white/10"
                                            >
                                                {emoji}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}

                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={handleFileSelect}
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                            />
                            <button
                                type="button"
                                onClick={function () { if (fileInputRef.current) fileInputRef.current.click(); }}
                                className="shrink-0 rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <Paperclip className="h-4 w-4" />
                            </button>

                            <button
                                type="button"
                                onClick={function () { setShowEmojiPicker(!showEmojiPicker); }}
                                className={cn('shrink-0 rounded-full p-1.5 transition-colors', showEmojiPicker ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white')}
                            >
                                <Smile className="h-4 w-4" />
                            </button>

                            <input
                                ref={inputRef}
                                value={text}
                                onChange={function (e) { setText(e.target.value); }}
                                onKeyDown={function (e) { if (e.key === 'Enter') sendMessage(); }}
                                onFocus={function () { setShowEmojiPicker(false); }}
                                placeholder="Type a message..."
                                className="min-w-0 flex-1 rounded bg-white/10 px-2.5 py-2 sm:py-1.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:bg-white/15"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={sendMessage}
                                disabled={sending || (!text.trim() && !pendingFile)}
                                className="shrink-0 h-8 w-8 min-w-8 text-white transition-transform active:scale-90 disabled:opacity-40"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
        {renderPreview()}
        </>
    );

    function renderPreview() {
        if (!previewAttachment) return null;

        return createPortal(
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
                onClick={function () { setPreviewAttachment(null); }}
            >
                <button
                    type="button"
                    onClick={function () { setPreviewAttachment(null); }}
                    className="absolute right-4 top-4 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                {isImageType(previewAttachment.type) ? (
                    <div
                        onClick={function (e) { e.stopPropagation(); }}
                        className="flex max-h-[85vh] max-w-full flex-col items-center gap-3"
                    >
                        <img
                            src={previewAttachment.url}
                            alt={previewAttachment.name || 'attachment'}
                            className="max-h-[75vh] max-w-full rounded-lg object-contain"
                        />
                        <a
                            href={previewAttachment.url}
                            download={previewAttachment.name || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/25"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </a>
                    </div>
                ) : isPdfType(previewAttachment.type, previewAttachment.name) ? (
                    <div
                        onClick={function (e) { e.stopPropagation(); }}
                        className="flex h-[85vh] w-full max-w-3xl flex-col gap-2 rounded-lg bg-[#2a0002] p-3"
                    >
                        <div className="flex items-center justify-between gap-2 px-1">
                            <p className="min-w-0 truncate text-sm text-white/80">{previewAttachment.name}</p>
                            <a
                                href={previewAttachment.url}
                                download={previewAttachment.name || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/25"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Download
                            </a>
                        </div>
                        <iframe
                            src={previewAttachment.url}
                            title={previewAttachment.name || 'PDF preview'}
                            className="w-full flex-1 rounded bg-white"
                        />
                    </div>
                ) : (
                    <div
                        onClick={function (e) { e.stopPropagation(); }}
                        className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg bg-[#2a0002] p-6 text-center"
                    >
                        <FileText className="h-10 w-10 text-white/60" />
                        <div className="min-w-0">
                            <p className="break-words text-sm text-white">{previewAttachment.name}</p>
                            {previewAttachment.size != null ? (
                                <p className="mt-1 text-xs text-white/40">{formatFileSize(previewAttachment.size)}</p>
                            ) : null}
                        </div>
                        <a
                            href={previewAttachment.url}
                            download={previewAttachment.name || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/25"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </a>
                    </div>
                )}
            </div>,
            document.body,
        );
    }
}