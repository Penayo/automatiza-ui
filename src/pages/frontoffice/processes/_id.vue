<script setup lang="ts">
import { Form } from '@bpmn-io/form-js';
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@/forms.scss';

import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, Button, Dialog } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition } from '@services/ProcessesService';
import type { IForm } from '@services/FormsService';
import { parseApiError } from '@/utils/error';
import { useTheme } from '@/composables/useTheme';
import ProcessInfo from '@pages/admin/processes/components/ProcessInfo.vue';

const { isDark } = useTheme();
const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const process    = ref<ProcessDefinition | null>(null);
const formSchema = ref<IForm | null>(null);
const loading    = ref(false);
const error      = ref<string | null>(null);

// Dialog state
const dialogVisible = ref(false);
const formRef       = ref<HTMLElement | null>(null);
const formViewer    = ref<Form>();
const starting      = ref(false);
const dialogDone    = ref(false);   // success panel inside dialog

// Key-value variable rows (fallback when no BPMN start form)
interface KVRow { key: string; value: string }
const kvRows = ref<KVRow[]>([{ key: '', value: '' }]);

function addRow()         { kvRows.value.push({ key: '', value: '' }); }
function removeRow(i: number) { kvRows.value.splice(i, 1); if (kvRows.value.length === 0) addRow(); }

/** Map filled rows to a plain object; skips rows with empty keys. */
function buildVariables(): Record<string, string> {
    return Object.fromEntries(
        kvRows.value
            .filter(r => r.key.trim() !== '')
            .map(r => [r.key.trim(), r.value]),
    );
}

function resetKvRows() { kvRows.value = [{ key: '', value: '' }]; }

// ── Load ─────────────────────────────────────────────────────────────────────

async function load() {
    loading.value = true;
    error.value   = null;
    try {
        const id = route.params.id as string;
        const [pd, form] = await Promise.allSettled([
            $api.processes.findById(id),
            $api.processes.getStartForm(id),
        ]);
        if (pd.status === 'rejected') throw pd.reason;
        process.value    = pd.value;
        formSchema.value = form.status === 'fulfilled' ? form.value : null;
    } catch (err) {
        const info = parseApiError(err);
        error.value = info.detail ?? info.summary;
    } finally {
        loading.value = false;
    }
}

// ── Dialog ────────────────────────────────────────────────────────────────────

function openDialog() {
    dialogDone.value    = false;
    resetKvRows();
    dialogVisible.value = true;
}

// Build/rebuild the bpmn-io form each time the dialog becomes visible
watch(dialogVisible, (open) => {
    if (!open) {
        formViewer.value?.destroy();
        formViewer.value = undefined;
        return;
    }
    if (!formSchema.value) return;
    // Wait for DOM to render the ref
    setTimeout(() => {
        if (!formRef.value) return;
        const form = new Form({ container: formRef.value });
        formViewer.value = form;
        form.importSchema(formSchema.value!, formSchema.value!.metadata ?? {});
        form.on('submit', (event: { data: Record<string, any>; errors: any[] }) => {
            startProcess(event.data);
        });
    }, 0);
});

// ── Start ────────────────────────────────────────────────────────────────────

async function startProcess(variables: Record<string, any>) {
    starting.value = true;
    try {
        await $api.processes.startProcess(process.value!.id!, { variables });
        dialogDone.value = true;
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

function closeAndGoTasks() {
    dialogVisible.value = false;
    router.push('/my-tasks');
}

function startAnother() {
    dialogDone.value = false;
    resetKvRows();
    // Rebuild BPMN form if applicable
    if (formSchema.value && formRef.value) {
        formViewer.value?.destroy();
        formViewer.value = undefined;
        setTimeout(() => {
            const form = new Form({ container: formRef.value! });
            formViewer.value = form;
            form.importSchema(formSchema.value!, formSchema.value!.metadata ?? {});
            form.on('submit', (event: { data: Record<string, any>; errors: any[] }) => startProcess(event.data));
        }, 0);
    }
}

onMounted(load);
</script>

<template>
    <div class="min-h-screen bg-white dark:bg-zinc-950">

        <!-- ── Page header ────────────────────────────────────────────────── -->
        <div class="border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-zinc-950 px-6 py-4 flex items-center gap-3">
            <button
                class="text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
                @click="router.push({ name: 'FrontofficeProcesses' })"
            >
                <i class="pi pi-arrow-left" />
            </button>

            <div class="flex-1 min-w-0">
                <div v-if="loading" class="space-y-1">
                    <div class="h-5 w-48 rounded bg-surface-200 dark:bg-surface-700 animate-pulse" />
                    <div class="h-3 w-32 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
                </div>
                <div v-else>
                    <h1 class="text-xl font-semibold truncate" style="color: var(--layout-title-color)">
                        {{ process?.name ?? 'Process' }}
                    </h1>
                    <p v-if="process?.processId" class="text-xs text-surface-400 font-mono mt-0.5">
                        {{ process.processId }} · v{{ process?.version ?? 1 }}
                    </p>
                </div>
            </div>

            <!-- Start process CTA -->
            <Button
                v-if="!loading && !error && process"
                label="Start Process"
                icon="pi pi-play"
                @click="openDialog"
            />
        </div>

        <!-- ── Loading skeleton ───────────────────────────────────────────── -->
        <div v-if="loading" class="max-w-2xl mx-auto px-6 py-10 space-y-4">
            <div class="h-3 w-3/4 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
            <div class="h-3 w-1/2 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
            <div class="h-24 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse mt-6" />
            <div class="h-24 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
        </div>

        <!-- ── Error ──────────────────────────────────────────────────────── -->
        <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-surface-400 gap-3">
            <i class="pi pi-exclamation-circle text-4xl" />
            <p class="text-sm">{{ error }}</p>
            <Button severity="secondary" size="small" label="Go back" icon="pi pi-arrow-left"
                    @click="router.push({ name: 'FrontofficeProcesses' })" />
        </div>

        <!-- ── Info content ───────────────────────────────────────────────── -->
        <div v-else-if="process">

            <!-- Shared read-only info panel -->
            <ProcessInfo
                :initial-meta="{
                    description:         process.description,
                    responsibleContacts: process.responsibleContacts,
                    starterGroups:       process.starterGroups,
                    starterUsers:        process.starterUsers,
                }"
                readonly
            />

            <!-- Meta row -->
            <div class="max-w-2xl mx-auto px-6 pb-4 flex flex-wrap gap-4 text-xs text-surface-400">
                <span v-if="process.createdAt">
                    <i class="pi pi-calendar mr-1" />
                    Created {{ new Date(process.createdAt).toLocaleDateString() }}
                </span>
                <span>
                    <i class="pi pi-tag mr-1" />
                    Version {{ process.version ?? 1 }}
                </span>
                <span v-if="!formSchema">
                    <i class="pi pi-info-circle mr-1" />
                    No start form — variables can be added before starting
                </span>
            </div>

            <!-- Prompt to start -->
            <div class="max-w-2xl mx-auto px-6 pb-8">
                <div class="rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 flex flex-col items-center gap-3 text-center">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: color-mix(in srgb, var(--layout-accent-color) 12%, transparent)">
                        <i class="pi pi-play text-lg" style="color: var(--layout-accent-color)" />
                    </div>
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                        Ready to start <strong class="text-surface-900 dark:text-surface-100">{{ process.name }}</strong>?
                    </p>
                    <Button label="Start Process" icon="pi pi-play" @click="openDialog" />
                </div>
            </div>

        </div>

        <!-- ── Start Process Dialog ───────────────────────────────────────── -->
        <Dialog
            v-model:visible="dialogVisible"
            modal
            :header="dialogDone ? 'Process started!' : `Start: ${process?.name}`"
            :style="{ width: '38rem' }"
            :breakpoints="{ '640px': '95vw' }"
            :closable="!starting"
        >
            <!-- ── Success state ── -->
            <div v-if="dialogDone" class="flex flex-col items-center gap-4 py-8 text-center">
                <div class="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                    <i class="pi pi-check text-green-600 dark:text-green-400" style="font-size: 2rem" />
                </div>
                <p class="text-surface-600 dark:text-surface-400 max-w-xs">
                    <strong class="text-surface-900 dark:text-surface-100">{{ process?.name }}</strong>
                    was started successfully. You can track progress from your task list.
                </p>
                <div class="flex gap-2 mt-2">
                    <Button severity="secondary" label="Start another" icon="pi pi-refresh" @click="startAnother" />
                    <Button label="My Tasks" icon="pi pi-list-check" @click="closeAndGoTasks" />
                </div>
            </div>

            <!-- ── BPMN start form ── -->
            <div v-else-if="formSchema">
                <p class="text-xs text-surface-400 mb-4">Fill in the form below and submit to start this process.</p>
                <div ref="formRef" :class="isDark ? 'formjs-dark' : 'formjs-light'" />
                <div class="flex justify-end mt-4 gap-2">
                    <Button severity="secondary" label="Cancel" @click="dialogVisible = false" :disabled="starting" />
                    <Button label="Start" icon="pi pi-play" :loading="starting" @click="submitForm" />
                </div>
            </div>

            <!-- ── Key-value variable editor (no BPMN form) ── -->
            <div v-else>
                <p class="text-xs text-surface-400 mb-4">
                    Add any variables this process needs, or leave empty to start with no variables.
                </p>

                <!-- Row list -->
                <div class="space-y-2 mb-3">
                    <div
                        v-for="(row, i) in kvRows"
                        :key="i"
                        class="flex items-center gap-2"
                    >
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

                <!-- Add row -->
                <button
                    class="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors mb-5"
                    @click="addRow"
                >
                    <i class="pi pi-plus text-[10px]" /> Add variable
                </button>

                <div class="flex justify-end gap-2">
                    <Button severity="secondary" label="Cancel" @click="dialogVisible = false" :disabled="starting" />
                    <Button label="Start" icon="pi pi-play" :loading="starting" @click="submitForm" />
                </div>
            </div>
        </Dialog>

    </div>
</template>
