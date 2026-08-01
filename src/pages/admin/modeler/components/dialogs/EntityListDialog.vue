<script setup lang="ts" generic="T">
import { ref, watch, nextTick } from 'vue';
import { Dialog, DataTable, Button, InputText, IconField, InputIcon } from 'primevue';
import type { ListQuery, PageResponse } from '@services/api';
import { useTableQuery } from '@/composables/useTableQuery';

/**
 * Shared shell for the modeler's "browse existing X" dialogs.
 *
 * Owns the Dialog chrome, the debounced search box, and server-side paging/sorting;
 * each concrete dialog supplies only its columns and footer. Paging and filtering
 * are server-side — these lists are unbounded per tenant, so the table must never
 * assume it holds the whole collection.
 */
const visible = defineModel<boolean>('visible', { default: false });

const props = withDefaults(defineProps<{
    header: string;
    /** Fetches one page. Always called with an explicit `page`. */
    load: (params: ListQuery & { page: number }) => Promise<PageResponse<T>>;
    emptyText: string;
    /** Columns the server accepts for `sortField`; anything else it ignores. */
    dataKey?: string;
    rows?: number;
    searchPlaceholder?: string;
    width?: string;
}>(), {
    dataKey: 'id',
    rows: 10,
    searchPlaceholder: 'Search…',
    width: '680px',
});

const searchInput = ref<{ $el?: HTMLElement } | null>(null);

// Paging/search/sort live in the shared composable; the dialog owns only the
// chrome around them. `immediate: false` — the first fetch happens on @show.
const {
    items, totalRecords, loading, search, activeSearch,
    firstRow, rowsPerPage, reload, reset, onPage, onSort, clearSearch,
} = useTableQuery<T>({
    load: (params) => props.load(params),
    rows: props.rows,
    immediate: false,
});

watch(visible, (open) => {
    // Reset on close so reopening never shows a stale query or offset.
    if (!open) reset();
});

async function onShow() {
    await reload();
    await nextTick();
    searchInput.value?.$el?.focus();   // type immediately on open
}

defineExpose({ refresh: reload });
</script>

<template>
    <Dialog
        v-model:visible="visible"
        modal
        :header="header"
        :style="{ width }"
        :dismissableMask="true"
        @show="onShow"
    >
        <DataTable
            :value="items"
            :loading="loading"
            :dataKey="dataKey"
            size="small"
            stripedRows
            lazy
            paginator
            :first="firstRow"
            :rows="rowsPerPage"
            :totalRecords="totalRecords"
            :rowsPerPageOptions="[10, 20, 50]"
            @page="onPage"
            @sort="onSort"
        >
            <template #header>
                <div class="flex items-center justify-between gap-3">
                    <IconField>
                        <InputIcon><i class="pi pi-search" /></InputIcon>
                        <InputText
                            ref="searchInput"
                            v-model="search"
                            size="small"
                            :placeholder="searchPlaceholder"
                        />
                    </IconField>

                    <div class="flex items-center gap-2">
                        <span v-if="activeSearch" class="text-xs text-surface-400">
                            {{ totalRecords }} match{{ totalRecords === 1 ? '' : 'es' }}
                        </span>
                        <Button icon="pi pi-refresh" text rounded size="small" severity="secondary"
                            v-tooltip.top="'Refresh'" @click="reload" />
                    </div>
                </div>
            </template>

            <template #empty>
                <div class="text-center py-6 text-surface-400">
                    <template v-if="activeSearch">
                        <div>No matches for &ldquo;{{ activeSearch }}&rdquo;.</div>
                        <Button label="Clear search" text size="small" @click="clearSearch" />
                    </template>
                    <template v-else>{{ emptyText }}</template>
                </div>
            </template>

            <slot name="columns" />
        </DataTable>

        <template #footer>
            <slot name="footer" />
        </template>
    </Dialog>
</template>
