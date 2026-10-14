import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';

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
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

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
        const fieldName = e.target.name;
        setData({
            ...data,
            [fieldName]: e.target.value,
        });
        if (errors[fieldName]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[fieldName];
                return next;
            });
        }
    };

    const handleSelectChange = (value: string, name: string) => {
        setData({
            ...data,
            [name]: value,
        });
        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
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
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Add Employee File Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Section: Employee Name */}
                    <div>
                        <h3 className={sectionTitleClass}>Employee Name</h3>
                        <div className="grid gap-4 md:grid-cols-3">
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
                                    className={cn(errors.first_name && 'border-red-500')}
                                />
                                {errors.first_name && (
                                    <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.first_name}</p>
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
                                    className={cn(errors.middle_name && 'border-red-500')}
                                />
                                {errors.middle_name && (
                                    <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.middle_name}</p>
                                )}
                            </div>

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
                                    className={cn(errors.last_name && 'border-red-500')}
                                />
                                {errors.last_name && (
                                    <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.last_name}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Assignment Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Assignment Details</h3>
                        <div className="grid gap-4 md:grid-cols-2">
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
                                    className={cn(errors.area && 'border-red-500')}
                                />
                                {errors.area && (
                                    <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.area}</p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="status">
                                    Status <span className="text-red-500">*</span>
                                </label>
                                <Select value={data.status} onValueChange={(value) => handleSelectChange(value, 'status')}>
                                    <SelectTrigger className={cn("w-full", errors.status && "border-red-500")}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && (
                                    <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.status}</p>
                                )}
                            </div>
                        </div>
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
            </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
