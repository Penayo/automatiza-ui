import { computed, type Ref } from 'vue';
import type { ProcessInstance } from '@services/ProcessesService';
import type { PageResponse } from '@services/api';

/**
 * The business-key column of an instance list (process-instance-runtime spec §6a).
 * The engine resolves each row's key when the page is read. The column is headed by
 * correlationLabel when every row on the page shares it; with mixed processes it is
 * "Business key" and each cell carries its own label.
 *
 * `tableKey` changes when the column appears or disappears: bind it as the
 * DataTable's `:key` so the table remounts and picks the column up reliably.
 */
export function useBusinessKeyColumn(page: Ref<PageResponse<ProcessInstance> | undefined>) {
    const hasBusinessKey = (row: ProcessInstance) =>
        !!(row.processInfo?.correlationKey || row.processInfo?.correlationDisplay);

    const businessKeyText = (row: ProcessInstance) =>
        row.processInfo?.correlationDisplay ?? row.processInfo?.correlationValue ?? null;

    const labels = computed(() => new Set(
        (page.value?.rows ?? []).filter(hasBusinessKey).map(row => row.processInfo?.correlationLabel ?? ''),
    ));

    const showBusinessKey = computed(() => labels.value.size > 0);
    const sharedLabel = computed(() => (labels.value.size === 1 ? [...labels.value][0] || null : null));
    const header = computed(() => sharedLabel.value ?? 'Business key');
    const cellLabel = (row: ProcessInstance) =>
        sharedLabel.value ? null : row.processInfo?.correlationLabel ?? null;
    const tableKey = computed(() => (showBusinessKey.value ? 'with-business-key' : 'plain'));

    return { hasBusinessKey, businessKeyText, showBusinessKey, header, cellLabel, tableKey };
}
