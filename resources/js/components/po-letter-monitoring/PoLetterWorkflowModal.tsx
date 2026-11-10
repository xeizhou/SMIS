import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import DatePicker from '@/components/date-picker';

interface PoLetter {
    id: number;
    po_number: string;
    po_date: string | null;
    date_received_by_supplier: string | null;
    delivery_term: string | number | null;
    due_date: string | null;
    office_end_user: string;
    type_of_letter: string;
    date_received_by_smu: string | null;
    date_forwarded_to_ovpad: string | null;
    status_of_the_letter: string;
    date_forwarded_to_end_user: string | null;
    remarks: string | null;
    supplier?: { supplier_name?: string | null } | null;
    serve_po?: { item_description?: string | null } | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    poLetter: PoLetter | null;
}

const STEPS = [
    { key: 'date_received_by_smu', label: 'Date Received by SMU' },
    { key: 'date_forwarded_to_ovpad', label: 'Date Forwarded to OVPAD' },
    { key: 'final_section', label: 'End User & Letter Status' },
] as const;

const STATUS_VALUES = ['APPROVED', 'DISAPPROVED'];

type WorkflowData = {
    date_received_by_smu: string;
    date_forwarded_to_ovpad: string;
    status_of_the_letter: string;
    date_forwarded_to_end_user: string;
    remarks: string;
};

const EMPTY_DATA: WorkflowData = {
    date_received_by_smu: '',
    date_forwarded_to_ovpad: '',
    status_of_the_letter: '',
    date_forwarded_to_end_user: '',
    remarks: '',
};

function dateValue(value: string | null) {
    if (!value) return '';
    return value.slice(0, 10);
}

function formatDate(value: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          });
}

function isComplete(step: number, data: WorkflowData) {
    if (step === 2) {
        return Boolean(
            data.status_of_the_letter &&
            data.status_of_the_letter !== 'PENDING' &&
            data.date_forwarded_to_end_user,
        );
    }

    return Boolean(
        (step === 0
            ? data.date_received_by_smu
            : data.date_forwarded_to_ovpad
        ).trim(),
    );
}

export default function PoLetterWorkflowModal({
    open,
    onOpenChange,
    poLetter,
}: Props) {
    const [data, setData] = useState<WorkflowData>(EMPTY_DATA);
    const [activeStep, setActiveStep] = useState(0);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!open || !poLetter) return;
        const nextData: WorkflowData = {
            date_received_by_smu: dateValue(poLetter.date_received_by_smu),
            date_forwarded_to_ovpad: dateValue(
                poLetter.date_forwarded_to_ovpad,
            ),
            status_of_the_letter: poLetter.status_of_the_letter ?? '',
            date_forwarded_to_end_user: dateValue(
                poLetter.date_forwarded_to_end_user,
            ),
            remarks: poLetter.remarks ?? '',
        };
        setData(nextData);
        const firstIncomplete = STEPS.findIndex(
            (_, index) => !isComplete(index, nextData),
        );
        setActiveStep(firstIncomplete < 0 ? STEPS.length - 1 : firstIncomplete);
        setError('');
    }, [open, poLetter]);

    const canOpenStep = useMemo(
        () =>
            STEPS.map(
                (_, index) =>
                    index === 0 ||
                    STEPS.slice(0, index).every((__, previous) =>
                        isComplete(previous, data),
                    ),
            ),
        [data],
    );

    if (!poLetter) return null;

    const active = STEPS[activeStep];

    // Only APPROVED / DISAPPROVED exist as options. Any other stored value
    // (e.g. PENDING) would leave the Select blank, so pass '' instead and
    // let the "Select status" placeholder show.
    const statusSelectValue = STATUS_VALUES.includes(data.status_of_the_letter)
        ? data.status_of_the_letter
        : '';

    const updateValue = (field: keyof WorkflowData, value: string) => {
        setData((current) => ({ ...current, [field]: value }));
        setError('');
    };

    const saveAndContinue = () => {
        if (activeStep === 2) {
            if (!data.date_forwarded_to_end_user) {
                setError('Enter the date forwarded to the end user.');
                return;
            }
            if (!STATUS_VALUES.includes(data.status_of_the_letter)) {
                setError('Select the letter status before continuing.');
                return;
            }

            setProcessing(true);
            router.put(
                `/po-letter-monitoring/${poLetter.id}/workflow`,
                {
                    step: 'final_section',
                    value: {
                        date_forwarded_to_end_user:
                            data.date_forwarded_to_end_user,
                        status_of_the_letter: data.status_of_the_letter,
                        remarks: data.remarks,
                    },
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setError('');
                        onOpenChange(false);
                    },
                    onError: (errors) => {
                        setError(
                            errors.value ??
                                errors.step ??
                                errors['value.date_forwarded_to_end_user'] ??
                                errors['value.status_of_the_letter'] ??
                                errors.date_forwarded_to_end_user ??
                                errors.status_of_the_letter ??
                                'Unable to save this workflow section.',
                        );
                    },
                    onFinish: () => setProcessing(false),
                },
            );
            return;
        }

        const field =
            activeStep === 0
                ? 'date_received_by_smu'
                : 'date_forwarded_to_ovpad';
        const value = data[field];
        if (!value.trim()) {
            setError('This step is required before continuing.');
            return;
        }
        setProcessing(true);
        router.put(
            `/po-letter-monitoring/${poLetter.id}/workflow`,
            {
                step: active.key,
                value,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setError('');
                    if (activeStep === STEPS.length - 1) {
                        onOpenChange(false);
                    } else {
                        setActiveStep((current) =>
                            Math.min(current + 1, STEPS.length - 1),
                        );
                    }
                },
                onError: (errors) => {
                    setError(
                        errors.value ??
                            errors.step ??
                            'Unable to save this workflow step.',
                    );
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>PO Letter Workflow</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {poLetter.po_number} · {poLetter.type_of_letter}
                    </p>
                </DialogHeader>

                <div className="sticky top-0 z-10 rounded-md border bg-background p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold">
                        Purchase Order Details
                    </h3>
                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <Summary label="PO Number" value={poLetter.po_number} />
                        <Summary
                            label="PO Date"
                            value={formatDate(poLetter.po_date)}
                        />
                        <Summary
                            label="Supplier"
                            value={poLetter.supplier?.supplier_name ?? '—'}
                        />
                        <Summary
                            label="Date Received by Supplier"
                            value={formatDate(
                                poLetter.date_received_by_supplier,
                            )}
                        />
                        <Summary
                            label="Due Date"
                            value={formatDate(poLetter.due_date)}
                        />
                        <Summary
                            label="Delivery Term"
                            value={
                                poLetter.delivery_term === null
                                    ? '—'
                                    : `${poLetter.delivery_term} days`
                            }
                        />
                        <Summary
                            label="End User"
                            value={poLetter.office_end_user || '—'}
                        />
                        <div className="sm:col-span-2 lg:col-span-3">
                            <Summary
                                label="Item Description"
                                value={
                                    poLetter.serve_po?.item_description ?? '—'
                                }
                            />
                        </div>
                    </div>
                </div>

                <nav
                    aria-label="Workflow steps"
                    className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                >
                    {STEPS.map((step, index) => (
                        <button
                            key={step.key}
                            type="button"
                            disabled={!canOpenStep[index]}
                            onClick={() => {
                                setActiveStep(index);
                                setError('');
                            }}
                            className={`flex min-h-14 items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                                activeStep === index
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'hover:bg-muted'
                            }`}
                        >
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border">
                                {isComplete(index, data) ? (
                                    <Check className="size-3.5" />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <span>{step.label}</span>
                        </button>
                    ))}
                </nav>

                <section className="min-h-28 space-y-2">
                    {activeStep < 2 ? (
                        <DatePicker
                            label={active.label}
                            value={data[fieldForStep(activeStep)]}
                            onChange={(value: string) =>
                                updateValue(fieldForStep(activeStep), value)
                            }
                        />
                    ) : (
                        <>
                            <p className="text-sm font-medium">
                                {active.label}
                            </p>
                            <div className="grid gap-4 md:grid-cols-2">
                                <DatePicker
                                    label="Date Forwarded to End User"
                                    value={data.date_forwarded_to_end_user}
                                    onChange={(value: string) =>
                                        updateValue(
                                            'date_forwarded_to_end_user',
                                            value,
                                        )
                                    }
                                />
                                <div className="space-y-2">
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="workflow-status-of-the-letter"
                                    >
                                        Status of the Letter
                                    </label>
                                    <Select
                                        value={statusSelectValue}
                                        onValueChange={(value) =>
                                            updateValue(
                                                'status_of_the_letter',
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="workflow-status-of-the-letter">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="APPROVED">
                                                APPROVED
                                            </SelectItem>
                                            <SelectItem value="DISAPPROVED">
                                                DISAPPROVED
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="workflow-remarks"
                                    >
                                        Remarks
                                    </label>
                                    <Textarea
                                        id="workflow-remarks"
                                        value={data.remarks}
                                        onChange={(event) =>
                                            updateValue(
                                                'remarks',
                                                event.target.value,
                                            )
                                        }
                                        rows={4}
                                        placeholder="Enter remarks (optional)"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </section>

                <DialogFooter className="flex-row justify-between sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={activeStep === 0 || processing}
                        onClick={() =>
                            setActiveStep((current) => Math.max(0, current - 1))
                        }
                    >
                        <ChevronLeft className="mr-1 size-4" /> Previous
                    </Button>
                    <Button
                        type="button"
                        onClick={saveAndContinue}
                        disabled={processing}
                    >
                        {processing ? (
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                        ) : null}
                        {activeStep === STEPS.length - 1
                            ? 'Save and Finish'
                            : 'Save and Continue'}
                        {activeStep < STEPS.length - 1 && (
                            <ChevronRight className="ml-1 size-4" />
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Summary({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium break-words">{value}</p>
        </div>
    );
}

function fieldForStep(
    step: number,
): 'date_received_by_smu' | 'date_forwarded_to_ovpad' {
    return step === 0 ? 'date_received_by_smu' : 'date_forwarded_to_ovpad';
}