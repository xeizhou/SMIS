import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'staff';
    created_at: string;
}

interface Props {
    users: User[];
}

export default function Index({ users }: Props) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);

    const { data, setData, post, put, reset, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        role: 'staff' as 'admin' | 'staff',
    });

    const filteredUsers = users.filter((user) => {
        const term = search.toLowerCase();
        return (
            user.name.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term)
        );
    });

    function openCreate() {
        setEditing(null);
        reset();
        setOpen(true);
    }

    function openEdit(user: User) {
        setEditing(user);
        setData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
        });
        setOpen(true);
    }

    function submit() {
        if (editing) {
            put(`/users/${editing.id}`, {
                onSuccess: () => setOpen(false),
            });
        } else {
            post('/users', {
                onSuccess: () => setOpen(false),
            });
        }
    }

    function destroy(user: User) {
        if (confirm(`Delete ${user.name}?`)) {
            router.delete(`/users/${user.id}`);
        }
    }

    return (
        <>
            <Head title="Users" />

            <div className="p-4 space-y-6 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Users</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage system users and their roles
                        </p>
                    </div>
                </div>

                {/* Search & Actions */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 flex-1">
                        <div className="relative w-full max-w-sm flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search users"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={openCreate}
                        className="w-full lg:w-auto"
                        style={{ backgroundColor: '#612A35' }}
                    >
                        Add User
                    </Button>
                </div>

                {/* Table */}
                <ScrollArea className="w-full rounded-md border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b" style={{ backgroundColor: '#370001' }}>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Name
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Email
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-white">
                                    Role
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-white">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <p className="text-base font-medium text-muted-foreground">
                                            No users found.
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Click <strong>&quot;Add User&quot;</strong> to create your first entry.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-b transition-colors hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3 font-medium">{user.name}</td>
                                        <td className="px-4 py-3">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                                {user.role.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(user)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => destroy(user)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="Juan Dela Cruz"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                        </div>

                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="juan.delacruz@example.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                        </div>

                        <div>
                            <Label htmlFor="password">
                                Password {editing && '(leave blank to keep current)'}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder={editing ? '••••••••' : 'Enter password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                        </div>

                        <div>
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={data.role}
                                onValueChange={(value) => setData('role', value as 'admin' | 'staff')}
                            >
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submit} disabled={processing}>
                            {editing ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'System / Administration',
            href: '#',
        },
        {
            title: 'Users',
            href: '/users',
        },
    ],
};