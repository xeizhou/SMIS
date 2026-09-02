export function buildFilterUrl(overrides: Record<string, any> = {}) {
    return {
        ...Object.fromEntries(new URLSearchParams(window.location.search)),
        ...overrides,
    };
}