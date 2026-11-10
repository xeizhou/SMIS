import { useState } from 'react';
import { MonitorSmartphone, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { printUrl } from '@/lib/print-utils';
import { toast } from 'sonner';

interface WmrPrintRecord {
    id: number;
    wmr_no: string;
}

export default function WmrPrintButton({ record }: { record: WmrPrintRecord }) {
    const [isOpen, setIsOpen] = useState(false);

    const openPrintPage = (type: 'print-html' | 'print') => {
        setIsOpen(false);
        const url = `/wmr-monitoring/${record.id}/${type}`;

        if (type === 'print-html') {
            void printUrl(url).catch(() => {
                toast.error('Unable to prepare the WMR for printing.');
            });
            return;
        }

        window.open(url, '_blank');
    };

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Print WMR"
                aria-label={`Print WMR ${record.wmr_no}`}
                onClick={() => setIsOpen(true)}
            >
                <Printer className="size-4" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Printer className="size-5 text-[#612A35]" />
                            Print WMR {record.wmr_no}
                        </DialogTitle>
                    </DialogHeader>

                    <p className="py-3 text-center text-sm text-muted-foreground">
                        Choose browser printing or open a downloadable PDF.
                    </p>

                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => openPrintPage('print-html')}
                            className="flex items-center gap-2 border-[#612A35]/40 text-[#612A35] hover:bg-[#612A35]/5"
                        >
                            <MonitorSmartphone className="size-4" />
                            Print via Browser
                        </Button>
                        <Button
                            type="button"
                            onClick={() => openPrintPage('print')}
                            className="bg-[#612A35] text-white hover:bg-[#612A35]/90"
                        >
                            Download PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
