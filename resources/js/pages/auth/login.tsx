import { Form, Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

// Runs once when this module is first evaluated (module bodies execute
// exactly once per page load) — deliberately kept OUTSIDE the component
// and out of a useEffect. React 18 StrictMode double-invokes effects in
// dev (mount -> cleanup -> mount again), which would otherwise strip the
// query param on the first pass and leave the second pass reading a
// blank URL, silently dropping the message.
let initialExpiredMessage: string | null = null;
if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
        initialExpiredMessage = 'You were logged out due to inactivity. Please log in again.';

        // Clean the URL so a refresh doesn't keep showing the message.
        params.delete('expired');
        const newUrl =
            window.location.pathname +
            (params.toString() ? `?${params.toString()}` : '') +
            window.location.hash;
        window.history.replaceState({}, '', newUrl);
    }
}

export default function Login({ status, canResetPassword }: Props) {
    const { flash } = usePage<{ flash: { error?: string } }>().props;
    const [expiredMessage] = useState<string | null>(initialExpiredMessage);

    const bannerMessage = flash?.error ?? expiredMessage;

    return (
        <>
            <Head title="Log in" />

            <PasskeyVerify />

            {bannerMessage && (
                <div className="mb-4 rounded-md border border-white bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-white">
                    {bannerMessage}
                </div>
            )}

            <Form
                action={store.url()}
                method="post"
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="border-white/40 data-[state=checked]:!border-[#0075FF] data-[state=checked]:!bg-[#0075FF] data-[state=checked]:[&_svg]:text-white"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="cursor-pointer"
                                >
                                    Remember me
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
};