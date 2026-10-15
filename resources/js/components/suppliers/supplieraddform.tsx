import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
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
    pattern?: string;
    title?: string;
}

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
    pattern,
    title,
}: FieldProps) {
    return (
        <div>
            <label htmlFor={name} className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <Input
                id={name}
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
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
    supplier_name: '',
    contact_person: '',
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
    const setError = (field: string, message: string) => setErrors((prev) => ({ ...prev, [field]: message }));
    const clearErrors = (field: string) => setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    const { handleBlur, handleChange: handleValidationChange } = useNativeValidation(errors, setError, clearErrors);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
                        Add Supplier Record
                    </DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit}
                    onBlur={handleBlur}
                    onChange={handleValidationChange}
                    noValidate
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
                        label="Contact Person"
                        name="contact_person"
                        value={data.contact_person}
                        onChange={handleChange}
                        error={errors.contact_person}
                        placeholder="e.g. Juan Dela Cruz"
                    />

                    <Field
                        label="Contact Number"
                        name="contact_number"
                        value={data.contact_number}
                        onChange={handleChange}
                        error={errors.contact_number}
                        placeholder="e.g. 09171234567"
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
                        placeholder="e.g. supplier@email.com"
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
                                    status: value,
                                });
                                if (errors.status) clearErrors('status');
                            }}
                        >
                            <SelectTrigger className={cn('w-full', errors.status && 'border-red-500')}>
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
                            <p className="mt-1 text-[11px] text-red-500 font-medium">
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