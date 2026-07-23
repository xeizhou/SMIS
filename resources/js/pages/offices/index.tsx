import { Head, Link, router } from '@inertiajs/react';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import OfficeAddForm from '@/components/offices/officeaddform';
import OfficeDeleteModal from '@/components/offices/officedeletemodal';
import OfficeEditForm from '@/components/offices/officeeditform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Office {
    office_code: string;
    office_name: string;
    entity_name: string;
    office_head: string;
}

interface PaginatedOffices {
    data: Office[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Filters {
    search: string | null;
}

interface Props {
    offices: PaginatedOffices;
    filters: Filters;
}

export default function Index({
    offices,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedOffice, setSelectedOffice] =
    useState<Office | null>(null);

    const handleDelete = (office: Office) => {
        setSelectedOfficeCode(office.office_code);
        setDeleteOpen(true);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        router.get(
            '/offices',
            {
                search,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleClear = () => {
        setSearch('');

        router.get(
            '/offices',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedOfficeCode, setSelectedOfficeCode] = useState<string | null>(null);

    return (
        <>
            <Head title="Offices" />

            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Offices
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage university offices.
                        </p>
                    </div>
                </div>

                {/* Search */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                            <Input
                                placeholder="Search offices..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                                className="pl-9"
                            />
                        </div>

                        <Button
                            type="submit"
                            variant="secondary"
                        >
                            Search
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClear}
                        >
                            Clear
                        </Button>
                    </div>

                    <Button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="w-full lg:w-auto"
                        style={{
                            backgroundColor: '#612A35',
                        }}
                    >
                        Add Office
                    </Button>
                </form>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <table className="w-full text-sm">
                        <thead
                            className="border-b"
                            style={{
                                backgroundColor: '#370001',
                            }}
                        >
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Office Code
                                </th>

                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Office Name
                                </th>

                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Entity Name
                                </th>

                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Office Head
                                </th>

                                <th className="px-4 py-3 text-center font-semibold text-white">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {offices.data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-16 text-center"
                                    >
                                        <p className="text-base font-medium text-muted-foreground">
                                            No offices added yet.
                                        </p>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>"Add Office"</strong> to
                                            create your first office.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                offices.data.map((office) => (
                                    <tr
                                        key={office.office_code}
                                        className="border-b transition-colors hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3">
                                            {office.office_code}
                                        </td>

                                        <td className="px-4 py-3">
                                            {office.office_name}
                                        </td>

                                        <td className="px-4 py-3">
                                            {office.entity_name}
                                        </td>

                                        <td className="px-4 py-3">
                                            {office.office_head}
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedOffice(office);
                                                        setEditOpen(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(office)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            {offices.data.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 p-4">
                    {offices.links.map((link, i) => (
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
                                (!link.url
                                    ? ' pointer-events-none opacity-40'
                                    : '')
                            }
                            dangerouslySetInnerHTML={{
                                __html: link.label,
                            }}
                        />
                    ))}
                </div>
            )}

            </div>

            <OfficeAddForm
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />

            <OfficeEditForm
                open={editOpen}
                onOpenChange={setEditOpen}
                office={selectedOffice}
            />

            <OfficeDeleteModal
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                officeCode={selectedOfficeCode}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Personnel Files',
            href: '#',
        },
        {
            title: 'Offices',
            href: '/office',
        },
    ],
};