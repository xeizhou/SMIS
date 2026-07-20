import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Office {
    office_code: string;
    office_name: string;
    entity_name: string;
    office_head: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    office: Office | null;
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
    office_code: '',
    office_name: '',
    entity_name: '',
    office_head: '',
};

export default function OfficeEditForm({
    open,
    onOpenChange,
    office,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (office) {
            setData({
                office_code: office.office_code,
                office_name: office.office_name,
                entity_name: office.entity_name,
                office_head: office.office_head,
            });
        }
    }, [office]);

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

        router.put(`/offices/${data.office_code}`, data, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Office</DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit}
                    className="mt-4 space-y-4"
                >
                    <Field
                        label="Office Code"
                        name="office_code"
                        value={data.office_code}
                        onChange={handleChange}
                        error={errors.office_code}
                        required
                        disabled
                    />

                    <Field
                        label="Office Name"
                        name="office_name"
                        value={data.office_name}
                        onChange={handleChange}
                        error={errors.office_name}
                        required
                    />

                    <Field
                        label="Entity Name"
                        name="entity_name"
                        value={data.entity_name}
                        onChange={handleChange}
                        error={errors.entity_name}
                    />

                    <Field
                        label="Office Head"
                        name="office_head"
                        value={data.office_head}
                        onChange={handleChange}
                        error={errors.office_head}
                    />

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            style={{
                                backgroundColor: '#612A35',
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