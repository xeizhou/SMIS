import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itrPtrs: any[];
}

interface FieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
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

const emptyForm = {
    transaction_no: '',
    pre_repair_no: '',
    from_accountable_officer: '',
    to_accountable_officer: '',
    property_no: '',
    description: '',
    amount: '',
    condition_of_ppe: '',
    location: '',
};

export default function PreRepairAddForm({ open, onOpenChange, itrPtrs }: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        
        if (name === 'transaction_no') {
            const selectedItr = itrPtrs.find((itr) => itr.transaction_no === value);
            if (selectedItr) {
                let condition = selectedItr.condition_of_ppe || '';
                if (condition.toLowerCase() === 'serviceable') condition = 'Serviceable';
                if (condition.toLowerCase() === 'unserviceable') condition = 'Unserviceable';

                setData({
                    ...data,
                    transaction_no: value,
                    property_no: selectedItr.property_no || '',
                    description: selectedItr.description || '',
                    amount: selectedItr.amount ? selectedItr.amount.toString() : '',
                    condition_of_ppe: condition,
                    location: selectedItr.location || '',
                    from_accountable_officer: selectedItr.from_accountable_officer || '',
                    to_accountable_officer: selectedItr.to_accountable_officer || '',
                });
                return;
            }
        }
        
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post('/pre-repair-monitoring', data, {
            onSuccess: () => {
                onOpenChange(false);
                setData(emptyForm);
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Pre-Repair Record</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass}>
                                Transaction No.
                                <span className="text-red-500"> *</span>
                            </label>
                            <select
                                name="transaction_no"
                                value={data.transaction_no}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select Transaction No.</option>
                                {itrPtrs.map((itr) => (
                                    <option key={itr.id} value={itr.transaction_no}>
                                        {itr.transaction_no} - {itr.property_no}
                                    </option>
                                ))}
                            </select>
                            {errors.transaction_no && <p className="mt-1 text-xs text-red-500">{errors.transaction_no}</p>}
                        </div>
                        <Field
                            label="Pre-Repair No."
                            name="pre_repair_no"
                            value={data.pre_repair_no}
                            onChange={handleChange}
                            error={errors.pre_repair_no}
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
                        <div>
                            <label className={labelClass}>
                                Condition of PPE
                                <span className="text-red-500"> *</span>
                            </label>
                            <select
                                name="condition_of_ppe"
                                value={data.condition_of_ppe}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select Condition</option>
                                <option value="Serviceable">Serviceable</option>
                                <option value="Unserviceable">Unserviceable</option>
                            </select>
                            {errors.condition_of_ppe && <p className="mt-1 text-xs text-red-500">{errors.condition_of_ppe}</p>}
                        </div>
                        <Field
                            label="Location"
                            name="location"
                            value={data.location}
                            onChange={handleChange}
                            error={errors.location}
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
                            {processing ? 'Saving...' : 'Save Record'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
