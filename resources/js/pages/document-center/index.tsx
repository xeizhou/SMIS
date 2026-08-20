import { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
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
} from 'lucide-react';

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

const PAGE_SIZE = 24;

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
                            p === page ? 'bg-primary text-primary-foreground border-primary' : ''
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
                <div className="animate-in fade-in grid grid-cols-2 gap-2.5 duration-300 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
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

export default function DocumentCenterIndex({
    purchaseOrders,
    clearances,
}: {
    purchaseOrders: ItemOption[];
    clearances: ItemOption[];
}) {
    return (
        <>
            <Head title="Document Center" />

            <div className="p-3 sm:p-6">
                <Tabs defaultValue="archive">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-foreground text-xl font-bold sm:text-2xl">Document Center</h1>
                            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                                Manage archived documents along with attached documents
                            </p>
                        </div>

                        <TabsList className="w-full sm:w-auto">
                            <TabsTrigger value="archive" className="flex-1 px-16 sm:flex-none">
                                Archive
                            </TabsTrigger>
                            <TabsTrigger value="gallery" className="flex-1 px-16 sm:flex-none">
                                Gallery
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