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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const emptyForm: Record<string, string> = {
    last_name: '',
    first_name: '',
    middle_name: '',
    area: '',
    status: '',
};

const labelClass = 'mb-1 block text-sm font-medium text-foreground';

export default function EmployeeFileAddForm({ open, onOpenChange }: Props) {
    const [data, setData] = useState<Record<string, string>>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) {
            setData(emptyForm);
            setErrors({});
        }
    }, [open]);

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

        router.post('/employee-file-locator', data, {
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
                    <DialogTitle>Add Employee File Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass} htmlFor="last_name">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="last_name"
                                name="last_name"
                                value={data.last_name}
                                onChange={handleChange}
                                placeholder="Enter last name"
                            />
                            {errors.last_name && (
                                <p className="mt-1 text-xs text-red-500">{errors.last_name}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="first_name">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="first_name"
                                name="first_name"
                                value={data.first_name}
                                onChange={handleChange}
                                placeholder="Enter first name"
                            />
                            {errors.first_name && (
                                <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="middle_name">
                                Middle Name
                            </label>
                            <Input
                                id="middle_name"
                                name="middle_name"
                                value={data.middle_name}
                                onChange={handleChange}
                                placeholder="Enter middle name"
                            />
                            {errors.middle_name && (
                                <p className="mt-1 text-xs text-red-500">{errors.middle_name}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass} htmlFor="area">
                                Area <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="area"
                                name="area"
                                value={data.area}
                                onChange={handleChange}
                                placeholder="Enter area"
                            />
                            {errors.area && (
                                <p className="mt-1 text-xs text-red-500">{errors.area}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="status">
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
                            Save Record
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
