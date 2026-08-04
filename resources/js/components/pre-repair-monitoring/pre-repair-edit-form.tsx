import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PreRepairMonitoring } from '@/pages/pre-repair-monitoring/index';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: PreRepairMonitoring | null;
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

export default function PreRepairEditForm({ open, onOpenChange, item, itrPtrs }: Props) {
    const [data, setData] = useState({
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
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        if (open && item) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrors({});
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setData({
                transaction_no: item.transaction_no || '',
                pre_repair_no: item.pre_repair_no || '',
                from_accountable_officer: item.from_accountable_officer || '',
                to_accountable_officer: item.to_accountable_officer || '',
                property_no: item.property_no || '',
                description: item.description || '',
                amount: item.amount ? item.amount.toString() : '',
                condition_of_ppe: item.condition_of_ppe || '',
                remarks: item.remarks || '',
                location: item.location || '',
            });
        }
    }, [open, item]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!item) {
            return;
        }

        // ALWAYS show modal since all fields cascade
        if (e) {
            setShowConfirmModal(true);
            return;
        }

        setProcessing(true);

        router.put(`/pre-repair-monitoring/${item.id}`, data, {
            onSuccess: () => {
                onOpenChange(false);
            },
            onError: (errors) => setErrors(errors),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1000px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                <DialogHeader>
                    <DialogTitle>Edit Pre-Repair Record — {item?.id}, {item?.transaction_no}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-8">
                    {/* Section: General Information */}
                    <div>
                        <h3 className={sectionTitleClass}>General Information</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Field
                                label="Transaction No."
                                name="transaction_no"
                                value={data.transaction_no}
                                onChange={handleChange}
                                error={errors.transaction_no}
                                required
                            />
                            <Field
                                label="Pre-Repair No."
                                name="pre_repair_no"
                                value={data.pre_repair_no}
                                onChange={handleChange}
                                error={errors.pre_repair_no}
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
                                    <span className="text-red-500"> *</span>
                                </label>
                                <Select value={data.condition_of_ppe} onValueChange={(val) => setData({ ...data, condition_of_ppe: val })}>
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
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                            {processing ? 'Updating...' : 'Update Record'}
                        </Button>
                    </div>
                </form>
            </div>
                </ScrollArea>
            </DialogContent>
            
            {/* Confirmation Modal */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Update</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-sm text-foreground">
                        <p className="font-semibold text-red-600">Warning:</p>
                        {item && (data.transaction_no !== item.transaction_no || data.pre_repair_no !== item.pre_repair_no || data.property_no !== item.property_no) ? (
                            <p>Changing the <strong>Transaction No.</strong>, <strong>Pre-Repair No.</strong> or <strong>Property No.</strong> will also modify all linked records in For Disposal.</p>
                        ) : (
                            <p>Updating this record will also modify the linked record in For Disposal.</p>
                        )}
                        <p className="mt-2">Are you sure you want to proceed with this change?</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowConfirmModal(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setShowConfirmModal(false);
                                handleSubmit();
                            }}
                            disabled={processing}
                            style={{ backgroundColor: '#612A35' }}
                            className="text-white"
                        >
                            {processing ? 'Updating...' : 'Yes, Proceed'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
