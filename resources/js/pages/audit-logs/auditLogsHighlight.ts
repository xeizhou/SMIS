import { router } from '@inertiajs/react';

/**
 * Shared utility to highlight a specific record (row) in a module after navigation.
 * 
 * Used by: System Audit Logs, My Activity, Notifications, and Dashboards.
 * 
 * How it works:
 * 1. It hooks into Inertia's 'finish' event to run after the target module/page has loaded.
 * 2. It searches the DOM for an element containing the specific recordId (usually a table row 
 *    with `data-record-id`, which SortableTable automatically applies).
 * 3. It briefly flashes the background color of the element so the user sees exactly what record
 *    the activity belongs to.
 * 4. It cleans up the URL so a manual page refresh doesn't trigger the highlight again, but
 *    preserves pagination parameters so the user isn't kicked back to page 1.
 * 
 * Pagination handling:
 * - If the target record is not on page 1, the backend (AppServiceProvider's `paginateWithHighlight` macro)
 *   will automatically detect which page it's on and append `?page=X` to the URL.
 * - The frontend then lands on the correct page, and this script finds the element and highlights it.
 * 
 * Module-specific configuration:
 * - The `expectedPath` parameter ensures we don't accidentally highlight a record if the user
 *   cancels navigation or if the navigation is interrupted before reaching the target module.
 */
export function auditLogsHighlight(recordId: string, expectedPath: string) {
    const removeListener = router.on('finish', (event) => {
        removeListener();

        // Guard against interrupted/stale navigations: Ensure we are actually on the target module.
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

            // Remove the highlight after 3 seconds
            setTimeout(() => {
                element.classList.remove('!bg-yellow-100', '!dark:bg-yellow-900/40');
            }, 3000);
        };

        const checkDOM = () => {
            // Support multiple data attributes depending on how the table was rendered.
            // SortableTable uses `data-record-id`. Others may use `data-search-*`.
            const selector = `[data-record-id="${recordId}"], [data-search-0="${recordId}"], [data-search-1="${recordId}"], [data-search-2="${recordId}"]`;
            const rows = document.querySelectorAll(selector);
            if (rows.length > 0) {
                rows.forEach(row => highlightElement(row));
                return true;
            }
            return false;
        };

        // If the element is not immediately in the DOM (e.g. still rendering), observe mutations.
        if (!checkDOM()) {
            const observer = new MutationObserver((mutations, obs) => {
                if (checkDOM()) {
                    obs.disconnect();
                    clearTimeout(timeoutId);
                }
            });

            const targetNode = document.getElementById('app') || document.body;
            observer.observe(targetNode, { childList: true, subtree: true });

            // Stop observing after 5 seconds to avoid memory leaks if the record was deleted
            // or simply doesn't exist on the page.
            timeoutId = setTimeout(() => {
                observer.disconnect();
            }, 5000);
        }
    });
}
