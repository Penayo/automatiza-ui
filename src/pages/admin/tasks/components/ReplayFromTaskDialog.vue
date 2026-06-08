<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Dialog, Button, InputText, useToast, Message } from 'primevue';
import { $api } from '@services/api';
import type { Task, TaskVariable } from '@services/TasksService';

const props = defineProps<{
    visible: boolean;
    task: Task | null;
    /**
     * 'retry'  — FAILED task: re-execute using current process variables + overrides
     * 'replay' — any task: restore to inputVariables snapshot + overrides, cancel subsequent tasks
     */
    mode: 'retry' | 'replay';
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    done: [];
}>();

const toast  = useToast();
const saving = ref(false);

interface Row { key: string; raw: string; error: string }

const rows = ref<Row[]>([]);

const title = computed(() =>
    props.mode === 'replay'
        ? `Replay from — ${props.task?.name ?? ''}`
        : `Retry with overrides — ${props.task?.name ?? ''}`,
);

const warningMessage = computed(() =>
    props.mode === 'replay'
        ? 'All tasks created after this one will be cancelled. The process will re-run from this point with the variables below (restored from the original input snapshot).'
        : 'The task will re-run using the current process variables merged with any overrides you add below.',
);

function sourceVars(task: Task | null): TaskVariable[] {
    if (!task) return [];
    return props.mode === 'replay'
        ? (task.inputVariables ?? [])
        : (task.variables ?? []);
}

watch(() => [props.task, props.mode] as const, ([task]) => {
    if (!task) { rows.value = []; return; }
    rows.value = sourceVars(task).map((v) => ({
        key: v.key,
        raw: typeof v.value === 'string' ? v.value : JSON.stringify(v.value, null, 2),
        error: '',
    }));
}, { immediate: true });

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

async function confirm() {
    let valid = true;
    for (const row of rows.value) {
        if (!validateRow(row)) valid = false;
    }
    if (!valid) return;

    const variables: Record<string, any> = {};
    for (const row of rows.value) {
        variables[row.key.trim()] = parseValue(row.raw);
    }

    const overrides = Object.keys(variables).length ? variables : undefined;

    saving.value = true;
    try {
        if (props.mode === 'replay') {
            await $api.tasks.replayFromTask(props.task!.id, overrides);
            toast.add({ severity: 'success', summary: 'Replay triggered', detail: `Process rewound to "${props.task!.name}".`, life: 4000 });
        } else {
            await $api.tasks.retryTask(props.task!.id, overrides);
            toast.add({ severity: 'success', summary: 'Retry triggered', detail: `"${props.task!.name}" is being re-executed.`, life: 4000 });
        }
        emit('done');
        emit('update:visible', false);
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? 'Operation failed.', life: 5000 });
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
        :header="title"
        :style="{ width: '700px' }"
        :dismissableMask="true"
    >
        <div class="flex flex-col gap-4">

            <Message
                :severity="mode === 'replay' ? 'warn' : 'info'"
                :closable="false"
                class="text-sm"
            >
                {{ warningMessage }}
            </Message>

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
                No variables. The task will run with
                {{ mode === 'replay' ? 'an empty variable context' : 'current process variables unchanged' }}.
            </div>

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
            <Button
                :label="mode === 'replay' ? 'Replay' : 'Retry'"
                :icon="mode === 'replay' ? 'pi pi-history' : 'pi pi-refresh'"
                :severity="mode === 'replay' ? 'warn' : 'primary'"
                :loading="saving"
                @click="confirm"
            />
        </template>
    </Dialog>
</template>
