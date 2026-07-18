import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
}: FieldProps) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <Input
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
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
};

export default function OfficeAddForm({
    open,
    onOpenChange,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

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

        router.post('/offices', data, {
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
                        New Office
                    </DialogTitle>
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
                        placeholder="e.g. ICT"
                    />

                    <Field
                        label="Office Name"
                        name="office_name"
                        value={data.office_name}
                        onChange={handleChange}
                        error={errors.office_name}
                        required
                        placeholder="e.g. Information and Communications Technology Office"
                    />

                    <Field
                        label="Entity Name"
                        name="entity_name"
                        value={data.entity_name}
                        onChange={handleChange}
                        error={errors.entity_name}
                        placeholder="e.g. University of Southeastern Philippines"
                    />

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>

                        <Button type="submit"                         
                        style={{
                            backgroundColor: '#612A35',
                        }}>
                            Save Office
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}