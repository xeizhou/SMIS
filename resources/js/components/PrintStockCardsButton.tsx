import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
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

    // Provide fallbacks to match your requested layout
    const fundCluster = filters.fundCluster || 'None';
    const unissuedOnly = filters.unissuedOnly || false;
    const searchQuery = filters.searchQuery || 'None';

    const handleConfirmPrint = () => {
        // Construct the URL parameters based on the current filters
        const params = new URLSearchParams();
        
        if (fundCluster !== 'None') params.append('fund_cluster', fundCluster);
        if (unissuedOnly) params.append('unissued', 'true');
        if (searchQuery !== 'None') params.append('search', searchQuery);

        // Close the dialog and open the PDF generator route in a new tab
        setIsOpen(false);
        window.open(`/stock-items/print-cards?${params.toString()}`, '_blank');
    };

    return (
        <>
            {/* The Trigger Button */}
            <Button 
                onClick={() => setIsOpen(true)}
                className="bg-[#612A35] hover:bg-[#612A35]/90 text-white flex items-center gap-2"
            >
                <Printer className="size-4" />
                Print Stock Cards
            </Button>

            {/* The Confirmation Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Print Confirmation</DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4 text-sm text-foreground space-y-4">
                        <p>
                            You are about to print <strong>{totalItems}</strong> stock card(s).
                        </p>
                        
                        <div className="bg-muted p-4 rounded-md space-y-1 font-mono text-xs">
                            <p>Fund Filter: {fundCluster}</p>
                            <p>Unissued Only: {unissuedOnly ? 'Yes' : 'No'}</p>
                            <p>Search Filter: {searchQuery}</p>
                        </div>

                        <p>Do you want to continue?</p>
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