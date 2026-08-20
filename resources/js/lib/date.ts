// resources/js/lib/date.ts

/**
 * Converts a date string (from the backend, in any reasonable format) into
 * a YYYY-MM-DD string safe for <input type="date">.
 *
 * Deliberately avoids `new Date(value).toISOString()` — that round-trips
 * through UTC and can shift the date back a day for timezones ahead of UTC
 * (e.g. PH/UTC+8) whenever the source string has no explicit timezone
 * offset. This uses local date parts instead, so the date shown always
 * matches the date stored.
 */
export function toDateInputValue(value: string | null | undefined): string {
    if (!value) return '';

    // Already in the right shape (e.g. "2024-01-15" or "2024-01-15T00:00:00")
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Number of whole days between two date-only (YYYY-MM-DD) strings.
 * Returns 0 if either date is missing or invalid.
 */
export function daysBetween(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Adds a number of days to a date-only (YYYY-MM-DD) string and returns the
 * result in the same format. Built from local date parts (not UTC/ISO) for
 * the same reason as toDateInputValue — avoids off-by-one shifts.
 * Returns '' if startDate is missing/invalid.
 */
export function addDays(startDate: string, days: number): string {
    if (!startDate) return '';

    const match = startDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return '';

    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (Number.isNaN(date.getTime())) return '';

    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats a date string for display, e.g. "Jan 15, 2024".
 */
export function formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}