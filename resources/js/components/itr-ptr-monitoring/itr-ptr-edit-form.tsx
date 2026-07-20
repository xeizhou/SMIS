import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ITRPTRMonitoring } from '@/pages/itr-ptr-monitoring/index';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: ITRPTRMonitoring | null;
}

interface FieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    type?: string;
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
    type = 'text',
}: FieldProps) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <Input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function TextareaField({
    label,
    name,
    value,
    onChange,
    error,
    required = false,
    placeholder = '',
}: FieldProps) {
    return (
        <div className="md:col-span-2">
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <Textarea
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export default function ItrPtrEditForm({ open, onOpenChange, item }: Props) {
    const [data, setData] = useState({
        transaction_no: '',
        date_release: '',
        claimed_by: '',
        from_accountable_officer: '',
        to_accountable_officer: '',
        property_no: '',
        description: '',
        amount: '',
        condition_of_ppe: '',
        location: '',
        date_received: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open && item) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrors({});
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setData({
                transaction_no: item.transaction_no || '',
                date_release: item.date_release || '',
                claimed_by: item.claimed_by || '',
                from_accountable_officer: item.from_accountable_officer || '',
                to_accountable_officer: item.to_accountable_officer || '',
                property_no: item.property_no || '',
                description: item.description || '',
                amount: item.amount ? item.amount.toString() : '',
                condition_of_ppe: item.condition_of_ppe || '',
                location: item.location || '',
                date_received: item.date_received || '',
            });
        }
    }, [open, item]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!item) {
            return;
        }

        setProcessing(true);

        router.put(`/itr-ptr-monitoring/${item.id}`, data, {
            onSuccess: () => {
                onOpenChange(false);
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit ITR/PTR Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field
                            label="Transaction No."
                            name="transaction_no"
                            value={data.transaction_no}
                            onChange={handleChange}
                            error={errors.transaction_no}
                            required
                        />
                        <Field
                            label="Date Release"
                            name="date_release"
                            type="date"
                            value={data.date_release}
                            onChange={handleChange}
                            error={errors.date_release}
                            required
                        />

                        <TextareaField
                            label="Description"
                            name="description"
                            value={data.description}
                            onChange={handleChange}
                            error={errors.description}
                            required
                        />

                        <Field
                            label="Property No."
                            name="property_no"
                            value={data.property_no}
                            onChange={handleChange}
                            error={errors.property_no}
                            required
                        />
                        <Field
                            label="Amount"
                            name="amount"
                            type="number"
                            value={data.amount}
                            onChange={handleChange}
                            error={errors.amount}
                            required
                        />
                        <Field
                            label="Claimed By"
                            name="claimed_by"
                            value={data.claimed_by}
                            onChange={handleChange}
                            error={errors.claimed_by}
                            required
                        />
                        <Field
                            label="Condition of PPE"
                            name="condition_of_ppe"
                            value={data.condition_of_ppe}
                            onChange={handleChange}
                            error={errors.condition_of_ppe}
                            required
                        />
                        <Field
                            label="From Accountable Officer"
                            name="from_accountable_officer"
                            value={data.from_accountable_officer}
                            onChange={handleChange}
                            error={errors.from_accountable_officer}
                            required
                        />
                        <Field
                            label="To Accountable Officer"
                            name="to_accountable_officer"
                            value={data.to_accountable_officer}
                            onChange={handleChange}
                            error={errors.to_accountable_officer}
                            required
                        />
                        <Field
                            label="Location"
                            name="location"
                            value={data.location}
                            onChange={handleChange}
                            error={errors.location}
                            required
                        />
                        <Field
                            label="Date Received"
                            name="date_received"
                            type="date"
                            value={data.date_received}
                            onChange={handleChange}
                            error={errors.date_received}
                            required
                        />
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
                            disabled={processing}
                            style={{ backgroundColor: '#612A35' }}
                            className="text-white"
                        >
                            {processing ? 'Updating...' : 'Update Record'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
