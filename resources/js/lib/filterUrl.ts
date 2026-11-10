export function buildFilterUrl(overrides: Record<string, any> = {}) {
    return {
        ...Object.fromEntries(new URLSearchParams(window.location.search)),
        ...overrides,
    };
}

export function preservePerPage<T extends Record<string, unknown>>(params: T) {
    const perPage = new URLSearchParams(window.location.search).get('per_page');

    return perPage ? { ...params, per_page: perPage } : params;
}