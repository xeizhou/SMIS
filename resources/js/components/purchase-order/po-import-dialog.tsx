import { FormEvent, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    Download,
    FileText,
    Loader2,
    UploadCloud,
    X,
    AlertCircle,
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

interface ImportSummary {
    created: number;
    updated: number;
    skipped_count: number;
    skipped: string[];
}

export default function PurchaseOrderImportDialog({ open, onOpenChange }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [summary, setSummary] = useState<ImportSummary | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setFile(null);
        setError(null);
        setSuccessMessage(null);
        setSummary(null);
        setSubmitting(false);
        setDragging(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = (nextOpen: boolean) => {
        if (!nextOpen) {
            resetState();
        }
        onOpenChange(nextOpen);
    };

    const validateFile = (selectedFile: File): boolean => {
        const name = selectedFile.name.toLowerCase();
        const isValid = name.endsWith('.csv') || selectedFile.type === 'text/csv';

        if (!isValid) {
            setError('Please select a valid CSV (.csv) file.');
            return false;
        }

        if (selectedFile.size > 20 * 1024 * 1024) {
            setError('File size exceeds the 20MB limit.');
            return false;
        }

        setError(null);
        return true;
    };

    const handleFileSelect = (selectedFile: File | null) => {
        if (!selectedFile) return;

        if (validateFile(selectedFile)) {
            setFile(selectedFile);
            setError(null);
            setSuccessMessage(null);
            setSummary(null);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (submitting) return;
        setDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (submitting) return;
        setDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const removeFile = () => {
        if (submitting) return;
        setFile(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const units = ['Bytes', 'KB', 'MB', 'GB'];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!file) {
            setError('Please choose a CSV file to upload.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);
        setSummary(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('merge_existing', '1');

        router.post('/purchase-orders/import', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = (page.props as any)?.flash;
                const message = flash?.success ?? 'Purchase orders imported successfully.';
                const importSummary = flash?.import_summary;

                setSuccessMessage(message);
                if (importSummary) {
                    setSummary(importSummary);
                }

                setSubmitting(false);
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                setError(
                    typeof firstError === 'string'
                        ? firstError
                        : 'Import failed. Please verify your CSV format and try again.'
                );
                setSubmitting(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <UploadCloud className="size-5 text-[#612A35]" />
                        Import Purchase Orders
                    </DialogTitle>
                    <DialogDescription>
                        Upload the standard template, the 2025 Served PO sheet, or the 2026 PIR Monitoring sheet as a CSV to batch import or update records.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* File Dropzone */}
                    <div>
                        <input
                            ref={fileInputRef}
                            id="po-import-file-input"
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                            disabled={submitting}
                        />

                        {!file ? (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                                    dragging
                                        ? 'border-[#612A35] bg-[#612A35]/5 scale-[0.99]'
                                        : 'border-border bg-muted/20 hover:border-[#612A35]/50 hover:bg-muted/40'
                                }`}
                            >
                                <div className="flex size-12 items-center justify-center rounded-full bg-[#612A35]/10 text-[#612A35] mb-3">
                                    <UploadCloud className="size-6" />
                                </div>

                                <p className="text-sm font-semibold text-foreground">
                                    {dragging ? 'Drop your CSV here' : 'Drop your CSV file here'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    or <span className="font-medium text-[#612A35] underline">browse your files</span>
                                </p>

                                <div className="mt-3 flex items-center gap-2">
                                    <span className="rounded bg-background px-2 py-0.5 text-[10px] font-semibold tracking-wide border text-muted-foreground uppercase">
                                        CSV
                                    </span>
                                    <span className="text-xs text-muted-foreground">Purchase Order format</span>
                                </div>

                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    Use the supplied CSV template to ensure correct column format.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-xl border bg-muted/20 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#612A35]/10 text-[#612A35]">
                                        <FileText className="size-6" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {formatFileSize(file.size)} • CSV file
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={removeFile}
                                        disabled={submitting}
                                        className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <X className="size-4" />
                                        <span className="sr-only">Remove file</span>
                                    </Button>
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                        <CheckCircle2 className="size-3.5" /> File ready for import
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={submitting}
                                        className="text-xs font-medium text-[#612A35] hover:underline"
                                    >
                                        Choose another
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Error Box */}
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-red-700 text-xs dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400">
                            <AlertCircle className="size-4 shrink-0 mt-0.5" />
                            <div className="flex-1">{error}</div>
                        </div>
                    )}

                    {/* Success / Summary Box */}
                    {successMessage && (
                        <div className="rounded-lg border border-green-200 bg-green-50/70 p-4 space-y-2.5 text-green-900 dark:bg-green-950/20 dark:border-green-900/50 dark:text-green-300">
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="size-5 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold">{successMessage}</p>
                                    {summary && (
                                        <p className="mt-1 text-xs text-green-800/80 dark:text-green-400/80">
                                            Created: <strong className="font-semibold">{summary.created}</strong> |
                                            Updated: <strong className="font-semibold">{summary.updated}</strong> |
                                            Skipped: <strong className="font-semibold">{summary.skipped_count}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {summary && summary.skipped.length > 0 && (
                                <div className="mt-2 rounded bg-white/70 dark:bg-black/30 border border-green-200/60 p-2.5 max-h-32 overflow-y-auto">
                                    <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                                        Skipped details:
                                    </p>
                                    <ul className="space-y-0.5 text-[11px] text-muted-foreground list-disc list-inside">
                                        {summary.skipped.map((msg, i) => (
                                            <li key={i}>{msg}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="pt-1 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={resetState}
                                    className="text-xs font-semibold text-[#612A35] dark:text-[#a04b5b] hover:underline"
                                >
                                    + Import another file
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-2 border-t">
                        <a
                            href="/purchase-orders/import/template"
                            download="purchase_orders_import_template.csv"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors hover:underline"
                        >
                            <Download className="size-3.5" />
                            Download CSV template
                        </a>

                        <div className="flex items-center gap-2 justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleClose(false)}
                                disabled={submitting}
                            >
                                {successMessage ? 'Done' : 'Cancel'}
                            </Button>
                            {!successMessage && (
                                <Button
                                    type="submit"
                                    disabled={!file || submitting}
                                    className="text-white bg-[#612A35] hover:bg-[#612A35]/90"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        'Import'
                                    )}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
