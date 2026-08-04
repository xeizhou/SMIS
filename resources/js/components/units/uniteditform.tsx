import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Unit {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unit: Unit | null;
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
    unit_name: '',
    unit_short_name: '',
};

export default function UnitEditForm({
    open,
    onOpenChange,
    unit,
}: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (unit) {
            setData({
                unit_name: unit.unit_name,
                unit_short_name: unit.unit_short_name,
            });
            setErrors({});
        }
    }, [unit]);

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

        if (!unit) {
return;
}

        router.put(`/units/${unit.unitID}`, data, {
            onSuccess: () => {
                onOpenChange(false);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    if (!unit) {
return null;
}

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Unit Record — {unit?.unitID}</DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit}
                    className="mt-4 space-y-8"
                >
                    {/* Section: Unit Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Unit Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label="Unit Name"
                                name="unit_name"
                                value={data.unit_name}
                                onChange={handleChange}
                                error={errors.unit_name}
                                required
                                placeholder="e.g. Piece"
                            />
                            <Field
                                label="Short Name"
                                name="unit_short_name"
                                value={data.unit_short_name}
                                onChange={handleChange}
                                error={errors.unit_short_name}
                                required
                                placeholder="e.g. pc"
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
                            style={{ backgroundColor: '#612A35' }}
                        >
                            Update Unit
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}