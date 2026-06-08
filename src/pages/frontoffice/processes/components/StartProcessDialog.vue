<script setup lang="ts">
import { Form } from '@bpmn-io/form-js';
import { DocumentListModule } from '@/form-fields/DocumentListField';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast, Button, Dialog } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition } from '@services/ProcessesService';
import type { IForm } from '@services/FormsService';
import { parseApiError } from '@/utils/error';
import { useTheme } from '@/composables/useTheme';

const props = defineProps<{
    visible:    boolean;
    process:    ProcessDefinition;
    formSchema: IForm | null;
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    'started':        [];
}>();

const { isDark } = useTheme();
const router     = useRouter();
const toast      = useToast();

const formRef    = ref<HTMLElement | null>(null);
const formViewer = ref<Form>();
const starting   = ref(false);
const done       = ref(false);

// ── Key-value variable rows (fallback when no BPMN start form) ───────────────

interface KVRow { key: string; value: string }
const kvRows = ref<KVRow[]>([{ key: '', value: '' }]);

function addRow()             { kvRows.value.push({ key: '', value: '' }); }
function removeRow(i: number) { kvRows.value.splice(i, 1); if (kvRows.value.length === 0) addRow(); }
function resetKvRows()        { kvRows.value = [{ key: '', value: '' }]; }

function buildVariables(): Record<string, string> {
    return Object.fromEntries(
        kvRows.value
            .filter(r => r.key.trim() !== '')
            .map(r => [r.key.trim(), r.value]),
    );
}

// ── BPMN form lifecycle ──────────────────────────────────────────────────────

function mountForm() {
    if (!props.formSchema || !formRef.value) return;
    const form = new Form({ container: formRef.value, additionalModules: [DocumentListModule] });
    formViewer.value = form;
    form.importSchema(props.formSchema, props.formSchema.metadata ?? {});
    form.on('submit', (event: { data: Record<string, any>; errors: any[] }) => {
        startProcess(event.data);
    });
}

function destroyForm() {
    formViewer.value?.destroy();
    formViewer.value = undefined;
}

watch(() => props.visible, (open) => {
    if (!open) {
        destroyForm();
        return;
    }
    done.value = false;
    resetKvRows();
    setTimeout(mountForm, 0);
});

// ── Actions ──────────────────────────────────────────────────────────────────

async function startProcess(variables: Record<string, any>) {
    starting.value = true;
    try {
        await $api.processes.startProcess(props.process.id!, { variables });
        done.value = true;
        emit('started');
    } catch (err) {
        toast.add({ ...parseApiError(err), life: 6000 });
    } finally {
        starting.value = false;
    }
}

function submitForm() {
    if (formViewer.value) {
        formViewer.value.submit();
    } else {
        startProcess(buildVariables());
    }
}

function startAnother() {
    done.value = false;
    resetKvRows();
    if (props.formSchema) {
        destroyForm();
        setTimeout(mountForm, 0);
    }
}

function closeAndGoTasks() {
    emit('update:visible', false);
    router.push('/my-tasks');
}

function close() {
    emit('update:visible', false);
}
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        :header="done ? 'Process started!' : `Start: ${props.process?.name}`"
        :style="{ width: '38rem' }"
        :breakpoints="{ '640px': '95vw' }"
        :closable="!starting"
    >
        <!-- ── Success state ── -->
        <div v-if="done" class="flex flex-col items-center gap-4 py-8 text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                <i class="pi pi-check text-green-600 dark:text-green-400" style="font-size: 2rem" />
            </div>
            <p class="text-surface-600 dark:text-surface-400 max-w-xs">
                <strong class="text-surface-900 dark:text-surface-100">{{ props.process?.name }}</strong>
                was started successfully. You can track progress from your task list.
            </p>
            <div class="flex gap-2 mt-2">
                <Button severity="secondary" label="Start another" icon="pi pi-refresh" @click="startAnother" />
                <Button label="My Tasks" icon="pi pi-list-check" @click="closeAndGoTasks" />
            </div>
        </div>

        <!-- ── BPMN start form ── -->
        <div v-else-if="props.formSchema">
            <p class="text-xs text-surface-400 mb-4">Fill in the form below and submit to start this process.</p>
            <div ref="formRef" :class="isDark ? 'formjs-dark' : 'formjs-light'" />
            <div class="flex justify-end mt-4 gap-2">
                <Button severity="secondary" label="Cancel" @click="close" :disabled="starting" />
                <Button label="Start" icon="pi pi-play" :loading="starting" @click="submitForm" />
            </div>
        </div>

        <!-- ── Key-value variable editor (no BPMN form) ── -->
        <div v-else>
            <p class="text-xs text-surface-400 mb-4">
                Add any variables this process needs, or leave empty to start with no variables.
            </p>

            <div class="space-y-2 mb-3">
                <div v-for="(row, i) in kvRows" :key="i" class="flex items-center gap-2">
                    <input
                        v-model="row.key"
                        type="text"
                        placeholder="Variable name"
                        class="flex-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-(--layout-accent-color) min-w-0"
                    />
                    <input
                        v-model="row.value"
                        type="text"
                        placeholder="Value"
                        class="flex-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-(--layout-accent-color) min-w-0"
                    />
                    <button
                        class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        :disabled="kvRows.length === 1 && !row.key && !row.value"
                        @click="removeRow(i)"
                        title="Remove"
                    >
                        <i class="pi pi-times text-xs" />
                    </button>
                </div>
            </div>

            <button
                class="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors mb-5"
                @click="addRow"
            >
                <i class="pi pi-plus text-[10px]" /> Add variable
            </button>

            <div class="flex justify-end gap-2">
                <Button severity="secondary" label="Cancel" @click="close" :disabled="starting" />
                <Button label="Start" icon="pi pi-play" :loading="starting" @click="submitForm" />
            </div>
        </div>
    </Dialog>
</template>
