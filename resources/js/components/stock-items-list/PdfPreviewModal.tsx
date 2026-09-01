import { useEffect } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface PdfPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    pdfUrl: string;
    filename: string;
}

export default function PdfPreviewModal({
    isOpen,
    onClose,
    title,
    pdfUrl,
    filename,
}: PdfPreviewModalProps) {
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        
        if (isOpen) {
            document.addEventListener('keydown', handleKey);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 duration-150"
            onClick={onClose}
        >
            <div
                className="animate-in fade-in zoom-in-95 bg-background flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-lg duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b p-3 sm:p-4">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{title}</p>
                        <p className="text-muted-foreground text-xs">PDF Preview</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                            title="Open in new tab"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                        <a
                            href={pdfUrl}
                            download={filename}
                            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                            title="Download"
                        >
                            <Download className="h-4 w-4" />
                        </a>
                        <button
                            onClick={onClose}
                            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                            title="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* PDF Viewer Body */}
                <div className="bg-muted flex flex-1 overflow-hidden p-2 sm:p-4">
                    {/* The browser will natively handle the loading state or blank screen until the PDF stream finishes loading from the server */}
                    <iframe
                        src={pdfUrl}
                        title={title}
                        className="h-full w-full rounded-md border-0 bg-white shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
}