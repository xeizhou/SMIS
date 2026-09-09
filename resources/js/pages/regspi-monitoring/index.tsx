import { Head, router } from '@inertiajs/react';
import { AnimatedTableRow } from '@/components/animated-table-row';
import Pagination from '@/components/Pagination';

import { Eye, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import RegSPIAddForm from '@/components/regspi-monitoring/regspiaddform';
import RegSPIDeleteModal from '@/components/regspi-monitoring/regspideletemodal';
import RegSPIEditForm from '@/components/regspi-monitoring/regspieditform';
import RegSPIViewForm from '@/components/regspi-monitoring/regspiviewform';
import RegSPIImportDialog from '@/components/regspi-monitoring/regspi-import-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';


import {
    RegSPIRecord,
    PaginatedRegSPIRecords,
    RrspItem,
    RrspOption,
    Filters,
    FundClusterOption,
} from '@/types/regspi';


interface Props {
    regspis: PaginatedRegSPIRecords;
    filters: Filters;
    rrsps: RrspOption[];
    fundClusters: FundClusterOption[];
}


function formatCurrency(value: string | number | null) {
    if (value === null) {
return '—';
}


    const numeric = typeof value === 'string' ? parseFloat(value) : value;


    if (Number.isNaN(numeric)) {
return '—';
}


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
    const [importOpen, setImportOpen] = useState(false);

    const handleSort = (field: string) => {
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get('/regspi-monitoring', { search, rrsp_no: rrspNo === 'all' ? undefined : rrspNo, fund_cluster_id: fundClusterId === 'all' ? undefined : fundClusterId, sort_field: field, sort_direction: direction }, { preserveState: true, preserveScroll: true, replace: true });
    };


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


            <div className="flex flex-col h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] p-4 sm:p-6 gap-6">
                {/* Sticky Header & Search */}
                <div className="shrink-0 relative z-30 -mx-4 -mt-4 bg-background/95 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">RegSPI Monitoring</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Manage and track all RegSPI records</p>
                        </div>
                    </div>


                    {/* Search & Actions */}
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
                                <SelectTrigger className={`w-[240px] ${fundClusterId === 'all' ? 'text-muted-foreground' : ''}`}>
                                    <SelectValue placeholder="Filter by Fund Cluster" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Filter by Fund Cluster</SelectItem>
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


                        <div className="flex w-full gap-2 lg:w-auto">
                            <Button type="button" variant="outline" onClick={() => setImportOpen(true)} className="flex-1 lg:flex-initial">
                                <Upload className="mr-2 size-4" />
                                Import
                            </Button>
                            <Button type="button" onClick={() => setAddDialogOpen(true)} className="flex-1 lg:flex-initial" style={{ backgroundColor: '#612A35' }}>
                                Add RegSPI Record
                            </Button>
                        </div>
                    </form>

                    {/* Horizontal fading border */}
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                </div>

                

                <div className="flex-1 min-h-0 flex flex-col gap-6">
                    <div className="flex-initial min-h-0 overflow-x-auto overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                        <table className="w-full text-sm whitespace-nowrap">
                        <thead className="bg-[#3e0b0e] text-white/90 sticky top-0 z-20">
                            <tr>
                                {['Property No.', 'Item Description', 'Issued Qty', 'Balance Qty'].map((label, index) => <th key={label} className="p-0 text-left font-semibold text-white"><button type="button" onClick={() => handleSort(['semi_expendable_property_no', 'item_description', 'issued_qty', 'balance_qty'][index])} className="w-full px-4 py-3 text-left hover:bg-[#4C0002]">{label}</button></th>)}
                               
                                <th className="px-4 py-3 text-center font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {regspis.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">No RegSPI records added yet.</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Click <strong>&quot;Add RegSPI Record&quot;</strong> to create your first entry.</p>
                                    </td>
                                </tr>
                            ) : (
                                regspis.data.map((record, i) => (
                                    <AnimatedTableRow
                                        key={record.regspi_id}
                                        index={i}
                                        className="border-b transition-colors hover:bg-muted/40"
                                        data-search-0={record.semi_expendable_property_no}
                                        data-search-1={record.item_description}
                                        data-record-id={record.regspi_id}
                                    >
                                        <td className="px-4 py-3 font-medium">{record.semi_expendable_property_no}</td>
                                        <td className="px-4 py-3">{record.item_description}</td>
                                        <td className="px-4 py-3">{record.issued_qty ?? '—'}</td>
                                        <td className="px-4 py-3">{record.balance_qty ?? '—'}</td>
                                       
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
                                    </AnimatedTableRow>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>

                    {regspis.data.length > 0 && (
                        <div className="shrink-0">
                            <Pagination meta={regspis} />
                        </div>
                    )}
                </div>
            </div>


            <RegSPIAddForm open={addDialogOpen} onOpenChange={setAddDialogOpen} rrsps={rrsps} fundClusters={fundClusters} />
            <RegSPIEditForm open={editDialogOpen} onOpenChange={setEditDialogOpen} regspi={selectedRegSPI} rrsps={rrsps} fundClusters={fundClusters} />
            <RegSPIViewForm open={viewDialogOpen} onOpenChange={setViewDialogOpen} regspi={selectedRegSPI} />
            <RegSPIDeleteModal open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} regspiId={regspiToDelete?.regspi_id ?? null} propertyNo={regspiToDelete?.semi_expendable_property_no ?? null} />
            <RegSPIImportDialog open={importOpen} onOpenChange={setImportOpen} fundClusters={fundClusters} />        </>
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

