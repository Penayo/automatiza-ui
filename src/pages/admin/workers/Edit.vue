<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, Button, InputText, InputNumber, Textarea } from 'primevue';
import CodeEditor from '@components/CodeEditor.vue';
import { $api } from '@services/api';
import type { SaveWorkerDto, WorkerTestResult } from '@services/WorkersService';
import { useTheme } from '@/composables/useTheme';

const route  = useRoute();
const router = useRouter();
const toast  = useToast();
const { isDark } = useTheme();

const DEFAULT_CODE = `// \`variables\` holds the process variables. Return an object: its keys are
// merged into the process variables. Synchronous only, stopped at the
// timeout set above; no require / fetch / console.
const total = (variables.items ?? []).reduce((sum, i) => sum + i.qty * i.price, 0);

return {
    total,
    approvalLevel: total > 10000 ? 'director' : total > 1000 ? 'manager' : 'none',
};
`;

const id      = computed(() => route.params.id as string | undefined);
const loading = ref(false);
const saving  = ref(false);
const version = ref<number | null>(null);
const DEFAULT_TEST_VARIABLES = '{\n    "items": [{ "qty": 2, "price": 600 }]\n}';

const form    = ref<SaveWorkerDto & { testVariables: string }>({ type: '', name: '', description: '', code: DEFAULT_CODE, timeoutMs: 1000, testVariables: DEFAULT_TEST_VARIABLES });

const canSave = computed(() => !!form.value.type.trim() && !!form.value.name.trim() && !!form.value.code.trim());

onMounted(async () => {
    if (!id.value) return;
    loading.value = true;
    try {
        const w = await $api.workers.findById(id.value);
        form.value = { type: w.type, name: w.name, description: w.description ?? '', code: w.code, timeoutMs: w.timeoutMs ?? 1000, testVariables: w.testVariables ?? '{}' };
        version.value = w.version;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load the worker.', life: 4000 });
        router.push({ name: 'WorkersIndex' });
    } finally {
        loading.value = false;
    }
});

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
    saving.value = true;
    try {
        if (id.value) {
            const w = await $api.workers.update(id.value, form.value);
            version.value = w.version;
            toast.add({ severity: 'success', summary: 'Saved', detail: `"${w.type}" saved (v${w.version}).`, life: 3000 });
        } else {
            const w = await $api.workers.create(form.value);
            version.value = w.version;
            toast.add({ severity: 'success', summary: 'Created', detail: `"${w.type}" created.`, life: 3000 });
            router.replace({ name: 'WorkerEdit', params: { id: w.id } });
        }
    } catch (err: any) {
        const msg = err?.response?.data?.message;
        toast.add({ severity: 'error', summary: 'Error', detail: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

// ── Test ──────────────────────────────────────────────────────────────────────
const testing       = ref(false);
const testResult    = ref<WorkerTestResult | null>(null);
const testInputError = ref('');

async function runTest() {
    testInputError.value = '';
    let variables: Record<string, any>;
    try {
        variables = JSON.parse(form.value.testVariables || '{}');
    } catch (e: any) {
        testInputError.value = `Invalid JSON: ${e.message}`;
        return;
    }

    testing.value = true;
    try {
        // Runs the editor's current (possibly unsaved) code.
        testResult.value = await $api.workers.test(form.value.code, variables, form.value.timeoutMs);
    } catch (err: any) {
        testResult.value = { error: err?.response?.data?.message ?? 'Test request failed.', durationMs: 0 };
    } finally {
        testing.value = false;
    }
}
</script>

<template>
    <div class="p-6 flex flex-col gap-4 h-full">

        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <Button icon="pi pi-arrow-left" text rounded size="small" v-tooltip.top="'Back to workers'" @click="router.push({ name: 'WorkersIndex' })" />
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">
                    {{ id ? form.name || 'Worker' : 'New Worker' }}
                </h1>
                <span v-if="version" class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">v{{ version }}</span>
            </div>
            <Button label="Save" icon="pi pi-save" size="small" :loading="saving" :disabled="!canSave || loading" @click="save" />
        </div>

        <!-- Metadata -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Type <span class="text-red-500">*</span></label>
                <InputText v-model="form.type" placeholder="e.g. approval-level" class="font-mono" />
                <p class="text-xs text-surface-400">Set a Script Task's Implementation to <strong>Job worker</strong> and its Type to this value.</p>
                <p v-if="id" class="text-xs text-amber-500">Changing the type breaks Script Tasks that use the old one.</p>
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
                <InputText v-model="form.name" placeholder="e.g. Approval level" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Timeout</label>
                <InputNumber v-model="form.timeoutMs" :min="100" :max="10000" :step="100" suffix=" ms" showButtons :useGrouping="false" />
                <p class="text-xs text-surface-400">100 – 10 000 ms. Stops runaway code; typical logic finishes in a few ms.</p>
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Description</label>
                <Textarea v-model="form.description" rows="1" auto-resize placeholder="Optional description" />
            </div>
        </div>

        <!-- Code + test -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
            <div class="lg:col-span-2 flex flex-col gap-1 min-h-0 min-w-0">
                <label class="text-sm font-medium">Code <span class="text-red-500">*</span></label>
                <div class="editor-box editor-box--fill">
                    <CodeEditor v-if="!loading" v-model="form.code" lang="js" :dark="isDark" />
                </div>
            </div>

            <div class="flex flex-col gap-2 min-h-0 min-w-0">
                <div class="flex items-center justify-between">
                    <label class="text-sm font-medium">Test variables (JSON)</label>
                    <Button label="Run" icon="pi pi-play" size="small" severity="secondary" :loading="testing" :disabled="!form.code.trim()" @click="runTest" />
                </div>
                <div class="editor-box editor-box--small">
                    <CodeEditor v-if="!loading" v-model="form.testVariables" lang="json" :dark="isDark" />
                </div>
                <p v-if="testInputError" class="text-xs text-red-500">{{ testInputError }}</p>

                <template v-if="testResult">
                    <div class="flex items-center justify-between text-sm">
                        <span :class="testResult.error ? 'text-red-500' : 'text-green-600'" class="font-medium">
                            {{ testResult.error ? 'Failed' : 'Returned' }}
                        </span>
                        <span class="text-xs text-surface-400">{{ testResult.durationMs }} ms</span>
                    </div>
                    <pre class="test-output">{{ testResult.error ?? JSON.stringify(testResult.result, null, 2) }}</pre>
                </template>
            </div>
        </div>

    </div>
</template>

<style scoped>
.editor-box {
    border: 1px solid var(--p-content-border-color);
    border-radius: 6px;
    overflow: hidden;
}
.editor-box--fill {
    flex: 1;
    min-height: 300px;
}
.editor-box--small {
    height: 300px;
}
.test-output {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--p-content-hover-background);
    max-height: 220px;
    overflow: auto;
}
</style>
