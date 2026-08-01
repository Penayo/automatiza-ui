import { ref, computed, watch, onScopeDispose, type Ref } from 'vue';
import type { DataTableSortEvent } from 'primevue/datatable';
import type { ListQuery, PageResponse, StringFilter } from '@services/api';

/** Mirrors DEFAULT_ROWS_PER_PAGE in the engine's common/query/page-query.ts. */
export const DEFAULT_ROWS_PER_PAGE = 15;

/** The API caps rowsPerPage at 100 (@Max on BaseRequestDto); asking for more is a 400. */
export const ROWS_PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

const SEARCH_DEBOUNCE_MS = 300;

export interface TableQueryOptions<T> {
    /** Fetches one page. Always called with an explicit `page`. */
    load: (params: ListQuery & { page: number }) => Promise<PageResponse<T>>;
    rows?: number;
    /**
     * Nested per-field filters, serialized as filter[field][like]=…
     * A getter rather than a value so chip/dropdown state stays reactive.
     */
    filter?: () => Record<string, StringFilter | undefined> | undefined;
    /** Flat query params outside the shared filter shape, e.g. decisions' `deployed`. */
    extraParams?: () => Record<string, unknown>;
    /** Fetch on creation. Dialogs defer to their own @show handler instead. */
    immediate?: boolean;
}

/**
 * Server-side paging, search and sorting for a lazy PrimeVue DataTable.
 *
 * These collections are unbounded per tenant, so the table must never assume it
 * holds the whole collection: every narrowing (search, filter, sort) is a new
 * request, and `totalRecords` comes from the server rather than `items.length`.
 */
export function useTableQuery<T>(options: TableQueryOptions<T>) {
    const items        = ref<T[]>([]) as Ref<T[]>;
    const totalRecords = ref(0);
    const loading      = ref(false);
    const search       = ref('');
    const page         = ref(1);
    const rowsPerPage  = ref(options.rows ?? DEFAULT_ROWS_PER_PAGE);
    const sortField    = ref<string | undefined>();
    const sortOrder    = ref<1 | -1 | undefined>();

    // A fast typist has several requests in flight; only the newest may write state.
    let requestSeq = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const activeSearch = computed(() => search.value.trim());
    const firstRow     = computed(() => (page.value - 1) * rowsPerPage.value);

    /** Refetch at the current offset. Used by search/sort/paging and after a mutation. */
    async function reload() {
        const seq = ++requestSeq;
        loading.value = true;

        try {
            const result = await options.load({
                page: page.value,
                rowsPerPage: rowsPerPage.value,
                search: activeSearch.value || undefined,
                sortField: sortField.value,
                sortOrder: sortOrder.value,
                filter: options.filter?.(),
                ...(options.extraParams?.() ?? {}),
            });

            if (seq !== requestSeq) return;   // superseded by a newer request

            items.value        = result.rows ?? [];
            totalRecords.value = result.totalRecords ?? 0;
        } finally {
            if (seq === requestSeq) loading.value = false;
        }
    }

    /** Refetch from the first page — any narrowing invalidates the old offset. */
    async function fetchPage() {
        page.value = 1;
        return reload();
    }

    function onPage(event: { page: number; rows: number }) {
        page.value        = event.page + 1;   // PrimeVue is 0-based, the API is 1-based
        rowsPerPage.value = event.rows;
        reload();
    }

    function onSort(event: DataTableSortEvent) {
        // PrimeVue types sortField as string | ((item) => string): a function-valued
        // sort key has no server-side equivalent, so fall back to the default sort.
        sortField.value = typeof event.sortField === 'string' ? event.sortField : undefined;
        sortOrder.value = event.sortOrder === -1 ? -1 : event.sortOrder === 1 ? 1 : undefined;
        fetchPage();
    }

    function clearSearch() {
        search.value = '';
    }

    /** Clear pending work so a torn-down component can't write state or refetch. */
    function cancelPending() {
        clearTimeout(debounceTimer);
        requestSeq++;
    }

    /** Back to a pristine query — used by dialogs that reset on close. */
    function reset() {
        cancelPending();
        search.value = '';
        page.value = 1;
        sortField.value = undefined;
        sortOrder.value = undefined;
    }

    watch(search, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchPage, SEARCH_DEBOUNCE_MS);
    });

    // Filters apply immediately — unlike typing, a chip click is a single deliberate act.
    if (options.filter || options.extraParams) {
        watch(
            () => JSON.stringify([options.filter?.(), options.extraParams?.()]),
            (next, prev) => { if (next !== prev) fetchPage(); },
        );
    }

    onScopeDispose(cancelPending);

    if (options.immediate !== false) void reload();

    return {
        items,
        totalRecords,
        loading,
        search,
        activeSearch,
        page,
        rowsPerPage,
        firstRow,
        sortField,
        sortOrder,
        fetchPage,
        reload,
        reset,
        onPage,
        onSort,
        clearSearch,
    };
}
