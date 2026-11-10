import { Plus, Trash2 } from 'lucide-react';
import DatePicker from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface WmrFields {
    wmr_no: string;
    wmr_date: string;
    supplier_id: string;
    job_order_no: string;
    job_order_date: string;
    vehicle_type: string;
    brand_name: string;
    model: string;
    serial_engine_no: string;
    inspector_name: string;
    inspection_date: string;
    invoice_no: string;
    invoice_date: string;
    property_no: string;
    acquisition_date: string;
    plate_no: string;
    labor_cost: string;
}

export interface WmrItemInput {
    quantity: string;
    unit: string;
    description: string;
}

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
}

interface Props {
    data: WmrFields;
    errors: Record<string, string>;
    suppliers: SupplierOption[];
    items: WmrItemInput[];
    onChange: (field: keyof WmrFields, value: string) => void;
    onItemsChange: (items: WmrItemInput[]) => void;
}

const labelClass = 'mb-1 block';
const inputClass = 'w-full';

// Radix Select doesn't allow an empty-string item value, so use a sentinel for "no supplier".
const NO_SUPPLIER = '__none__';

export default function WmrFormFields({
    data,
    errors,
    suppliers,
    items,
    onChange,
    onItemsChange,
}: Props) {
    const textField = (
        field: keyof WmrFields,
        label: string,
        placeholder = '',
    ) => (
        <div key={field}>
            <Label className={labelClass} htmlFor={`wmr_${field}`}>
                {label}
            </Label>
            <Input
                id={`wmr_${field}`}
                value={data[field]}
                required={field === 'wmr_no'}
                onChange={(event) => onChange(field, event.target.value)}
                placeholder={placeholder}
                className={inputClass}
            />
            {errors[field] && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                    {errors[field]}
                </p>
            )}
        </div>
    );

    const dateField = (
        field: 'wmr_date' | 'job_order_date' | 'inspection_date',
        label: string,
        required = false,
    ) => (
        <DatePicker
            key={field}
            label={label}
            required={required}
            value={data[field]}
            onChange={(value) => onChange(field, value)}
            error={errors[field]}
        />
    );

    return (
        <div className="space-y-8">
            <section>
                <h3 className="mb-4 border-b pb-2 text-sm font-semibold text-foreground">
                    WMR Details
                </h3>
                <div className="grid items-start gap-x-8 gap-y-4 md:grid-cols-2">
                    {textField('wmr_no', 'WMR No. *', 'e.g. 2026100001')}
                    {dateField('wmr_date', 'WMR Date', true)}

                    <div>
                        <Label className={labelClass} htmlFor="wmr_supplier_id">
                            Supplier
                        </Label>
                        <Select
                            value={data.supplier_id || undefined}
                            onValueChange={(value) =>
                                onChange(
                                    'supplier_id',
                                    value === NO_SUPPLIER ? '' : value,
                                )
                            }
                        >
                            <SelectTrigger
                                id="wmr_supplier_id"
                                className="w-full"
                            >
                                <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_SUPPLIER}>
                                    No supplier
                                </SelectItem>
                                {suppliers.map((supplier) => (
                                    <SelectItem
                                        key={supplier.supplier_id}
                                        value={String(supplier.supplier_id)}
                                    >
                                        {supplier.supplier_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.supplier_id && (
                            <p className="mt-1 text-[11px] font-medium text-red-500">
                                {errors.supplier_id}
                            </p>
                        )}
                    </div>
                    {textField('inspector_name', 'Inspector Name')}
                    {dateField('inspection_date', 'Inspection Date')}

                    {textField(
                        'job_order_no',
                        'Job Order No.',
                        'e.g. M0-73-09-2026',
                    )}
                    {dateField('job_order_date', 'Job Order Date')}

                    {textField('brand_name', 'Brand Name', 'e.g. MITSUBISHI')}
                    {textField('model', 'Model', 'e.g. 2009 MONTERO SPORT')}

                    {textField('vehicle_type', 'Vehicle Type', 'e.g. SUV')}
                    {textField('plate_no', 'Plate No.')}

                    {textField('serial_engine_no', 'Serial / Engine No.')}
                    {textField('property_no', 'Property No.')}

                    {textField(
                        'acquisition_date',
                        'Acquisition Date',
                        'Year or date (e.g. 2018)',
                    )}
                    <div>
                        <Label className={labelClass} htmlFor="wmr_labor_cost">
                            Amount
                        </Label>
                        <Input
                            id="wmr_labor_cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={data.labor_cost}
                            onChange={(event) =>
                                onChange('labor_cost', event.target.value)
                            }
                            placeholder="0.00"
                        />
                        {errors.labor_cost && (
                            <p className="mt-1 text-[11px] font-medium text-red-500">
                                {errors.labor_cost}
                            </p>
                        )}
                    </div>

                    {textField('invoice_no', 'Invoice No.')}
                    {textField(
                        'invoice_date',
                        'Invoice Date',
                        'Date or multiple dates',
                    )}
                </div>
            </section>

            <section>
                <div className="mb-4 flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-semibold text-foreground">
                        Defects / Complaints
                    </h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            onItemsChange([
                                ...items,
                                { quantity: '1', unit: 'PC', description: '' },
                            ])
                        }
                    >
                        <Plus className="mr-1 size-4" />
                        Add Item
                    </Button>
                </div>
                {errors.items && (
                    <p className="mb-3 text-sm text-red-500">{errors.items}</p>
                )}
                <Table className="min-w-[760px] border-collapse">
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-16 border px-3 text-center font-medium">
                                Item
                            </TableHead>
                            <TableHead className="w-28 border px-3 font-medium">
                                Quantity
                            </TableHead>
                            <TableHead className="w-28 border px-3 font-medium">
                                Unit
                            </TableHead>
                            <TableHead className="border px-3 font-medium">
                                Description
                            </TableHead>
                            <TableHead className="w-44 border px-3 font-medium">
                                Item Control No.
                            </TableHead>
                            <TableHead
                                className="w-12 border px-2"
                                aria-label="Actions"
                            />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, index) => {
                            const controlNumber = data.wmr_no
                                ? `${data.wmr_no}-${String(index + 1).padStart(2, '0')}`
                                : '—';

                            return (
                                <TableRow key={index}>
                                    <TableCell className="border px-3 text-center align-top">
                                        <div className="flex h-9 items-center justify-center">
                                            {index + 1}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border p-1 align-top">
                                        <Input
                                            aria-label={`Quantity for item ${index + 1}`}
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={item.quantity}
                                            onChange={(event) =>
                                                onItemsChange(
                                                    items.map(
                                                        (row, rowIndex) =>
                                                            rowIndex === index
                                                                ? {
                                                                      ...row,
                                                                      quantity:
                                                                          event
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : row,
                                                    ),
                                                )
                                            }
                                        />
                                        {errors[`items.${index}.quantity`] && (
                                            <p className="px-2 pt-1 text-[11px] text-red-500">
                                                {
                                                    errors[
                                                        `items.${index}.quantity`
                                                    ]
                                                }
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="border p-1 align-top">
                                        <Input
                                            aria-label={`Unit for item ${index + 1}`}
                                            value={item.unit}
                                            onChange={(event) =>
                                                onItemsChange(
                                                    items.map(
                                                        (row, rowIndex) =>
                                                            rowIndex === index
                                                                ? {
                                                                      ...row,
                                                                      unit: event
                                                                          .target
                                                                          .value,
                                                                  }
                                                                : row,
                                                    ),
                                                )
                                            }
                                        />
                                        {errors[`items.${index}.unit`] && (
                                            <p className="px-2 pt-1 text-[11px] text-red-500">
                                                {errors[`items.${index}.unit`]}
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="border p-1 align-top">
                                        <Input
                                            aria-label={`Description for item ${index + 1}`}
                                            value={item.description}
                                            onChange={(event) =>
                                                onItemsChange(
                                                    items.map(
                                                        (row, rowIndex) =>
                                                            rowIndex === index
                                                                ? {
                                                                      ...row,
                                                                      description:
                                                                          event
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : row,
                                                    ),
                                                )
                                            }
                                            placeholder="Defect, complaint, or item"
                                        />
                                        {errors[
                                            `items.${index}.description`
                                        ] && (
                                            <p className="px-2 pt-1 text-[11px] text-red-500">
                                                {
                                                    errors[
                                                        `items.${index}.description`
                                                    ]
                                                }
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="border px-3 align-top text-muted-foreground">
                                        <div className="flex h-9 items-center">
                                            {controlNumber}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border px-1 text-center align-top">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Remove item ${index + 1}`}
                                            disabled={items.length === 1}
                                            onClick={() =>
                                                onItemsChange(
                                                    items.filter(
                                                        (_, rowIndex) =>
                                                            rowIndex !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            <Trash2 className="size-4 text-red-600" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </section>
        </div>
    );
}
