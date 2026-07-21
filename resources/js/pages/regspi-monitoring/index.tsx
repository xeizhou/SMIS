import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import RegSPIAddForm from '@/components/regspi-monitoring/regspiaddform';
import RegSPIEditForm from '@/components/regspi-monitoring/regspieditform';
import RegSPIViewForm from '@/components/regspi-monitoring/regspiviewform';
import RegSPIDeleteModal from '@/components/regspi-monitoring/regspideletemodal';

interface RegSPIRecord {
    regspi_id: number;
    month_year: string;
    ics_no: string | null;
    rrsp_no: string | null;
    semi_expendable_property_no: string;
    item_description: string;
    estimated_useful_life: number | string | null;
    issued_qty: number | string | null;
    issued_office_officer: string | null;
    returned_qty: number | string | null;
    returned_office_officer: string | null;
    reissued_qty: number | string | null;
    reissued_office_officer: string | null;
    disposed_qty: number | string | null;
    balance_qty: number | string | null;
    amount: number | string | null;
    remarks: string | null;
    rrspMonitoring?: {
        rrsp_no?: string | null;
        item_description?: string | null;
    } | null;
}

interface PaginatedRegSPIRecords {
    data: RegSPIRecord[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface RrspOption {
    rrsp_no: string;
}

interface Filters {
    search: string | null;
    rrsp_no: string | null;
    fund_cluster_id: string | null;
}

interface FundClusterOption {
    fund_cluster_id: string;
    fund_description: string;
}

interface Props {
    regspis: PaginatedRegSPIRecords;
    filters: Filters;
    rrsps: RrspOption[];
    fundClusters: FundClusterOption[];
}

function formatCurrency(value: string | number | null) {
    if (value === null) return '—';

    const numeric = typeof value === 'string' ? parseFloat(value) : value;

    if (Number.isNaN(numeric)) return '—';

    return numeric.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });
}

export default function Index({ regspis, filters, rrsps, fundClusters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [rrspNo, setRrspNo] = useState(filters.rrsp_no ?? 'all');
    const [fundClusterId, setFundClusterId] = useState(filters.fund_cluster_id ?? 'all');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRegSPI, setSelectedRegSPI] = useState<RegSPIRecord | null>(null);
    const [regspiToDelete, setRegspiToDelete] = useState<RegSPIRecord | null>(null);

    const runSearch = (nextRrspNo?: string, nextFundClusterId?: string) => {
        router.get(
            '/regspi-monitoring',
            {
                search,
                rrsp_no: (nextRrspNo ?? rrspNo) === 'all' ? undefined : nextRrspNo ?? rrspNo,
                fund_cluster_id: (nextFundClusterId ?? fundClusterId) === 'all' ? undefined : nextFundClusterId ?? fundClusterId,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch();
    };

    const handleRrspChange = (value: string) => {
        setRrspNo(value);
        runSearch(value, fundClusterId);
    };

    const handleFundClusterChange = (value: string) => {
        setFundClusterId(value);
        runSearch(rrspNo, value);
    };

    const handleClear = () => {
        setSearch('');
        setRrspNo('all');
        setFundClusterId('all');

        router.get(
            '/regspi-monitoring',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleEdit = (record: RegSPIRecord) => {
        setSelectedRegSPI(record);
        setEditDialogOpen(true);
    };

    const handleView = (record: RegSPIRecord) => {
        setSelectedRegSPI(record);
        setViewDialogOpen(true);
    };

    const handleDelete = (record: RegSPIRecord) => {
        setRegspiToDelete(record);
        setDeleteDialogOpen(true);
    };

    return (
        <>
            <Head title="RegSPI Monitoring" />

            <div className="p-4 space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">RegSPI Monitoring</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage and track all RegSPI records</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search RegSPI"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={fundClusterId} onValueChange={handleFundClusterChange}>
                            <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="All Fund Cluster" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Fund Cluster</SelectItem>
                                {fundClusters.map((cluster) => (
                                    <SelectItem key={cluster.fund_cluster_id} value={cluster.fund_cluster_id}>
                                        {cluster.fund_cluster_id} - {cluster.fund_description}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="secondary">Search</Button>
                        <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                    </div>

                    <Button type="button" onClick={() => setAddDialogOpen(true)} className="w-full lg:w-auto" style={{ backgroundColor: '#612A35' }}>
                        Add RegSPI Record
                    </Button>
                </form>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <table className="w-full text-sm">
                        <thead className="border-b" style={{ backgroundColor: '#370001' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">Property No.</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Item Description</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">RRSP No.</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Month / Year</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Issued Qty</th>
                                <th className="px-4 py-3 text-left font-semibold text-white">Balance Qty</th>
                                <th className="px-4 py-3 text-right font-semibold text-white">Amount</th>
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {regspis.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">No RegSPI records added yet.</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Click <strong>&quot;Add RegSPI Record&quot;</strong> to create your first entry.</p>
                                    </td>
                                </tr>
                            ) : (
                                regspis.data.map((record) => (
                                    <tr key={record.regspi_id} className="border-b transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-3 font-medium">{record.semi_expendable_property_no}</td>
                                        <td className="px-4 py-3">{record.item_description}</td>
                                        <td className="px-4 py-3">{record.rrsp_no ?? record.rrspMonitoring?.rrsp_no ?? '—'}</td>
                                        <td className="px-4 py-3">{record.month_year}</td>
                                        <td className="px-4 py-3">{record.issued_qty ?? '—'}</td>
                                        <td className="px-4 py-3">{record.balance_qty ?? '—'}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(record.amount)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" onClick={() => handleEdit(record)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button type="button" onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-800" title="Delete">
                                                    <Trash2 className="size-4" />
                                                </button>
                                                <button type="button" onClick={() => handleView(record)} className="text-foreground hover:text-muted-foreground" title="View">
                                                    <Eye className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {regspis.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 p-4">
                        {regspis.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url ?? '#'}
                                preserveState
                                preserveScroll
                                className={
                                    'rounded-lg border px-4 py-2 text-sm font-medium transition-colors ' +
                                    (link.active
                                        ? 'border-[#612A35] bg-[#612A35] text-white'
                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100') +
                                    (!link.url ? ' pointer-events-none opacity-40' : '')
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <RegSPIAddForm open={addDialogOpen} onOpenChange={setAddDialogOpen} rrsps={rrsps} fundClusters={fundClusters} />
            <RegSPIEditForm open={editDialogOpen} onOpenChange={setEditDialogOpen} regspi={selectedRegSPI} rrsps={rrsps} fundClusters={fundClusters} />
            <RegSPIViewForm open={viewDialogOpen} onOpenChange={setViewDialogOpen} regspi={selectedRegSPI} />
            <RegSPIDeleteModal open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} regspiId={regspiToDelete?.regspi_id ?? null} propertyNo={regspiToDelete?.semi_expendable_property_no ?? null} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Property',
            href: '#',
        },
        {
            title: 'RegSPI Monitoring',
            href: '/regspi-monitoring',
        },
    ],
};