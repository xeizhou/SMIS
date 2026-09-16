import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { UploadCloud } from 'lucide-react';

interface SupplierImportFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SupplierImportForm({ open, onOpenChange }: SupplierImportFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<{
        file: File | null;
    }>({
        file: null,
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setFileName(file?.name ?? null);
        setData('file', file);
    };

    const handleClose = (nextOpen: boolean) => {
        if (!nextOpen) {
            reset();
            clearErrors();
            setFileName(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
        onOpenChange(nextOpen);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.file) return;

        post('/supplier/import', {
            forceFormData: true,
            onSuccess: () => handleClose(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Suppliers</DialogTitle>
                    <DialogDescription>
                        Upload a CSV in the standard supplier directory format.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                        Required columns, in order: <strong>SUPPLIER NAME, ADDRESS, EMAIL, CONTACT NO., CONTACT PERSON, POSITION</strong>.
                        Only Supplier Name, Email, Contact No. and Contact Person are imported.
                    </div>

                    <div>
                        <label
                            htmlFor="supplier-import-file"
                            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-input px-4 py-6 text-center hover:bg-muted/50"
                        >
                            <UploadCloud className="size-5 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {fileName ?? 'Click to select a .csv file'}
                            </span>
                        </label>
                        <input
                            ref={fileInputRef}
                            id="supplier-import-file"
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {errors.file && <p className="mt-1 text-xs text-red-600">{errors.file}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!data.file || processing} style={{ backgroundColor: '#612A35' }}>
                            {processing ? 'Importing…' : 'Import'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}