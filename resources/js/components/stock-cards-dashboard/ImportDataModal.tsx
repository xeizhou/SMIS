import { useState, useRef, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';
import { UploadCloud, Download, Loader2, Package, Ruler, Receipt, Building2, FileSpreadsheet, FileJson } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const BRAND = '#612A35';

type DataType = 'items' | 'units' | 'transactions' | 'offices';
type FileFormat = 'xlsx' | 'json';

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

// Matches routes/web.php: import.template/{type}, import.items,
// import.units, import.transactions, import.offices (see ImportController).
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

export default function ImportDataModal({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [dataType, setDataType] = useState<DataType>('items');
    const [fileFormat, setFileFormat] = useState<FileFormat>('xlsx');
    const [file, setFile] = useState<File | null>(null);
    const [mergeExisting, setMergeExisting] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{ message: string; skipped: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const acceptAttr = fileFormat === 'xlsx' ? '.xlsx,.xls' : '.json';

    function resetForm() {
        setDataType('items');
        setFileFormat('xlsx');
        setFile(null);
        setMergeExisting(true);
        setError(null);
        setSummary(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleOpenChange(next: boolean) {
        if (!next) resetForm();
        onOpenChange(next);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] ?? null;
        setFile(selected);
        setError(null);
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (!file) {
            setError('Please choose a file to import.');
            return;
        }

        setSubmitting(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_format', fileFormat);
        formData.append('merge_existing', mergeExisting ? '1' : '0');

        router.post(IMPORT_ROUTES[dataType], formData, {
            forceFormData: true,
            onSuccess: (page) => {
                setSubmitting(false);
                const flash = (page.props as any)?.flash ?? page.props;
                const raw = flash?.success ?? 'Import complete.';
                const [message, ...skipped] = raw.split('|||');
                setSummary({ message, skipped });
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
                                onClick={() => setDataType(opt.value)}
                                className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
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

                    {/* File format + file picker side by side */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">File format</Label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFileFormat('xlsx')}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                                    style={fileFormat === 'xlsx' ? { borderColor: BRAND, color: BRAND } : undefined}
                                >
                                    <FileSpreadsheet className="size-3.5" />
                                    Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFileFormat('json')}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                                    style={fileFormat === 'json' ? { borderColor: BRAND, color: BRAND } : undefined}
                                >
                                    <FileJson className="size-3.5" />
                                    JSON
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">File</Label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40"
                                >
                                    <UploadCloud className="size-4 shrink-0" />
                                    <span className="min-w-0 flex-1 truncate">{file ? file.name : 'No file selected'}</span>
                                </button>
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    Browse
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={acceptAttr}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}

                    {/* Merge checkbox */}
                    <label htmlFor="merge-existing" className="flex cursor-pointer items-start gap-2">
                        <Checkbox
                            id="merge-existing"
                            checked={mergeExisting}
                            onCheckedChange={(checked) => setMergeExisting(checked === true)}
                            className="mt-0.5"
                        />
                        <span className="text-sm">
                            Merge with existing data{' '}
                            <span className="text-xs text-muted-foreground">(recommended)</span>
                        </span>
                    </label>

                    {summary && (
                        <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                            <p className="font-medium text-foreground">{summary.message}</p>
                            {summary.skipped.length > 0 && (
                                <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-muted-foreground">
                                    {summary.skipped.map((s, i) => (
                                        <li key={i}>• {s}</li>
                                    ))}
                                </ul>
                            )}
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
                        <Button type="submit" disabled={submitting} style={{ backgroundColor: BRAND }} className="text-white">
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                'Import Data'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}