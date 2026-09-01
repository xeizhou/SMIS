import { router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
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
}

interface BonaVidaRecord {
    bvm_id: number;
    date_received: string;
    office_code: string;
    qty: number;
    price: string;
    total_amount: string;
    invoice_no: string;
    invoice_date: string;
    remarks: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: BonaVidaRecord | null;
    offices: Office[];
}

interface DefaultFormState {
    date_received: string;
    invoice_no: string;
    invoice_date: string;
    price: string;
}

interface RowState {
    id: string; // for react key
    bvm_id?: number; // actual DB ID, if it exists
    office_code: string;
    qty: string;
    price: string;
    total_amount: string;
    remarks: string;
}

const emptyDefaults: DefaultFormState = {
    date_received: '',
    invoice_no: '',
    invoice_date: '',
    price: '',
};

const createEmptyRow = (): RowState => ({
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    office_code: '',
    qty: '',
    price: '',
    total_amount: '',
    remarks: '',
});

const labelClass = 'mb-1 block text-sm font-medium text-foreground';
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-4';

// Custom Searchable Dropdown for Office
interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
    options: { value: string; label: string }[];
}

function SearchableSelect({
    value,
    onChange,
    error,
    placeholder = 'Search...',
    options,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        'w-full justify-between font-normal px-3',
                        !selectedLabel && 'text-muted-foreground',
                        error && 'border-red-500'
                    )}
                >
                    <span className="truncate max-w-[150px]">{selectedLabel || placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                    <CommandInput placeholder={placeholder} />
                    <CommandList style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <CommandEmpty>No office found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
                                <CommandItem
                                    key={opt.value}
                                    value={opt.label}
                                    onSelect={() => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === opt.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    {opt.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function BonaVidaEditForm({ open, onOpenChange, record, offices }: Props) {
    const [defaults, setDefaults] = useState<DefaultFormState>(emptyDefaults);
    const [rows, setRows] = useState<RowState[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && record) {
            setIsLoading(true);
            setErrors({});
            // Fetch all records with the same invoice_no
            fetch(`/bona-vida-monitoring/by-invoice/${record.invoice_no}`)
                .then(response => response.json())
                .then((fetchedRecords: BonaVidaRecord[]) => {
                    if (fetchedRecords.length > 0) {
                        const first = fetchedRecords[0];
                        setDefaults({
                            date_received: first.date_received ? first.date_received.split('T')[0] : '',
                            invoice_no: first.invoice_no,
                            invoice_date: first.invoice_date ? first.invoice_date.split('T')[0] : '',
                            price: first.price,
                        });

                        setRows(fetchedRecords.map(r => ({
                            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
                            bvm_id: r.bvm_id,
                            office_code: r.office_code,
                            qty: r.qty.toString(),
                            price: r.price,
                            total_amount: r.total_amount,
                            remarks: r.remarks || '',
                        })));
                    } else {
                        // Fallback if none returned
                        setRows([createEmptyRow()]);
                    }
                })
                .catch((err: Error) => {
                    console.error('Failed to load related records:', err);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else if (!open) {
            setDefaults(emptyDefaults);
            setRows([]);
            setErrors({});
            setIsSubmitting(false);
        }
    }, [open, record]);

    // Recalculate totals when defaults.price or row qty/price changes
    useEffect(() => {
        if (isLoading) return; // don't overwrite during load
        
        setRows((prevRows) =>
            prevRows.map((row) => {
                const qty = parseFloat(row.qty) || 0;
                const effectivePrice = parseFloat(row.price !== '' ? row.price : defaults.price) || 0;
                
                if (qty > 0 && effectivePrice > 0) {
                    const newTotal = (qty * effectivePrice).toFixed(2);
                    if (row.total_amount !== newTotal) {
                        return { ...row, total_amount: newTotal };
                    }
                } else if (row.total_amount !== '') {
                    return { ...row, total_amount: '' };
                }
                return row;
            })
        );
    }, [defaults.price, JSON.stringify(rows.map(r => ({ q: r.qty, p: r.price })))]);

    const handleDefaultChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDefaults({
            ...defaults,
            [e.target.name]: e.target.value,
        });
    };

    const handleRowChange = (index: number, field: keyof RowState, value: string) => {
        setRows((prev) => {
            const newRows = [...prev];
            newRows[index] = { ...newRows[index], [field]: value };
            return newRows;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: string) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const nextIndex = e.key === 'ArrowDown' ? index + 1 : index - 1;
            const nextInput = document.getElementById(`edit-${field}-${nextIndex}`);
            if (nextInput) {
                nextInput.focus();
            }
        }
    };

    const addRow = () => {
        setRows((prev) => [...prev, createEmptyRow()]);
    };

    const removeRow = (index: number) => {
        setRows((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!record) return;

        setIsSubmitting(true);
        setErrors({});

        // Filter out empty rows (where office and qty are empty)
        const validRows = rows.filter(row => row.office_code !== '' || row.qty !== '');

        if (validRows.length === 0) {
            setErrors({ general: 'Please fill in at least one row.' });
            setIsSubmitting(false);
            return;
        }

        // Format data for bulk update
        const dataToSubmit = {
            records: validRows.map(row => ({
                bvm_id: row.bvm_id || null, // null for new rows
                date_received: defaults.date_received,
                invoice_no: defaults.invoice_no,
                invoice_date: defaults.invoice_date,
                office_code: row.office_code,
                qty: row.qty,
                price: row.price !== '' ? row.price : defaults.price,
                total_amount: row.total_amount,
                remarks: row.remarks,
            }))
        };

        // Note: passing the original invoice_no so backend can scope deletes properly
        router.put(`/bona-vida-monitoring/bulk/${record.invoice_no}`, dataToSubmit, {
            onSuccess: () => {
                onOpenChange(false);
            },
            onError: (errs) => {
                setErrors(errs);
                setIsSubmitting(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-[95vw]" style={{ maxWidth: '1200px' }}>
                <ScrollArea className="max-h-[95vh] w-full">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle>Bulk Edit Bona Vida Records — {record?.invoice_no}</DialogTitle>
                        </DialogHeader>

                        {errors.general && (
                            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                                {errors.general}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex justify-center items-center h-40">
                                <span className="text-muted-foreground">Loading related records...</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                                {/* Section: Shared Defaults */}
                                <div className="bg-muted/30 p-4 rounded-md border">
                                    <h3 className={sectionTitleClass}>Default Values (Applied to all rows)</h3>
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <div>
                                            <label className={labelClass} htmlFor="edit_default_date_received">
                                                Date Received <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                id="edit_default_date_received"
                                                name="date_received"
                                                type="date"
                                                value={defaults.date_received}
                                                onChange={handleDefaultChange}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className={labelClass} htmlFor="edit_default_invoice_no">
                                                Invoice No <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                id="edit_default_invoice_no"
                                                name="invoice_no"
                                                value={defaults.invoice_no}
                                                onChange={handleDefaultChange}
                                                placeholder="Invoice number"
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass} htmlFor="edit_default_invoice_date">
                                                Invoice Date <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                id="edit_default_invoice_date"
                                                name="invoice_date"
                                                type="date"
                                                value={defaults.invoice_date}
                                                onChange={handleDefaultChange}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass} htmlFor="edit_default_price">
                                                Default Price <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                id="edit_default_price"
                                                name="price"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={defaults.price}
                                                onChange={handleDefaultChange}
                                                placeholder="Default Price"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Spreadsheet Data Entry */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-foreground">Data Entry</h3>
                                        <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-8">
                                            <Plus className="mr-1 size-4" />
                                            Add Row
                                        </Button>
                                    </div>
                                    
                                    <div className="border rounded-md overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted border-b">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-medium w-[250px]">Office <span className="text-red-500">*</span></th>
                                                        <th className="px-3 py-2 text-left font-medium w-[120px]">Qty <span className="text-red-500">*</span></th>
                                                        <th className="px-3 py-2 text-left font-medium w-[140px]">Price Override</th>
                                                        <th className="px-3 py-2 text-left font-medium w-[150px]">Total Amount</th>
                                                        <th className="px-3 py-2 text-left font-medium">Remarks</th>
                                                        <th className="px-3 py-2 text-center font-medium w-[60px]"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row, index) => (
                                                        <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/10">
                                                            <td className="px-2 py-2">
                                                                <SearchableSelect
                                                                    value={row.office_code}
                                                                    onChange={(val) => handleRowChange(index, 'office_code', val)}
                                                                    error={errors[`records.${index}.office_code`]}
                                                                    options={offices.map((o) => ({ value: o.office_code, label: o.office_name }))}
                                                                />
                                                                {errors[`records.${index}.office_code`] && (
                                                                    <p className="mt-1 text-[10px] text-red-500">{errors[`records.${index}.office_code`]}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2 align-top">
                                                                <Input
                                                                    id={`edit-qty-${index}`}
                                                                    type="number"
                                                                    min="1"
                                                                    value={row.qty}
                                                                    onChange={(e) => handleRowChange(index, 'qty', e.target.value)}
                                                                    onKeyDown={(e) => handleKeyDown(e, index, 'qty')}
                                                                    className={cn("h-10", errors[`records.${index}.qty`] && 'border-red-500')}
                                                                />
                                                                {errors[`records.${index}.qty`] && (
                                                                    <p className="mt-1 text-[10px] text-red-500">{errors[`records.${index}.qty`]}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2 align-top">
                                                                <Input
                                                                    id={`edit-price-${index}`}
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder={defaults.price || "Default"}
                                                                    value={row.price}
                                                                    onChange={(e) => handleRowChange(index, 'price', e.target.value)}
                                                                    onKeyDown={(e) => handleKeyDown(e, index, 'price')}
                                                                    className={cn("h-10", errors[`records.${index}.price`] && 'border-red-500')}
                                                                />
                                                                {errors[`records.${index}.price`] && (
                                                                    <p className="mt-1 text-[10px] text-red-500">{errors[`records.${index}.price`]}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2 align-top">
                                                                <Input
                                                                    type="number"
                                                                    readOnly
                                                                    value={row.total_amount}
                                                                    placeholder="Auto"
                                                                    className={cn("h-10 bg-muted/50", errors[`records.${index}.total_amount`] && 'border-red-500')}
                                                                />
                                                                {errors[`records.${index}.total_amount`] && (
                                                                    <p className="mt-1 text-[10px] text-red-500">{errors[`records.${index}.total_amount`]}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2 align-top">
                                                                <Input
                                                                    id={`edit-remarks-${index}`}
                                                                    value={row.remarks}
                                                                    onChange={(e) => handleRowChange(index, 'remarks', e.target.value)}
                                                                    onKeyDown={(e) => handleKeyDown(e, index, 'remarks')}
                                                                    className="h-10"
                                                                    placeholder="Optional"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2 text-center align-top">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-10 w-10 text-muted-foreground hover:text-red-600"
                                                                    onClick={() => removeRow(index)}
                                                                    disabled={rows.length === 1}
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Form validation errors for missing defaults when rows exist */}
                                {Object.keys(errors).some(k => k.startsWith('records.0.') && k.includes('date_received')) && (
                                    <p className="text-sm text-red-500">Please ensure all default fields are filled if adding rows.</p>
                                )}

                                <div className="flex justify-end gap-3 border-t pt-4">
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#612A35' }}>
                                        {isSubmitting ? 'Saving...' : 'Save All Changes'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}