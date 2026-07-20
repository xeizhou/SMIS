import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import type { RRPPEMonitoring } from '@/pages/rrppe-monitoring/index';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: RRPPEMonitoring | null;
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

export default function RrppeViewModal({ open, onOpenChange, item }: Props) {
    if (!item) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>View RRPPE Record</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 py-4 md:grid-cols-2">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            RRPPE No.
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.rrppe_no}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Date Received
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.date_received}
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-gray-500">
                            Item Description
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.item_description}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Quantity
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.quantity}
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
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            End User Name
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.end_user_name || '-'}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Cost
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.cost)}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Status
                        </h4>
                        <p className="mt-1">
                            {item.status ? (
                                <span
                                    className={
                                        item.status === 'SERVICEABLE'
                                            ? 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
                                            : 'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
                                    }
                                >
                                    {item.status}
                                </span>
                            ) : (
                                '-'
                            )}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500">
                            Area
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.area || '-'}
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-gray-500">
                            Remarks
                        </h4>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                            {item.remarks || '-'}
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
