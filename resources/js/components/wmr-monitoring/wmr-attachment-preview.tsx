import { ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export interface WmrAttachmentPreviewTarget {
    name: string;
    url: string;
    isImage: boolean;
}

interface WmrAttachmentRowProps {
    name: string;
    url: string;
    isImage: boolean;
    fileSize?: number;
    onPreview: () => void;
    onRemove?: () => void;
}

export function WmrAttachmentRow({
    name,
    url,
    isImage,
    fileSize,
    onPreview,
    onRemove,
}: WmrAttachmentRowProps) {
    return (
        <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 sm:gap-2.5 sm:px-2.5">
            <button
                type="button"
                onClick={onPreview}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left hover:opacity-80 sm:gap-3"
            >
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted sm:size-9">
                    {isImage ? (
                        <img
                            src={url}
                            alt={name}
                            className="size-full object-cover"
                        />
                    ) : (
                        <FileText className="size-5 text-red-500" />
                    )}
                </div>
                <span className="min-w-0 flex-1 truncate text-xs sm:text-sm">
                    {name}
                </span>
                {fileSize !== undefined && (
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                        {formatBytes(fileSize)}
                    </span>
                )}
            </button>
            {onRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-red-500 hover:text-red-600"
                    aria-label={`Remove ${name}`}
                    onClick={onRemove}
                >
                    <span aria-hidden="true">×</span>
                </Button>
            )}
        </div>
    );
}

export function WmrAttachmentPreviewDialog({
    target,
    onOpenChange,
}: {
    target: WmrAttachmentPreviewTarget | null;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={target !== null} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] overflow-hidden p-0 sm:max-w-[900px]">
                <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b px-4 py-3">
                    <DialogTitle className="truncate pr-2 text-sm font-medium">
                        {target?.name}
                    </DialogTitle>
                    {target && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mr-7 size-8"
                            asChild
                        >
                            <a
                                href={target.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in new tab"
                                aria-label="Open attachment in new tab"
                            >
                                <ExternalLink className="size-4" />
                            </a>
                        </Button>
                    )}
                </DialogHeader>
                <div className="flex max-h-[80vh] min-h-40 items-center justify-center overflow-auto bg-muted/30 p-4">
                    {target &&
                        (target.isImage ? (
                            <img
                                src={target.url}
                                alt={target.name}
                                className="max-h-[75vh] max-w-full rounded object-contain"
                            />
                        ) : (
                            <iframe
                                src={target.url}
                                title={target.name}
                                className="h-[75vh] w-full rounded border bg-white"
                            />
                        ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(0)} KB`;
}
