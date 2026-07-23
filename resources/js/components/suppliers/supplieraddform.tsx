import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface FieldProps {
    label: string;
    name: string;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
}

const inputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const labelClass =
    "mb-1 block text-sm font-medium text-foreground";

function Field({
    label,
    name,
    type = "text",
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
}: FieldProps) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={inputClass}
            />

            {error && (
                <p className="mt-1 text-xs text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}

const emptyForm = {
    supplier_name: '',
    contact_number: '',
    email_address: '',
    status: '',
};

export default function SupplierForm({
    open,
    onOpenChange,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement
        >
    ) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        router.post('/supplier', data, {
            onSuccess: () => {
                onOpenChange(false);
                setData(emptyForm);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        New Supplier
                    </DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit}
                    className="mt-4 space-y-4"
                >
                    <Field
                        label="Supplier Name"
                        name="supplier_name"
                        value={data.supplier_name}
                        onChange={handleChange}
                        error={errors.supplier_name}
                        required
                        placeholder="e.g. ABC Trading"
                    />

                    <Field
                        label="Contact Number"
                        name="contact_number"
                        value={data.contact_number}
                        onChange={handleChange}
                        error={errors.contact_number}
                        placeholder="e.g. 09171234567"
                    />

                    <Field
                        label="Email Address"
                        name="email_address"
                        type="email"
                        value={data.email_address}
                        onChange={handleChange}
                        error={errors.email_address}
                        placeholder="e.g. supplier@email.com"
                    />
                    <div>
                        <label className={labelClass}>
                            Status
                        </label>

                        <Select
                            value={data.status}
                            onValueChange={(value) =>
                                setData({
                                    ...data,
                                    status: value,
                                })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="-- Select Status --" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="active">
                                    Active
                                </SelectItem>

                                <SelectItem value="inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {errors.status && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.status}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                onOpenChange(false)
                            }
                        >
                            Cancel
                        </Button>

                        <Button type="submit"  
                        style={{
                            backgroundColor: '#612A35',
                        }}>
                            Save Supplier
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}