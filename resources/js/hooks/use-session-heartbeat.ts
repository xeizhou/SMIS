import { useEffect } from 'react';

const HEARTBEAT_INTERVAL_MS = 15 * 1000; // well under STALE_CLAIM_AFTER_SECONDS (30s)

function getXsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Keeps this session's last_activity fresh while the tab is open and in
 * the foreground, so claimSession() can tell a genuinely open tab apart
 * from a closed/crashed one — usually within ~30s instead of waiting out
 * the full SESSION_LIFETIME.
 *
 * Deliberately paused while the tab is hidden/backgrounded: a
 * backgrounded tab isn't "in use," and letting heartbeats continue there
 * would mean someone with 10 background tabs never frees their session
 * slot even though they're actively using none of them.
 */
export function useSessionHeartbeat() {
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;

        function ping() {
            if (document.visibilityState !== 'visible') return;
            fetch('/heartbeat', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                credentials: 'include',
            }).catch(() => {
                // Ignore — a missed heartbeat just means this session goes
                // stale a little sooner than ideal; not worth surfacing.
            }); 
        }

        function handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                ping();
                interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
            } else if (interval) {
                clearInterval(interval);
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        if (document.visibilityState === 'visible') {
            interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
            ping();
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (interval) clearInterval(interval);
        };
    }, []);
}