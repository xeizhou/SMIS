import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface FundCluster {
    fund_cluster_id: string;
    fund_description: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fundCluster: FundCluster | null;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const valueClass = 'text-sm text-foreground mt-0.5';

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <p className={valueClass}>{value}</p>
        </div>
    );
}

export default function FundClusterViewForm({ open, onOpenChange, fundCluster }: Props) {
    if (!fundCluster) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Fund Cluster Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4 grid grid-cols-1 gap-4">
                    <Detail label="Fund Cluster ID" value={fundCluster.fund_cluster_id} />
                    <Detail label="Fund Description" value={fundCluster.fund_description} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
