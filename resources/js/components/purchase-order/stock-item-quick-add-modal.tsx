import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatedStockItem {
    stock_no: string;
    item_name: string;
    description: string | null;
    unitID: number | null;
    unit_name: string | null;
    unit_short_name: string | null;
}

interface UnitOption {
    unitID: number;
    unit_name: string;
    unit_short_name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName?: string;
    requireUnit?: boolean; // 👈 new
    onCreated: (item: CreatedStockItem) => void;
}

const labelClass = 'mb-1 block text-sm text-foreground';
const emptyData = {
    item_name: '',
    description: '',
    unitID: '',
    new_unit_name: '',
    new_unit_short_name: '',
};

export default function StockItemQuickAddModal({
    open, onOpenChange, initialName = '', requireUnit = false, onCreated,
}: Props) {
    const [data, setData] = useState({ ...emptyData, item_name: initialName });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [units, setUnits] = useState<UnitOption[]>([]);
    const [newUnitMode, setNewUnitMode] = useState(false);

    useEffect(() => {
        if (!open) return;
        setData({ ...emptyData, item_name: initialName });
        setErrors({});
        setNewUnitMode(false);

        fetch('/units/options', { headers: { Accept: 'application/json' } })
            .then((r) => r.json())
            .then(setUnits)
            .catch(() => setUnits([]));
    }, [open, initialName]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const payload = {
        ...(newUnitMode
            ? { ...data, unitID: '' }
            : { ...data, new_unit_name: '', new_unit_short_name: '' }),
        require_unit: requireUnit,
    };

        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');

            const res = await fetch('/stock-items/quick-add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token ?? '',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const body = await res.json();
                if (body.errors) {
                    const flat = Object.fromEntries(
                        Object.entries(body.errors).map(([k, v]) => [k, (v as string[])[0]]),
                    );
                    setErrors(flat);
                }
                return;
            }

            const created: CreatedStockItem = await res.json();
            onCreated(created);
            onOpenChange(false);
        } catch {
            setErrors({ item_name: 'Something went wrong. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Quick-Add Stock Item</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="mt-2 space-y-3">
                    <div>
                        <label className={labelClass}>
                            Item Name<span className="text-red-500"> *</span>
                        </label>
                        <Input
                            name="item_name"
                            value={data.item_name}
                            onChange={handleChange}
                            placeholder="e.g. Bond Paper A4"
                            autoFocus
                        />
                        {errors.item_name && <p className="mt-1 text-xs text-red-500">{errors.item_name}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Description</label>
                        <Input
                            name="description"
                            value={data.description}
                            onChange={handleChange}
                            placeholder="e.g. Sub 20, 500 sheets/ream"
                        />
                        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm text-foreground">
                                Unit{requireUnit && <span className="text-red-500"> *</span>}
                                {!requireUnit && <span className="text-muted-foreground"> (optional)</span>}
                            </label>
                            <div className="flex items-center gap-3">
                                {!requireUnit && !newUnitMode && data.unitID && (
                                    <button
                                        type="button"
                                        onClick={() => setData((p) => ({ ...p, unitID: '' }))}
                                        className="text-xs text-muted-foreground hover:underline"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setNewUnitMode((v) => !v)}
                                    className={cn(
                                        'group inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200',
                                        'active:scale-95',
                                        newUnitMode
                                            ? 'border-[#612A35]/30 bg-[#612A35]/10 text-[#612A35] hover:bg-[#612A35]/20'
                                            : 'border-[#612A35] bg-[#612A35] text-white shadow-sm hover:bg-[#612A35]/90 hover:shadow',
                                    )}
                                >
                                    {newUnitMode ? (
                                        <>
                                            <List className="size-3 transition-transform group-hover:-translate-x-0.5" />
                                            Pick existing
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="size-3 transition-transform duration-200 group-hover:rotate-90" />
                                            New unit
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {newUnitMode ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Input
                                        name="new_unit_name"
                                        value={data.new_unit_name}
                                        onChange={handleChange}
                                        placeholder="Name, e.g. Piece"
                                    />
                                    {errors.new_unit_name && (
                                        <p className="mt-1 text-xs text-red-500">{errors.new_unit_name}</p>
                                    )}
                                </div>
                                <div>
                                    <Input
                                        name="new_unit_short_name"
                                        value={data.new_unit_short_name}
                                        onChange={handleChange}
                                        placeholder="Short, e.g. pc"
                                    />
                                    {errors.new_unit_short_name && (
                                        <p className="mt-1 text-xs text-red-500">{errors.new_unit_short_name}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <Select
                                    value={data.unitID}
                                    onValueChange={(v) => setData((p) => ({ ...p, unitID: v }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="-- Select Unit --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map((u) => (
                                            <SelectItem key={u.unitID} value={String(u.unitID)}>
                                                {u.unit_name} ({u.unit_short_name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.unitID && <p className="mt-1 text-xs text-red-500">{errors.unitID}</p>}
                            </>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {requireUnit
                            ? 'Stock No. will be left unassigned. Complete it later in Stock Items.'
                            : 'Stock No. and Unit can be completed later in Stock Items.'}
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} style={{ backgroundColor: '#612A35' }} className="text-white">
                            {processing ? 'Adding...' : 'Add Item'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}