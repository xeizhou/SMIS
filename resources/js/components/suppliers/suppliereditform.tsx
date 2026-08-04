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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
    contact_number: string | null;
    email_address: string | null;
    status: 'active' | 'inactive';
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: Supplier | null;
}

interface FieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    disabled?: boolean;
}

const labelClass =
    'mb-1 block text-sm font-medium text-foreground';

function Field({
    label,
    name,
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
    disabled = false,
}: FieldProps) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>

            <Input
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
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
    supplier_id: 0,
    supplier_name: '',
    contact_number: '',
    email_address: '',
    status: 'active' as 'active' | 'inactive',
};

export default function SupplierEditForm({
    open,
    onOpenChange,
    supplier,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (supplier) {
            setData({
                supplier_id: supplier.supplier_id,
                supplier_name: supplier.supplier_name,
                contact_number: supplier.contact_number ?? '',
                email_address: supplier.email_address ?? '',
                status: supplier.status,
            });
        }
    }, [supplier]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        router.put(`/supplier/${data.supplier_id}`, data, {
            preserveScroll: true,

            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },

            onError: (errors) => {
                setErrors(errors);
            },
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Supplier Record — {supplier?.supplier_id}</DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit}
                    className="mt-4 space-y-4"
                >
                    <Field
                        label="Supplier ID"
                        name="supplier_id"
                        value={String(data.supplier_id)}
                        onChange={handleChange}
                        disabled
                    />

                    <Field
                        label="Supplier Name"
                        name="supplier_name"
                        value={data.supplier_name}
                        onChange={handleChange}
                        error={errors.supplier_name}
                        required
                    />

                    <Field
                        label="Contact Number"
                        name="contact_number"
                        value={data.contact_number}
                        onChange={handleChange}
                        error={errors.contact_number}
                    />

                    <Field
                        label="Email Address"
                        name="email_address"
                        value={data.email_address}
                        onChange={handleChange}
                        error={errors.email_address}
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
                                    status: value as
                                        | 'active'
                                        | 'inactive',
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
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

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                onOpenChange(false)
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            style={{
                                backgroundColor:
                                    '#612A35',
                            }}
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}