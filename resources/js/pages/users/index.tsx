import { Head, useForm, router } from '@inertiajs/react';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Pencil, Search, Trash2, Mail, ShieldCheck, Lock, Camera, X, ZoomIn, Loader2 } from 'lucide-react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// --- Types & Interfaces ---

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'staff';
    avatar_url: string | null;
    created_at: string;
    is_locked?: boolean;
}

interface IndexProps {
    users: User[];
}

interface UserDeleteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: number | null;
    userName: string | null;
}

interface FlashProps {
    success?: string;
    error?: string;
}

// --- Constants ---

const ROLE_ORDER: Record<User['role'], number> = {
    admin: 0,
    staff: 1,
};

// --- Helpers ---

/** Appends a cache-busting version query param so the browser re-fetches a changed
 * avatar even when the underlying URL path stays the same across uploads. `version`
 * should only change when the avatar actually changes (not on every render) —
 * pass a counter bumped explicitly after a successful upload/remove. */
function withVersion(url: string | null | undefined, version: number): string | undefined {
    if (!url) return undefined;
    if (!version) return url;
    return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}

/**
 * Draws the cropped, circular region of `imageSrc` (defined by `cropPixels`,
 * in source-image pixel coordinates from react-easy-crop) onto a canvas and
 * resolves a File ready to upload.
 */
async function getCroppedImageFile(
    imageSrc: string,
    cropPixels: Area,
    fileName: string,
    mimeType: string,
): Promise<File> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    canvas.width = cropPixels.width;
    canvas.height = cropPixels.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(
        image,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        cropPixels.width,
        cropPixels.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
    if (!blob) throw new Error('Failed to generate cropped image');

    return new File([blob], fileName, { type: mimeType });
}

// --- Sub-Components ---

export function UserDeleteModal({
    open,
    onOpenChange,
    userId,
    userName,
}: UserDeleteModalProps) {
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setErrorMessage(null);
        }
    }, [open]);

    const confirmDelete = () => {
        if (!userId) return;

        setProcessing(true);
        setErrorMessage(null);

        router.delete(`/users/${userId}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = page.props.flash as FlashProps;

                if (flash?.error) {
                    setErrorMessage(flash.error);
                } else {
                    onOpenChange(false);
                }
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-black">
                        Confirm Delete
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete user{' '}
                        {userName ? (
                            <span className="font-medium text-foreground">
                                {userName}
                            </span>
                        ) : (
                            'this user'
                        )}
                        ? This action cannot be undone.
                    </p>

                    {errorMessage && (
                        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                            {errorMessage}
                        </p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        onClick={confirmDelete}
                        disabled={processing}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {processing ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Page Component ---

export default function Index({ users }: IndexProps) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Avatar crop/confirm modal state
    const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
    const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
    const [avatarConfirmOpen, setAvatarConfirmOpen] = useState(false);
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixelsValue: Area) => {
        setCroppedAreaPixels(croppedAreaPixelsValue);
    }, []);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
    // Bumped per-user only when their avatar actually changes, so cache-busted
    // image URLs stay stable across unrelated re-renders (search typing, dialogs, etc).
    const [avatarVersions, setAvatarVersions] = useState<Record<number, number>>({});

    const bumpAvatarVersion = useCallback((userId: number) => {
        setAvatarVersions((prev) => ({ ...prev, [userId]: (prev[userId] ?? 0) + 1 }));
    }, []);

    const { data, setData, post, put, reset, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        role: 'staff' as 'admin' | 'staff',
    });

    // Keep the "editing" user's avatar in sync once `users` refreshes after an upload/remove,
    // so the modal's avatar preview reflects the newly reloaded data.
    useEffect(() => {
        if (!editing) return;
        const updated = users.find((u) => u.id === editing.id);
        if (updated && updated.avatar_url !== editing.avatar_url) {
            setEditing(updated);
        }
    }, [users, editing]);

     const filteredUsers = users
         .filter((user) => {
             const term = search.toLowerCase();
             return (
                 user.name.toLowerCase().includes(term) ||
                 user.email.toLowerCase().includes(term)
             );
         })
         .sort((a, b) => {
             const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
             if (roleDiff !== 0) return roleDiff;
            return a.id - b.id;
         });

    function openCreate() {
        setEditing(null);
        setData({
            name: '',
            email: '',
            password: '',
            role: 'staff',
        });
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
        setSaveConfirmOpen(true);
    }

    function handleConfirmSubmit() {
        if (editing) {
            put(`/users/${editing.id}`, {
                onSuccess: () => {
                    setOpen(false);
                    setSaveConfirmOpen(false);
                },
                onError: () => setSaveConfirmOpen(false),
            });
        } else {
            post('/users', {
                onSuccess: () => {
                    setData({
                        name: '',
                        email: '',
                        password: '',
                        role: 'staff',
                    });
                    setOpen(false);
                    setSaveConfirmOpen(false);
                },
                onError: () => setSaveConfirmOpen(false),
            });
        }
    }

    function openDelete(user: User) {
        setDeleteTarget(user);
        setDeleteOpen(true);
    }

    // Stage the picked file and show the crop/confirm modal before actually uploading it
    function stageAvatarFile(file: File) {
        setPendingAvatarFile(file);
        setPendingAvatarPreview(URL.createObjectURL(file));
        setAvatarConfirmOpen(true);
    }

    function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file && editing) stageAvatarFile(file);
    }

    function closeAvatarConfirm() {
        setAvatarConfirmOpen(false);
        if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
        setPendingAvatarFile(null);
        setPendingAvatarPreview(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        if (avatarInputRef.current) avatarInputRef.current.value = '';
    }

    async function handleConfirmAvatarUpload() {
        if (!editing || !pendingAvatarFile || !pendingAvatarPreview || !croppedAreaPixels) return;

        setAvatarUploading(true);
        try {
            const croppedFile = await getCroppedImageFile(
                pendingAvatarPreview,
                croppedAreaPixels,
                pendingAvatarFile.name,
                pendingAvatarFile.type || 'image/jpeg',
            );

            const formData = new FormData();
            formData.append('avatar', croppedFile);

            router.post(`/users/${editing.id}/avatar`, formData, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    bumpAvatarVersion(editing.id);
                    router.reload({ only: ['users'] });
                },
                onFinish: () => {
                    setAvatarUploading(false);
                    closeAvatarConfirm();
                },
            });
        } catch {
            setAvatarUploading(false);
        }
    }

    function handleAvatarRemove() {
        setRemoveConfirmOpen(true);
    }

    function handleConfirmAvatarRemove() {
        if (!editing) return;
        const userId = editing.id;
        setAvatarUploading(true);
        router.delete(`/users/${userId}/avatar`, {
            preserveScroll: true,
            onSuccess: () => {
                bumpAvatarVersion(userId);
                router.reload({ only: ['users'] });
            },
            onFinish: () => {
                setAvatarUploading(false);
                setRemoveConfirmOpen(false);
            },
        });
    }

    function initials(name: string) {
        return name
            .split(' ')
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
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

                {/* User Cards */}
                {filteredUsers.length === 0 ? (
                    <div className="rounded-md border border-border bg-card px-6 py-16 text-center">
                        <p className="text-base font-medium text-muted-foreground">
                            No users found.
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Click <strong>&quot;Add User&quot;</strong> to create your first entry.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="group relative rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-11 shrink-0">
                                            <AvatarImage
                                                key={user.avatar_url ?? 'none'}
                                                src={withVersion(user.avatar_url, avatarVersions[user.id] ?? 0)}
                                                alt={user.name}
                                            />
                                            <AvatarFallback
                                                className="text-sm font-semibold text-white"
                                                style={{ backgroundColor: '#370001' }}
                                            >
                                                {initials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-foreground">
                                                {user.name}
                                            </p>
                                            <Badge
                                                variant={user.role === 'admin' ? 'default' : 'secondary'}
                                                className="mt-1"
                                            >
                                                <ShieldCheck className="mr-1 size-3" />
                                                {user.role.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        {user.is_locked ? (
                                            <span title="Locked account">
                                                <Lock className="size-4 text-muted-foreground" />
                                            </span>
                                        ) : (
                                            <>
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
                                                    onClick={() => openDelete(user)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="size-3.5 shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    if (!next) {
                        setEditing(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Avatar upload — only available once the user exists */}
                        {editing && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <Avatar className="size-20">
                                        <AvatarImage
                                            key={editing.avatar_url ?? 'none'}
                                            src={withVersion(editing.avatar_url, avatarVersions[editing.id] ?? 0)}
                                            alt={editing.name}
                                        />
                                        <AvatarFallback
                                            className="text-lg font-semibold text-white"
                                            style={{ backgroundColor: '#370001' }}
                                        >
                                            {initials(editing.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <button
                                        type="button"
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted"
                                        title="Change photo"
                                    >
                                        <Camera className="size-3.5" />
                                    </button>
                                </div>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarSelect}
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {avatarUploading ? 'Uploading...' : 'JPG, PNG, or WEBP. Max 2MB.'}
                                    </span>
                                    {editing.avatar_url && !avatarUploading && (
                                        <button
                                            type="button"
                                            onClick={handleAvatarRemove}
                                            className="flex items-center gap-0.5 text-xs text-red-600 hover:text-red-800"
                                        >
                                            <X className="size-3" /> Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

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

            {/* Confirm changes before actually saving */}
            <Dialog
                open={saveConfirmOpen}
                onOpenChange={(next) => !processing && setSaveConfirmOpen(next)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Save changes?' : 'Create this user?'}</DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Review the changes before saving them.'
                                : 'Review the details before creating this user.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-sm">
                        {editing ? (
                            <>
                                {data.name !== editing.name && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground">Name</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground line-through">{editing.name}</span>
                                            <span>→</span>
                                            <span className="font-medium">{data.name}</span>
                                        </div>
                                    </div>
                                )}
                                {data.email !== editing.email && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground">Email</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground line-through">{editing.email}</span>
                                            <span>→</span>
                                            <span className="font-medium">{data.email}</span>
                                        </div>
                                    </div>
                                )}
                                {data.role !== editing.role && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground">Role</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground line-through">
                                                {editing.role.toUpperCase()}
                                            </span>
                                            <span>→</span>
                                            <span className="font-medium">{data.role.toUpperCase()}</span>
                                        </div>
                                    </div>
                                )}
                                {data.password && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground">Password</span>
                                        <span className="font-medium">Will be changed</span>
                                    </div>
                                )}
                                {data.name === editing.name &&
                                    data.email === editing.email &&
                                    data.role === editing.role &&
                                    !data.password && (
                                        <p className="text-muted-foreground">No changes made.</p>
                                    )}
                            </>
                        ) : (
                            <>
                                <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Name</span>
                                    <span className="font-medium">{data.name}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Email</span>
                                    <span className="font-medium">{data.email}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Role</span>
                                    <span className="font-medium">{data.role.toUpperCase()}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing}
                            onClick={() => setSaveConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="button" disabled={processing} onClick={handleConfirmSubmit}>
                            {processing && <Loader2 className="size-4 animate-spin" />}
                            {editing ? 'Save changes' : 'Create user'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <UserDeleteModal
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                userId={deleteTarget?.id ?? null}
                userName={deleteTarget?.name ?? null}
            />

            {/* Crop & confirm new avatar before uploading */}
            <Dialog
                open={avatarConfirmOpen}
                onOpenChange={(next) => {
                    if (avatarUploading) return;
                    if (!next) closeAvatarConfirm();
                    else setAvatarConfirmOpen(next);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update profile picture?</DialogTitle>
                        <DialogDescription>
                            Drag to reposition and use the slider to zoom.
                        </DialogDescription>
                    </DialogHeader>

                    {pendingAvatarPreview && (
                        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black/90">
                            <Cropper
                                image={pendingAvatarPreview}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                        <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.01}
                            onValueChange={([value]) => setZoom(value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={avatarUploading}
                            onClick={closeAvatarConfirm}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={avatarUploading || !croppedAreaPixels}
                            onClick={handleConfirmAvatarUpload}
                        >
                            {avatarUploading && <Loader2 className="size-4 animate-spin" />}
                            Save picture
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm avatar removal */}
            <Dialog
                open={removeConfirmOpen}
                onOpenChange={(next) => !avatarUploading && setRemoveConfirmOpen(next)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove profile picture?</DialogTitle>
                        <DialogDescription>
                            This user's profile picture will be removed and replaced with their initials.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={avatarUploading}
                            onClick={() => setRemoveConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={avatarUploading}
                            onClick={handleConfirmAvatarRemove}
                        >
                            {avatarUploading && <Loader2 className="size-4 animate-spin" />}
                            Remove
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