<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Dialog, Button, InputText, IconField, InputIcon, useToast } from 'primevue';
import { $api } from '@services/api';
import type { Task } from '@services/TasksService';

const props = defineProps<{
    visible: boolean;
    task: Task | null;
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    saved: [];
}>();

const toast   = useToast();
const saving  = ref(false);
const loading = ref(false);
const filter  = ref('');

// ── Local editable copy ───────────────────────────────────────────────────────
// Variables live on the process instance (docs/specs/process-variable-store.spec.md) —
// task.variables only holds a task's recorded outputs, so it is empty for a waiting
// or failed task. The dialog shows the instance's current values.

interface Row { key: string; raw: string; original: string | null; error: string }

const rows = ref<Row[]>([]);

const toRaw = (value: any) => typeof value === 'string' ? value : JSON.stringify(value, null, 2);

async function loadRows(task: Task) {
    loading.value = true;
    rows.value = [];
    try {
        const instance = await $api.processes.getInstance(task.processInstanceId);
        rows.value = (instance?.variables ?? [])
            .map((v) => { const raw = toRaw(v.value); return { key: v.key, raw, original: raw, error: '' }; })
            .sort((a, b) => a.key.localeCompare(b.key));
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load the current variables.', life: 4000 });
    } finally {
        loading.value = false;
    }
}

watch(() => [props.visible, props.task] as const, ([visible, task]) => {
    if (visible && task) loadRows(task);
}, { immediate: true });

const isNew     = (row: Row) => row.original === null;
const isChanged = (row: Row) => isNew(row) || row.raw !== row.original;

const visibleRows = computed(() => {
    const q = filter.value.trim().toLowerCase();
    return q ? rows.value.filter((r) => isNew(r) || r.key.toLowerCase().includes(q)) : rows.value;
});
const changedCount = computed(() => rows.value.filter(isChanged).length);

// ── Row operations ────────────────────────────────────────────────────────────

function addRow() {
    rows.value.push({ key: '', raw: '', original: null, error: '' });
}

function removeRow(row: Row) {
    rows.value.splice(rows.value.indexOf(row), 1);
}

function revertRow(row: Row) {
    row.raw = row.original ?? '';
}

function parseValue(raw: string): any {
    const trimmed = raw.trim();
    if (trimmed === '') return '';
    if (trimmed === 'true')  return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null')  return null;
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') return num;
    try { return JSON.parse(trimmed); } catch { return raw; }
}

function validateRow(row: Row) {
    row.error = '';
    const key = row.key.trim();
    if (!key) { row.error = 'Key is required'; return false; }
    if (isNew(row) && rows.value.some((r) => r !== row && r.key.trim() === key)) {
        row.error = 'Key already exists'; return false;
    }
    return true;
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
    // The endpoint merges, so only changed and new keys are sent.
    const changed = rows.value.filter(isChanged);
    if (!changed.every(validateRow)) return;
    if (!changed.length) { emit('update:visible', false); return; }

    const variables: Record<string, any> = {};
    for (const row of changed) {
        variables[row.key.trim()] = parseValue(row.raw);
    }

    saving.value = true;
    try {
        await $api.tasks.updateVariables(props.task!.id, variables);
        toast.add({ severity: 'success', summary: 'Variables saved', detail: `${changed.length} variable(s) updated.`, life: 3000 });
        emit('saved');
        emit('update:visible', false);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not update variables.', life: 4000 });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        :header="`Edit Variables — ${props.task?.name ?? ''}`"
        :style="{ width: '900px' }"
        :breakpoints="{ '960px': '95vw' }"
        :dismissableMask="true"
    >
        <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-3">
                <IconField class="flex-1 max-w-xs">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="filter" placeholder="Filter by key" size="small" class="w-full" />
                </IconField>
                <span class="text-xs text-zinc-500 dark:text-zinc-400">
                    Process instance values · only changed rows are saved
                </span>
            </div>

            <div v-if="loading" class="flex justify-center py-8">
                <i class="pi pi-spin pi-spinner text-2xl text-zinc-400" />
            </div>

            <div v-else class="max-h-[60vh] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                <table class="w-full text-sm">
                    <thead class="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-800">
                        <tr class="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            <th class="px-3 py-2 w-56">Key</th>
                            <th class="px-3 py-2">Value</th>
                            <th class="px-2 py-2 w-12" />
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-200 dark:divide-zinc-700">
                        <tr
                            v-for="row in visibleRows"
                            :key="row.original === null ? `new-${rows.indexOf(row)}` : row.key"
                            class="align-top"
                            :class="isChanged(row) ? 'bg-amber-50 dark:bg-amber-900/15' : ''"
                        >
                            <td class="px-3 py-2">
                                <InputText
                                    v-if="isNew(row)"
                                    v-model="row.key"
                                    placeholder="new key"
                                    size="small"
                                    :class="row.error ? 'p-invalid' : ''"
                                    class="w-full font-mono text-sm"
                                    @blur="validateRow(row)"
                                />
                                <span v-else class="block pt-1.5 font-mono font-semibold text-zinc-600 dark:text-zinc-300 break-all">
                                    {{ row.key }}
                                </span>
                                <span v-if="row.error" class="text-xs text-red-500">{{ row.error }}</span>
                            </td>
                            <td class="px-3 py-2">
                                <textarea
                                    v-model="row.raw"
                                    :rows="Math.min(Math.max(row.raw.split('\n').length, 1), 12)"
                                    placeholder="string, number, true/false, null or JSON"
                                    class="w-full font-mono text-sm rounded border border-zinc-300 dark:border-zinc-600
                                           bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100
                                           px-2.5 py-1.5 resize-y focus:outline-none focus:ring-1
                                           focus:ring-(--layout-accent-color)"
                                    style="min-height: 34px;"
                                    spellcheck="false"
                                />
                            </td>
                            <td class="px-2 py-2 text-center">
                                <Button
                                    v-if="isNew(row)"
                                    icon="pi pi-times" severity="danger" text rounded size="small"
                                    v-tooltip.top="'Remove'" @click="removeRow(row)"
                                />
                                <Button
                                    v-else-if="isChanged(row)"
                                    icon="pi pi-undo" severity="secondary" text rounded size="small"
                                    v-tooltip.top="'Revert'" @click="revertRow(row)"
                                />
                            </td>
                        </tr>
                        <tr v-if="!visibleRows.length">
                            <td colspan="3" class="text-center text-zinc-400 dark:text-zinc-500 py-6">
                                {{ rows.length ? 'No variables match the filter.' : 'No variables yet.' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <Button
                label="Add variable"
                icon="pi pi-plus"
                severity="secondary"
                size="small"
                text
                class="self-start"
                :disabled="loading"
                @click="addRow"
            />
        </div>

        <template #footer>
            <Button label="Cancel" severity="secondary" text @click="emit('update:visible', false)" />
            <Button
                :label="changedCount ? `Save ${changedCount} change${changedCount === 1 ? '' : 's'}` : 'Save'"
                icon="pi pi-check"
                :loading="saving"
                :disabled="loading"
                @click="save"
            />
        </template>
    </Dialog>
</template>
