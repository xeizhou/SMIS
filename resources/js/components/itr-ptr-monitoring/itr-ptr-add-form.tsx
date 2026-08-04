import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
}

interface FieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    type?: string;
}

const labelClass = 'mb-1 block text-sm font-medium text-foreground';
const sectionTitleClass =
    'text-sm font-semibold text-foreground border-b pb-2 mb-4';

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
};

export default function ItrPtrAddForm({ open, onOpenChange }: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post('/itr-ptr-monitoring', data, {
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
            <DialogContent
                className="max-h-[90vh] w-[95vw] overflow-hidden p-0"
                style={{ maxWidth: '1000px' }}
            >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Add ITR/PTR Record</DialogTitle>
                        </DialogHeader>

                        <form
                            onSubmit={handleSubmit}
                            className="mt-4 space-y-8"
                        >
                            {/* Section: General Information */}
                            <div>
                                <h3 className={sectionTitleClass}>
                                    General Information
                                </h3>
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
                                        label="Property No."
                                        name="property_no"
                                        value={data.property_no}
                                        onChange={handleChange}
                                        error={errors.property_no}
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
                                    <Field
                                        label="Date Received"
                                        name="date_received"
                                        type="date"
                                        value={data.date_received}
                                        onChange={handleChange}
                                        error={errors.date_received}
                                        required
                                    />
                                    <div className="md:col-span-2">
                                        <TextareaField
                                            label="Description"
                                            name="description"
                                            value={data.description}
                                            onChange={handleChange}
                                            error={errors.description}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Assessment & Location */}
                            <div>
                                <h3 className={sectionTitleClass}>
                                    Assessment & Location
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <Field
                                        label="Location"
                                        name="location"
                                        value={data.location}
                                        onChange={handleChange}
                                        error={errors.location}
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
                                            <span className="text-red-500">
                                                {' '}
                                                *
                                            </span>
                                        </label>
                                        
                                        <Select
                                            value={data.condition_of_ppe}
                                            onValueChange={(val) =>
                                                setData({
                                                    ...data,
                                                    condition_of_ppe: val,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select Condition" />
                                                
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Serviceable">
                                                    Serviceable
                                                </SelectItem>
                                                <SelectItem value="Unserviceable">
                                                    Unserviceable
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.condition_of_ppe && (
                                            <p className="mt-1 text-xs text-red-500">
                                                {errors.condition_of_ppe}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section: Accountability */}
                            <div>
                                <h3 className={sectionTitleClass}>
                                    Accountability
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <Field
                                        label="Claimed By"
                                        name="claimed_by"
                                        value={data.claimed_by}
                                        onChange={handleChange}
                                        error={errors.claimed_by}
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
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
