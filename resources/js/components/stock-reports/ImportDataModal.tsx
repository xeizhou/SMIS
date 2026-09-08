import { FormEvent, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    Download,
    FileText,
    FileUp,
    Loader2,
    Package,
    Ruler,
    Receipt,
    Building2,
    Upload,
    X,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const BRAND = '#612A35';

type DataType = 'items' | 'units' | 'transactions' | 'offices';
type FileFormat = 'xlsx' | 'json';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ImportStatus {
    id: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    total_rows: number | null;
    processed_rows: number;
    created_rows: number;
    updated_rows: number;
    skipped_rows: number;
    error_message: string | null;
}

const DATA_TYPE_OPTIONS: { value: DataType; label: string; description: string; icon: React.ReactNode }[] = [
    {
        value: 'items',
        label: 'Items',
        description: 'Import item master data including stock numbers, description, and units',
        icon: <Package className="size-4" />,
    },
    {
        value: 'units',
        label: 'Units',
        description: 'Import unit of measurement data',
        icon: <Ruler className="size-4" />,
    },
    {
        value: 'offices',
        label: 'Offices',
        description: 'Import office directory: code, name, entity, head, and email',
        icon: <Building2 className="size-4" />,
    },
    {
        value: 'transactions',
        label: 'Transactions',
        description: 'Import transaction history (receipts and issues)',
        icon: <Receipt className="size-4" />,
    },
];

const TEMPLATE_ROUTES: Record<DataType, string> = {
    items: '/import/template/items',
    units: '/import/template/units',
    transactions: '/import/template/transactions',
    offices: '/import/template/offices',
};

const IMPORT_ROUTES: Record<DataType, string> = {
    items: '/import/items',
    units: '/import/units',
    transactions: '/import/transactions',
    offices: '/import/offices',
};

// Only items/transactions have a queued json path (see ImportController).
// units/offices always run synchronously, json or not.
const QUEUEABLE_TYPES: DataType[] = ['items', 'transactions'];

export default function ImportDataModal({ open, onOpenChange }: Props) {
    const [dataType, setDataType] = useState<DataType>('items');
    const [fileFormat, setFileFormat] = useState<FileFormat>('xlsx');
    const [file, setFile] = useState<File | null>(null);
    const [mergeExisting, setMergeExisting] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{ message: string; skipped: string[] } | null>(null);
    const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const acceptAttr = fileFormat === 'xlsx' ? '.xlsx,.xls' : '.json';
    const isQueueable = QUEUEABLE_TYPES.includes(dataType) && fileFormat === 'json';
    const isImporting = importStatus?.status === 'pending' || importStatus?.status === 'processing';
    const wasCancelled = importStatus?.status === 'cancelled';

    const progress =
        importStatus?.total_rows && importStatus.total_rows > 0
            ? Math.min(100, Math.round((importStatus.processed_rows / importStatus.total_rows) * 100))
            : 0;

    function resetForm() {
        setDataType('items');
        setFileFormat('xlsx');
        setFile(null);
        setMergeExisting(true);
        setSubmitting(false);
        setCancelling(false);
        setError(null);
        setSummary(null);
        setImportStatus(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    // Closing the dialog no longer wipes state — same as RegSPIImportDialog,
    // so reopening mid-import still shows progress.
    function handleOpenChange(next: boolean) {
        onOpenChange(next);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] ?? null;
        setFile(selected);
        setError(null);
        setSummary(null);
        setImportStatus(null);
    }

    /*
    |--------------------------------------------------------------------------
    | Poll import status (json/queued path only)
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        if (!importStatus) return;
        if (['completed', 'failed', 'cancelled'].includes(importStatus.status)) return;

        let cancelled = false;

        const pollStatus = async () => {
            try {
                const res = await fetch(`/import/${importStatus.id}/status`, {
                    headers: { Accept: 'application/json' },
                });
                if (!res.ok) return;
                const data: ImportStatus = await res.json();
                if (!cancelled) setImportStatus(data);
            } catch {
                // ignore transient polling errors
            }
        };

        const timer = window.setInterval(pollStatus, 1000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [importStatus?.id]);

    /*
    |--------------------------------------------------------------------------
    | React to terminal status
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        if (!importStatus) return;

        if (importStatus.status === 'completed') {
            setSummary({
                message: `Import complete: ${importStatus.created_rows.toLocaleString()} created, ${importStatus.updated_rows.toLocaleString()} updated${
                    importStatus.skipped_rows > 0 ? `, ${importStatus.skipped_rows.toLocaleString()} row(s) skipped` : ''
                }.`,
                skipped: importStatus.error_message ? importStatus.error_message.split('|||') : [],
            });
            setSubmitting(false);
        }

        if (importStatus.status === 'failed') {
            setError(importStatus.error_message ?? 'The background import failed.');
            setSubmitting(false);
        }

        if (importStatus.status === 'cancelled') {
            setError(null);
            setSummary(null);
            setSubmitting(false);
        }
    }, [importStatus]);

    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */
    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (!file) {
            setError('Please choose a file to import.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSummary(null);
        setImportStatus(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_format', fileFormat);
        formData.append('merge_existing', mergeExisting ? '1' : '0');

        router.post(IMPORT_ROUTES[dataType], formData, {
            forceFormData: true,
            onSuccess: (page) => {
                const flash = (page.props as any)?.flash ?? page.props;
                const raw = flash?.success ?? 'Import complete.';
                const [message, token] = raw.split('|||');

                if (isQueueable) {
                    // Queued path: response only carries an import_id, actual
                    // progress comes from polling. Same handoff as RegSPI.
                    const importId = Number(token?.replace('import_id:', ''));
                    if (Number.isInteger(importId) && importId > 0) {
                        setImportStatus({
                            id: importId,
                            status: 'pending',
                            total_rows: null,
                            processed_rows: 0,
                            created_rows: 0,
                            updated_rows: 0,
                            skipped_rows: 0,
                            error_message: null,
                        });
                    } else {
                        setSummary({ message, skipped: [] });
                        setSubmitting(false);
                    }
                } else {
                    // Synchronous path (xlsx/csv, or units/offices json):
                    // the whole result is already in the flash message.
                    const [msg, ...skipped] = raw.split('|||');
                    setSummary({ message: msg, skipped });
                    setSubmitting(false);
                }

                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: (errors) => {
                setSubmitting(false);
                const firstError = Object.values(errors)[0];
                setError(typeof firstError === 'string' ? firstError : 'Import failed. Please check your file and try again.');
            },
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Cancel
    |--------------------------------------------------------------------------
    */
    function cancelImport() {
        if (!importStatus || !isImporting) {
            handleOpenChange(false);
            return;
        }

        setCancelling(true);

        router.post(
            `/import/${importStatus.id}/cancel`,
            {},
            {
                onFinish: () => {
                    setCancelling(false);
                    setSubmitting(false);
                    setImportStatus((current) => (current ? { ...current, status: 'cancelled' } : current));
                },
                onError: () => {
                    setCancelling(false);
                    setError('Could not cancel the import. It may finish on its own.');
                },
            },
        );
    }

    function formatFileSize(bytes: number) {
        if (bytes === 0) return '0 Bytes';
        const units = ['Bytes', 'KB', 'MB', 'GB'];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
    }

    const locked = submitting || isImporting;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import Data</DialogTitle>
                    <DialogDescription>Import data from an Excel or JSON file.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Data type selection */}
                    <div className="grid grid-cols-2 gap-2">
                        {DATA_TYPE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                disabled={locked}
                                onClick={() => setDataType(opt.value)}
                                className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50"
                                style={dataType === opt.value ? { borderColor: BRAND } : undefined}
                            >
                                <span
                                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md"
                                    style={{
                                        backgroundColor: dataType === opt.value ? `${BRAND}1A` : 'var(--muted)',
                                        color: dataType === opt.value ? BRAND : 'var(--muted-foreground)',
                                    }}
                                >
                                    {opt.icon}
                                </span>
                                <div>
                                    <p className="text-sm font-medium leading-none">{opt.label}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{opt.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* File format toggle */}
                    <div className="space-y-2">
                        <Label className="text-sm">File format</Label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => setFileFormat('xlsx')}
                                className="flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50"
                                style={fileFormat === 'xlsx' ? { borderColor: BRAND, color: BRAND } : undefined}
                            >
                                Excel
                            </button>
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => setFileFormat('json')}
                                className="flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50"
                                style={fileFormat === 'json' ? { borderColor: BRAND, color: BRAND } : undefined}
                            >
                                JSON
                            </button>
                        </div>
                    </div>

                    {/* File dropzone — mirrors RegSPIImportDialog's dropzone/selected-file states */}
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={acceptAttr}
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        {!file ? (
                            <div
                                role="button"
                                tabIndex={locked ? -1 : 0}
                                onClick={() => !locked && fileInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && !locked) {
                                        e.preventDefault();
                                        fileInputRef.current?.click();
                                    }
                                }}
                                className={`group relative flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 border-muted-foreground/20 bg-muted/20 hover:border-[#612A35]/40 hover:bg-[#612A35]/[0.03] ${
                                    locked ? 'pointer-events-none opacity-50' : ''
                                }`}
                            >
                                <div className="flex size-12 items-center justify-center rounded-full bg-[#612A35]/10 text-[#612A35] transition-all duration-200 group-hover:scale-105">
                                    <Upload className="size-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-sm font-semibold">Drop your file here</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        or <span className="font-medium text-[#612A35]">browse your files</span>
                                    </p>
                                </div>
                                <span className="mt-3 rounded-md border bg-background px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {fileFormat}
                                </span>
                            </div>
                        ) : (
                            <div className="rounded-xl border bg-muted/20 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#612A35]/10">
                                        <FileText className="size-6 text-[#612A35]" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">{file.name}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formatFileSize(file.size)} • {fileFormat.toUpperCase()} file
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            if (locked) return;
                                            setFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        disabled={locked}
                                        className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <X className="size-4" />
                                        <span className="sr-only">Remove file</span>
                                    </Button>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t pt-3">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CheckCircle2 className="size-3.5 text-green-600" />
                                        File ready for import
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={locked}
                                        className="text-xs font-medium text-[#612A35] hover:underline disabled:opacity-50"
                                    >
                                        Choose another
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Merge checkbox */}
                    <label htmlFor="merge-existing" className="flex cursor-pointer items-start gap-2">
                        <Checkbox
                            id="merge-existing"
                            checked={mergeExisting}
                            onCheckedChange={(checked) => setMergeExisting(checked === true)}
                            disabled={locked}
                            className="mt-0.5"
                        />
                        <span className="text-sm">
                            Merge with existing data <span className="text-xs text-muted-foreground">(recommended)</span>
                        </span>
                    </label>

                    {wasCancelled && (
                        <div className="rounded-lg border bg-muted/20 p-3">
                            <p className="text-sm text-muted-foreground">Import cancelled.</p>
                        </div>
                    )}

                    {/* Progress bar — only ever shown for the queued (json) path */}
                    {importStatus && isImporting && (
                        <div className="rounded-xl border bg-muted/20 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#612A35]/10">
                                        <Loader2 className="size-4 animate-spin text-[#612A35]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {importStatus.status === 'pending' ? 'Preparing import...' : 'Importing records...'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {importStatus.status === 'pending' ? 'Reading your file.' : 'Please keep this window open.'}
                                        </p>
                                    </div>
                                </div>
                                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                                    {importStatus.total_rows !== null
                                        ? `${importStatus.processed_rows.toLocaleString()} / ${importStatus.total_rows.toLocaleString()}`
                                        : 'Reading file...'}
                                </span>
                            </div>

                            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                                {importStatus.total_rows !== null ? (
                                    <div
                                        className="h-full rounded-full bg-[#612A35] transition-[width] duration-500 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                ) : (
                                    <div className="h-full w-1/3 rounded-full bg-[#612A35] animate-[regspi-loading_1.5s_ease-in-out_infinite]" />
                                )}
                            </div>

                            {importStatus.total_rows !== null && (
                                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>{progress}% complete</span>
                                    <span>
                                        {importStatus.created_rows.toLocaleString()} created
                                        {' • '}
                                        {importStatus.updated_rows.toLocaleString()} updated
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Success */}
                    {summary && (
                        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
                            <div className="flex gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                                    <CheckCircle2 className="size-4 text-green-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-green-900">{summary.message}</p>
                                    {summary.skipped.length > 0 && (
                                        <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-green-800/70">
                                            {summary.skipped.map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    )}
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="mt-2 text-xs font-medium text-[#612A35] hover:underline"
                                    >
                                        Import another file
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <a
                            href={TEMPLATE_ROUTES[dataType]}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
                        >
                            <Download className="size-3.5" />
                            Need a template? Download template
                        </a>

                        <div className="flex items-center gap-2">
                            {isQueueable && (
                                <Button type="button" variant="outline" onClick={cancelImport} disabled={cancelling}>
                                    {cancelling ? (
                                        <>
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                            Cancelling...
                                        </>
                                    ) : isImporting ? (
                                        'Cancel Import'
                                    ) : (
                                        'Cancel'
                                    )}
                                </Button>
                            )}
                            <Button type="submit" disabled={locked || !file} style={{ backgroundColor: BRAND }} className="text-white">
                                {locked ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        {isImporting ? 'Importing...' : 'Starting...'}
                                    </>
                                ) : (
                                    'Import Data'
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}