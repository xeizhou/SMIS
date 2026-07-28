import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmployeeFileRecord {
    efr_id: number;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    area: string;
    status: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: EmployeeFileRecord | null;
}

const emptyForm: Record<string, string> = {
    last_name: '',
    first_name: '',
    middle_name: '',
    area: '',
    status: 'Active',
};

const labelClass = 'mb-1 block text-sm font-medium text-foreground';

export default function EmployeeFileEditForm({ open, onOpenChange, record }: Props) {
    const [data, setData] = useState<Record<string, string>>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (record) {
            setData({
                last_name: record.last_name,
                first_name: record.first_name,
                middle_name: record.middle_name ?? '',
                area: record.area,
                status: record.status,
            });
            setErrors({});
        }
    }, [record]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!record) {
            return;
        }

        router.put(`/employee-file-locator/${record.efr_id}`, data, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Employee File Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass} htmlFor="edit_last_name">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="edit_last_name"
                                name="last_name"
                                value={data.last_name}
                                onChange={handleChange}
                            />
                            {errors.last_name && (
                                <p className="mt-1 text-xs text-red-500">{errors.last_name}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="edit_first_name">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="edit_first_name"
                                name="first_name"
                                value={data.first_name}
                                onChange={handleChange}
                            />
                            {errors.first_name && (
                                <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="edit_middle_name">
                                Middle Name
                            </label>
                            <Input
                                id="edit_middle_name"
                                name="middle_name"
                                value={data.middle_name}
                                onChange={handleChange}
                            />
                            {errors.middle_name && (
                                <p className="mt-1 text-xs text-red-500">{errors.middle_name}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="edit_area">
                                Area <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="edit_area"
                                name="area"
                                value={data.area}
                                onChange={handleChange}
                            />
                            {errors.area && (
                                <p className="mt-1 text-xs text-red-500">{errors.area}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="edit_status">
                            Status <span className="text-red-500">*</span>
                        </label>
                        <Select value={data.status} onValueChange={(value) => handleSelectChange(value, 'status')}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.status && (
                            <p className="mt-1 text-xs text-red-500">{errors.status}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" style={{ backgroundColor: '#612A35' }}>
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
