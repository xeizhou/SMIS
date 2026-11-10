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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    suppliers: SupplierOption[];
}

interface StagedFile {
    file: File;
    previewUrl: string;
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

const emptyItems: WmrItemInput[] = [
    { quantity: '1', unit: 'PC', description: '' },
];

export default function WmrAddForm({ open, onOpenChange, suppliers }: Props) {
    const [data, setData] = useState<WmrFields>(emptyFields);
    const [items, setItems] = useState<WmrItemInput[]>(emptyItems);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [files, setFiles] = useState<StagedFile[]>([]);
    const [createdRecordId, setCreatedRecordId] = useState<number | null>(null);
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

    const uploadFiles = (recordId: number) => {
        const formData = new FormData();
        files.forEach(({ file }) => formData.append('files[]', file));

        router.post(`/wmr-monitoring/${recordId}/attachments`, formData, {
            forceFormData: true,
            onSuccess: () => {
                onOpenChange(false);
                clearFiles();
                setCreatedRecordId(null);
                setErrors({});
            },
            onError: (validationErrors) => setErrors(validationErrors),
            onFinish: () => setProcessing(false),
        });
    };

    useEffect(() => {
        if (!open) {
            setData(emptyFields);
            setItems(emptyItems);
            setErrors({});
            setProcessing(false);
            clearFiles();
            setCreatedRecordId(null);
        }
    }, [open]);

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
        setProcessing(true);

        if (createdRecordId) {
            uploadFiles(createdRecordId);
            return;
        }

        router.post(
            '/wmr-monitoring',
            {
                ...data,
                items: items.map((item) => ({
                    quantity: item.quantity,
                    unit: item.unit,
                    description: item.description,
                })),
            },
            {
                onSuccess: (page) => {
                    if (files.length > 0) {
                        const flash = page.props.flash as
                            { newRecordId?: number } | undefined;
                        if (!flash?.newRecordId) {
                            setErrors({
                                attachments:
                                    'The WMR record was saved, but its ID was not returned for attachment upload.',
                            });
                            setProcessing(false);
                            return;
                        }
                        setCreatedRecordId(flash.newRecordId);
                        uploadFiles(flash.newRecordId);
                        return;
                    }

                    onOpenChange(false);
                    setErrors({});
                    setProcessing(false);
                },
                onError: (validationErrors) => {
                    setErrors(validationErrors);
                    setProcessing(false);
                },
            },
        );
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
                                <DialogTitle>Add WMR Record</DialogTitle>
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
                                    {(errors.files ||
                                        errors['files.0'] ||
                                        errors.attachments) && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {errors.files ||
                                                errors['files.0'] ||
                                                errors.attachments}
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
                                            : 'Save Record'}
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
