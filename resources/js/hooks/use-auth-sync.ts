import { useEffect } from 'react';
import { router } from '@inertiajs/react';

const LOGOUT_KEY = 'auth:logout-broadcast';

// Call this wherever your logout button/handler lives, instead of
// (or alongside) whatever currently triggers the logout POST request.
export function broadcastLogout() {
    localStorage.setItem(LOGOUT_KEY, Date.now().toString());
}

// Mount this once, high up in the app (e.g. in your main layout),
// so every tab is listening.
export function useAuthSync() {
    useEffect(() => {
        function handleStorage(e: StorageEvent) {
            if (e.key === LOGOUT_KEY) {
                // Another tab logged out. Force this tab to the login page.
                router.visit('/login', { replace: true });
            }
        }
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);
}