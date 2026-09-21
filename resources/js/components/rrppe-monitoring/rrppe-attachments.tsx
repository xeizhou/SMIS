import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
    File,
    FileImage,
    FileText,
    FileSpreadsheet,
    FileArchive,
    ExternalLink,
} from 'lucide-react';

export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function getExtension(filename: string) {
    return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function getFileType(filename: string) {
    const ext = getExtension(filename);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    return 'file';
}

export function FileTypeIcon({ type }: { type: string }) {
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

export function formatBytes(bytes: number) {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

let fileIdCounter = 0;
export function generateFileId() {
    fileIdCounter += 1;
    return `file-${Date.now()}-${fileIdCounter}`;
}

export interface StagedFile {
    id: string;
    file: File;
    previewUrl: string | null;
}

export interface PreviewTarget {
    name: string;
    url: string;
}

export interface RrppeAttachment {
    id: number;
    originalName: string;
    url: string;
    mimeType: string | null;
    fileSize: number | null;
}

export function ImageLightbox({
    target,
    onClose,
}: {
    target: PreviewTarget | null;
    onClose: () => void;
}) {
    return (
        <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="w-[95vw] p-0 overflow-hidden" style={{ maxWidth: '900px' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <p className="text-sm font-medium truncate pr-4">{target?.name}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 mr-6" asChild>
                        <a
                            href={target?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </Button>
                </div>
                <div className="flex items-center justify-center bg-muted/30 p-4 max-h-[80vh] overflow-auto">
                    {target && (
                        <img
                            src={target.url}
                            alt={target.name}
                            className="max-w-full max-h-[75vh] object-contain rounded"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}