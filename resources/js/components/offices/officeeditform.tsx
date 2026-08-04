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

interface Office {
    office_code: string;
    office_name: string;
    entity_name: string;
    office_head: string;
    email: string;
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
    type?: string;
}

const labelClass = 'mb-1 block text-sm font-medium text-foreground';
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

function Field({
    label,
    name,
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
    disabled = false,
    type = 'text',
}: FieldProps) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>

            <Input
                type={type}
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
    email: '',
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
                email: office.email ?? '',
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
                    <DialogTitle>Edit Office Record — {office?.office_code}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Section: Office Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Office Details</h3>
                        <div className="grid grid-cols-1 gap-4">
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
                        </div>
                    </div>

                    {/* Section: Additional Info */}
                    <div>
                        <h3 className={sectionTitleClass}>Additional Info</h3>
                        <div className="grid grid-cols-1 gap-4">
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

                            <Field
                                label="Email"
                                name="email"
                                type="email"
                                value={data.email}
                                onChange={handleChange}
                                error={errors.email}
                            />
                        </div>
                    </div>

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