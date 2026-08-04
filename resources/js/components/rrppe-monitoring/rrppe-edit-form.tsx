import { RefreshCw } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { RRPPEMonitoring } from '@/pages/rrppe-monitoring/index';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: RRPPEMonitoring | null;
}

interface FieldProps {
    label: string;
    name: string;
    value: string | number;
    onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
                value={value as string}
                onChange={onChange}
                placeholder={placeholder}
            />

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    options: { value: string; label: string }[];
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

function SelectField({
    label,
    value,
    onChange,
    error,
    required = false,
    placeholder = 'Select...',
    options,
    onRefresh,
    isRefreshing = false,
}: SelectFieldProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-foreground">
                    {label}
                    {required && <span className="text-red-500"> *</span>}
                </label>
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className={`text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={`Refresh ${label} list`}
                    >
                        <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>

            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>

                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export default function RrppeEditForm({ open, onOpenChange, item }: Props) {

    const [refreshingField, setRefreshingField] = useState<string | null>(null);

    const handleRefreshData = (field: string) => {
        setRefreshingField(field);
        router.reload({
            only: [],
            onFinish: () => setRefreshingField(null),
        });
    };
    const [data, setData] = useState({
        rrppe_no: '',
        date_received: '',
        item_description: '',
        quantity: '1',
        property_no: '',
        end_user_name: '',
        cost: '',
        status: '',
        area: '',
        remarks: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open && item) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrors({});
             
            setData({
                rrppe_no: item.rrppe_no || '',
                date_received: item.date_received || '',
                item_description: item.item_description || '',
                quantity: item.quantity ? item.quantity.toString() : '1',
                property_no: item.property_no || '',
                end_user_name: item.end_user_name || '',
                cost: item.cost ? item.cost.toString() : '',
                status: item.status || '',
                area: item.area || '',
                remarks: item.remarks || '',
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

    const handleSelectChange = (name: string) => (value: string) => {
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!item) {
            return;
        }

        setProcessing(true);

        router.put(`/rrppe-monitoring/${item.id}`, data, {
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
                    <DialogTitle>Edit RRPPE Record — {item?.id}, {item?.rrppe_no}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                    {/* Section: General Information */}
                    <div>
                        <h3 className={sectionTitleClass}>General Information</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Field
                                label="RRPPE No."
                                name="rrppe_no"
                                value={data.rrppe_no}
                                onChange={handleChange}
                                error={errors.rrppe_no}
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
                            <div className="md:col-span-3">
                                <Field
                                    label="Item Description"
                                    name="item_description"
                                    value={data.item_description}
                                    onChange={handleChange}
                                    error={errors.item_description}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Asset Details */}
                    <div>
                        <h3 className={sectionTitleClass}>Asset Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Field
                                label="Quantity"
                                name="quantity"
                                type="number"
                                value={data.quantity}
                                onChange={handleChange}
                                error={errors.quantity}
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
                                label="Cost"
                                name="cost"
                                type="number"
                                value={data.cost}
                                onChange={handleChange}
                                error={errors.cost}
                            />
                        </div>
                    </div>

                    {/* Section: Assignment & Status */}
                    <div>
                        <h3 className={sectionTitleClass}>Assignment & Status</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Field
                                label="End User Name"
                                name="end_user_name"
                                value={data.end_user_name}
                                onChange={handleChange}
                                error={errors.end_user_name}
                            />
                            <Field
                                label="Area"
                                name="area"
                                value={data.area}
                                onChange={handleChange}
                                error={errors.area}
                            />
                            <SelectField
                                label="Status"
                                value={data.status}
                                onChange={handleSelectChange('status')}
                                error={errors.status}
                                options={[
                                    { value: 'SERVICEABLE', label: 'SERVICEABLE' },
                                    {
                                        value: 'UNSERVICEABLE',
                                        label: 'UNSERVICEABLE',
                                    },
                                ]}
                            />
                            <div className="md:col-span-3">
                                <Field
                                    label="Remarks"
                                    name="remarks"
                                    value={data.remarks}
                                    onChange={handleChange}
                                    error={errors.remarks}
                                />
                            </div>
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
        </Dialog>
    );
}
