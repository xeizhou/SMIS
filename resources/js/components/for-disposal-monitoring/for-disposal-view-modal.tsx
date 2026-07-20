import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import type { ForDisposalMonitoring } from '@/pages/for-disposal-monitoring/index';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: ForDisposalMonitoring | null;
}

const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined || amount === '') {
        return '-';
    }

    const num = Number(amount);

    if (isNaN(num)) {
        return '-';
    }

    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(num);
};

export default function ForDisposalViewModal({
    open,
    onOpenChange,
    item,
}: Props) {
    if (!item) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>View For Disposal Record</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 py-4 md:grid-cols-2">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Transaction No.
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.transaction_no}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Pre-Repair No.
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.pre_repair_no}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Property No.
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.property_no}
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-gray-500">
                            Description
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.description}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            From Accountable Officer
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.from_accountable_officer}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            To Accountable Officer
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.to_accountable_officer}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Condition of PPE
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.condition_of_ppe}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Location
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.location}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Amount
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.amount)}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
