import { Head, router, usePage } from '@inertiajs/react';
import { Camera, Loader2, Trash2, ZoomIn } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { edit, update } from '@/routes/profile';
import type { Auth } from '@/types';

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

type PageProps = {
    auth: Auth;
    mustVerifyEmail: boolean;
    status?: string;
};

export default function Profile() {
    const { auth } = usePage<PageProps>().props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarProcessing, setAvatarProcessing] = useState<'upload' | 'remove' | null>(null);
    const [isDragging, setIsDragging] = useState(false);
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

    // Controlled profile fields (needed so we can show a confirm modal before submitting)
    const [name, setName] = useState(auth.user.name);
    const [email, setEmail] = useState(auth.user.email);
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const hasChanges = name !== auth.user.name || email !== auth.user.email;

    // Stage the picked file and show a confirm modal before actually uploading it
    const stageAvatarFile = (file: File) => {
        setPendingAvatarFile(file);
        setPendingAvatarPreview(URL.createObjectURL(file));
        setAvatarConfirmOpen(true);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) stageAvatarFile(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) stageAvatarFile(file);
    };

    const closeAvatarConfirm = () => {
        setAvatarConfirmOpen(false);
        if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
        setPendingAvatarFile(null);
        setPendingAvatarPreview(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmAvatarUpload = async () => {
        if (!pendingAvatarFile || !pendingAvatarPreview || !croppedAreaPixels) return;

        setAvatarProcessing('upload');
        try {
            const croppedFile = await getCroppedImageFile(
                pendingAvatarPreview,
                croppedAreaPixels,
                pendingAvatarFile.name,
                pendingAvatarFile.type || 'image/jpeg',
            );

            const formData = new FormData();
            formData.append('avatar', croppedFile);

            router.post('/settings/profile/avatar', formData, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload();
                },
                onFinish: () => {
                    setAvatarProcessing(null);
                    closeAvatarConfirm();
                },
            });
        } catch {
            setAvatarProcessing(null);
        }
    };

    const handleAvatarRemove = () => {
        setRemoveConfirmOpen(true);
    };

    const handleConfirmAvatarRemove = () => {
        setAvatarProcessing('remove');
        router.delete('/settings/profile/avatar', {
            preserveScroll: true,
            onSuccess: () => {
                router.reload();
            },
            onFinish: () => {
                setAvatarProcessing(null);
                setRemoveConfirmOpen(false);
            },
        });
    };

    const isBusy = avatarProcessing !== null;

    // "Save" button just opens the confirm modal (or submits directly if nothing changed)
    const handleSaveClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasChanges) return;
        setConfirmOpen(true);
    };

    // Actual submit only happens once the user confirms in the modal
    const handleConfirmSave = () => {
        setProcessing(true);
        setRecentlySuccessful(false);
        router.patch(
            update(),
            { name, email },
            {
                preserveScroll: true,
                onSuccess: () => setRecentlySuccessful(true),
                onError: (err) => setErrors(err as { name?: string; email?: string }),
                onFinish: () => {
                    setProcessing(false);
                    setConfirmOpen(false);
                },
            },
        );
    };

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile"
                    description="Update your profile picture, username, and email"
                />

                <div className="rounded-xl border border-border bg-card p-6">
                    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => !isBusy && fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            className={`group relative size-24 shrink-0 cursor-pointer rounded-full outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-ring ${
                                isDragging ? 'ring-2 ring-primary' : ''
                            }`}
                        >
                            {auth.user.avatar_url ? (
                                <img
                                    key={String(auth.user.avatar_url)}
                                    src={`${String(auth.user.avatar_url)}${
                                        String(auth.user.avatar_url).includes('?') ? '&' : '?'
                                    }v=${Date.now()}`}
                                    alt={auth.user.name}
                                    className="size-24 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex size-24 items-center justify-center rounded-full bg-gray-200 text-2xl font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    {auth.user.name.charAt(0).toUpperCase()}
                                </div>
                            )}

                            <div
                                className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity ${
                                    isBusy || isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                            >
                                {avatarProcessing === 'upload' ? (
                                    <Loader2 className="size-6 animate-spin" />
                                ) : (
                                    <Camera className="size-6" />
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                onChange={handleAvatarChange}
                                disabled={isBusy}
                            />
                        </div>

                        <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
                            <p className="text-sm font-medium text-foreground">{auth.user.name}</p>
                            <p className="text-xs text-muted-foreground">
                                Click or drag a photo onto your picture to update it — JPG, PNG or WEBP, max 2MB.
                            </p>
                            <div className="mt-1 flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {avatarProcessing === 'upload' ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Camera className="size-4" />
                                    )}
                                    Change picture
                                </Button>
                                {Boolean(auth.user.avatar_url) && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={isBusy}
                                        onClick={handleAvatarRemove}
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        {avatarProcessing === 'remove' ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="size-4" />
                                        )}
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                    <form onSubmit={handleSaveClick} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Username</Label>
                            <Input
                                id="name"
                                name="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                maxLength={255}
                                pattern="[a-zA-Z0-9_. ]+"
                                title="Letters, numbers, underscores, periods, and spaces only"
                                autoComplete="username"
                                placeholder="Username"
                            />
                            <InputError message={errors.name} />
                            <p className="text-xs text-muted-foreground">
                                Letters, numbers, underscores, periods, and spaces only.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                maxLength={255}
                                autoComplete="email"
                                placeholder="Email address"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={processing || !hasChanges}>
                                {processing && <Loader2 className="size-4 animate-spin" />}
                                Save
                            </Button>
                            {recentlySuccessful && (
                                <p className="text-sm text-muted-foreground">Saved.</p>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Confirm new avatar before uploading */}
            <Dialog
                open={avatarConfirmOpen}
                onOpenChange={(open) => {
                    if (avatarProcessing) return;
                    if (!open) closeAvatarConfirm();
                    else setAvatarConfirmOpen(open);
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
                            disabled={avatarProcessing === 'upload'}
                            onClick={closeAvatarConfirm}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={avatarProcessing === 'upload' || !croppedAreaPixels}
                            onClick={handleConfirmAvatarUpload}
                        >
                            {avatarProcessing === 'upload' && <Loader2 className="size-4 animate-spin" />}
                            Save picture
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm avatar removal */}
            <Dialog
                open={removeConfirmOpen}
                onOpenChange={(open) => avatarProcessing !== 'remove' && setRemoveConfirmOpen(open)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove profile picture?</DialogTitle>
                        <DialogDescription>
                            Your profile picture will be removed and replaced with your initials.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={avatarProcessing === 'remove'}
                            onClick={() => setRemoveConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={avatarProcessing === 'remove'}
                            onClick={handleConfirmAvatarRemove}
                        >
                            {avatarProcessing === 'remove' && <Loader2 className="size-4 animate-spin" />}
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Facebook-style confirm modal */}
            <Dialog open={confirmOpen} onOpenChange={(open) => !processing && setConfirmOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save changes?</DialogTitle>
                        <DialogDescription>
                            Review your changes before saving them to your profile.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-sm">
                        {name !== auth.user.name && (
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">Username</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground line-through">{auth.user.name}</span>
                                    <span>→</span>
                                    <span className="font-medium">{name}</span>
                                </div>
                            </div>
                        )}
                        {email !== auth.user.email && (
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">Email</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground line-through">{auth.user.email}</span>
                                    <span>→</span>
                                    <span className="font-medium">{email}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing}
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="button" disabled={processing} onClick={handleConfirmSave}>
                            {processing && <Loader2 className="size-4 animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};