import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    FileText,
    Image as ImageIcon,
    Mail,
    Truck,
    File as FileIcon,
    ArrowLeft,
    Folder,
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    Download,
    ExternalLink,
    Clock,
    Settings,
    Save,
    Send,
    Database,
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ItemOption {
    id: string | number;
    label: string;
    subtitle: string | null;
    attachment_count: number;
}

interface AttachmentItem {
    id: number;
    name: string;
    url: string;
    mime_type: string | null;
    file_size: number | null;
    source: string;
    is_image: boolean;
    is_pdf: boolean;
    created_at: string | null;
}

interface DetailData {
    label: string;
    subtitle: string | null;
    stats: Record<string, number>;
    attachments: AttachmentItem[];
}

const PAGE_SIZE = 20;

function formatBytes(bytes: number | null) {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

const STAT_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    total: { label: 'Total Files', icon: FileIcon },
    images: { label: 'Images', icon: ImageIcon },
    pdfs: { label: 'PDFs', icon: FileText },
    from_deliveries: { label: 'From Deliveries', icon: Truck },
    from_po_letters: { label: 'From PO Letters', icon: Mail },
    from_po: { label: 'From PO', icon: FileIcon },
    from_clearance: { label: 'From Clearance', icon: FileIcon },
};

function KpiCard({ statKey, value }: { statKey: string; value: number }) {
    const meta = STAT_META[statKey] ?? { label: statKey, icon: FileIcon };
    const Icon = meta.icon;
    return (
        <div className="flex items-center gap-2.5 rounded-xl border p-3 transition-colors sm:gap-3 sm:p-4">
            <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xl font-semibold leading-none sm:text-2xl">{value}</p>
                <p className="text-muted-foreground mt-1 truncate text-[11px] sm:text-xs">{meta.label}</p>
            </div>
        </div>
    );
}

function FilePreviewModal({ file, onClose }: { file: AttachmentItem; onClose: () => void }) {
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div
            className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 duration-150"
            onClick={onClose}
        >
            <div
                className="animate-in fade-in zoom-in-95 bg-background flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border shadow-lg duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 border-b p-3 sm:p-4">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-muted-foreground text-xs">
                            {file.source} {file.file_size ? `· ${formatBytes(file.file_size)}` : ''}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                            title="Open in new tab"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                        <a
                            href={file.url}
                            download={file.name}
                            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                            title="Download"
                        >
                            <Download className="h-4 w-4" />
                        </a>
                        <button
                            onClick={onClose}
                            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                            title="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="bg-muted flex flex-1 items-center justify-center overflow-auto p-2 sm:p-4">
                    {file.is_image ? (
                        <img
                            src={file.url}
                            alt={file.name}
                            className="max-h-[70vh] w-auto max-w-full rounded-md object-contain"
                        />
                    ) : file.is_pdf ? (
                        <iframe
                            src={file.url}
                            title={file.name}
                            className="h-[70vh] w-full rounded-md border-0 bg-white"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                            <FileText className="text-muted-foreground h-12 w-12" />
                            <p className="text-muted-foreground text-sm">
                                No preview available for this file type.
                            </p>
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm"
                            >
                                Open file
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ItemDetail({ endpoint, onBack }: { endpoint: string; onBack: () => void }) {
    const [data, setData] = useState<DetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewFile, setPreviewFile] = useState<AttachmentItem | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setData(null);

        fetch(endpoint)
            .then((res) => res.json())
            .then((json) => {
                if (!cancelled) {
                    setData(json);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [endpoint]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-1 space-y-5 duration-300 sm:space-y-6">
            <button
                onClick={onBack}
                className="text-muted-foreground flex items-center gap-1.5 text-sm transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </button>

            <div>
                <h2 className="text-base font-semibold sm:text-lg">{data?.label ?? '—'}</h2>
                {data?.subtitle && <p className="text-muted-foreground text-sm">{data.subtitle}</p>}
            </div>

            {loading && (
                <p className="text-muted-foreground animate-pulse text-sm">Loading attachments…</p>
            )}

            {!loading && data && (
                <div className="animate-in fade-in space-y-5 duration-300 sm:space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                        {Object.entries(data.stats).map(([key, value]) => (
                            <KpiCard key={key} statKey={key} value={value} />
                        ))}
                    </div>

                    {data.attachments.length === 0 ? (
                        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed">
                            <p className="text-muted-foreground text-sm">No attachments found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                            {data.attachments.map((file) => (
                                <button
                                    key={file.id}
                                    onClick={() => setPreviewFile(file)}
                                    className="overflow-hidden rounded-xl border text-left transition-colors"
                                >
                                    <div className="bg-muted flex aspect-square items-center justify-center overflow-hidden">
                                        {file.is_image ? (
                                            <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <FileText className="text-muted-foreground h-8 w-8" />
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <p className="truncate text-xs font-medium">{file.name}</p>
                                        <div className="text-muted-foreground mt-1 flex items-center justify-between text-[11px]">
                                            <span className="truncate">{file.source}</span>
                                            <span className="shrink-0">{formatBytes(file.file_size)}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </div>
    );
}

function Pagination({
    page,
    totalPages,
    onChange,
}: {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
}) {
    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
        (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
    );

    return (
        <div className="flex items-center justify-center gap-1 pt-2">
            <button
                onClick={() => onChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-40"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            {pages.map((p, i) => (
                <div key={p} className="flex items-center">
                    {i > 0 && pages[i - 1] !== p - 1 && (
                        <span className="text-muted-foreground px-1 text-sm">…</span>
                    )}
                    <button
                        onClick={() => onChange(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors ${
                            p === page ? 'bg-[#612A35] text-white border-[#612A35]' : ''
                        }`}
                    >
                        {p}
                    </button>
                </div>
            ))}

            <button
                onClick={() => onChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-40"
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}

function GalleryTab({
    purchaseOrders,
    clearances,
}: {
    purchaseOrders: ItemOption[];
    clearances: ItemOption[];
}) {
    const [category, setCategory] = useState<'po' | 'clearance'>('po');
    const [selectedId, setSelectedId] = useState<string | number | null>(null);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    const items = category === 'po' ? purchaseOrders : clearances;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (item) =>
                item.label.toLowerCase().includes(q) ||
                item.subtitle?.toLowerCase().includes(q),
        );
    }, [items, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
        setQuery('');
        setSelectedId(null);
    }, [category]);

    useEffect(() => {
        setPage(1);
    }, [query]);

    if (selectedId !== null) {
        const endpoint =
            category === 'po'
                ? `/document-center/po/${selectedId}/attachments`
                : `/document-center/clearance/${selectedId}/attachments`;

        return <ItemDetail endpoint={endpoint} onBack={() => setSelectedId(null)} />;
    }

    return (
        <div className="animate-in fade-in space-y-4 duration-300 sm:space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="bg-muted inline-flex w-full rounded-lg p-1 sm:w-fit">
                    <button
                        onClick={() => setCategory('po')}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:flex-none sm:px-4 ${
                            category === 'po' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                        }`}
                    >
                        Purchase Orders
                    </button>
                    <button
                        onClick={() => setCategory('clearance')}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:flex-none sm:px-4 ${
                            category === 'clearance' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                        }`}
                    >
                        Clearance
                    </button>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={category === 'po' ? 'Search PO number or end user…' : 'Search clearance…'}
                        className="border-input bg-background h-9 w-full rounded-lg border pl-9 pr-3 text-sm outline-none transition-colors focus:border-ring"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed">
                    <p className="text-muted-foreground text-sm">No results found.</p>
                </div>
            ) : (
                <div className="animate-in fade-in grid grid-cols-2 gap-2.5 duration-300 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                    {paged.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className="flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-colors sm:gap-2 sm:p-3"
                        >
                            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9">
                                <Folder className="h-4 w-4" />
                            </div>
                            <div className="w-full min-w-0">
                                <p className="truncate text-sm font-semibold">{item.label}</p>
                                {item.subtitle && (
                                    <p className="text-muted-foreground truncate text-xs">{item.subtitle}</p>
                                )}
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {item.attachment_count} {item.attachment_count === 1 ? 'file' : 'files'}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
    );
}

function ScheduledTasksTab({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    
    // Force Email States
    const [forceEmailType, setForceEmailType] = useState('overdue');
    const [forceEmailDays, setForceEmailDays] = useState('2');
    const [forceEmailDate, setForceEmailDate] = useState('');

    const [settings, setSettings] = useState({
        delivery_email_enabled: false,
        delivery_email_schedule_time: '08:00',
        reminder_email_enabled: false,
        reminder_email_schedule_time: '08:00',
        reminder_email_days: ['3'],
        audit_logs_cleanup_days: 30,
    });
    
    const [originalSettings, setOriginalSettings] = useState({
        delivery_email_enabled: false,
        delivery_email_schedule_time: '08:00',
        reminder_email_enabled: false,
        reminder_email_schedule_time: '08:00',
        reminder_email_days: ['3'],
        audit_logs_cleanup_days: 30,
    });

    const isOverdueDirty = settings.delivery_email_enabled !== originalSettings.delivery_email_enabled ||
        settings.delivery_email_schedule_time !== originalSettings.delivery_email_schedule_time;

    const isUpcomingDirty = settings.reminder_email_enabled !== originalSettings.reminder_email_enabled ||
        settings.reminder_email_schedule_time !== originalSettings.reminder_email_schedule_time ||
        JSON.stringify(settings.reminder_email_days) !== JSON.stringify(originalSettings.reminder_email_days);

    const isAuditDirty = settings.audit_logs_cleanup_days !== originalSettings.audit_logs_cleanup_days;

    useEffect(() => {
        if (onDirtyChange) onDirtyChange(isOverdueDirty || isUpcomingDirty || isAuditDirty);
    }, [isOverdueDirty, isUpcomingDirty, isAuditDirty, onDirtyChange]);
    
    const [rawTasks, setRawTasks] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/scheduled-tasks')
            .then(res => res.json())
            .then(data => {
                const newSettings = {
                    delivery_email_enabled: Boolean(data.delivery_email_enabled),
                    delivery_email_schedule_time: data.delivery_email_schedule_time || '08:00',
                    reminder_email_enabled: Boolean(data.reminder_email_enabled),
                    reminder_email_schedule_time: data.reminder_email_schedule_time || '08:00',
                    reminder_email_days: Array.isArray(data.reminder_email_days) ? data.reminder_email_days : (data.reminder_email_days ? [data.reminder_email_days] : ['3']),
                    audit_logs_cleanup_days: data.audit_logs_cleanup_days || 30,
                };
                setSettings(newSettings);
                setOriginalSettings(newSettings);
                setRawTasks(data.raw_tasks || []);
                setLoading(false);
            });
    }, []);

    const handleSave = (type: 'overdue' | 'upcoming' | 'audit') => {
        setSaving(true);
        
        let payload: any = { ...originalSettings };
        if (type === 'overdue') {
            payload.delivery_email_enabled = settings.delivery_email_enabled;
            payload.delivery_email_schedule_time = settings.delivery_email_schedule_time;
        } else if (type === 'upcoming') {
            payload.reminder_email_enabled = settings.reminder_email_enabled;
            payload.reminder_email_schedule_time = settings.reminder_email_schedule_time;
            payload.reminder_email_days = settings.reminder_email_days;
        } else if (type === 'audit') {
            payload.audit_logs_cleanup_days = settings.audit_logs_cleanup_days;
        }

        fetch('/api/scheduled-tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.head.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify(payload),
        })
            .then(res => res.json())
            .then(() => {
                setOriginalSettings(prev => ({
                    ...prev,
                    ...(type === 'overdue' ? {
                        delivery_email_enabled: payload.delivery_email_enabled,
                        delivery_email_schedule_time: payload.delivery_email_schedule_time,
                    } : type === 'upcoming' ? {
                        reminder_email_enabled: payload.reminder_email_enabled,
                        reminder_email_schedule_time: payload.reminder_email_schedule_time,
                        reminder_email_days: payload.reminder_email_days,
                    } : {
                        audit_logs_cleanup_days: payload.audit_logs_cleanup_days,
                    })
                }));
                toast.success('Scheduled tasks settings saved successfully!');
            })
            .catch(() => toast.error('Failed to save settings.'))
            .finally(() => setSaving(false));
    };

    const handleForceSend = () => {
        setSending(true);
        
        let payload: any = { type: forceEmailType };
        if (forceEmailType === 'reminder') {
            if (forceEmailDays === 'custom') {
                if (!forceEmailDate) {
                    toast.error('Please select a specific date.');
                    setSending(false);
                    return;
                }
                payload.date = forceEmailDate;
            } else {
                payload.days = parseInt(forceEmailDays);
            }
        }

        fetch('/api/scheduled-tasks/force-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.head.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify(payload),
        })
            .then(async res => {
                const data = await res.json();
                if (res.ok) {
                    toast.success(data.message || 'Emails processed successfully!');
                } else {
                    toast.error(data.message || 'Failed to send emails.');
                }
            })
            .catch(() => toast.error('An error occurred.'))
            .finally(() => setSending(false));
    };

    if (loading) {
        return <div className="text-muted-foreground animate-pulse text-sm text-center py-10">Loading scheduled tasks...</div>;
    }

    return (
        <div className="animate-in fade-in space-y-6 duration-300">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="border-b p-4 sm:p-6 bg-muted/40 flex items-start gap-4">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Overdue Delivery Auto-Emailer</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                            Automatically sends reminder emails to suppliers when their deliveries are exactly 1 day past due. 
                            This runs silently in the background every day.
                        </p>
                    </div>
                </div>
                <div className="p-4 sm:p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Enable Auto-Emailer</Label>
                            <p className="text-sm text-muted-foreground">Turn this background task on or off globally.</p>
                        </div>
                        <Switch 
                            checked={settings.delivery_email_enabled} 
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, delivery_email_enabled: checked }))}
                        />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Daily Execution Time</Label>
                            <p className="text-sm text-muted-foreground">What time should the system check for overdue deliveries?</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="text-muted-foreground h-4 w-4" />
                            <Input 
                                type="time" 
                                className="w-[130px]" 
                                value={settings.delivery_email_schedule_time}
                                onChange={(e) => setSettings(s => ({ ...s, delivery_email_schedule_time: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
                <div className="border-t p-4 bg-muted/20 flex items-center justify-between">
                    <div>
                        {isOverdueDirty && (
                            <p className="text-sm font-medium text-destructive animate-in fade-in italic">
                                You have unsaved changes
                            </p>
                        )}
                    </div>
                    <Button onClick={() => handleSave('overdue')} disabled={!isOverdueDirty || saving} variant={isOverdueDirty ? 'default' : 'secondary'} className="gap-2">
                        {saving ? <Settings className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Settings
                    </Button>
                </div>
            </div>

            
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mt-6">
                <div className="border-b p-4 sm:p-5 bg-muted/40 flex items-start gap-4">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Upcoming Delivery Auto-Emailer</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                            Automatically sends reminder emails to suppliers for upcoming deliveries based on your configured timeline.
                            This runs silently in the background every day.
                        </p>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Enable Auto-Emailer</Label>
                            <p className="text-sm text-muted-foreground">Turn this background task on or off globally.</p>
                        </div>
                        <Switch 
                            checked={settings.reminder_email_enabled} 
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, reminder_email_enabled: checked }))}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Target Delivery Target</Label>
                            <p className="text-sm text-muted-foreground">Send reminders for deliveries due in how many days?</p>
                        </div>
                        <div className="flex flex-wrap gap-4 sm:gap-6 mt-2 sm:mt-0">
                            {['2', '3', '5', '7'].map((days) => (
                                <div key={days} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`reminder_${days}`}
                                        checked={settings.reminder_email_days.includes(days)}
                                        onCheckedChange={(checked) => {
                                            setSettings(s => ({
                                                ...s,
                                                reminder_email_days: checked 
                                                    ? [...s.reminder_email_days, days] 
                                                    : s.reminder_email_days.filter(d => d !== days)
                                            }));
                                        }}
                                    />
                                    <label
                                        htmlFor={`reminder_${days}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        Exactly {days} Days
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Daily Execution Time</Label>
                            <p className="text-sm text-muted-foreground">What time should the system send these reminders?</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="text-muted-foreground h-4 w-4" />
                            <Input 
                                type="time" 
                                value={settings.reminder_email_schedule_time}
                                onChange={(e) => setSettings(s => ({ ...s, reminder_email_schedule_time: e.target.value }))}
                                className="w-[130px]"
                            />
                        </div>
                    </div>
                </div>
                <div className="border-t p-4 bg-muted/20 flex items-center justify-between">
                    <div>
                        {isUpcomingDirty && (
                            <p className="text-sm font-medium text-destructive animate-in fade-in italic">
                                You have unsaved changes
                            </p>
                        )}
                    </div>
                    <Button onClick={() => handleSave('upcoming')} disabled={!isUpcomingDirty || saving} variant={isUpcomingDirty ? 'default' : 'secondary'} className="gap-2">
                        {saving ? <Settings className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Settings
                    </Button>
                </div>
            </div>

            {/* Audit Logs Settings */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mt-6">
                <div className="border-b p-4 sm:p-5 bg-muted/40 flex items-start gap-4">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg">
                        <Database className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">System Audit Logs Cleanup</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                            Configure how long background Audit Logs are kept before being automatically deleted to free up space. No other modules or data are affected.
                        </p>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-3 max-w-xs">
                            <Label>Keep logs older than</Label>
                            <Select 
                                value={String(settings.audit_logs_cleanup_days)} 
                                onValueChange={(val) => setSettings({ ...settings, audit_logs_cleanup_days: parseInt(val) })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select timeframe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">7 days</SelectItem>
                                    <SelectItem value="15">15 days</SelectItem>
                                    <SelectItem value="30">30 days</SelectItem>
                                    <SelectItem value="60">60 days</SelectItem>
                                    <SelectItem value="90">90 days</SelectItem>
                                    <SelectItem value="180">180 days</SelectItem>
                                    <SelectItem value="365">1 year</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Logs older than this threshold will be pruned daily.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border-t p-4 bg-muted/20 flex items-center justify-between">
                    <div>
                        {isAuditDirty && (
                            <p className="text-sm font-medium text-destructive animate-in fade-in italic">
                                You have unsaved changes
                            </p>
                        )}
                    </div>
                    <Button onClick={() => handleSave('audit')} disabled={!isAuditDirty || saving} variant={isAuditDirty ? 'default' : 'secondary'} className="gap-2">
                        {saving ? <Settings className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Settings
                    </Button>
                </div>
            </div>

            {/* Manual Email Triggers */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mt-6">
                <div className="border-b p-4 sm:p-5 bg-muted/40 flex items-start gap-4">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg">
                        <Send className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Force Send Delivery Emails</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                            Manually trigger the email system right now to send notices for overdue deliveries or upcoming reminders.
                        </p>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label>Email Type</Label>
                            <Select value={forceEmailType} onValueChange={setForceEmailType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select email type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="overdue">Overdue Notice (1 Day Past Due)</SelectItem>
                                    <SelectItem value="reminder">Upcoming Delivery Reminder</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Select what kind of message to send.
                            </p>
                        </div>

                        {forceEmailType === 'reminder' && (
                            <div className="space-y-3">
                                <Label>Target Delivery Date</Label>
                                <Select value={forceEmailDays} onValueChange={setForceEmailDays}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select criteria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2">Due in exactly 2 Days</SelectItem>
                                        <SelectItem value="3">Due in exactly 3 Days</SelectItem>
                                        <SelectItem value="5">Due in exactly 5 Days</SelectItem>
                                        <SelectItem value="custom">Specific Custom Date</SelectItem>
                                    </SelectContent>
                                </Select>

                                {forceEmailDays === 'custom' && (
                                    <div className="mt-2">
                                        <Input 
                                            type="date" 
                                            value={forceEmailDate}
                                            onChange={(e) => setForceEmailDate(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t p-4 bg-muted/20 flex justify-end">
                    <Button onClick={handleForceSend} disabled={sending} className="gap-2">
                        {sending ? <Settings className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Force Send Now
                    </Button>
                </div>
            </div>

            {/* Next Execution Status */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mt-6">
                <div className="border-b p-4 sm:p-5 bg-muted/40">
                    <h3 className="font-semibold text-base">Upcoming Background Tasks</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Status of automated system tasks and their next scheduled execution time.
                    </p>
                </div>
                <div className="divide-y">
                    {rawTasks.map((task, i) => {
                        let title = "Unknown Task";
                        let description = "A system background task.";
                        
                        if (task.command.includes('send-overdue-emails')) {
                            title = "Overdue Delivery Emails";
                            description = "When the auto-emailer is scheduled to run next.";
                        } else if (task.command.includes('model:prune')) {
                            title = "System Audit Logs Cleanup";
                            description = `Automatically deletes background Audit Logs older than ${settings.audit_logs_cleanup_days} days to free up space. No other modules or data are affected.`;
                        }

                        return (
                            <div key={i} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-sm">{title}</h3>
                                    <p className="text-xs text-muted-foreground">{description}</p>
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 whitespace-nowrap">
                                    <Clock className="w-3.5 h-3.5" />
                                    {task.next_due}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function DocumentCenterIndex({
    purchaseOrders,
    clearances,
}: {
    purchaseOrders: ItemOption[];
    clearances: ItemOption[];
}) {
    const [activeTab, setActiveTab] = useState('archive');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        const removeInertiaListener = router.on('before', (event: any) => {
            if (hasUnsavedChanges) {
                if (event.detail?.visit?.prefetch) {
                    return;
                }
                toast.error("Please save your settings before leaving this page.");
                event.preventDefault();
            }
        });

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            removeInertiaListener();
        };
    }, [hasUnsavedChanges]);

    const handleTabChange = (val: string) => {
        if (hasUnsavedChanges) {
            toast.error("Please save your settings before switching tabs.");
            return;
        }
        setActiveTab(val);
        setHasUnsavedChanges(false);
    };

    return (
        <>
            <Head title="Document Center" />

            <div className="p-3 sm:p-6">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-foreground text-xl font-bold sm:text-2xl">Document Center</h1>
                            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                                Manage archived documents along with attached documents
                            </p>
                        </div>

                        <TabsList className="w-full sm:w-auto">
                            <TabsTrigger value="archive" className="flex-1 px-10 sm:flex-none">
                                Archive
                            </TabsTrigger>
                            <TabsTrigger value="gallery" className="flex-1 px-10 sm:flex-none">
                                Gallery
                            </TabsTrigger>
                            <TabsTrigger value="scheduled-tasks" className="flex-1 px-10 sm:flex-none">
                                Scheduled Tasks
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent
                        value="archive"
                        className="animate-in fade-in mt-5 flex min-h-[300px] items-center justify-center rounded-xl border border-dashed duration-300 sm:mt-6"
                    >
                        <p className="text-muted-foreground text-sm">No archived documents yet.</p>
                    </TabsContent>

                    <TabsContent value="gallery" className="animate-in fade-in mt-5 duration-300 sm:mt-6">
                        <GalleryTab purchaseOrders={purchaseOrders} clearances={clearances} />
                    </TabsContent>

                    <TabsContent value="scheduled-tasks" className="animate-in fade-in mt-5 duration-300 sm:mt-6">
                        <ScheduledTasksTab onDirtyChange={setHasUnsavedChanges} />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

DocumentCenterIndex.layout = {
    breadcrumbs: [
        {
            title: 'Document Tracker',
            href: '#',
        },
    ],
};
