import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface UserOption {
    id: number;
    name: string;
}

interface OfficeOption {
    office_code: string;
    office_name: string;
}

interface ClearanceRecord {
    clearance_id: number;
    name: string;
    office: string | OfficeOption;
    claim_date: string;
    received_by: string;
    status: string;
    cleared: boolean | string;
    pending: boolean | string;
    remarks: string | null;
    checker?: UserOption | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: ClearanceRecord | null;
}

export default function ClearanceProcessModal({ open, onOpenChange, record }: Props) {
    const { data, setData, patch, processing, errors, reset, clearErrors } = useForm({
        cleared: false,
        claimed: false,
    });

    useEffect(() => {
        if (record && open) {
            clearErrors();
            setData({
                cleared: record.cleared === true || record.cleared === 'true' || record.cleared === '1',
                claimed: !!record.claim_date,
            });
        }
    }, [record, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!record) return;

        patch(`/clearance/${record.clearance_id}/process`, {
            onSuccess: () => {
                onOpenChange(false);
                reset();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Process Clearance</DialogTitle>
                    <DialogDescription>
                        Update the clearance and claiming status for this record.
                    </DialogDescription>
                </DialogHeader>

                {record && (
                    <div className="mt-4 rounded-md border p-4 bg-muted/30">
                        <p className="text-sm font-medium">Name: <span className="font-normal text-muted-foreground">{record.name}</span></p>
                        <p className="text-sm font-medium mt-1">Office: <span className="font-normal text-muted-foreground">{typeof record.office === 'string' ? record.office : (record.office as OfficeOption)?.office_name}</span></p>
                        {record.checker && (
                            <p className="text-sm font-medium mt-1">Claimed By: <span className="font-normal text-muted-foreground">{record.checker.name}</span></p>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold">Cleared</Label>
                            <p className="text-sm text-muted-foreground">
                                Has the clearance been successfully processed?
                            </p>
                            {errors.cleared && <p className="text-xs text-red-500 mt-1">{errors.cleared}</p>}
                        </div>
                        <Switch
                            checked={data.cleared}
                            onCheckedChange={(val) => {
                                setData('cleared', val);
                                if (!val) setData('claimed', false);
                            }}
                        />
                    </div>

                    <div className={`flex items-center justify-between rounded-lg border p-4 transition-opacity ${!data.cleared ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold">Claimed</Label>
                            <p className="text-sm text-muted-foreground">
                                Has the requester claimed their clearance?
                            </p>
                            {errors.claimed && <p className="text-xs text-red-500 mt-1">{errors.claimed}</p>}
                        </div>
                        <Switch
                            checked={data.claimed}
                            onCheckedChange={(val) => setData('claimed', val)}
                            disabled={!data.cleared}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} style={{ backgroundColor: '#612A35' }}>
                            {processing ? 'Saving...' : 'Save Updates'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
