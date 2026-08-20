import { Form, Head, router, usePage } from '@inertiajs/react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit, update } from '@/routes/profile';
import type { Auth } from '@/types';

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

    const uploadAvatar = (file: File) => {
        const formData = new FormData();
        formData.append('avatar', file);

        setAvatarProcessing('upload');
        router.post('/settings/profile/avatar', formData, {
            preserveScroll: true,
            onFinish: () => {
                setAvatarProcessing(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadAvatar(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) uploadAvatar(file);
    };

    const handleAvatarRemove = () => {
        setAvatarProcessing('remove');
        router.delete('/settings/profile/avatar', {
            preserveScroll: true,
            onFinish: () => setAvatarProcessing(null),
        });
    };

    const isBusy = avatarProcessing !== null;

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
                                    src={auth.user.avatar_url}
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
                                {auth.user.avatar_url && (
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
                    <Form
                        method="patch"
                        action={update()}
                        options={{ preserveScroll: true }}
                        className="space-y-4"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Username</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={auth.user.name}
                                        required
                                        maxLength={255}
                                        pattern="[a-zA-Z0-9_]+"
                                        title="Letters, numbers, and underscores only"
                                        autoComplete="username"
                                        placeholder="Username"
                                    />
                                    <InputError message={errors.name} />
                                    <p className="text-xs text-muted-foreground">
                                        Letters, numbers, and underscores only.
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        defaultValue={auth.user.email}
                                        required
                                        maxLength={255}
                                        autoComplete="email"
                                        placeholder="Email address"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Loader2 className="size-4 animate-spin" />}
                                        Save
                                    </Button>
                                    {recentlySuccessful && (
                                        <p className="text-sm text-muted-foreground">Saved.</p>
                                    )}
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </div>
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