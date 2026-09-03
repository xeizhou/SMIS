import { FormEvent, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    Download,
    FileText,
    FileUp,
    Loader2,
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

export default function RegSPIImportDialog({
    open,
    onOpenChange,
}: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<{
        message: string;
        skipped: string[];
    } | null>(null);

    const [importStatus, setImportStatus] =
        useState<ImportStatus | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    /*
    |--------------------------------------------------------------------------
    | Reset
    |--------------------------------------------------------------------------
    | Only called explicitly (e.g. "Import another file"), never on close,
    | so re-opening the dialog shows whatever was left in progress.
    */

    function reset() {
        setFile(null);
        setSubmitting(false);
        setCancelling(false);
        setDragging(false);
        setError(null);
        setSummary(null);
        setImportStatus(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    /*
    |--------------------------------------------------------------------------
    | File validation
    |--------------------------------------------------------------------------
    */

    function validateFile(selectedFile: File): boolean {
        const isCsv =
            selectedFile.type === 'text/csv' ||
            selectedFile.name.toLowerCase().endsWith('.csv');

        if (!isCsv) {
            setError('Please select a CSV file.');
            return false;
        }

        setError(null);
        return true;
    }

    /*
    |--------------------------------------------------------------------------
    | Select file
    |--------------------------------------------------------------------------
    */

    function selectFile(selectedFile: File | null) {
        if (!selectedFile) {
            return;
        }

        if (!validateFile(selectedFile)) {
            return;
        }

        setFile(selectedFile);
        setError(null);
        setSummary(null);
        setImportStatus(null);
    }

    /*
    |--------------------------------------------------------------------------
    | Drag & Drop
    |--------------------------------------------------------------------------
    */

    function handleDragOver(
        event: React.DragEvent<HTMLDivElement>,
    ) {
        event.preventDefault();

        if (submitting || isImporting) {
            return;
        }

        setDragging(true);
    }

    function handleDragLeave(
        event: React.DragEvent<HTMLDivElement>,
    ) {
        event.preventDefault();

        if (
            event.currentTarget.contains(
                event.relatedTarget as Node,
            )
        ) {
            return;
        }

        setDragging(false);
    }

    function handleDrop(
        event: React.DragEvent<HTMLDivElement>,
    ) {
        event.preventDefault();

        if (submitting || isImporting) {
            return;
        }

        setDragging(false);

        const droppedFile = event.dataTransfer.files?.[0];

        if (droppedFile) {
            selectFile(droppedFile);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Remove file
    |--------------------------------------------------------------------------
    */

    function removeFile() {
        if (submitting || isImporting) {
            return;
        }

        setFile(null);
        setError(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Format file size
    |--------------------------------------------------------------------------
    */

    function formatFileSize(bytes: number) {
        if (bytes === 0) {
            return '0 Bytes';
        }

        const units = ['Bytes', 'KB', 'MB', 'GB'];

        const index = Math.floor(
            Math.log(bytes) / Math.log(1024),
        );

        return `${(
            bytes / Math.pow(1024, index)
        ).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
    }

    /*
    |--------------------------------------------------------------------------
    | Poll import status
    |--------------------------------------------------------------------------
    | Note: this effect lives on the component instance, not on dialog
    | visibility, so polling keeps running even while the dialog is closed
    | (as long as the parent keeps this component mounted, which is the
    | normal pattern for a controlled Dialog). That's what lets you close
    | the modal mid-import and see progress again when you reopen it.
    */

    useEffect(() => {
        if (!importStatus) {
            return;
        }

        if (
            importStatus.status === 'completed' ||
            importStatus.status === 'failed' ||
            importStatus.status === 'cancelled'
        ) {
            return;
        }

        let cancelled = false;

        const pollStatus = async () => {
            try {
                const response = await fetch(
                    `/import/regspi/${importStatus.id}/status`,
                    {
                        headers: {
                            Accept: 'application/json',
                        },
                    },
                );

                if (!response.ok) {
                    return;
                }

                const data: ImportStatus =
                    await response.json();

                if (!cancelled) {
                    setImportStatus(data);
                }
            } catch {
                // Ignore temporary polling errors.
            }
        };

        const timer = window.setInterval(
            pollStatus,
            1000,
        );

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [importStatus?.id]);

    /*
    |--------------------------------------------------------------------------
    | Open / close
    |--------------------------------------------------------------------------
    | Closing the dialog (X, backdrop click, Esc) no longer resets state.
    | Whatever was selected/in-progress/completed is still there next time
    | the dialog is opened.
    */

    function handleOpenChange(nextOpen: boolean) {
        onOpenChange(nextOpen);
    }

    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

    function submit(event: FormEvent) {
        event.preventDefault();

        if (!file) {
            setError('Choose a CSV file first.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSummary(null);
        setImportStatus(null);

        const data = new FormData();

        data.append('file', file);
        data.append('file_format', 'csv');

        router.post('/import/regspi', data, {
            forceFormData: true,

            onSuccess: (page) => {
                const flash =
                    (page.props as any)?.flash ??
                    page.props;

                const raw =
                    flash?.success ??
                    'RegSPI import started.';

                const [message, importToken] =
                    raw.split('|||');

                const importId = Number(
                    importToken?.replace(
                        'import_id:',
                        '',
                    ),
                );

                if (
                    Number.isInteger(importId) &&
                    importId > 0
                ) {
                    /*
                     * Immediately create the import status.
                     *
                     * total_rows is initially null because
                     * the queue worker may still be reading
                     * the CSV.
                     */
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
                    setSummary({
                        message,
                        skipped: [],
                    });
                }

                setSubmitting(false);
                setFile(null);

                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },

            onError: (errors) => {
                const first = Object.values(errors)[0];

                setError(
                    typeof first === 'string'
                        ? first
                        : 'Import failed. Check the CSV and try again.',
                );

                setSubmitting(false);
            },
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Cancel
    |--------------------------------------------------------------------------
    | Before an import has started: just closes the dialog, state is kept.
    | While an import is running: asks the backend to cancel the job, then
    | reflects that locally. Requires a
    |   POST /import/regspi/{import}/cancel
    | route on the backend that marks the import row 'cancelled' (and
    | ideally has the queued job check that flag and bail out early).
    */

    function cancelImport() {
        if (!importStatus || !isImporting) {
            handleOpenChange(false);
            return;
        }

        setCancelling(true);

        router.post(
            `/import/regspi/${importStatus.id}/cancel`,
            {},
            {
                onFinish: () => {
                    setCancelling(false);
                    setSubmitting(false);
                    setImportStatus((current) =>
                        current
                            ? { ...current, status: 'cancelled' }
                            : current,
                    );
                },
                onError: () => {
                    setCancelling(false);
                    setError(
                        'Could not cancel the import. It may finish on its own.',
                    );
                },
            },
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Import completion
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!importStatus) {
            return;
        }

        if (importStatus.status === 'completed') {
            setSummary({
                message: `Import complete — ${importStatus.processed_rows.toLocaleString()} rows processed.`,
                skipped:
                    importStatus.skipped_rows > 0
                        ? [
                              `${importStatus.skipped_rows.toLocaleString()} rows skipped.`,
                          ]
                        : [],
            });

            setSubmitting(false);
        }

        if (importStatus.status === 'failed') {
            setError(
                importStatus.error_message ??
                    'The background import failed.',
            );

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
    | Progress
    |--------------------------------------------------------------------------
    */

    const progress =
        importStatus?.total_rows &&
        importStatus.total_rows > 0
            ? Math.min(
                  100,
                  Math.round(
                      (importStatus.processed_rows /
                          importStatus.total_rows) *
                          100,
                  ),
              )
            : 0;

    const isImporting =
        importStatus?.status === 'pending' ||
        importStatus?.status === 'processing';

    const wasCancelled = importStatus?.status === 'cancelled';

    /*
    |--------------------------------------------------------------------------
    | UI
    |--------------------------------------------------------------------------
    */

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        Import RegSPI Records
                    </DialogTitle>

                    <DialogDescription>
                        Upload your RegSPI records using the
                        supplied CSV format. Balance quantity
                        is calculated automatically.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={submit}
                    className="space-y-5"
                >
                    {/* -------------------------------------------------
                        File Upload
                    -------------------------------------------------- */}

                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(event) => {
                                selectFile(
                                    event.target.files?.[0] ??
                                        null,
                                );
                            }}
                        />

                        {!file ? (
                            <div
                                role="button"
                                tabIndex={
                                    submitting ||
                                    isImporting
                                        ? -1
                                        : 0
                                }
                                onClick={() => {
                                    if (
                                        !submitting &&
                                        !isImporting
                                    ) {
                                        fileInputRef.current?.click();
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                    ) {
                                        event.preventDefault();

                                        if (
                                            !submitting &&
                                            !isImporting
                                        ) {
                                            fileInputRef.current?.click();
                                        }
                                    }
                                }}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`
                                    group relative flex min-h-[220px]
                                    flex-col items-center justify-center
                                    rounded-xl border-2 border-dashed
                                    p-8 text-center
                                    transition-all duration-200
                                    ${
                                        dragging
                                            ? 'scale-[1.01] border-[#612A35] bg-[#612A35]/5'
                                            : 'border-muted-foreground/20 bg-muted/20 hover:border-[#612A35]/40 hover:bg-[#612A35]/[0.03]'
                                    }
                                    ${
                                        submitting ||
                                        isImporting
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                `}
                            >
                                <div
                                    className={`
                                        flex size-14 items-center
                                        justify-center rounded-full
                                        transition-all duration-200
                                        ${
                                            dragging
                                                ? 'scale-110 bg-[#612A35] text-white'
                                                : 'bg-[#612A35]/10 text-[#612A35] group-hover:scale-105'
                                        }
                                    `}
                                >
                                    {dragging ? (
                                        <FileUp className="size-6" />
                                    ) : (
                                        <Upload className="size-6" />
                                    )}
                                </div>

                                <div className="mt-4">
                                    <p className="text-sm font-semibold">
                                        {dragging
                                            ? 'Drop your CSV here'
                                            : 'Drop your CSV file here'}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        or{' '}
                                        <span className="font-medium text-[#612A35]">
                                            browse your files
                                        </span>
                                    </p>
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    <span className="rounded-md border bg-background px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        CSV
                                    </span>

                                    <span className="text-xs text-muted-foreground">
                                        RegSPI format
                                    </span>
                                </div>

                                <p className="mt-3 text-[11px] text-muted-foreground">
                                    Use the supplied template
                                    to ensure the correct
                                    column format.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-xl border bg-muted/20 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#612A35]/10">
                                        <FileText className="size-6 text-[#612A35]" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">
                                            {file.name}
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formatFileSize(
                                                file.size,
                                            )}{' '}
                                            • CSV file
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={removeFile}
                                        disabled={
                                            submitting ||
                                            isImporting
                                        }
                                        className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <X className="size-4" />

                                        <span className="sr-only">
                                            Remove file
                                        </span>
                                    </Button>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t pt-3">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CheckCircle2 className="size-3.5 text-green-600" />

                                        File ready for import
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        disabled={
                                            submitting ||
                                            isImporting
                                        }
                                        className="text-xs font-medium text-[#612A35] hover:underline disabled:opacity-50"
                                    >
                                        Choose another
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* -------------------------------------------------
                        Error
                    -------------------------------------------------- */}

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-sm text-red-600">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* -------------------------------------------------
                        Cancelled
                    -------------------------------------------------- */}

                    {wasCancelled && (
                        <div className="rounded-lg border bg-muted/20 p-3">
                            <p className="text-sm text-muted-foreground">
                                Import cancelled.
                            </p>
                        </div>
                    )}

                    {/* -------------------------------------------------
                        Import Progress
                    -------------------------------------------------- */}

                    {importStatus && isImporting && (
                        <div className="rounded-xl border bg-muted/20 p-4">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#612A35]/10">
                                        <Loader2 className="size-4 animate-spin text-[#612A35]" />
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium">
                                            {importStatus.status ===
                                            'pending'
                                                ? 'Preparing import...'
                                                : 'Importing records...'}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {importStatus.status ===
                                            'pending'
                                                ? 'Reading your CSV file.'
                                                : 'Please keep this window open.'}
                                        </p>
                                    </div>
                                </div>

                                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                                    {importStatus.total_rows !==
                                    null
                                        ? `${importStatus.processed_rows.toLocaleString()} / ${importStatus.total_rows.toLocaleString()}`
                                        : 'Reading file...'}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                                {importStatus.total_rows !==
                                null ? (
                                    <div
                                        className="h-full rounded-full bg-[#612A35] transition-[width] duration-500 ease-out"
                                        style={{
                                            width: `${progress}%`,
                                        }}
                                    />
                                ) : (
                                    <div className="h-full w-1/3 rounded-full bg-[#612A35] animate-[regspi-loading_1.5s_ease-in-out_infinite]" />
                                )}
                            </div>

                            {/* Progress details */}
                            {importStatus.total_rows !==
                                null && (
                                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>
                                        {progress}% complete
                                    </span>

                                    <span>
                                        {importStatus.created_rows.toLocaleString()}{' '}
                                        created
                                        {' • '}
                                        {importStatus.updated_rows.toLocaleString()}{' '}
                                        updated
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* -------------------------------------------------
                        Success
                    -------------------------------------------------- */}

                    {summary && (
                        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
                            <div className="flex gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                                    <CheckCircle2 className="size-4 text-green-600" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-green-900">
                                        {summary.message}
                                    </p>

                                    {summary.skipped.length >
                                        0 && (
                                        <ul className="mt-2 space-y-1 text-xs text-green-800/70">
                                            {summary.skipped.map(
                                                (
                                                    item,
                                                    index,
                                                ) => (
                                                    <li
                                                        key={
                                                            index
                                                        }
                                                    >
                                                        {item}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}

                                    <button
                                        type="button"
                                        onClick={reset}
                                        className="mt-2 text-xs font-medium text-[#612A35] hover:underline"
                                    >
                                        Import another file
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* -------------------------------------------------
                        Footer
                    -------------------------------------------------- */}

                    <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <a
                            href="/import/template/regspi"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                        >
                            <Download className="size-3.5" />
                            Download CSV template
                        </a>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={cancelImport}
                                disabled={cancelling}
                            >
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

                            <Button
                                type="submit"
                                disabled={
                                    submitting ||
                                    isImporting ||
                                    !file
                                }
                                className="bg-[#612A35] text-white hover:bg-[#612A35]/90"
                            >
                                {submitting || isImporting ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />

                                        {isImporting
                                            ? 'Importing...'
                                            : 'Starting...'}
                                    </>
                                ) : (
                                    <>
                                        <FileUp className="mr-2 size-4" />
                                        Import RegSPI
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}