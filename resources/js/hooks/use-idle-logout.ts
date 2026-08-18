import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
const DEFAULT_LIFETIME_MINUTES = 120;

/**
 * Redirects to /login after SESSION_LIFETIME minutes of true inactivity.
 *
 * "Activity" includes both real user interaction (mouse/keyboard/scroll)
 * AND any successful Inertia visit — which covers usePoll pages, since
 * usePoll calls router.reload() under the hood, firing router.on('success').
 * That means dashboards that poll every 5s effectively never idle out on
 * their own, which is the intended behavior for those pages.
 *
 * This hook is mounted in withApp() — outside Inertia's own <App>
 * component — so usePage() isn't available here. Instead: read the
 * initial value from the data-page attribute Inertia embeds in the root
 * element on first load, then keep it updated via router.on('success'),
 * whose event payload includes the current page props.
 */
export function useIdleLogout() {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const lifetimeMinutesRef = useRef<number>(DEFAULT_LIFETIME_MINUTES);

    useEffect(() => {
        // Seed from the initial server-rendered page payload.
        try {
            const rootEl = document.getElementById('app');
            const raw = rootEl?.getAttribute('data-page');
            if (raw) {
                const initialProps = JSON.parse(raw)?.props as
                    | { sessionLifetimeMinutes?: number }
                    | undefined;
                if (initialProps?.sessionLifetimeMinutes) {
                    lifetimeMinutesRef.current = initialProps.sessionLifetimeMinutes;
                }
            }
        } catch {
            // Keep the default if parsing fails for any reason.
        }

        function resetTimer() {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(handleIdle, lifetimeMinutesRef.current * 60 * 1000);
        }

        async function handleIdle() {
            // Confirm the session is actually dead server-side before
            // redirecting — don't trust the client clock alone (tab could
            // have been backgrounded/throttled, or the timer could drift).
            try {
                const res = await fetch(window.location.pathname, {
                    method: 'GET',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'include',
                    redirect: 'manual',
                });

                // opaqueredirect happens when the server tried to redirect
                // us (e.g. to /login) — that confirms the session is gone.
                if (res.type === 'opaqueredirect' || res.status === 401 || res.status === 419) {
                    window.location.href = '/login?expired=1';
                    return;
                }
            } catch {
                // Network hiccup — don't force a redirect on a fluke.
            }

            resetTimer();
        }

        // Keep the lifetime value fresh on every successful navigation.
        const removeSuccessListener = router.on('success', (event) => {
            const props = (event as unknown as { detail?: { page?: { props?: { sessionLifetimeMinutes?: number } } } })
                .detail?.page?.props;
            if (props?.sessionLifetimeMinutes) {
                lifetimeMinutesRef.current = props.sessionLifetimeMinutes;
            }
            resetTimer();
        });

        ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            removeSuccessListener();
            ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);
}