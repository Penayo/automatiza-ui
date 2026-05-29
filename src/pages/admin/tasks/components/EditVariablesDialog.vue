<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, Button, InputText, useToast } from 'primevue';
import { $api } from '@services/api';
import type { Task, TaskVariable } from '@services/TasksService';

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

// ── Local editable copy ───────────────────────────────────────────────────────

interface Row { key: string; raw: string; error: string }

const rows = ref<Row[]>([]);

watch(() => props.task, (task) => {
    if (!task) { rows.value = []; return; }
    rows.value = (task.variables ?? []).map((v) => ({
        key: v.key,
        raw: typeof v.value === 'string' ? v.value : JSON.stringify(v.value, null, 2),
        error: '',
    }));
}, { immediate: true });

// ── Row operations ────────────────────────────────────────────────────────────

function addRow() {
    rows.value.push({ key: '', raw: '', error: '' });
}

function removeRow(i: number) {
    rows.value.splice(i, 1);
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
    if (!row.key.trim()) { row.error = 'Key is required'; return false; }
    return true;
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
    let valid = true;
    for (const row of rows.value) {
        if (!validateRow(row)) valid = false;
    }
    if (!valid) return;

    const variables: Record<string, any> = {};
    for (const row of rows.value) {
        variables[row.key.trim()] = parseValue(row.raw);
    }

    saving.value = true;
    try {
        await $api.tasks.updateVariables(props.task!.id, variables);
        toast.add({ severity: 'success', summary: 'Variables saved', detail: 'Task and process variables updated.', life: 3000 });
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
        :style="{ width: '680px' }"
        :dismissableMask="true"
    >
        <div class="flex flex-col gap-3">

            <!-- Header row -->
            <div class="grid grid-cols-[1fr_2fr_auto] gap-2 px-1">
                <span class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Key</span>
                <span class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Value</span>
                <span />
            </div>

            <!-- Variable rows -->
            <div
                v-for="(row, i) in rows"
                :key="i"
                class="grid grid-cols-[1fr_2fr_auto] gap-2 items-start"
            >
                <div class="flex flex-col gap-1">
                    <InputText
                        v-model="row.key"
                        placeholder="key"
                        size="small"
                        :class="row.error ? 'p-invalid' : ''"
                        class="w-full font-mono text-sm"
                        @blur="validateRow(row)"
                    />
                    <span v-if="row.error" class="text-xs text-red-500">{{ row.error }}</span>
                </div>

                <textarea
                    v-model="row.raw"
                    rows="1"
                    placeholder="value  (string, number, true/false, JSON)"
                    class="w-full font-mono text-sm rounded border border-zinc-300 dark:border-zinc-600
                           bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                           px-2.5 py-1.5 resize-y focus:outline-none focus:ring-1
                           focus:ring-(--layout-accent-color)"
                    style="min-height: 34px;"
                />

                <Button
                    icon="pi pi-times"
                    severity="danger"
                    text
                    rounded
                    size="small"
                    v-tooltip.top="'Remove'"
                    @click="removeRow(i)"
                />
            </div>

            <!-- Empty state -->
            <div
                v-if="rows.length === 0"
                class="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4"
            >
                No variables. Click <strong>Add</strong> to create one.
            </div>

            <!-- Add row -->
            <Button
                label="Add variable"
                icon="pi pi-plus"
                severity="secondary"
                size="small"
                text
                @click="addRow"
            />
        </div>

        <template #footer>
            <Button label="Cancel" severity="secondary" text @click="emit('update:visible', false)" />
            <Button label="Save" icon="pi pi-check" :loading="saving" @click="save" />
        </template>
    </Dialog>
</template>
