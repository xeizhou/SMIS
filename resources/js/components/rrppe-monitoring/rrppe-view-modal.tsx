import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import type { RRPPEMonitoring } from '@/pages/rrppe-monitoring/index';

import { StatusBadge } from '@/components/ui/status-badge';
import {
    FileTypeIcon,
    ImageLightbox,
    formatBytes,
    getExtension,
    getFileType,
    type PreviewTarget,
    type RrppeAttachment,
} from './rrppe-attachments';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: RRPPEMonitoring | null;
}

const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined || amount === '') {
        return '-';
    }

    const num = Number(amount);

    if (isNaN(num)) {
        return '-';
    }

    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(num);
};

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-3 pb-2 border-b';

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <div className={valueClass}>{value}</div>
        </div>
    );
}

export default function RrppeViewModal({ open, onOpenChange, item }: Props) {
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

    if (!item) {
        return null;
    }

    const openAttachment = (att: RrppeAttachment) => {
        if (getFileType(att.originalName) === 'image') {
            setPreviewTarget({ name: att.originalName, url: att.url });
        } else {
            window.open(att.url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw]" style={{ maxWidth: '1000px' }}>
                    <DialogHeader>
                        <DialogTitle>View RRPPE Record</DialogTitle>
                    </DialogHeader>

                    <div className="mt-2 space-y-6">
                        <section>
                            <p className={sectionTitleClass}>General Information</p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Detail label="RRPPE No." value={item.rrppeNo} />
                                <Detail label="Date Received" value={item.dateReceived} />
                                <Detail label="End User Name" value={item.endUserName || '-'} />
                                <Detail label="Return By" value={item.returnBy || '-'} />
                            </div>
                        </section>

                        <section>
                            <p className={sectionTitleClass}>Items</p>
                            <div className="space-y-6">
                                {item.items && item.items.length > 0 ? (
                                    item.items.map((i, index) => (
                                        <div key={index} className="rounded-md border p-4 bg-muted/10">
                                            <h4 className="mb-3 text-sm font-medium">Item #{index + 1}</h4>
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                <Detail label="Item Name" value={i.itemName || '-'} />
                                                <Detail label="Item Description" value={i.itemDescription || '-'} />
                                                <Detail label="Quantity" value={i.quantity || '-'} />
                                                <Detail label="Property No." value={i.propertyNo || '-'} />
                                                <Detail label="Cost" value={formatCurrency(i.cost)} />
                                                <Detail label="Area" value={i.area || '-'} />
                                                <Detail label="Status" value={<StatusBadge status={i.status} />} />
                                                {i.status === 'UNSERVICEABLE' && (
                                                    <div className="sm:col-span-3">
                                                        <Detail label="Remarks / Findings" value={i.remarks || '-'} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No items available.</p>
                                )}
                            </div>
                        </section>

                        <section>
                            <p className={sectionTitleClass}>Attachments</p>
                            {item.attachments && item.attachments.length > 0 ? (
                                <div className="space-y-1.5">
                                    {item.attachments.map((att) => {
                                        const type = getFileType(att.originalName);
                                        return (
                                            <div
                                                key={att.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => openAttachment(att)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        openAttachment(att);
                                                    }
                                                }}
                                                className="flex items-center gap-2 rounded-md border px-2 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer sm:gap-2.5 sm:px-2.5"
                                            >
                                                <div className="h-7 w-7 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden sm:h-8 sm:w-8">
                                                    {type === 'image' ? (
                                                        <img
                                                            src={att.url}
                                                            alt={att.originalName}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <FileTypeIcon type={type} />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs sm:text-sm">{att.originalName}</p>
                                                    {att.fileSize != null && (
                                                        <p className="hidden text-[11px] text-muted-foreground sm:block">
                                                            {formatBytes(att.fileSize)}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className="hidden text-[10px] h-5 sm:inline-flex">
                                                    {getExtension(att.originalName).toUpperCase()}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No attachments.</p>
                            )}
                        </section>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ImageLightbox target={previewTarget} onClose={() => setPreviewTarget(null)} />
        </>
    );
}