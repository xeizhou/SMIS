import { router } from '@inertiajs/react';
import { Paperclip } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import WmrFormFields, {
    type WmrFields,
    type WmrItemInput,
} from './wmrformfields';
import {
    WmrAttachmentPreviewDialog,
    WmrAttachmentRow,
    type WmrAttachmentPreviewTarget,
} from './wmr-attachment-preview';

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
}

interface Attachment {
    id: number;
    original_name: string;
    url: string;
    file_size?: number;
}

interface StagedFile {
    file: File;
    previewUrl: string;
}

interface WmrRecord {
    id: number;
    wmr_no: string;
    wmr_date: string;
    supplier_id: number | null;
    job_order_no: string | null;
    job_order_date: string | null;
    vehicle_type: string | null;
    brand_name: string | null;
    model: string | null;
    serial_engine_no: string | null;
    inspector_name: string | null;
    inspection_date: string | null;
    invoice_no: string | null;
    invoice_date: string | null;
    property_no: string | null;
    acquisition_date: string | null;
    plate_no: string | null;
    labor_cost: string | null;
    items?: { quantity: string; unit: string; description: string }[];
    defects_complaints: string | null;
    materials: string | null;
    attachments?: Attachment[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: WmrRecord | null;
    suppliers: SupplierOption[];
}

const emptyFields: WmrFields = {
    wmr_no: '',
    wmr_date: '',
    supplier_id: '',
    job_order_no: '',
    job_order_date: '',
    vehicle_type: '',
    brand_name: '',
    model: '',
    serial_engine_no: '',
    inspector_name: '',
    inspection_date: '',
    invoice_no: '',
    invoice_date: '',
    property_no: '',
    acquisition_date: '',
    plate_no: '',
    labor_cost: '',
};

function legacyItems(value: string | null): WmrItemInput[] {
    const descriptions =
        value
            ?.split(/\r?\n/)
            .map((description) => description.trim())
            .filter(Boolean) ?? [];
    return descriptions.map((description) => ({
        quantity: '1',
        unit: 'PC',
        description,
    }));
}

export default function WmrEditForm({
    open,
    onOpenChange,
    record,
    suppliers,
}: Props) {
    const [data, setData] = useState<WmrFields>(emptyFields);
    const [items, setItems] = useState<WmrItemInput[]>([
        { quantity: '1', unit: 'PC', description: '' },
    ]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [existingAttachments, setExistingAttachments] = useState<
        Attachment[]
    >([]);
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>(
        [],
    );
    const [files, setFiles] = useState<StagedFile[]>([]);
    const [previewTarget, setPreviewTarget] =
        useState<WmrAttachmentPreviewTarget | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const objectUrls = useRef(new Set<string>());

    const clearFiles = () => {
        objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrls.current.clear();
        setFiles([]);
        setPreviewTarget(null);
    };

    useEffect(
        () => () => {
            objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        },
        [],
    );

    useEffect(() => {
        if (open && record) {
            setData({
                wmr_no: record.wmr_no ?? '',
                wmr_date: record.wmr_date?.slice(0, 10) ?? '',
                supplier_id: record.supplier_id
                    ? String(record.supplier_id)
                    : '',
                job_order_no: record.job_order_no ?? '',
                job_order_date: record.job_order_date?.slice(0, 10) ?? '',
                vehicle_type: record.vehicle_type ?? '',
                brand_name: record.brand_name ?? '',
                model: record.model ?? '',
                serial_engine_no: record.serial_engine_no ?? '',
                inspector_name: record.inspector_name ?? '',
                inspection_date: record.inspection_date?.slice(0, 10) ?? '',
                invoice_no: record.invoice_no ?? '',
                invoice_date: record.invoice_date ?? '',
                property_no: record.property_no ?? '',
                acquisition_date: record.acquisition_date ?? '',
                plate_no: record.plate_no ?? '',
                labor_cost: record.labor_cost ?? '',
            });
            setItems(
                record.items?.length
                    ? record.items.map((item) => ({
                          quantity: item.quantity,
                          unit: item.unit,
                          description: item.description,
                      }))
                    : legacyItems(
                          record.defects_complaints || record.materials,
                      ),
            );
            if (
                !record.items?.length &&
                !record.defects_complaints &&
                !record.materials
            ) {
                setItems([{ quantity: '1', unit: 'PC', description: '' }]);
            }
            setErrors({});
            setProcessing(false);
            setExistingAttachments(record.attachments ?? []);
            setDeletedAttachmentIds([]);
            clearFiles();
        }
    }, [open, record]);

    const handleChange = (field: keyof WmrFields, value: string) => {
        setData((current) => ({ ...current, [field]: value }));
        setErrors((current) => {
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const handleItemsChange = (nextItems: WmrItemInput[]) => {
        setItems(nextItems);
        setErrors((current) =>
            Object.fromEntries(
                Object.entries(current).filter(
                    ([field]) =>
                        field !== 'items' && !field.startsWith('items.'),
                ),
            ),
        );
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!record) return;

        setProcessing(true);
        const payload = {
            ...data,
            items: items.map((item) => ({
                quantity: item.quantity,
                unit: item.unit,
                description: item.description,
            })),
            deleted_attachment_ids: deletedAttachmentIds,
        };

        router.put(`/wmr-monitoring/${record.id}`, payload, {
            onSuccess: () => {
                setErrors({});
                setExistingAttachments((current) =>
                    current.filter(
                        (attachment) =>
                            !deletedAttachmentIds.includes(attachment.id),
                    ),
                );
                setDeletedAttachmentIds([]);

                if (files.length > 0) {
                    const formData = new FormData();
                    files.forEach(({ file }) =>
                        formData.append('files[]', file),
                    );
                    router.post(
                        `/wmr-monitoring/${record.id}/attachments`,
                        formData,
                        {
                            forceFormData: true,
                            onSuccess: () => {
                                clearFiles();
                                onOpenChange(false);
                            },
                            onError: (validationErrors) =>
                                setErrors(validationErrors),
                            onFinish: () => setProcessing(false),
                        },
                    );
                    return;
                }

                onOpenChange(false);
                setProcessing(false);
            },
            onError: (validationErrors) => {
                setErrors(validationErrors);
                setProcessing(false);
            },
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="max-h-[95vh] w-[95vw] overflow-hidden p-0"
                    style={{ maxWidth: '1100px' }}
                >
                    <ScrollArea className="max-h-[95vh] w-full">
                        <div className="p-6">
                            <DialogHeader>
                                <DialogTitle>
                                    Edit WMR Record — {record?.wmr_no}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="mt-4">
                                <WmrFormFields
                                    data={data}
                                    errors={errors}
                                    suppliers={suppliers}
                                    items={items}
                                    onChange={handleChange}
                                    onItemsChange={handleItemsChange}
                                />
                                <div className="mt-6">
                                    <h3 className="mb-3 border-b pb-2 text-sm font-semibold">
                                        Attachments
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
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
                                        onChange={(event) => {
                                            if (event.target.files) {
                                                const selected = Array.from(
                                                    event.target.files,
                                                ).map((file) => {
                                                    const previewUrl =
                                                        URL.createObjectURL(
                                                            file,
                                                        );
                                                    objectUrls.current.add(
                                                        previewUrl,
                                                    );
                                                    return { file, previewUrl };
                                                });
                                                setFiles((current) => [
                                                    ...current,
                                                    ...selected,
                                                ]);
                                            }
                                            event.target.value = '';
                                        }}
                                    />
                                    {existingAttachments.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Existing Files
                                            </p>
                                            {existingAttachments.map(
                                                (attachment) => {
                                                    const isImage =
                                                        /\.(jpe?g|png)$/i.test(
                                                            attachment.original_name,
                                                        );

                                                    return (
                                                        <WmrAttachmentRow
                                                            key={attachment.id}
                                                            name={
                                                                attachment.original_name
                                                            }
                                                            url={attachment.url}
                                                            isImage={isImage}
                                                            fileSize={
                                                                attachment.file_size
                                                            }
                                                            onPreview={() =>
                                                                setPreviewTarget(
                                                                    {
                                                                        name: attachment.original_name,
                                                                        url: attachment.url,
                                                                        isImage,
                                                                    },
                                                                )
                                                            }
                                                            onRemove={() => {
                                                                setExistingAttachments(
                                                                    (current) =>
                                                                        current.filter(
                                                                            (
                                                                                item,
                                                                            ) =>
                                                                                item.id !==
                                                                                attachment.id,
                                                                        ),
                                                                );
                                                                setDeletedAttachmentIds(
                                                                    (
                                                                        current,
                                                                    ) => [
                                                                        ...current,
                                                                        attachment.id,
                                                                    ],
                                                                );
                                                                setPreviewTarget(
                                                                    (
                                                                        current,
                                                                    ) =>
                                                                        current?.url ===
                                                                        attachment.url
                                                                            ? null
                                                                            : current,
                                                                );
                                                            }}
                                                        />
                                                    );
                                                },
                                            )}
                                        </div>
                                    )}
                                    {files.length > 0 && (
                                        <div className="mt-3 space-y-1.5">
                                            {files.map(
                                                (
                                                    { file, previewUrl },
                                                    index,
                                                ) => (
                                                    <WmrAttachmentRow
                                                        key={`${file.name}-${index}`}
                                                        name={file.name}
                                                        url={previewUrl}
                                                        isImage={file.type.startsWith(
                                                            'image/',
                                                        )}
                                                        fileSize={file.size}
                                                        onPreview={() =>
                                                            setPreviewTarget({
                                                                name: file.name,
                                                                url: previewUrl,
                                                                isImage:
                                                                    file.type.startsWith(
                                                                        'image/',
                                                                    ),
                                                            })
                                                        }
                                                        onRemove={() => {
                                                            URL.revokeObjectURL(
                                                                previewUrl,
                                                            );
                                                            objectUrls.current.delete(
                                                                previewUrl,
                                                            );
                                                            setFiles(
                                                                (current) =>
                                                                    current.filter(
                                                                        (
                                                                            _,
                                                                            fileIndex,
                                                                        ) =>
                                                                            fileIndex !==
                                                                            index,
                                                                    ),
                                                            );
                                                            setPreviewTarget(
                                                                (current) =>
                                                                    current?.url ===
                                                                    previewUrl
                                                                        ? null
                                                                        : current,
                                                            );
                                                        }}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    )}
                                    {(errors.files || errors['files.0']) && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {errors.files || errors['files.0']}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        style={{ backgroundColor: '#612A35' }}
                                    >
                                        {processing
                                            ? 'Saving...'
                                            : 'Update Record'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <WmrAttachmentPreviewDialog
                target={previewTarget}
                onOpenChange={(isOpen) => !isOpen && setPreviewTarget(null)}
            />
        </>
    );
}
