import { createInertiaApp, router } from '@inertiajs/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { useAuthSync } from '@/hooks/use-auth-sync';
import { useIdleLogout } from '@/hooks/use-idle-logout';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { GlobalLoader } from '@/components/global-loader';
import '@/lib/i18n';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

const queryClient = new QueryClient();

import { toast } from 'sonner';

// Fires when a response isn't a valid Inertia response — e.g. the server
// returned an HTML error page (404, 403, 500), raw exception, or session expired.
// We intercept this so users never see raw Laravel exception pages or stack traces.
router.on('invalid', (event) => {
    const detail = event.detail as {
        response?: { status?: number; data?: any };
    };
    const status = detail?.response?.status;

    if (status === 401 || status === 419) {
        event.preventDefault();
        window.location.href = status === 419 ? '/login?expired=1' : '/login';
        return;
    }

    // Prevent Inertia from rendering the raw Laravel error modal iframe
    event.preventDefault();

    // 422 Unprocessable Content indicates validation errors, which are already
    // handled specifically by Inertia's 'error' event and form inputs. Suppress duplicate alert.
    if (status === 422) {
        return;
    }

    let safeMessage =
        'An error occurred while processing your request. Please try again.';
    if (status === 403) {
        safeMessage = 'You do not have permission to perform this action.';
    } else if (status === 404) {
        safeMessage = 'The requested record or page was not found.';
    } else if (status === 413) {
        safeMessage =
            'The uploaded file exceeds the allowed size. Please upload a smaller file.';
    } else if (status === 429) {
        safeMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (status && status >= 500) {
        safeMessage = 'A server error occurred. Please try again later.';
    } else if (typeof detail?.response?.data?.message === 'string') {
        const msg = detail.response.data.message;
        const lower = msg.toLowerCase();
        if (
            !lower.includes('sqlstate') &&
            !lower.includes('stack trace') &&
            !lower.includes('pdoexception') &&
            !lower.includes('fatal error')
        ) {
            safeMessage = msg;
        }
    }

    toast.error(safeMessage, { id: 'network-or-server-invalid-error' });
});

router.on('exception', (event) => {
    event.preventDefault();
    toast.error(
        'Network Error: Unable to communicate with the server. Please check your connection.',
        { id: 'network-exception-error' },
    );
});

function AppRoot({ app }: { app: React.ReactNode }) {
    useAuthSync();
    useIdleLogout();
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
                <GlobalLoader />
            </TooltipProvider>
        </QueryClientProvider>
    );
}

// Inertia intercepts popstate (Back/Forward) internally and restores the
// cached page from window.history.state without making a network request.
// That means logged-out state never gets checked on Back. Force a real
// reload on every popstate so it always hits Laravel/auth middleware.
if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
        window.location.reload();
    });
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob<any>('./pages/**/*.tsx'),
        ),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return <AppRoot app={app} />;
    },
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();
