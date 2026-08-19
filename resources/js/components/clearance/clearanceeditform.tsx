import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState, useRef } from 'react';
import { Check, ChevronsUpDown, Paperclip, X, Trash2, ExternalLink, File, FileImage, FileText, FileSpreadsheet, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface OfficeOption {
    office_code: string;
    office_name: string;
}


interface Attachment {
    id: number;
    original_name: string;
    file_size: number;
    created_at: string;
    url: string;
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

function FileIcon({ type }: { type: string }) {
    switch (type) {
        case 'image': return <FileImage className="h-5 w-5 text-blue-500" />;
        case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
        case 'word': return <FileText className="h-5 w-5 text-blue-600" />;
        case 'excel': return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
        case 'archive': return <FileArchive className="h-5 w-5 text-yellow-600" />;
        default: return <File className="h-5 w-5 text-muted-foreground" />;
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

interface PreviewTarget {
    name: string;
    url: string;
}

interface ClearanceRecord {
    clearance_id: number;
    name: string;
    office: string | OfficeOption; // Can be a string or an OfficeOption object due to relation overlap
    claim_date: string;
    received_by: string;
    status: string;
    cleared: boolean | string;
    pending: boolean | string;
    remarks: string | null;
    office_data?: OfficeOption | null;
    attachments?: Attachment[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: ClearanceRecord | null;
    offices: OfficeOption[];
}

const emptyForm: Record<string, string> = {
    name: '',
    office: '',
    claim_date: '',
    received_by: '',
    status: 'Active',
    cleared: '',
    pending: '',
    remarks: '',
};

const labelClass = 'mb-1 block text-sm font-medium text-foreground';
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

// Custom Searchable Dropdown for Office
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
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

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
                            error && 'border-red-500'
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
                            <CommandEmpty>No office found.</CommandEmpty>
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

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export default function ClearanceEditForm({ open, onOpenChange, record, offices }: Props) {

    const [data, setData] = useState<Record<string, string>>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [newFiles, setNewFiles] = useState<StagedFile[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (record) {
            setData({
                name: record.name,
                office: typeof record.office === 'object' && record.office !== null ? record.office.office_code : (record.office || ''),
                claim_date: record.claim_date,
                received_by: record.received_by,
                status: record.status,
                cleared: record.cleared === true || record.cleared === 'true' || record.cleared === '1' ? 'true' : 'false',
                pending: record.pending === true || record.pending === 'true' || record.pending === '1' ? 'true' : 'false',
                remarks: record.remarks ?? '',
            });

            setErrors({});
            newFiles.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
            setNewFiles([]);
            setExistingAttachments(record?.attachments ?? []);
            setDeletedAttachmentIds([]);
            setPreviewTarget(null);
        }
    }, [record]);

    useEffect(() => {
        return () => {
            newFiles.forEach((f) => {
                if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSelectChange = (value: string, name: string) => {
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selectedFiles = Array.from(e.target.files).map((file) => ({
            file,
            id: generateFileId(),
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));
        setNewFiles((prev) => [...prev, ...selectedFiles]);
        e.target.value = '';
    };

    const removeNewFile = (id: string) => {
        setNewFiles((prev) => {
            const target = prev.find((f) => f.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((f) => f.id !== id);
        });
    };

    const removeExistingAttachment = (attachmentId: number) => {
        setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        setDeletedAttachmentIds((prev) => [...prev, attachmentId]);
    };

    const openNewFilePreview = (staged: StagedFile) => {
        const type = getFileType(staged.file.name);
        if (type === 'image' && staged.previewUrl) {
            setPreviewTarget({ name: staged.file.name, url: staged.previewUrl });
        } else if (staged.previewUrl) {
            window.open(staged.previewUrl, '_blank', 'noopener,noreferrer');
        } else {
            const url = URL.createObjectURL(staged.file);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    };

    const openExistingAttachmentPreview = (att: Attachment) => {
        const type = getFileType(att.original_name);
        if (type === 'image') {
            setPreviewTarget({ name: att.original_name, url: att.url });
        } else {
            window.open(att.url, '_blank', 'noopener,noreferrer');
        }
    };


    const handleBooleanSelectChange = (value: string, name: 'cleared' | 'pending') => {
        const nextValue = value === 'true';

        setData((prev) => {
            if (name === 'cleared') {
                return {
                    ...prev,
                    cleared: nextValue ? 'true' : 'false',
                    pending: nextValue ? 'false' : prev.pending,
                };
            }

            return {
                ...prev,
                pending: nextValue ? 'true' : 'false',
                cleared: nextValue ? 'false' : prev.cleared,
            };
        });
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!record) {
            return;
        }

        setProcessing(true);

        const payload = {
            ...data,
            cleared: data.cleared === 'true',
            pending: data.pending === 'true',
            deleted_attachment_ids: deletedAttachmentIds,
        };

        router.put(`/clearance/${record.clearance_id}`, payload, {
            onSuccess: () => {
                if (newFiles.length > 0) {
                    const formData = new FormData();
                    newFiles.forEach(({ file }) => formData.append('files[]', file));

                    router.post(
                        `/clearance/${record.clearance_id}/attachments`,
                        formData,
                        {
                            forceFormData: true,
                            onFinish: () => {
                                onOpenChange(false);
                                newFiles.forEach((f) => {
                                    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
                                });
                                setNewFiles([]);
                                setDeletedAttachmentIds([]);
                                setProcessing(false);
                            },
                        }
                    );
                } else {
                    onOpenChange(false);
                    setNewFiles([]);
                    setDeletedAttachmentIds([]);
                    setErrors({});
                    setProcessing(false);
                }
            },
            onError: (errors) => {
                setErrors(errors);
                setProcessing(false);
            },
        });
    };



    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Edit Clearance Record — {record?.clearance_id}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Section: Requester Information */}
                    <div>
                        <h3 className={sectionTitleClass}>Requester Information</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className={labelClass} htmlFor="edit_name">Name <span className="text-red-500">*</span></label>
                                <Input id="edit_name" name="name" value={data.name} onChange={handleChange} />
                                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <SearchableSelect
                                label="Office"
                                value={data.office}
                                onChange={(value) => handleSelectChange(value, 'office')}
                                error={errors.office}
                                required
                                placeholder="Search office..."
                                options={offices.map((office) => ({
                                    value: office.office_code,
                                    label: office.office_code,
                                }))}
                            />

                            <div>
                                <label className={labelClass} htmlFor="edit_claim_date">Claim Date <span className="text-red-500">*</span></label>
                                <Input id="edit_claim_date" type="date" name="claim_date" value={data.claim_date} onChange={handleChange} />
                                {errors.claim_date && <p className="mt-1 text-xs text-red-500">{errors.claim_date}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section: Processing Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Processing Details</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={labelClass} htmlFor="edit_received_by">Received By <span className="text-red-500">*</span></label>
                                <Input id="edit_received_by" name="received_by" value={data.received_by} onChange={handleChange} />
                                {errors.received_by && <p className="mt-1 text-xs text-red-500">{errors.received_by}</p>}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="edit_status">Status <span className="text-red-500">*</span></label>
                                <Input id="edit_status" name="status" value={data.status} onChange={handleChange} placeholder="e.g. Retired" />
                                {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status}</p>}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="edit_cleared">Cleared <span className="text-red-500">*</span></label>
                                <Select value={data.cleared} onValueChange={(value) => handleBooleanSelectChange(value, 'cleared')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select cleared" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">True</SelectItem>
                                        <SelectItem value="false">False</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.cleared && <p className="mt-1 text-xs text-red-500">{errors.cleared}</p>}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="edit_pending">Pending <span className="text-red-500">*</span></label>
                                <Select value={data.pending} onValueChange={(value) => handleBooleanSelectChange(value, 'pending')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select pending" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">True</SelectItem>
                                        <SelectItem value="false">False</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.pending && <p className="mt-1 text-xs text-red-500">{errors.pending}</p>}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="edit_remarks">Remarks</label>
                        <textarea id="edit_remarks" name="remarks" value={data.remarks} onChange={handleChange} rows={3} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                        {errors.remarks && <p className="mt-1 text-xs text-red-500">{errors.remarks}</p>}
                    </div>


                    {/* Attachments Section */}
                    <div className="mt-8">
                        <h3 className={sectionTitleClass}>Attachments</h3>
                        <div className="md:col-span-3">

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40 mt-2"
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

                        {/* Existing Attachments */}
                        {existingAttachments.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Existing Files</p>
                                <ScrollArea className="max-h-[180px]">
                                    <div className="space-y-1.5">
                                        {existingAttachments.map((att) => {
                                            const type = getFileType(att.original_name);
                                            return (
                                                <div
                                                    key={att.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => openExistingAttachmentPreview(att)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            openExistingAttachmentPreview(att);
                                                        }
                                                    }}
                                                    className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
                                                >
                                                    <div className="h-8 w-8 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                        {type === 'image' ? (
                                                            <img
                                                                src={att.url}
                                                                alt={att.original_name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <FileIcon type={type} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm">{att.original_name}</p>
                                                        <p className="text-[11px] text-muted-foreground">{formatBytes(att.file_size)}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] h-5">
                                                        {getExtension(att.original_name).toUpperCase()}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-red-500 hover:text-red-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeExistingAttachment(att.id);
                                                        }}
                                                        title="Remove"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {/* New Files */}
                        {newFiles.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">New Files</p>
                                <ul className="divide-y divide-border rounded-md border border-border">
                                    {newFiles.map((staged) => {
                                        const { id, file } = staged;
                                        const type = getFileType(file.name);
                                        return (
                                            <li key={id}>
                                                <button
                                                    type="button"
                                                    onClick={() => openNewFilePreview(staged)}
                                                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                                                >
                                                    <div className="h-9 w-9 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                                        {staged.previewUrl ? (
                                                            <img
                                                                src={staged.previewUrl}
                                                                alt={file.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <FileIcon type={type} />
                                                        )}
                                                    </div>
                                                    <span className="min-w-0 flex-1 truncate text-sm">
                                                        {file.name}
                                                    </span>
                                                    <span className="shrink-0 text-xs text-muted-foreground">
                                                        {formatBytes(file.size)}
                                                    </span>
                                                    <span
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeNewFile(id);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.stopPropagation();
                                                                removeNewFile(id);
                                                            }
                                                        }}
                                                        className="shrink-0 text-red-600 hover:text-red-800"
                                                        title="Remove"
                                                    >
                                                        <X className="size-4" />
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        </div>
                    </div>


                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={processing} style={{ backgroundColor: '#612A35' }}>
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>

        {/* Image Lightbox */}
        <Dialog open={!!previewTarget} onOpenChange={(o) => !o && setPreviewTarget(null)}>
            <DialogContent className="w-[95vw] p-0 overflow-hidden" style={{ maxWidth: '900px' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <p className="text-sm font-medium truncate pr-4">
                        {previewTarget?.name}
                    </p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 mr-6" asChild>
                        <a
                            href={previewTarget?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </Button>
                </div>
                <div className="flex items-center justify-center bg-muted/30 p-4 max-h-[80vh] overflow-auto">
                    {previewTarget && (
                        <img
                            src={previewTarget.url}
                            alt={previewTarget.name}
                            className="max-w-full max-h-[75vh] object-contain rounded"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
