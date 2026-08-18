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
import "@/lib/i18n";

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

const queryClient = new QueryClient();

// Fires when a response isn't a valid Inertia response — e.g. the server
// redirected to /login because the session died mid-request (expired,
// force-logged-out by an admin, CSRF token stale, etc). Without this,
// the tab just sits there until the user clicks something.
router.on('invalid', (event) => {
    const status = (event.detail as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 419) {
        // Without this, Inertia's default behavior renders the raw
        // Laravel error page (the "Page Expired" whoops screen) in a
        // modal overlay before our redirect below has a chance to run.
        event.preventDefault();
        window.location.href = status === 419 ? '/login?expired=1' : '/login';
    }
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
window.addEventListener('popstate', () => {
    window.location.reload();
});

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