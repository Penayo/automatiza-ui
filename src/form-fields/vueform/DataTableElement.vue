<template>
    <component :is="elementLayout" ref="container">
        <template #element>
            <div class="vf-table" :class="{ 'vf-table--dense': dense }">
                <p v-if="!resolvedColumns.length" class="vf-table-empty">
                    No columns configured.
                </p>

                <div v-else class="vf-table-scroll">
                    <table class="vf-table-el" :class="{ 'vf-table-el--striped': striped }">
                        <thead>
                            <tr>
                                <th
                                    v-for="col in resolvedColumns"
                                    :key="col.key"
                                    :style="col.align ? { textAlign: col.align } : undefined"
                                >{{ col.label }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="!resolvedRows.length">
                                <td :colspan="resolvedColumns.length" class="vf-table-empty-cell">
                                    {{ emptyText || 'No data.' }}
                                </td>
                            </tr>
                            <tr v-for="(row, index) in resolvedRows" :key="index">
                                <td
                                    v-for="col in resolvedColumns"
                                    :key="col.key"
                                    :style="col.align ? { textAlign: col.align } : undefined"
                                >{{ cell(row, col.key) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>
    </component>
</template>

<script>
/**
 * DataTableElement — read-only tabular display of an array.
 *
 * The one thing a matrix cannot do: show data the person is not meant to edit. A matrix
 * is a grid of *inputs* with a value of its own, so using one to present a screening
 * result or a list of line items both invites edits and writes the whole grid back into
 * the process variables.
 *
 * This holds no value. `submit: false` is the mechanism, not decoration — Vueform's
 * `requestData` drops any element whose `submit` is false, so the table never appears in
 * the submitted variables even though it is a normal (non-static) element and can
 * therefore carry `conditions`, `columns` and a label like any other field.
 *
 * Rows come from a variable named by `rowsFrom`, resolved in two places — the same two
 * as documentList's checklist, for the same reasons (see formbuilder/seededSources.ts):
 *
 *   - live form data, so a table can follow what another field on this form produces;
 *   - the seeded process variables, folded into `rows` before render by
 *     resolveSeededSources() because Vueform's `data` only holds keys that have an
 *     element.
 */
import { computed } from 'vue';
import { defineElement } from '@vueform/vueform';
import { normalizeColumns, columnsFromRows, getPath } from '@/formbuilder/seededSources';

export default defineElement({
    name: 'DataTableElement',

    /**
     * Required even though this element brings its own stylesheet — Vueform's class
     * merger takes the first key of `defaultClasses` as the container class, and an
     * element carrying `columns` or `addClass` merges against `undefined` without it.
     */
    data() {
        return {
            merge: true,
            defaultClasses: { container: '' },
        };
    },

    props: {
        /**
         * `[{ key, label, align }]`. Empty means "derive them from the rows".
         *
         * Named `cols`, like the matrix element's, because Vueform's own `columns` prop
         * is the element's layout width — declaring a second meaning for that name
         * would silently break the table's own sizing.
         */
        cols: {
            required: false,
            type: [Array],
            default: () => ([]),
        },
        /** Static rows, and where a seeded process variable lands before render. */
        rows: {
            required: false,
            type: [Array],
            default: () => ([]),
        },
        /** Name of a variable holding the rows. Wins over `rows` when it resolves. */
        rowsFrom: {
            required: false,
            type: [String],
            default: null,
        },
        emptyText: {
            required: false,
            type: [String],
            default: null,
        },
        striped: {
            required: false,
            type: [Boolean],
            default: true,
        },
        dense: {
            required: false,
            type: [Boolean],
            default: false,
        },
    },

    setup(props, context) {
        const { form$, parent, value } = context.element;

        /**
         * `rowsFrom` is a dotted path, tried first next to this table (so a table inside
         * a list item reads that item's rows) and then from the form root. With no
         * `rowsFrom`, data loaded under the table's own name is used.
         */
        const liveRows = () => {
            const data = form$.value?.data;
            if (!props.rowsFrom) return value.value;
            const path = props.rowsFrom.trim();
            const parentPath = parent.value?.dataPath;
            const sibling = parentPath ? getPath(data, `${parentPath}.${path}`) : undefined;
            return Array.isArray(sibling) ? sibling : getPath(data, path);
        };

        const resolvedRows = computed(() => {
            const live = liveRows();
            const source = Array.isArray(live) ? live : props.rows;
            // Only object rows can be indexed by column key; a bare array of scalars is
            // shown in a single `value` column instead of rendering empty cells.
            if (!Array.isArray(source)) return [];
            return source.map((row) => (
                row !== null && typeof row === 'object' && !Array.isArray(row)
                    ? row
                    : { value: row }
            ));
        });

        /**
         * Authored columns win. With none, they are derived from the rows so a table
         * pointed at a variable shows something useful before anyone configures it.
         */
        const resolvedColumns = computed(() => {
            const authored = normalizeColumns(props.cols);
            return authored.length ? authored : columnsFromRows(resolvedRows.value);
        });

        /** Dotted paths so a column can reach into a nested row object. */
        function cell(row, key) {
            const value = String(key).split('.').reduce(
                (node, part) => (node === null || node === undefined ? undefined : node[part]),
                row,
            );

            if (value === null || value === undefined || value === '') return '—';
            if (typeof value === 'boolean') return value ? 'Yes' : 'No';
            if (Array.isArray(value)) return value.map((v) => cell({ v }, 'v')).join(', ');
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        }

        return { resolvedRows, resolvedColumns, cell };
    },
});
</script>

<style>
/*
 * Not scoped: the render function is handed to Vueform's template registry and is
 * applied to a component built by the installer, which does not carry the SFC's scope
 * id. The `vf-table-` prefix is what keeps these from colliding instead.
 */
.vf-table-scroll {
    overflow-x: auto;
    border: 1px solid var(--vf-border-color-input);
    border-radius: var(--vf-radius-input);
}

.vf-table-el {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    background: var(--vf-bg-input);
}

.vf-table-el th,
.vf-table-el td {
    padding: 0.5rem 0.625rem;
    text-align: left;
    border-bottom: 1px solid var(--vf-border-color-input);
    white-space: nowrap;
}

.vf-table-el th {
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--vf-color-muted);
    background: var(--vf-bg-passive);
    position: sticky;
    top: 0;
}

.vf-table-el tbody tr:last-child td { border-bottom: 0; }

.vf-table-el--striped tbody tr:nth-child(even) td { background: var(--vf-bg-passive); }

.vf-table--dense .vf-table-el th,
.vf-table--dense .vf-table-el td {
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
}

.vf-table-empty,
.vf-table-empty-cell {
    margin: 0;
    font-size: 0.8125rem;
    font-style: italic;
    color: var(--vf-color-muted);
}

.vf-table-empty-cell { text-align: center; }
</style>
