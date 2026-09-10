<script setup lang="ts">
import { ref, watch, computed, markRaw, type Component } from 'vue';
import { Button, Dialog, ToggleSwitch, Select, useToast } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';
import { CUSTOM_TASK_VIEWS } from '@/task-views/index';
import FormRenderer from '@components/forms/FormRenderer.vue';
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

const loading    = ref(false);
const starting   = ref(false);
const formSchema = ref<IForm | null>(null);
const renderer   = ref<InstanceType<typeof FormRenderer> | null>(null);
const processVars = ref('{}');

// Custom views are the one form type FormRenderer does not own — they take a
// task-like object and are resolved here.
const isCustom     = computed(() => formSchema.value?.type === 'custom');

const customView    = ref<Component | null>(null);
const customViewRef = ref<{ getVariables: () => Record<string, any> } | null>(null);

const processLike = computed(() => ({ name: props.processName }));

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
    customView.value  = null;
    processVars.value = '{}';
    testMode.value    = false;
    testType.value    = 'auto-stub';

    loading.value = true;
    try {
        formSchema.value = await $api.processes.getStartForm(props.processDefinitionId);

        const schema = formSchema.value;
        if (schema?.type === 'custom' && schema.key) {
            const loader = CUSTOM_TASK_VIEWS[schema.key];
            if (loader) {
                const mod = await loader();
                customView.value = markRaw(mod.default);
            }
        }
    } catch {
        // no start form — fall back to JSON editor
    } finally {
        loading.value = false;
    }
});

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

async function handleSubmit() {
    if (isCustom.value) {
        submitStart(customViewRef.value?.getVariables() ?? {});
        return;
    }
    if (formSchema.value) {
        const result = await renderer.value?.submit();
        // ok:false means the renderer refused and is showing its own messages.
        if (result?.ok) submitStart(result.data);
        return;
    }
    try {
        submitStart(JSON.parse(processVars.value));
    } catch {
        toast.add({ severity: 'error', summary: 'Invalid JSON', detail: 'Fix the variables JSON before starting.', life: 3000 });
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
            <template v-if="formSchema">
                <!-- Custom Vue component renderer -->
                <component
                    v-if="isCustom && customView"
                    :is="customView"
                    ref="customViewRef"
                    :task="processLike"
                    :variables="{}"
                    :read-only="false"
                />
                <div
                    v-else-if="isCustom && !customView"
                    class="flex flex-col items-center gap-2 py-8 text-surface-400"
                >
                    <i class="pi pi-exclamation-triangle text-2xl" />
                    <span class="text-sm">Custom view not found for key "{{ formSchema.key }}"</span>
                </div>

                <!-- form-js / JSON Schema / Vueform -->
                <FormRenderer v-else ref="renderer" :schema="formSchema" />
            </template>
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

<style>
.jsf-preview-root {
    font-family: inherit;
}

/* Element Plus defaults these to --el-font-weight-primary (500), which makes
   radio/checkbox option text read as a label. Options are content: keep them
   regular so only the field label carries weight.
   The vars must be set ON .el-radio / .el-checkbox — those rules declare their
   own copy, so a definition on an ancestor is shadowed and has no effect. */
.jsf-preview-root .el-radio {
    --el-radio-font-weight: 400;
}

.jsf-preview-root .el-checkbox {
    --el-checkbox-font-weight: 400;
}

.jsf-preview-root .el-form-item__label {
    font-size:   0.875rem;
    font-weight: 600;
}

.jsf-preview-root .el-button--primary {
    --el-button-bg-color: #0f62fe;
    --el-button-border-color: #0f62fe;
    --el-button-hover-bg-color: #0353e9;
    --el-button-hover-border-color: #0353e9;
}
</style>
