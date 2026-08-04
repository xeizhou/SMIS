import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OfficeOption {
    office_code: string;
    office_name: string;
}

interface ClearanceRecord {
    clearance_id: number;
    name: string;
    office: string;
    claim_date: string;
    received_by: string;
    status: string;
    cleared: boolean | string;
    pending: boolean | string;
    remarks: string | null;
    office_data?: OfficeOption | null;
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

export default function ClearanceEditForm({ open, onOpenChange, record, offices }: Props) {
    const [data, setData] = useState<Record<string, string>>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (record) {
            setData({
                name: record.name,
                office: record.office,
                claim_date: record.claim_date,
                received_by: record.received_by,
                status: record.status,
                cleared: record.cleared === true || record.cleared === 'true' || record.cleared === 1 || record.cleared === '1' ? 'true' : 'false',
                pending: record.pending === true || record.pending === 'true' || record.pending === 1 || record.pending === '1' ? 'true' : 'false',
                remarks: record.remarks ?? '',
            });
            setErrors({});
        }
    }, [record]);

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

        const payload = {
            ...data,
            cleared: data.cleared === 'true',
            pending: data.pending === 'true',
        };

        router.put(`/clearance/${record.clearance_id}`, payload, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    return (
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

                            <div>
                                <label className={labelClass} htmlFor="edit_office">Office <span className="text-red-500">*</span></label>
                                <Select value={data.office} onValueChange={(value) => handleSelectChange(value, 'office')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select office" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {offices.map((office) => (
                                            <SelectItem key={office.office_code} value={office.office_code}>{office.office_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.office && <p className="mt-1 text-xs text-red-500">{errors.office}</p>}
                            </div>

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

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" style={{ backgroundColor: '#612A35' }}>Save Changes</Button>
                    </div>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
