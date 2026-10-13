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
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    pattern?: string;
    title?: string;
}

const labelClass = 'mb-1 block text-sm font-medium text-foreground';

function Field({
    label,
    name,
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
    fund_cluster_id: '',
    fund_description: '',
};

export default function FundClusterAddForm({
    open,
    onOpenChange,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const setError = (field: string, message: string) => setErrors((prev) => ({ ...prev, [field]: message }));
    const clearErrors = (field: string) => setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    const { handleBlur, handleChange: handleValidationChange } = useNativeValidation(errors, setError, clearErrors);

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
        router.post('/fund-clusters', data, {
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
                        Add Fund Cluster Record
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
                        label="Fund Cluster ID"
                        name="fund_cluster_id"
                        value={data.fund_cluster_id}
                        onChange={handleChange}
                        error={errors.fund_cluster_id}
                        required
                        placeholder="e.g. 101"
                        pattern={PATTERNS.numbersOnly.source}
                        title={MESSAGES.numbersOnly}
                    />
                    <Field
                        label="Fund Description"
                        name="fund_description"
                        value={data.fund_description}
                        onChange={handleChange}
                        error={errors.fund_description}
                        required
                        placeholder="e.g. General Fund"
                        pattern={PATTERNS.fundDescription.source}
                        title={MESSAGES.fundDescription}
                    />

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            style={{ backgroundColor: '#612A35' }}
                        >
                            Save Fund Cluster
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
