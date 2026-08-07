import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Filter, PackageX, Search } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

interface PrintStockCardsProps {
    totalItems: number;
    filters: {
        fundCluster?: string;
        unissuedOnly?: boolean;
        searchQuery?: string;
    };
}

export default function PrintStockCardsButton({ totalItems, filters }: PrintStockCardsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const fundCluster = filters.fundCluster || 'All';
    const unissuedOnly = filters.unissuedOnly || false;
    const searchQuery = filters.searchQuery || 'None';

    const hasFundFilter = fundCluster !== 'All';
    const hasSearchFilter = searchQuery !== 'None';

    const handleConfirmPrint = () => {
        const params = new URLSearchParams();

        if (hasFundFilter) params.append('fund_cluster', fundCluster);
        if (unissuedOnly) params.append('unissued', 'true');
        if (hasSearchFilter) params.append('search', searchQuery);

        setIsOpen(false);
        window.open(`/stock-items/print-cards?${params.toString()}`, '_blank');
    };

    const filterRows = [
        {
            icon: Filter,
            label: 'Fund Cluster',
            value: fundCluster,
            active: hasFundFilter,
        },
        {
            icon: PackageX,
            label: 'Unissued Only',
            value: unissuedOnly ? 'Yes' : 'No',
            active: unissuedOnly,
        },
        {
            icon: Search,
            label: 'Search',
            value: searchQuery,
            active: hasSearchFilter,
        },
    ];

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className="bg-[#612A35] hover:bg-[#612A35]/90 text-white flex items-center gap-2"
            >
                <Printer className="size-4" />
                Print Stock Cards
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Printer className="size-5 text-[#612A35]" />
                            Print Confirmation
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-2 space-y-4">
                        <div className="rounded-lg bg-[#612A35]/5 border border-[#612A35]/20 px-4 py-3 text-center">
                            <p className="text-2xl font-bold text-[#612A35]">{totalItems}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                stock card{totalItems === 1 ? '' : 's'} will be printed
                            </p>
                        </div>

                        <div className="space-y-2">
                            {filterRows.map(({ icon: Icon, label, value, active }) => (
                                <div
                                    key={label}
                                    className={
                                        'flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ' +
                                        (active
                                            ? 'border-[#612A35]/30 bg-[#612A35]/5'
                                            : 'border-border bg-muted/30')
                                    }
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon
                                            className={
                                                'size-4 ' +
                                                (active ? 'text-[#612A35]' : 'text-muted-foreground')
                                            }
                                        />
                                        <span className={active ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                            {label}
                                        </span>
                                    </div>
                                    <span className={active ? 'text-foreground' : 'text-muted-foreground'}>
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <p className="text-sm text-muted-foreground text-center pt-1">
                            Do you want to continue?
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmPrint}
                            className="bg-[#612A35] text-white hover:bg-[#612A35]/90"
                        >
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}