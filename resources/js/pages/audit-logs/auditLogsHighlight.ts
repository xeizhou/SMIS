import { router } from '@inertiajs/react';

/**
 * Shared utility to highlight and auto-scroll to a specific record (row or task card)
 * in any module after navigation.
 * 
 * Used across:
 * - Purchase Orders (/purchase-orders)
 * - Delivery Monitoring (/deliveries)
 * - PO Letter Monitoring (/po-letter-monitoring)
 * - Notice of Delivery (/notice-of-delivery)
 * - Assigned Tasks & Dashboard Action Center (/dashboard)
 * - System Audit Logs (/audit-logs)
 * - My Activity (/my-activity)
 * - All inventory and monitoring modules using SortableTable or paginateWithHighlight
 * 
 * Features:
 * 1. Multi-stage auto-scroll: Scrolls smoothly and centers the target element in viewport
 *    and inside any scroll containers (Radix ScrollArea, main layout, overflow tables).
 *    Executes staggered scrolls (0ms, 120ms, 300ms, 600ms, 900ms) so table animations
 *    (e.g., animate-row-in) and layout adjustments do not push bottom records out of view.
 * 2. High-visibility highlight: Flash-highlights the record and its cells for 3 seconds.
 * 3. URL cleanup: Cleans highlight query params while preserving active page pagination.
 * 4. DOM resilience: Uses MutationObserver if the element is still rendering or behind tab switches.
 */
export function auditLogsHighlight(recordId: string, expectedPath: string) {
    if (!recordId) return;

    let executed = false;

    const handleHighlight = () => {
        if (executed) return;

        // Guard against interrupted/stale navigations: Ensure we are actually on the target module.
        if (!window.location.pathname.startsWith(expectedPath)) {
            return;
        }

        let timeoutId: NodeJS.Timeout;

        const scrollIntoViewSmooth = (element: Element) => {
            const performScroll = () => {
                try {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest',
                    });
                } catch {
                    try {
                        element.scrollIntoView();
                    } catch {}
                }

                // Scroll any scrollable parent containers (Radix ScrollArea, main sidebar-inset, etc.)
                try {
                    let parent = element.parentElement;
                    while (parent && parent !== document.body && parent !== document.documentElement) {
                        const style = window.getComputedStyle(parent);
                        const overflowY = style.overflowY;
                        const isScrollable =
                            (overflowY === 'auto' || overflowY === 'scroll') &&
                            parent.scrollHeight > parent.clientHeight;

                        if (isScrollable) {
                            const parentRect = parent.getBoundingClientRect();
                            const elemRect = element.getBoundingClientRect();
                            const relativeTop = elemRect.top - parentRect.top;
                            const targetScrollTop =
                                parent.scrollTop + relativeTop - (parent.clientHeight / 2) + (elemRect.height / 2);

                            parent.scrollTo({
                                top: Math.max(0, targetScrollTop),
                                behavior: 'smooth',
                            });
                        }
                        parent = parent.parentElement;
                    }
                } catch {}
            };

            // Multi-stage staggered execution:
            // Ensures records at the bottom of the page or in delayed animated tables
            // settle dead-center even after preceding rows finish animating in.
            performScroll();
            setTimeout(performScroll, 120);
            setTimeout(performScroll, 300);
            setTimeout(performScroll, 600);
            setTimeout(performScroll, 900);
        };

        const highlightElement = (element: Element) => {
            element.classList.add(
                '!bg-yellow-100',
                '!dark:bg-yellow-900/40',
                '!border-amber-400',
                'ring-2',
                'ring-amber-400/60',
                'transition-all',
                'duration-700'
            );

            if (element.tagName === 'TR') {
                Array.from(element.children).forEach(child => {
                    child.classList.add('!bg-yellow-100', '!dark:bg-yellow-900/40');
                });
            }

            // Clean the URL so a manual page refresh doesn't retain the highlight filter,
            // but preserve the 'page' parameter so we stay on the correct pagination page!
            if (window.location.search) {
                const url = new URL(window.location.href);
                const page = url.searchParams.get('page');

                url.search = '';
                if (page) {
                    url.searchParams.set('page', page);
                }

                window.history.replaceState({}, '', url.pathname + url.search);
            }

            // Remove the highlight after 3 seconds
            setTimeout(() => {
                element.classList.remove(
                    '!bg-yellow-100',
                    '!dark:bg-yellow-900/40',
                    '!border-amber-400',
                    'ring-2',
                    'ring-amber-400/60'
                );

                if (element.tagName === 'TR') {
                    Array.from(element.children).forEach(child => {
                        child.classList.remove('!bg-yellow-100', '!dark:bg-yellow-900/40');
                    });
                }
            }, 3000);
        };

        const checkDOM = () => {
            const rawId = String(recordId);
            const cleanId = rawId.replace(/^task-/, '');

            const safeEscape = (val: string) => {
                if (typeof window !== 'undefined' && window.CSS && window.CSS.escape) {
                    return window.CSS.escape(val);
                }
                return val.replace(/["\\]/g, '\\$&');
            };

            const escRaw = safeEscape(rawId);
            const escClean = safeEscape(cleanId);

            const selector = [
                `[data-record-id="${escRaw}"]`,
                `[data-record-id="${escClean}"]`,
                `[data-record-id="task-${escClean}"]`,
                `[data-task-id="${escClean}"]`,
                `[data-task-id="${escRaw}"]`,
                `[data-search-0="${escRaw}"]`,
                `[data-search-1="${escRaw}"]`,
                `[data-search-2="${escRaw}"]`,
                `#task-${escClean}`,
                `#task-${escRaw}`,
            ].join(', ');

            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                executed = true;
                scrollIntoViewSmooth(elements[0]);
                elements.forEach(el => highlightElement(el));
                return true;
            }
            return false;
        };

        // If the element is not immediately in the DOM (e.g. still rendering or in a tab), observe mutations.
        if (!checkDOM()) {
            const observer = new MutationObserver((_mutations, obs) => {
                if (checkDOM()) {
                    obs.disconnect();
                    clearTimeout(timeoutId);
                }
            });

            const targetNode = document.getElementById('app') || document.body;
            observer.observe(targetNode, { childList: true, subtree: true });

            // Stop observing after 6 seconds to avoid memory leaks
            timeoutId = setTimeout(() => {
                observer.disconnect();
            }, 6000);
        }
    };

    // If we are already on the expected path, attempt highlight immediately
    if (typeof window !== 'undefined' && window.location.pathname.startsWith(expectedPath)) {
        setTimeout(handleHighlight, 50);
    }

    // Hook into Inertia's finish event for page transitions
    const removeListener = router.on('finish', () => {
        removeListener();
        setTimeout(handleHighlight, 50);
    });
}

/**
 * Automatically inspects the current URL for any highlight parameter on page load
 * and triggers highlight & scroll if found.
 */
export function initHighlightFromUrl() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const highlightId =
        params.get('highlight_id') ||
        params.get('highlight_task_id') ||
        params.get('highlight_search');

    if (highlightId) {
        auditLogsHighlight(highlightId, window.location.pathname);
    }
}

// Auto-run on client-side initial load
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initHighlightFromUrl());
    } else {
        setTimeout(initHighlightFromUrl, 80);
    }
}
