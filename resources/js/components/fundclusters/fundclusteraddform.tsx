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

const labelClass = 'mb-1 block text-sm font-medium text-foreground';

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
    fund_cluster_id: '',
    fund_description: '',
};

export default function FundClusterAddForm({
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
                    />
                    <Field
                        label="Fund Description"
                        name="fund_description"
                        value={data.fund_description}
                        onChange={handleChange}
                        error={errors.fund_description}
                        required
                        placeholder="e.g. General Fund"
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
