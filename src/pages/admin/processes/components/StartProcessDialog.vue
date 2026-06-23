<script setup lang="ts">
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@/forms.scss';

import { ref, watch } from 'vue';
import { Button, Dialog, ToggleSwitch, Select, useToast } from 'primevue';
import { useTheme } from '@/composables/useTheme';
import JsonEditor from 'vue3-ts-jsoneditor';
import { Form } from '@bpmn-io/form-js';
import { DocumentListModule } from '@/form-fields/DocumentListField';
import { LinkModule } from '@/form-fields/LinkField';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';

const props = defineProps<{
    visible: boolean;
    processDefinitionId: string;
    processName?: string;
}>();

const emit = defineEmits<{
    'update:visible': [v: boolean];
    started: [];
}>();

const toast    = useToast();
const { isDark } = useTheme();

const loading    = ref(false);
const starting   = ref(false);
const formRef    = ref<HTMLElement | null>(null);
const formSchema = ref<IForm | null>(null);
const formViewer = ref<InstanceType<typeof Form> | null>(null);
const processVars = ref('{}');

const testMode = ref(false);
const testType = ref<'auto-stub' | 'pause-and-fill'>('auto-stub');
const testTypeOptions = [
    { label: 'Auto-stub — return mock or {} immediately', value: 'auto-stub'      },
    { label: 'Pause & fill — task waits for manual input', value: 'pause-and-fill' },
];

// ── Load start form whenever the dialog opens ─────────────────────────────────

watch(() => props.visible, async (open) => {
    if (!open) return;
    formSchema.value  = null;
    formViewer.value  = null;
    processVars.value = '{}';
    testMode.value    = false;
    testType.value    = 'auto-stub';

    loading.value = true;
    try {
        formSchema.value = await $api.processes.getStartForm(props.processDefinitionId);
    } catch {
        // no start form — fall back to JSON editor
    } finally {
        loading.value = false;
    }
});

// Mount formjs once the container div is rendered
watch(formSchema, (schema) => {
    if (!schema) return;
    setTimeout(() => mountForm(), 0);
});

function onDialogShow() {
    if (formSchema.value && formRef.value) mountForm();
}

function mountForm() {
    if (!formRef.value) return;
    const form = new Form({ container: formRef.value, additionalModules: [DocumentListModule, LinkModule] });
    formViewer.value = form;
    form.importSchema(formSchema.value!, {});
    form.on('submit', (event: { data: Record<string, any>; errors: unknown[] }) => {
        submitStart(event.data);
    });
}

// ── Submit ────────────────────────────────────────────────────────────────────

async function submitStart(variables: Record<string, any>) {
    starting.value = true;
    try {
        await $api.processes.startProcess(props.processDefinitionId, {
            variables,
            ...(testMode.value ? { testMode: true, testType: testType.value } : {}),
        });
        const detail = testMode.value
            ? `Process started in TEST mode (${testType.value})`
            : 'Process instance created.';
        toast.add({ severity: 'success', summary: 'Started', detail, life: 3000 });
        emit('started');
        emit('update:visible', false);
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.message ?? 'Failed to start process.', life: 4000 });
    } finally {
        starting.value = false;
    }
}

function handleSubmit() {
    if (formViewer.value && formSchema.value) {
        formViewer.value.submit();
    } else {
        try {
            submitStart(JSON.parse(processVars.value));
        } catch {
            toast.add({ severity: 'error', summary: 'Invalid JSON', detail: 'Fix the variables JSON before starting.', life: 3000 });
        }
    }
}
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        :header="props.processName ? `Start: ${props.processName}` : 'Start Process'"
        :style="{ width: '42rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        @show="onDialogShow"
    >
        <div v-if="loading" class="flex justify-center py-8">
            <i class="pi pi-spin pi-spinner text-3xl text-surface-400" />
        </div>

        <div v-else class="flex flex-col gap-4">

            <!-- Test Mode ──────────────────────────────────────────────────── -->
            <div class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 py-3 flex flex-col gap-2">
                <div class="flex items-center gap-3">
                    <ToggleSwitch v-model="testMode" inputId="startTestModeToggle" />
                    <label for="startTestModeToggle" class="text-sm font-semibold cursor-pointer select-none">
                        Test Mode
                    </label>
                    <span class="text-xs text-zinc-400">No real API calls or emails — uses mocked responses</span>
                </div>
                <div v-if="testMode" class="pl-1">
                    <Select
                        v-model="testType"
                        :options="testTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full text-sm"
                    />
                </div>
            </div>

            <!-- Start form or JSON variables editor ─────────────────────────── -->
            <div v-if="formSchema" ref="formRef" :class="isDark ? 'formjs-dark' : 'formjs-light'" />
            <div v-else class="flex flex-col gap-2">
                <p class="text-sm text-surface-500">No start form configured. Provide initial variables as JSON (optional).</p>
                <JsonEditor
                    mode="text"
                    v-model:text="processVars"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    :darkTheme="true"
                    height="200"
                />
            </div>

        </div>

        <template #footer>
            <Button label="Cancel" severity="secondary" text @click="emit('update:visible', false)" />
            <Button
                v-if="!loading"
                :label="testMode ? 'Start (Test)' : 'Start'"
                :icon="testMode ? 'pi pi-flask' : 'pi pi-play'"
                :severity="testMode ? 'warn' : 'success'"
                :loading="starting"
                @click="handleSubmit"
            />
        </template>
    </Dialog>
</template>
