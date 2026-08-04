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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preRepairs: any[];
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
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

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
    remarks: '',
    location: '',
};

export default function ForDisposalAddForm({ open, onOpenChange, preRepairs }: Props) {
    const [data, setData] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        
        if (name === 'pre_repair_no') {
            const selectedPre = preRepairs.find((pre) => pre.pre_repair_no === value);
            if (selectedPre) {
                let condition = selectedPre.condition_of_ppe || '';
                if (condition.toLowerCase() === 'serviceable') condition = 'Serviceable';
                if (condition.toLowerCase() === 'unserviceable') condition = 'Unserviceable';

                setData({
                    ...data,
                    pre_repair_no: value,
                    transaction_no: selectedPre.transaction_no || '',
                    property_no: selectedPre.property_no || '',
                    description: selectedPre.description || '',
                    amount: selectedPre.amount ? selectedPre.amount.toString() : '',
                    condition_of_ppe: condition,
                    remarks: selectedPre.remarks || '',
                    location: selectedPre.location || '',
                    from_accountable_officer: selectedPre.from_accountable_officer || '',
                    to_accountable_officer: selectedPre.to_accountable_officer || '',
                });
                return;
            }
        }
        
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        if (name === 'pre_repair_no') {
            const selectedPre = preRepairs.find((pre) => pre.pre_repair_no === value);
            if (selectedPre) {
                let condition = selectedPre.condition_of_ppe || '';
                if (condition.toLowerCase() === 'serviceable') condition = 'Serviceable';
                if (condition.toLowerCase() === 'unserviceable') condition = 'Unserviceable';

                setData({
                    ...data,
                    pre_repair_no: value,
                    transaction_no: selectedPre.transaction_no || '',
                    property_no: selectedPre.property_no || '',
                    description: selectedPre.description || '',
                    amount: selectedPre.amount ? selectedPre.amount.toString() : '',
                    condition_of_ppe: condition,
                    remarks: selectedPre.remarks || '',
                    location: selectedPre.location || '',
                    from_accountable_officer: selectedPre.from_accountable_officer || '',
                    to_accountable_officer: selectedPre.to_accountable_officer || '',
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

        router.post('/for-disposal-monitoring', data, {
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
                className="w-[95vw] max-h-[95vh] p-0 overflow-hidden"
                style={{ maxWidth: '1200px' }}
            >
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Add For Disposal Record</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                            {/* Section: General Information */}
                            <div>
                                <h3 className={sectionTitleClass}>General Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Field
                                label="Transaction No."
                                name="transaction_no"
                                value={data.transaction_no}
                                onChange={handleChange}
                                error={errors.transaction_no}
                                required
                            />
                            <div>
                                <label className={labelClass}>
                                    Pre-Repair No.
                                    <span className="text-red-500"> *</span>
                                </label>
                                <Select value={data.pre_repair_no} onValueChange={handleSelectChange('pre_repair_no')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Pre-Repair No." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {preRepairs.map((pre) => (
                                            <SelectItem key={pre.pre_repair_no} value={pre.pre_repair_no}>
                                                {pre.pre_repair_no} - {pre.property_no}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.pre_repair_no && <p className="mt-1 text-xs text-red-500">{errors.pre_repair_no}</p>}
                            </div>
                            <Field
                                label="Property No."
                                name="property_no"
                                value={data.property_no}
                                onChange={handleChange}
                                error={errors.property_no}
                                required
                            />
                            <div className="md:col-span-3">
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
                        <h3 className={sectionTitleClass}>Assessment & Location</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                    <span className="text-red-500"> *</span>
                                </label>
                                <Select value={data.condition_of_ppe} onValueChange={handleSelectChange('condition_of_ppe')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Condition" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Serviceable">Serviceable</SelectItem>
                                        <SelectItem value="Unserviceable">Unserviceable</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.condition_of_ppe && <p className="mt-1 text-xs text-red-500">{errors.condition_of_ppe}</p>}
                            </div>
                            
                            {data.condition_of_ppe === 'Unserviceable' && (
                                <div className="md:col-span-3">
                                    <TextareaField
                                        label="Remarks / Findings"
                                        name="remarks"
                                        value={data.remarks}
                                        onChange={handleChange}
                                        error={errors.remarks}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: Accountability */}
                    <div>
                        <h3 className={sectionTitleClass}>Accountability</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="mt-8 flex justify-end gap-3">
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
