import { router } from '@inertiajs/react';

export function auditLogsHighlight(recordId: string, expectedPath: string) {
    const removeListener = router.on('finish', (event) => {
        removeListener();

        // Guard against interrupted/stale navigations
        if (!window.location.pathname.startsWith(expectedPath)) {
            return;
        }

        let timeoutId: NodeJS.Timeout;

        const highlightElement = (element: Element) => {
            element.classList.add('!bg-yellow-100', '!dark:bg-yellow-900/40', 'transition-colors', 'duration-1000');
            
            // Clean the URL so a manual page refresh doesn't retain the highlight filter,
            // but preserve the 'page' parameter so we stay on the correct pagination page!
            if (window.location.search) {
                const url = new URL(window.location.href);
                const page = url.searchParams.get('page');
                
                // Clear all search params to remove the highlight trigger
                url.search = '';
                
                // Restore page if it existed
                if (page) {
                    url.searchParams.set('page', page);
                }
                
                window.history.replaceState({}, '', url.pathname + url.search);
            }

            setTimeout(() => {
                element.classList.remove('!bg-yellow-100', '!dark:bg-yellow-900/40');
            }, 3000);
        };

        const checkDOM = () => {
            const selector = `[data-record-id="${recordId}"], [data-search-0="${recordId}"], [data-search-1="${recordId}"], [data-search-2="${recordId}"]`;
            const rows = document.querySelectorAll(selector);
            if (rows.length > 0) {
                rows.forEach(row => highlightElement(row));
                return true;
            }
            return false;
        };

        if (!checkDOM()) {
            const observer = new MutationObserver((mutations, obs) => {
                if (checkDOM()) {
                    obs.disconnect();
                    clearTimeout(timeoutId);
                }
            });

            const targetNode = document.getElementById('app') || document.body;
            observer.observe(targetNode, { childList: true, subtree: true });

            timeoutId = setTimeout(() => {
                observer.disconnect();
            }, 5000);
        }
    });
}
