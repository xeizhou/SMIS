import { useForm, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Archive,
    RefreshCw,
    Check,
    ChevronsUpDown,
    Paperclip,
    X,
    File,
    FileImage,
    FileText,
    FileSpreadsheet,
    FileArchive,
    ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SearchableSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    options: { value: string; label: string }[];
}

function SearchableSelect({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Search...',
    options,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-foreground">
                    {label}
                    {required && <span className="text-destructive"> *</span>}
                </label>
            </div>
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            'w-full justify-between font-normal',
                            !selectedLabel && 'text-muted-foreground',
                            error && 'border-destructive'
                        )}
                    >
                        {selectedLabel || placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                        <CommandInput placeholder={placeholder} />
                        <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((opt) => (
                                    <CommandItem
                                        key={opt.value}
                                        value={opt.label}
                                        onSelect={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                value === opt.value ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        {opt.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
}

function getExtension(filename: string) {
    return filename.split('.').pop()?.toLowerCase() ?? '';
}

function getFileType(filename: string) {
    const ext = getExtension(filename);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    return 'file';
}

function FileTypeIcon({ type }: { type: string }) {
    switch (type) {
        case 'image':
            return <FileImage className="h-5 w-5 text-blue-500" />;
        case 'pdf':
            return <FileText className="h-5 w-5 text-red-500" />;
        case 'word':
            return <FileText className="h-5 w-5 text-blue-600" />;
        case 'excel':
            return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
        case 'archive':
            return <FileArchive className="h-5 w-5 text-yellow-600" />;
        default:
            return <File className="h-5 w-5 text-muted-foreground" />;
    }
}

function formatBytes(bytes: number) {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

let fileIdCounter = 0;
function generateFileId() {
    fileIdCounter += 1;
    return `file-${Date.now()}-${fileIdCounter}`;
}

interface StagedFile {
    id: string;
    file: File;
    previewUrl: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    areas: string[];
}

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function RrspAddForm({ open, onOpenChange, areas }: Props) {
    const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

    const [pos, setPos] = useState<any[]>([]);
    const [loadingPos, setLoadingPos] = useState(false);
    const [files, setFiles] = useState<StagedFile[]>([]);
    const [fileError, setFileError] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<StagedFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setLoadingPos(true);
            fetch('/api/rrsp-monitoring/purchase-orders')
                .then(res => res.json())
                .then(data => {
                    setPos(data);
                    setLoadingPos(false);
                })
                .catch(err => {
                    console.error('Failed to fetch POs', err);
                    setLoadingPos(false);
                });
        }
    }, [open]);

    // Revoke staged object URLs on unmount.
    useEffect(() => {
        return () => {
            files.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { data, setData, post, processing, errors, reset } = useForm({
        rrspNo: '',
        poNumber: '',
        dateReceived: '',
        endUserName: '',
        returnBy: '',
        items: [
            {
                itemName: '',
                itemDescription: '',
                quantity: '',
                propertyNo: '',
                kindOfSemiExpendable: '',
                status: '',
                area: '',
                cost: '',
                remarks: '',
            }
        ]
    });

    const addItem = () => {
        setData('items', [
            ...data.items,
            {
                itemName: '',
                itemDescription: '',
                quantity: '',
                propertyNo: '',
                kindOfSemiExpendable: '',
                status: '',
                area: '',
                cost: '',
                remarks: '',
            }
        ]);
    };

    const removeItem = (index: number) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setData('items', newItems);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const incoming = Array.from(e.target.files);
        const accepted: StagedFile[] = [];
        const rejected: string[] = [];

        for (const file of incoming) {
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                rejected.push(`${file.name} (unsupported type)`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                rejected.push(`${file.name} (over 10MB)`);
                continue;
            }
            accepted.push({
                file,
                id: generateFileId(),
                previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            });
        }

        setFileError(rejected.length > 0 ? `Skipped: ${rejected.join(', ')}` : null);
        setFiles((prev) => [...prev, ...accepted]);
        e.target.value = '';
    };

    const removeFile = (id: string) => {
        setFiles((prev) => {
            const target = prev.find((f) => f.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((f) => f.id !== id);
        });
        setPreviewFile((prev) => (prev?.id === id ? null : prev));
    };

    const openFilePreview = (staged: StagedFile) => {
        const type = getFileType(staged.file.name);
        if (type === 'image') {
            setPreviewFile(staged);
        } else if (staged.previewUrl) {
            window.open(staged.previewUrl, '_blank', 'noopener,noreferrer');
        } else {
            const url = URL.createObjectURL(staged.file);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    };

    const resetFiles = () => {
        files.forEach((f) => {
            if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        });
        setFiles([]);
        setFileError(null);
        setPreviewFile(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post('/rrsp-monitoring', {
            preserveScroll: true,
            onSuccess: () => {
                if (files.length > 0) {
                    const formData = new FormData();
                    files.forEach(({ file }) => formData.append('files[]', file));

                    router.post(
                        `/rrsp-monitoring/${data.rrspNo}/attachments`,
                        formData,
                        {
                            forceFormData: true,
                            onFinish: () => {
                                reset();
                                resetFiles();
                                onOpenChange(false);
                            },
                        }
                    );
                } else {
                    reset();
                    resetFiles();
                    onOpenChange(false);
                }
            },
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-h-[95vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
                    <ScrollArea className="max-h-[95vh] w-full">
                        <div className="p-6">
                    <DialogHeader>
                        <DialogTitle>Add RRSP Record</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                        {/* Section: General Information */}
                        <div>
                            <h3 className={sectionTitleClass}>General Information</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="rrspNo">RRSP No <span className="text-destructive">*</span></Label>
                                    <Input
                                        required
                                        id="rrspNo"
                                        placeholder="e.g. 2025-03-0001"
                                        value={data.rrspNo}
                                        onChange={(e) => setData('rrspNo', e.target.value)}
                                    />
                                    {errors.rrspNo && (
                                        <p className="text-sm text-destructive">{errors.rrspNo}</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <SearchableSelect
                                        label="Purchase Order (P.O.)"
                                        value={data.poNumber}
                                        onChange={(value) => {
                                            setData('poNumber', value);
                                            const selectedPo = pos.find(p => p.po_number === value);
                                            const availableItems = selectedPo?.items || [];

                                            if (availableItems.length > 0) {
                                                const newItems = availableItems.map((ai: any) => {
                                                    const desc = ai.description ? `${ai.item_name} - ${ai.description}` : ai.item_name;
                                                    return {
                                                        itemName: ai.item_name,
                                                        itemDescription: desc,
                                                        quantity: '',
                                                        propertyNo: '',
                                                        kindOfSemiExpendable: '',
                                                        status: '',
                                                        area: '',
                                                        cost: '',
                                                        remarks: '',
                                                    };
                                                });
                                                setData('items', newItems);
                                            } else {
                                                setData('items', [
                                                    {
                                                        itemName: '',
                                                        itemDescription: '',
                                                        quantity: '',
                                                        propertyNo: '',
                                                        kindOfSemiExpendable: '',
                                                        status: '',
                                                        area: '',
                                                        cost: '',
                                                        remarks: '',
                                                    }
                                                ]);
                                            }
                                        }}
                                        error={errors.poNumber}
                                        required={true}
                                        placeholder={loadingPos ? "Loading..." : "Search P.O."}
                                        options={pos.map(po => ({ value: po.po_number, label: po.po_number }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="dateReceived">Date Received <span className="text-destructive">*</span></Label>
                                    <Input
                                        required
                                        id="dateReceived"
                                        type="date"
                                        value={data.dateReceived}
                                        onChange={(e) => setData('dateReceived', e.target.value)}
                                    />
                                    {errors.dateReceived && (
                                        <p className="text-sm text-destructive">{errors.dateReceived}</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="endUserName">End User</Label>
                                    <Input
                                        id="endUserName"
                                        placeholder="e.g. Pier Lolita D. Sy"
                                        value={data.endUserName}
                                        onChange={(e) => setData('endUserName', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="returnBy">Return by</Label>
                                    <Input
                                        id="returnBy"
                                        placeholder="Name/Person"
                                        value={data.returnBy}
                                        onChange={(e) => setData('returnBy', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Items */}
                        <div>
                            <div className="flex items-center justify-between border-b pb-2 mb-4">
                                <h3 className="text-sm font-semibold text-foreground">Items</h3>
                            </div>

                            <div className="space-y-6">
                                {data.items.map((item, index) => {
                                    return (
                                    <div key={index} className="relative rounded-md border p-4 bg-muted/20">
                                        {data.items.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-2 top-2 h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Archive className="size-4" />
                                            </Button>
                                        )}
                                        <h4 className="mb-3 text-sm font-medium">Item #{index + 1}</h4>
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                            <div className="space-y-1.5 md:col-span-2">
                                                <Label htmlFor={`item-${index}-name`}>Item Name <span className="text-destructive">*</span></Label>
                                                <Input
                                                    id={`item-${index}-name`}
                                                    required
                                                    placeholder="Enter Item Name"
                                                    value={item.itemName}
                                                    onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                                                />
                                                {(errors as any)[`items.${index}.itemName`] && (
                                                    <p className="text-sm text-destructive">{(errors as any)[`items.${index}.itemName`]}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5 md:col-span-2">
                                                <Label htmlFor={`item-${index}-desc`}>Item Description (from P.O.) <span className="text-destructive">*</span></Label>
                                                <Input
                                                    id={`item-${index}-desc`}
                                                    required
                                                    readOnly
                                                    className="bg-muted text-muted-foreground"
                                                    placeholder="Auto-filled from P.O."
                                                    value={item.itemDescription}
                                                />
                                                {(errors as any)[`items.${index}.itemDescription`] && (
                                                    <p className="text-sm text-destructive">{(errors as any)[`items.${index}.itemDescription`]}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor={`item-${index}-qty`}>Quantity <span className="text-destructive">*</span></Label>
                                                <Input
                                                    id={`item-${index}-qty`}
                                                    required
                                                    type="number"
                                                    min="1"
                                                    placeholder="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                />
                                                {(errors as any)[`items.${index}.quantity`] && (
                                                    <p className="text-sm text-destructive">{(errors as any)[`items.${index}.quantity`]}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor={`item-${index}-prop`}>Property No</Label>
                                                <Input
                                                    id={`item-${index}-prop`}
                                                    placeholder="e.g. 223-01-08-00-0000"
                                                    value={item.propertyNo}
                                                    onChange={(e) => updateItem(index, 'propertyNo', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor={`item-${index}-kind`}>Kind of Semi-Expendable</Label>
                                                <Select
                                                    value={item.kindOfSemiExpendable}
                                                    onValueChange={(value) => updateItem(index, 'kindOfSemiExpendable', value)}
                                                >
                                                    <SelectTrigger id={`item-${index}-kind`} className="w-full">
                                                        <SelectValue placeholder="Select kind" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Low Value">Low Value</SelectItem>
                                                        <SelectItem value="High Value">High Value</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor={`item-${index}-cost`}>Cost</Label>
                                                <Input
                                                    id={`item-${index}-cost`}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="e.g. 1500.00"
                                                    value={item.cost}
                                                    onChange={(e) => updateItem(index, 'cost', e.target.value)}
                                                />
                                                {(errors as any)[`items.${index}.cost`] && (
                                                    <p className="text-sm text-destructive">{(errors as any)[`items.${index}.cost`]}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor={`item-${index}-area`}>Area</Label>
                                                    <button
                                                        type="button"
                                                        onClick={() => router.reload({ only: ['areas'] })}
                                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                                        title="Refresh Areas"
                                                    >
                                                        <RefreshCw className="size-3.5" />
                                                    </button>
                                                </div>
                                                <Select
                                                    value={item.area}
                                                    onValueChange={(value) => updateItem(index, 'area', value)}
                                                >
                                                    <SelectTrigger id={`item-${index}-area`} className="w-full">
                                                        <SelectValue placeholder="Select Area" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {areas.map((a) => (
                                                            <SelectItem key={a} value={a}>{a}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor={`item-${index}-status`}>Status</Label>
                                                <Select
                                                    value={item.status}
                                                    onValueChange={(value) => updateItem(index, 'status', value)}
                                                >
                                                    <SelectTrigger id={`item-${index}-status`} className="w-full">
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="SERVICEABLE">SERVICEABLE</SelectItem>
                                                        <SelectItem value="UNSERVICEABLE">UNSERVICEABLE</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {item.status === 'UNSERVICEABLE' && (
                                                <div className="space-y-1.5 md:col-span-4">
                                                    <Label htmlFor={`item-${index}-remarks`}>Remarks / Findings</Label>
                                                    <Textarea
                                                        id={`item-${index}-remarks`}
                                                        placeholder="Remarks or Findings..."
                                                        value={item.remarks || ''}
                                                        onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-center pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addItem}
                                    className="w-full md:w-auto"
                                >
                                    + Add Item
                                </Button>
                            </div>
                        </div>

                        {/* Section: Attachments */}
                        <div>
                            <h3 className={sectionTitleClass}>Attachments</h3>
                            <div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40"
                                >
                                    <Paperclip className="size-4" />
                                    Click to select files (PDF, JPG, PNG)
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                {fileError && (
                                    <p className="mt-2 text-xs text-destructive">{fileError}</p>
                                )}
                                {files.length > 0 && (
                                    <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                                        {files.map((staged) => {
                                            const { id, file } = staged;
                                            const type = getFileType(file.name);
                                            return (
                                                <li key={id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openFilePreview(staged)}
                                                        className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/50 transition-colors cursor-pointer sm:gap-3 sm:px-3 sm:py-2"
                                                    >
                                                        <div className="h-7 w-7 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden sm:h-9 sm:w-9">
                                                            {staged.previewUrl ? (
                                                                <img
                                                                    src={staged.previewUrl}
                                                                    alt={file.name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <FileTypeIcon type={type} />
                                                            )}
                                                        </div>
                                                        <span className="min-w-0 flex-1 truncate text-xs sm:text-sm">{file.name}</span>
                                                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                                                            {formatBytes(file.size)}
                                                        </span>
                                                        <span
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeFile(id);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.stopPropagation();
                                                                    removeFile(id);
                                                                }
                                                            }}
                                                            className="shrink-0 text-red-600 hover:text-red-800"
                                                            title="Remove"
                                                        >
                                                            <X className="size-3.5 sm:size-4" />
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={processing}
                                style={{ backgroundColor: '#612A35' }}
                            >
                                Save RRSP
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Image Lightbox */}
            <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
                <DialogContent className="w-[95vw] p-0 overflow-hidden" style={{ maxWidth: '900px' }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <p className="text-sm font-medium truncate pr-4">
                            {previewFile?.file.name}
                        </p>
                        {previewFile?.previewUrl && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 mr-6" asChild>
                                <a
                                    href={previewFile.previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open in new tab"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center justify-center bg-muted/30 p-4 max-h-[80vh] overflow-auto">
                        {previewFile?.previewUrl && (
                            <img
                                src={previewFile.previewUrl}
                                alt={previewFile.file.name}
                                className="max-w-full max-h-[75vh] object-contain rounded"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}