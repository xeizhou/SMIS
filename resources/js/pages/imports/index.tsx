import { useEffect, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    ChevronRight,
    FileSpreadsheet,
    FileUp,
    Loader2,
    Terminal,
    Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { FundClusterOption } from '@/types/regspi';

type ImportId =
    | 'rrsp'
    | 'rrppe'
    | 'regspi'
    | 'wmr'
    | 'bona-vida'
    | 'suppliers'
    | 'offices'
    | 'employee-files'
    | 'clearance'
    | 'stock-items'
    | 'units'
    | 'transactions';

type ImportFileFormat = 'csv' | 'xlsx' | 'json';

interface ImportOption {
    id: ImportId;
    title: string;
    description: string;
}

interface Props {
    fundClusters: FundClusterOption[];
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

const importGroups: { title: string; options: ImportOption[] }[] = [
    {
        title: 'Asset Monitoring',
        options: [
            {
                id: 'rrsp',
                title: 'RRSP Monitoring',
                description: 'Import semi-expendable property records.',
            },
            {
                id: 'rrppe',
                title: 'RRPPE Monitoring',
                description: 'Import property, plant, and equipment records.',
            },
            {
                id: 'regspi',
                title: 'RegSPI Monitoring',
                description:
                    'Import registered semi-expendable property records.',
            },
            {
                id: 'wmr',
                title: 'WMR Monitoring',
                description:
                    'Import warehouse monitoring records from a CSV file.',
            },
            {
                id: 'bona-vida',
                title: 'Bona Vida Monitoring',
                description: 'Import Bona Vida monitoring records.',
            },
        ],
    },
    {
        title: 'Procurement & Personnel',
        options: [
            {
                id: 'suppliers',
                title: 'Suppliers',
                description: 'Import supplier details from a CSV file.',
            },
            {
                id: 'offices',
                title: 'Offices',
                description: 'Import office directory records.',
            },
            {
                id: 'employee-files',
                title: 'Employee Files',
                description: 'Import employee file locator records.',
            },
            {
                id: 'clearance',
                title: 'Clearance',
                description: 'Import employee clearance records.',
            },
        ],
    },
    {
        title: 'Stock Cards & Reports',
        options: [
            {
                id: 'stock-items',
                title: 'Stock Items',
                description: 'Import stock item records.',
            },
            {
                id: 'units',
                title: 'Units',
                description: 'Import units of measure.',
            },
            {
                id: 'transactions',
                title: 'Transactions',
                description: 'Import stock transaction records.',
            },
        ],
    },
];

const steps = [
    { title: 'Choose a module' },
    { title: 'Check the file requirements' },
    { title: 'Upload and confirm' },
];

const IMPORT_CONFIG: Record<
    ImportId,
    {
        endpoint: string;
        templateUrl: string;
        cancelPath?: string;
        sendFileFormat?: boolean;
        sendMergeOption?: boolean;
        needsFundCluster?: boolean;
        fileFormats?: ImportFileFormat[];
    }
> = {
    rrsp: {
        endpoint: '/import/rrsp',
        templateUrl: '/import/template/rrsp',
        cancelPath: '/import/rrsp',
    },
    rrppe: {
        endpoint: '/import/rrppe',
        templateUrl: '/import/template/rrppe',
        cancelPath: '/import/rrppe',
    },
    regspi: {
        endpoint: '/import/regspi',
        templateUrl: '/import/template/regspi',
        cancelPath: '/import/regspi',
        needsFundCluster: true,
    },
    wmr: {
        endpoint: '/import/wmr',
        templateUrl: '/import/template/wmr',
        cancelPath: '/import/wmr',
    },
    'bona-vida': {
        endpoint: '/import/bona-vida',
        templateUrl: '/import/template/bona-vida',
        cancelPath: '/import/bona-vida',
    },
    suppliers: {
        endpoint: '/supplier/import',
        templateUrl: '/supplier/import/template',
    },
    offices: {
        endpoint: '/import/offices',
        templateUrl: '/import/template/offices',
        cancelPath: '/import/offices',
        sendFileFormat: true,
        sendMergeOption: true,
    },
    'employee-files': {
        endpoint: '/import/employee-files',
        templateUrl: '/import/template/employee-files',
        cancelPath: '/import/employee-files',
    },
    clearance: {
        endpoint: '/import/clearance',
        templateUrl: '/import/template/clearance',
        cancelPath: '/import/clearance',
    },
    'stock-items': {
        endpoint: '/import/items',
        templateUrl: '/import/template/items',
        cancelPath: '/import/items',
        sendFileFormat: true,
        sendMergeOption: true,
        fileFormats: ['csv', 'xlsx', 'json'],
    },
    units: {
        endpoint: '/import/units',
        templateUrl: '/import/template/units',
        cancelPath: '/import/units',
        sendFileFormat: true,
        sendMergeOption: true,
        fileFormats: ['csv', 'xlsx', 'json'],
    },
    transactions: {
        endpoint: '/import/transactions',
        templateUrl: '/import/template/transactions',
        cancelPath: '/import/transactions',
        sendFileFormat: true,
        sendMergeOption: true,
        fileFormats: ['csv', 'xlsx', 'json'],
    },
};

const templatePreviewUrl = (id: ImportId, format: ImportFileFormat) => {
    const config = IMPORT_CONFIG[id];
    if (!config.fileFormats) {
        return config.templateUrl;
    }

    return `${config.templateUrl}?preview=1&format=${format}`;
};

const templateDownloadUrl = (id: ImportId, format: ImportFileFormat) => {
    const config = IMPORT_CONFIG[id];
    return config.fileFormats
        ? `${config.templateUrl}?format=${format}`
        : config.templateUrl;
};

const MAX_PREVIEW_ROWS = 100;

const FILE_FORMAT_DETAILS: Record<
    ImportFileFormat,
    { label: string; accept: string; extensions: string[]; mimeTypes: string[] }
> = {
    csv: {
        label: 'CSV',
        accept: '.csv,text/csv',
        extensions: ['.csv'],
        mimeTypes: ['text/csv'],
    },
    xlsx: {
        label: 'Excel',
        accept: '.xlsx,.xls',
        extensions: ['.xlsx', '.xls'],
        mimeTypes: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ],
    },
    json: {
        label: 'JSON',
        accept: '.json,application/json',
        extensions: ['.json'],
        mimeTypes: ['application/json'],
    },
};

function matchesFileFormat(file: File, format: ImportFileFormat): boolean {
    const name = file.name.toLowerCase();
    const details = FILE_FORMAT_DETAILS[format];
    return (
        details.extensions.some((extension) => name.endsWith(extension)) ||
        details.mimeTypes.includes(file.type)
    );
}

function describeFileFormats(formats: ImportFileFormat[]): string {
    return formats
        .map((format) => FILE_FORMAT_DETAILS[format].label)
        .join(', ');
}

type TemplateState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; rows: string[][]; jsonPreview?: string };

interface TemplatePreviewResponse {
    headers: string[];
    rows: string[][];
    json?: string;
}

function parseCsv(text: string): string[][] {
    const input = text.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (inQuotes) {
            if (char === '"') {
                if (input[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && input[i + 1] === '\n') {
                i++;
            }
            row.push(field);
            field = '';
            rows.push(row);
            row = [];
        } else {
            field += char;
        }
    }

    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const allOptions = importGroups.flatMap((group) => group.options);

export default function Index({ fundClusters }: Props) {
    const [selectedImport, setSelectedImport] = useState<ImportId | ''>('');
    const [templates, setTemplates] = useState<Record<string, TemplateState>>(
        {},
    );
    const [isUploading, setIsUploading] = useState(false);
    const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [importMessage, setImportMessage] = useState('');
    const [importError, setImportError] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [fileFormat, setFileFormat] = useState<ImportFileFormat>('csv');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fundClusterId, setFundClusterId] = useState('');
    const [mergeExisting, setMergeExisting] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = allOptions.find((o) => o.id === selectedImport);
    const hasSelection = Boolean(selectedOption);
    const config = selectedImport ? IMPORT_CONFIG[selectedImport] : null;
    const allowedFileFormats = config?.fileFormats ?? ['csv'];
    const selectedFileFormat: ImportFileFormat = allowedFileFormats.includes(
        fileFormat,
    )
        ? fileFormat
        : (allowedFileFormats[0] ?? 'csv');
    const fileFormatDescription = describeFileFormats(allowedFileFormats);
    const templateKey = selectedImport
        ? `${selectedImport}:${selectedFileFormat}`
        : '';
    const template = templateKey
        ? (templates[templateKey] ?? { status: 'loading' as const })
        : undefined;
    const requirementsReady = Boolean(
        selectedOption &&
        template?.status === 'ready' &&
        (!config?.needsFundCluster || fundClusterId),
    );
    const isImportComplete = importStatus?.status === 'completed';
    const isImportCancelled = importStatus?.status === 'cancelled';
    const isImportActive =
        isUploading ||
        importStatus?.status === 'pending' ||
        importStatus?.status === 'processing';
    const showImportResult = Boolean(
        isUploading || importStatus || importError,
    );

    const resetImport = () => {
        setImportStatus(null);
        setImportMessage('');
        setImportError('');
        setSelectedFileName('');
        setUploadProgress(0);
        setIsUploading(false);
        setIsCancelling(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (!selectedImport || templates[templateKey]?.status === 'ready') {
            return;
        }

        const id = selectedImport;
        const key = templateKey;
        const controller = new AbortController();

        fetch(templatePreviewUrl(id, selectedFileFormat), {
            signal: controller.signal,
            credentials: 'same-origin',
        })
            .then((response) => {
                const type = response.headers.get('content-type') ?? '';
                if (!response.ok || type.includes('text/html')) {
                    throw new Error('Template not found');
                }
                if (type.includes('application/json')) {
                    return response.json() as Promise<TemplatePreviewResponse>;
                }
                return response.text();
            })
            .then((content) => {
                setTemplates((prev) => ({
                    ...prev,
                    [key]:
                        typeof content === 'string'
                            ? { status: 'ready', rows: parseCsv(content) }
                            : {
                                  status: 'ready',
                                  rows: [content.headers, ...content.rows],
                                  jsonPreview: content.json,
                              },
                }));
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }
                setTemplates((prev) => ({
                    ...prev,
                    [key]: { status: 'error' },
                }));
            });

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedImport, selectedFileFormat, templateKey]);

    useEffect(() => {
        if (
            !importStatus ||
            !['pending', 'processing'].includes(importStatus.status)
        ) {
            return;
        }

        const controller = new AbortController();
        const poll = async () => {
            try {
                const response = await fetch(
                    `/import/${importStatus.id}/status`,
                    {
                        signal: controller.signal,
                        credentials: 'same-origin',
                        headers: { Accept: 'application/json' },
                    },
                );
                if (!response.ok) {
                    throw new Error(
                        `Import status request failed (${response.status}).`,
                    );
                }
                const status: ImportStatus = await response.json();
                setImportStatus(status);
                if (status.status === 'completed') {
                    setImportMessage(
                        `Import complete: ${status.processed_rows.toLocaleString()} row(s) processed.`,
                    );
                } else if (status.status === 'failed') {
                    setImportError(
                        status.error_message ?? 'The import failed.',
                    );
                } else if (status.status === 'cancelled') {
                    setImportError('');
                    setImportMessage('Import cancelled.');
                }
            } catch (error: unknown) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }
                setImportError(
                    error instanceof Error
                        ? error.message
                        : 'Could not check the import status.',
                );
            }
        };

        void poll();
        const timer = window.setInterval(() => void poll(), 1500);
        return () => {
            controller.abort();
            window.clearInterval(timer);
        };
    }, [importStatus?.id, importStatus?.status]);

    const cancelImport = () => {
        if (
            !config?.cancelPath ||
            !importStatus ||
            importStatus.id <= 0 ||
            !isImportActive ||
            isCancelling
        ) {
            return;
        }

        setIsCancelling(true);
        setImportError('');
        router.post(
            `${config.cancelPath}/${importStatus.id}/cancel`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setImportStatus((current) =>
                        current ? { ...current, status: 'cancelled' } : current,
                    );
                    setImportMessage('Import cancelled.');
                },
                onError: () => {
                    setImportError(
                        'Could not cancel the import. It may finish on its own.',
                    );
                },
                onFinish: () => setIsCancelling(false),
            },
        );
    };

    const handleModuleChange = (value: string) => {
        resetImport();
        setSelectedImport(value as ImportId);
        setFileFormat('csv');
        setFundClusterId('');
        setMergeExisting(true);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedImport || !config) {
            return;
        }
        setSelectedFileName(file.name);
        if (!matchesFileFormat(file, selectedFileFormat)) {
            setImportError(
                `Choose a ${FILE_FORMAT_DETAILS[selectedFileFormat].label} file to match the selected format.`,
            );
            event.target.value = '';
            return;
        }
        if (config.needsFundCluster && !fundClusterId) {
            setImportError(
                'Select a fund cluster before choosing the CSV file.',
            );
            event.target.value = '';
            return;
        }

        setIsUploading(true);
        setImportError('');
        setImportMessage('');
        setSelectedFileName(file.name);
        setUploadProgress(0);
        setImportStatus(null);

        const data = new FormData();
        data.append('file', file);
        if (config.sendFileFormat) {
            data.append('file_format', selectedFileFormat);
        }
        if (config.sendMergeOption) {
            data.append('merge_existing', mergeExisting ? '1' : '0');
        }
        if (config.needsFundCluster) {
            data.append('fund_cluster_id', fundClusterId);
        }

        router.post(config.endpoint, data, {
            forceFormData: true,
            preserveScroll: true,
            onProgress: (progress) => {
                setUploadProgress(progress?.percentage ?? 0);
            },
            onSuccess: (page) => {
                const flash = (page.props as { flash?: { success?: string } })
                    .flash;
                const message = flash?.success;
                if (!message) {
                    setImportError(
                        'The upload finished, but the server did not return an import status. Refresh the page or try again.',
                    );
                    return;
                }
                setUploadProgress(100);
                const importId = Number(
                    message.match(/import_id:(\d+)/)?.[1] ?? 0,
                );
                if (importId > 0) {
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
                    setImportMessage('Import started. Processing your file...');
                } else {
                    setImportMessage(message);
                    setImportStatus({
                        id: 0,
                        status: 'completed',
                        total_rows: null,
                        processed_rows: 0,
                        created_rows: 0,
                        updated_rows: 0,
                        skipped_rows: 0,
                        error_message: null,
                    });
                }
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                setImportError(
                    typeof firstError === 'string'
                        ? firstError
                        : 'Import failed. Check the file and try again.',
                );
            },
            onFinish: () => {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    return (
        <>
            <Head title="Data Imports" />
            <main className="mx-auto w-full max-w-screen-2xl space-y-8 p-4 sm:p-6 lg:p-8">
                        <p className="mt-1 text-sm text-muted-foreground">
                            Choose a module, review its file template, then
                            select a file to start importing.
                        </p>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,2fr)] xl:gap-10">
                    {/* Left: module picker and import steps */}
                    <div className="flex flex-col gap-7">
                        <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
                            <div className="mb-5">
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Start here
                                </p>
                                <h2 className="mt-1 text-lg font-semibold text-foreground">
                                    Choose a module
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Select the records you want to import.
                                </p>
                            </div>

                            <label
                                htmlFor="import-module"
                                className="mb-2 block text-sm font-medium text-foreground"
                            >
                                Import module
                            </label>
                            <Select
                                value={selectedImport}
                                disabled={isImportActive}
                                onValueChange={(value) =>
                                    handleModuleChange(value)
                                }
                            >
                                <SelectTrigger
                                    id="import-module"
                                    className="h-14 w-full rounded-lg border-border bg-background px-4 text-left shadow-sm transition-colors hover:bg-muted/50 focus-visible:ring-2"
                                >
                                    <SelectValue placeholder="Select a module..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[min(65vh,32rem)]">
                                    {importGroups.map((group) => (
                                        <SelectGroup key={group.title}>
                                            <SelectLabel className="px-3 pt-3 pb-2 text-[11px] tracking-wider uppercase">
                                                {group.title}
                                            </SelectLabel>
                                            {group.options.map((option) => (
                                                <SelectItem
                                                    key={option.id}
                                                    value={option.id}
                                                    className="min-h-10 cursor-pointer px-3 py-2.5"
                                                >
                                                    {option.title}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="mt-2 text-xs text-muted-foreground">
                                You can change the module at any time.
                            </p>
                        </section>

                        <section
                            aria-label="Import steps"
                            className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
                        >
                            <ol className="space-y-5">
                                {steps.map((step, index) => {
                                    const isDone =
                                        index === 0
                                            ? hasSelection
                                            : index === 1
                                              ? requirementsReady
                                              : isImportComplete;
                                    const isCurrent =
                                        !isDone &&
                                        (index === 0
                                            ? !hasSelection
                                            : index === 1
                                              ? hasSelection &&
                                                !requirementsReady
                                              : requirementsReady);
                                    const body =
                                        index === 0
                                            ? selectedOption
                                                ? `Selected: ${selectedOption.title}.`
                                                : 'Choose a module to see its template.'
                                            : index === 1
                                              ? !hasSelection
                                                  ? 'Choose a module to view its requirements.'
                                                  : template?.status ===
                                                      'loading'
                                                    ? 'Loading the module template...'
                                                    : template?.status ===
                                                        'error'
                                                      ? 'The template could not be loaded.'
                                                      : config?.needsFundCluster &&
                                                          !fundClusterId
                                                        ? 'Select the required fund cluster to continue.'
                                                        : 'Template loaded and required options are ready.'
                                              : isUploading
                                                ? `Uploading ${selectedFileName || 'file'} (${uploadProgress}%).`
                                                : importStatus?.status ===
                                                    'pending'
                                                  ? 'Import queued; waiting for a worker.'
                                                  : importStatus?.status ===
                                                      'processing'
                                                    ? importStatus.total_rows
                                                        ? `Processing ${importStatus.processed_rows.toLocaleString()} of ${importStatus.total_rows.toLocaleString()} rows.`
                                                        : 'The import is processing.'
                                                    : isImportComplete
                                                      ? importMessage ||
                                                        'Import completed successfully.'
                                                      : isImportCancelled
                                                        ? 'Import cancelled. Choose another file to retry.'
                                                        : importError
                                                          ? 'Import failed. Review the message and try again.'
                                                          : requirementsReady
                                                            ? `Choose a file (${fileFormatDescription}) to start the import.`
                                                            : 'Complete the previous steps first.';

                                    return (
                                        <li
                                            key={step.title}
                                            className="flex gap-4"
                                        >
                                            <span
                                                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                                    isDone
                                                        ? 'bg-foreground text-background'
                                                        : isCurrent
                                                          ? 'border-2 border-foreground text-foreground'
                                                          : 'border border-border text-muted-foreground'
                                                }`}
                                            >
                                                {isDone ? (
                                                    <Check
                                                        aria-hidden="true"
                                                        className="size-4"
                                                    />
                                                ) : (
                                                    index + 1
                                                )}
                                            </span>
                                            <div>
                                                <h3 className="text-sm font-medium text-foreground">
                                                    {step.title}
                                                </h3>
                                                <p className="mt-0.5 text-sm text-muted-foreground">
                                                    {body}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </section>
                    </div>

                    {/* Right: file template preview, then the import action */}
                    {selectedOption ? (
                        <section
                            key={selectedOption.id}
                            aria-live="polite"
                            className="min-w-0 animate-in overflow-hidden rounded-xl border border-border bg-card shadow-sm duration-300 fade-in slide-in-from-right-4 motion-reduce:animate-none"
                        >
                            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Template preview
                                    </p>
                                    <h2 className="text-xl font-semibold text-foreground">
                                        {selectedOption.title}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedOption.description}
                                    </p>
                                </div>
                                <span className="w-fit shrink-0 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                                    {
                                        FILE_FORMAT_DETAILS[selectedFileFormat]
                                            .label
                                    }{' '}
                                    template · Accepts {fileFormatDescription}
                                </span>
                            </div>

                            {!showImportResult && (
                                <>
                                    <div className="space-y-4 p-5 sm:p-6">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                <FileSpreadsheet
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                                {
                                                    FILE_FORMAT_DETAILS[
                                                        selectedFileFormat
                                                    ].label
                                                }{' '}
                                                template
                                            </h3>
                                            {template?.status === 'ready' &&
                                                template.rows.length > 0 && (
                                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                                                        {
                                                            template.rows[0]
                                                                .length
                                                        }{' '}
                                                        columns ·{' '}
                                                        {template.rows.length -
                                                            1}{' '}
                                                        rows
                                                    </span>
                                                )}
                                        </div>

                                        {template?.status === 'loading' && (
                                            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                                                <Loader2
                                                    aria-hidden="true"
                                                    className="size-4 animate-spin motion-reduce:animate-none"
                                                />
                                                Loading template...
                                            </div>
                                        )}

                                        {template?.status === 'error' && (
                                            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                                                <AlertCircle
                                                    aria-hidden="true"
                                                    className="mt-0.5 size-4 shrink-0"
                                                />
                                                <p>
                                                    Couldn&apos;t load the
                                                    template from{' '}
                                                    <code className="font-mono text-xs">
                                                        {templatePreviewUrl(
                                                            selectedOption.id,
                                                            selectedFileFormat,
                                                        )}
                                                    </code>
                                                    .
                                                </p>
                                            </div>
                                        )}

                                        {template?.status === 'ready' &&
                                            template.rows.length > 0 && (
                                                <>
                                                    {selectedFileFormat ===
                                                    'json' ? (
                                                        <pre className="max-h-[min(65vh,34rem)] overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
                                                            <code>
                                                                {template.jsonPreview ??
                                                                    JSON.stringify(
                                                                        template.rows,
                                                                        null,
                                                                        2,
                                                                    )}
                                                            </code>
                                                        </pre>
                                                    ) : (
                                                        <div className="max-h-[min(65vh,34rem)] overflow-auto rounded-lg border border-border">
                                                            <table className="w-full min-w-max text-left text-sm">
                                                                <thead className="sticky top-0 bg-muted">
                                                                    <tr>
                                                                        {template.rows[0].map(
                                                                            (
                                                                                cell,
                                                                                i,
                                                                            ) => (
                                                                                <th
                                                                                    key={
                                                                                        i
                                                                                    }
                                                                                    scope="col"
                                                                                    className="px-4 py-3 font-semibold whitespace-nowrap text-foreground"
                                                                                >
                                                                                    {
                                                                                        cell
                                                                                    }
                                                                                </th>
                                                                            ),
                                                                        )}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {template.rows
                                                                        .slice(
                                                                            1,
                                                                            MAX_PREVIEW_ROWS +
                                                                                1,
                                                                        )
                                                                        .map(
                                                                            (
                                                                                row,
                                                                                r,
                                                                            ) => (
                                                                                <tr
                                                                                    key={
                                                                                        r
                                                                                    }
                                                                                    className="border-t border-border"
                                                                                >
                                                                                    {row.map(
                                                                                        (
                                                                                            cell,
                                                                                            c,
                                                                                        ) => (
                                                                                            <td
                                                                                                key={
                                                                                                    c
                                                                                                }
                                                                                                className="border-t border-border px-4 py-3 whitespace-nowrap text-muted-foreground"
                                                                                            >
                                                                                                {
                                                                                                    cell
                                                                                                }
                                                                                            </td>
                                                                                        ),
                                                                                    )}
                                                                                </tr>
                                                                            ),
                                                                        )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">
                                                        Your file should use
                                                        these column headers and
                                                        follow the sample rows
                                                        above.
                                                    </p>
                                                </>
                                            )}

                                        {template?.status === 'ready' &&
                                            template.rows.length === 0 && (
                                                <p className="py-4 text-center text-sm text-muted-foreground">
                                                    This template file is empty.
                                                </p>
                                            )}
                                    </div>

                                    {config?.needsFundCluster && (
                                        <div className="space-y-2 border-t border-border p-5 sm:px-6">
                                            <Label htmlFor="import-fund-cluster">
                                                Fund cluster
                                            </Label>
                                            <Select
                                                value={fundClusterId}
                                                onValueChange={setFundClusterId}
                                                disabled={isImportActive}
                                            >
                                                <SelectTrigger
                                                    id="import-fund-cluster"
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Select a fund cluster" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {fundClusters.map(
                                                        (cluster) => (
                                                            <SelectItem
                                                                key={
                                                                    cluster.fund_cluster_id
                                                                }
                                                                value={
                                                                    cluster.fund_cluster_id
                                                                }
                                                            >
                                                                {
                                                                    cluster.fund_cluster_id
                                                                }{' '}
                                                                -{' '}
                                                                {
                                                                    cluster.fund_description
                                                                }
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {config?.sendMergeOption && (
                                        <div className="flex items-start gap-3 border-t border-border px-5 py-4 sm:px-6">
                                            <Checkbox
                                                id="import-merge-existing"
                                                checked={mergeExisting}
                                                onCheckedChange={(checked) =>
                                                    setMergeExisting(
                                                        checked === true,
                                                    )
                                                }
                                                disabled={isImportActive}
                                            />
                                            <div className="space-y-1">
                                                <Label htmlFor="import-merge-existing">
                                                    Merge with existing records
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Update matching records and
                                                    add new ones.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {showImportResult ? (
                                <div
                                    className="space-y-4 border-t border-border p-5 sm:p-6"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <div className="flex items-start gap-3">
                                        {isImportActive ? (
                                            <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
                                        ) : importError ? (
                                            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                                        ) : (
                                            <Check className="mt-0.5 size-5 shrink-0 text-green-600" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-medium text-foreground">
                                                {isImportActive
                                                    ? isUploading
                                                        ? 'Uploading your file...'
                                                        : importStatus?.total_rows
                                                          ? `Importing ${importStatus.processed_rows.toLocaleString()} of ${importStatus.total_rows.toLocaleString()} rows`
                                                          : 'Import queued and starting...'
                                                    : importError
                                                      ? 'Import could not be completed'
                                                      : isImportCancelled
                                                        ? 'Import cancelled'
                                                        : 'Import complete'}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {importError || importMessage}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden rounded-lg border border-border bg-muted/40 text-foreground">
                                        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
                                            <Terminal
                                                aria-hidden="true"
                                                className="size-4 text-emerald-600"
                                            />
                                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                Import activity
                                            </span>
                                            {isImportActive && (
                                                <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-700">
                                                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
                                                    Running
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-h-44 space-y-2.5 bg-background px-4 py-3 font-mono text-xs leading-relaxed">
                                            <p className="animate-in break-all text-foreground duration-300 fade-in slide-in-from-bottom-1 motion-reduce:animate-none">
                                                <span className="mr-2 text-emerald-600">
                                                    $
                                                </span>
                                                import --module "
                                                {selectedOption.title}" --format
                                                {` ${FILE_FORMAT_DETAILS[selectedFileFormat].label.toLowerCase()}`}
                                            </p>
                                            <p className="animate-in break-all text-muted-foreground duration-300 fade-in slide-in-from-bottom-1 motion-reduce:animate-none">
                                                <span className="mr-2 text-emerald-600">
                                                    [file]
                                                </span>
                                                {selectedFileName ||
                                                    'Waiting for file'}
                                            </p>
                                            <p className="animate-in text-muted-foreground duration-300 fade-in slide-in-from-bottom-1 motion-reduce:animate-none">
                                                <span className="mr-2 text-emerald-600">
                                                    [config]
                                                </span>
                                                {config?.sendMergeOption
                                                    ? `Merge matching records: ${mergeExisting ? 'on' : 'off'}`
                                                    : 'Import settings ready'}
                                                {config?.needsFundCluster &&
                                                    ` · Fund cluster: ${fundClusterId || 'not selected'}`}
                                            </p>
                                            <p className="animate-in text-muted-foreground duration-300 fade-in slide-in-from-bottom-1 motion-reduce:animate-none">
                                                <span className="mr-2 text-emerald-600">
                                                    [upload]
                                                </span>
                                                {isUploading
                                                    ? `Sending file to server · ${uploadProgress}%`
                                                    : importError &&
                                                        !importStatus
                                                      ? 'Upload or validation needs attention'
                                                      : uploadProgress >= 100
                                                        ? 'Upload complete'
                                                        : 'Ready to upload'}
                                            </p>
                                            {importStatus?.id ? (
                                                <>
                                                    <p className="text-muted-foreground">
                                                        <span className="mr-2 text-emerald-600">
                                                            [job]
                                                        </span>
                                                        Import #
                                                        {importStatus.id} ·{' '}
                                                        {importStatus.status}
                                                        {isImportActive && (
                                                            <span className="ml-2 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500 align-middle motion-reduce:animate-none" />
                                                        )}
                                                    </p>
                                                    {importStatus.total_rows !==
                                                        null && (
                                                        <p className="text-muted-foreground">
                                                            <span className="mr-2 text-emerald-600">
                                                                [rows]
                                                            </span>
                                                            {importStatus.processed_rows.toLocaleString()}
                                                            {' / '}
                                                            {importStatus.total_rows.toLocaleString()}
                                                            {' processed'}
                                                        </p>
                                                    )}
                                                    {(importStatus.created_rows >
                                                        0 ||
                                                        importStatus.updated_rows >
                                                            0 ||
                                                        importStatus.skipped_rows >
                                                            0) && (
                                                        <p className="text-muted-foreground">
                                                            <span className="mr-2 text-emerald-600">
                                                                [results]
                                                            </span>
                                                            {importStatus.created_rows.toLocaleString()}
                                                            {' created · '}
                                                            {importStatus.updated_rows.toLocaleString()}
                                                            {' updated · '}
                                                            {importStatus.skipped_rows.toLocaleString()}
                                                            {' skipped'}
                                                        </p>
                                                    )}
                                                </>
                                            ) : null}
                                            {importError ? (
                                                <p className="break-words text-destructive">
                                                    <span className="mr-2">
                                                        [error]
                                                    </span>
                                                    {importError}
                                                </p>
                                            ) : isImportCancelled ? (
                                                <p className="text-amber-700">
                                                    <span className="mr-2">
                                                        [cancelled]
                                                    </span>
                                                    Import stopped. Your data
                                                    was not processed further.
                                                </p>
                                            ) : isImportComplete ||
                                              (importStatus?.id === 0 &&
                                                  !isUploading) ? (
                                                <p className="text-emerald-700">
                                                    <span className="mr-2">
                                                        [done]
                                                    </span>
                                                    {importMessage ||
                                                        'Import completed successfully.'}
                                                </p>
                                            ) : isImportActive ? (
                                                <p className="text-muted-foreground">
                                                    <span className="mr-2 text-emerald-600">
                                                        [system]
                                                    </span>
                                                    {isUploading
                                                        ? 'Preparing a secure upload...'
                                                        : 'Worker is processing the import...'}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                    {importStatus?.total_rows &&
                                        importStatus.total_rows > 0 && (
                                            <div
                                                className="h-2 overflow-hidden rounded-full bg-muted"
                                                role="progressbar"
                                                aria-valuemin={0}
                                                aria-valuemax={
                                                    importStatus.total_rows
                                                }
                                                aria-valuenow={
                                                    importStatus.processed_rows
                                                }
                                            >
                                                <div
                                                    className="h-full rounded-full bg-foreground transition-[width]"
                                                    style={{
                                                        width: `${Math.min(100, Math.round((importStatus.processed_rows / importStatus.total_rows) * 100))}%`,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    {isUploading && (
                                        <div
                                            className="h-2 overflow-hidden rounded-full bg-muted"
                                            role="progressbar"
                                            aria-label="File upload progress"
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={uploadProgress}
                                        >
                                            <div
                                                className="h-full rounded-full bg-foreground transition-[width]"
                                                style={{
                                                    width: `${uploadProgress}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                    {!isImportActive && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={resetImport}
                                        >
                                            Choose another file
                                        </Button>
                                    )}
                                    {isImportActive &&
                                        importStatus?.id &&
                                        importStatus.id > 0 &&
                                        config?.cancelPath && (
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={cancelImport}
                                                disabled={isCancelling}
                                            >
                                                {isCancelling
                                                    ? 'Cancelling...'
                                                    : 'Cancel import'}
                                            </Button>
                                        )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                    <a
                                        href={templateDownloadUrl(
                                            selectedOption.id,
                                            selectedFileFormat,
                                        )}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                                    >
                                        <FileSpreadsheet
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                        Download template
                                    </a>
                                    {allowedFileFormats.length > 1 && (
                                        <div className="grid gap-1.5 sm:min-w-40">
                                            <Label
                                                htmlFor="import-file-format"
                                                className="text-xs text-muted-foreground"
                                            >
                                                Import file type
                                            </Label>
                                            <Select
                                                value={selectedFileFormat}
                                                disabled={isImportActive}
                                                onValueChange={(value) => {
                                                    setFileFormat(
                                                        value as ImportFileFormat,
                                                    );
                                                    setImportError('');
                                                }}
                                            >
                                                <SelectTrigger
                                                    id="import-file-format"
                                                    className="h-11"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {allowedFileFormats.map(
                                                        (format) => (
                                                            <SelectItem
                                                                key={format}
                                                                value={format}
                                                            >
                                                                {
                                                                    FILE_FORMAT_DETAILS[
                                                                        format
                                                                    ].label
                                                                }
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={
                                            FILE_FORMAT_DETAILS[
                                                selectedFileFormat
                                            ].accept
                                        }
                                        className="sr-only"
                                        aria-label={`Choose ${selectedOption.title} ${FILE_FORMAT_DETAILS[selectedFileFormat].label} file`}
                                        onChange={handleFileChange}
                                        disabled={
                                            isImportActive ||
                                            Boolean(
                                                config?.needsFundCluster &&
                                                !fundClusterId,
                                            )
                                        }
                                    />
                                    <Button
                                        type="button"
                                        className="min-h-11 w-full sm:w-auto"
                                        disabled={
                                            template?.status !== 'ready' ||
                                            isImportActive ||
                                            Boolean(
                                                config?.needsFundCluster &&
                                                !fundClusterId,
                                            )
                                        }
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                    >
                                        <Upload
                                            aria-hidden="true"
                                            className="mr-2 size-4"
                                        />
                                        Choose{' '}
                                        {
                                            FILE_FORMAT_DETAILS[
                                                selectedFileFormat
                                            ].label
                                        }{' '}
                                        File & Import
                                        <ChevronRight
                                            aria-hidden="true"
                                            className="ml-2 size-4"
                                        />
                                    </Button>
                                    {importError && (
                                        <p
                                            className="text-sm text-destructive sm:basis-full"
                                            role="alert"
                                        >
                                            {importError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                    ) : (
                        <section className="flex min-h-[28rem] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-8 text-center lg:min-h-[36rem]">
                            <span className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                                <FileSpreadsheet
                                    aria-hidden="true"
                                    className="size-8 text-muted-foreground"
                                />
                            </span>
                            <h2 className="mt-5 text-lg font-semibold text-foreground">
                                Your template preview will appear here
                            </h2>
                            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                Choose a module from the menu to see the
                                required columns and sample data before
                                importing.
                            </p>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Data Imports', href: '/imports' }],
};
