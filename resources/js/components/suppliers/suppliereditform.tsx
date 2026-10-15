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
import { cn } from '@/lib/utils';
import { useNativeValidation } from '@/hooks/useNativeValidation';
import { PATTERNS, MESSAGES } from '@/lib/validation';

interface Supplier {
    supplier_id: number;
    supplier_name: string;
    contact_person: string | null;
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
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    disabled?: boolean;
    pattern?: string;
    title?: string;
}

const labelClass =
    'mb-1 block text-sm font-medium text-foreground';

function Field({
    label,
    name,
    type = 'text',
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
    disabled = false,
    pattern,
    title,
}: FieldProps) {
    return (
        <div>
            <label htmlFor={name} className={labelClass}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>

            <Input
                id={name}
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                pattern={pattern}
                title={title}
                className={cn(error && 'border-red-500')}
            />

            {error && (
                <p className="mt-1 text-[11px] text-red-500 font-medium">
                    {error}
                </p>
            )}
        </div>
    );
}

const emptyForm = {
    supplier_id: 0,
    supplier_name: '',
    contact_person: '',
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
    const setError = (field: string, message: string) => setErrors((prev) => ({ ...prev, [field]: message }));
    const clearErrors = (field: string) => setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    const { handleBlur, handleChange: handleValidationChange } = useNativeValidation(errors, setError, clearErrors);

    useEffect(() => {
        if (supplier) {
            setData({
                supplier_id: supplier.supplier_id,
                supplier_name: supplier.supplier_name,
                contact_person: supplier.contact_person ?? '',
                contact_number: supplier.contact_number ?? '',
                email_address: supplier.email_address ?? '',
                status: supplier.status,
            });
            setErrors({});
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
                    onBlur={handleBlur}
                    onChange={handleValidationChange}
                    noValidate
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
                        label="Contact Person"
                        name="contact_person"
                        value={data.contact_person}
                        onChange={handleChange}
                        error={errors.contact_person}
                    />

                    <Field
                        label="Contact Number"
                        name="contact_number"
                        value={data.contact_number}
                        onChange={handleChange}
                        error={errors.contact_number}
                        pattern={PATTERNS.contactNumber.source}
                        title={MESSAGES.contactNumber}
                    />

                    <Field
                        label="Email Address"
                        name="email_address"
                        type="email"
                        value={data.email_address}
                        onChange={handleChange}
                        error={errors.email_address}
                        pattern={PATTERNS.email.source}
                        title={MESSAGES.email}
                    />

                    <div>
                        <label className={labelClass}>
                            Status <span className="text-red-500">*</span>
                        </label>

                        <Select
                            value={data.status}
                            onValueChange={(value) => {
                                setData({
                                    ...data,
                                    status: value as
                                        | 'active'
                                        | 'inactive',
                                });
                                if (errors.status) clearErrors('status');
                            }}
                        >
                            <SelectTrigger className={cn('w-full', errors.status && 'border-red-500')}>
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
                            <p className="mt-1 text-[11px] text-red-500 font-medium">
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