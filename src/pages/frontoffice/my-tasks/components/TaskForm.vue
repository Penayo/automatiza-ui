<script setup lang="ts">
import { ref, watch, computed, onUnmounted, onErrorCaptured, provide, markRaw, type Component } from 'vue';
import { CUSTOM_TASK_VIEWS } from '@/task-views/index';

onErrorCaptured((err) => {
    if (err instanceof TypeError && err.message.includes('emitsOptions')) return false;
    return true;
});
import type { Task } from '@services/TasksService';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';
import { Button, useConfirm, useToast } from 'primevue';
import { onApprove } from "@/utils/common";
import { parseApiError } from "@/utils/error";
import type { IAccess } from "@services/AuthService.ts";
import { awaitChain, hasNextForm, isPending, type FormChain } from '@services/FormChainService';

import FormRenderer from '@components/forms/FormRenderer.vue';
const toast    = useToast();
const confirm  = useConfirm();

const props = defineProps<{ task: Task | null }>();
const emit  = defineEmits(['refresh']);

// ── Multi-step form chain (docs/specs/multi-step-forms.spec.md §12) ───────────
// A chained next step is NOT in the parent's fetched task list, so `props.task`
// can never point at it. Everything below therefore reads `activeTask` — the
// chained step when a wizard is running, the prop otherwise. Missing one of
// these (especially isTaskAssignedToUser) renders the next step permanently
// read-only with both buttons disabled.
const chainedTask = ref<Task | null>(null);
const activeTask  = computed<Task | null>(() => chainedTask.value ?? props.task);

const isWizard   = ref(false);
const step       = ref(1);
const waiting    = ref(false);
const chainAbort = ref<AbortController | null>(null);

const formSchema      = ref<IForm | null>(null);
const formData        = ref<Record<string, any>>({});
const renderer        = ref<InstanceType<typeof FormRenderer> | null>(null);
const loading         = ref<boolean>(false);
const saving          = ref<boolean>(false);
const saved           = ref<boolean>(false);
const userInfo        = ref<IAccess | null>(null);
const completed       = ref<boolean>(false);


// Provide full task formData (process variables) to child widgets such as
// DocReviewWidget that need to read sibling keys (e.g. uploadedDocuments).
provide('jsfFormData', formData);

// Provide disabled state explicitly — @lljj/vue3-form-element does not reliably
// propagate :disabled to custom ui:field components.
const formDisabled = computed(() => !isTaskAssignedToUser());
provide('formDisabled', formDisabled);

// Custom views are the one form type FormRenderer does not own — they take a
// task-like object and read the page-level provides above.
const isCustom     = computed(() => formSchema.value?.type === 'custom');

const customView    = ref<Component | null>(null);
const customViewRef = ref<{ getVariables: () => Record<string, any> } | null>(null);

// ── Task completion ──────────────────────────────────────────────────────────

async function completeTask(variables: any) {
    try {
        loading.value = true;
        const response = await $api.tasks.completeTask(activeTask.value?.id as string, {
            variables,
            // Only opt in for a marked step: otherwise the response and the server's
            // behaviour (including auto-claim) stay exactly as they are today.
            chainForms: isWizard.value,
        });
        formSchema.value = null;

        if (isWizard.value && response?.chain) {
            await followChain(response.chain);
            return;
        }

        completed.value  = true;
        emit('refresh');
    } catch (error) {
        const errorInfo = parseApiError(error);
        toast.add({ ...errorInfo, life: 6000 });
    } finally {
        loading.value = false;
    }
}

/**
 * Acts on a `chain` payload (§4/§9).
 *
 * `nextForm` renders the next step in place of today's `emit('refresh')`.
 * `pending` waits on the stream. Every terminal reason falls back to today's
 * behaviour: the completion panel plus a list refresh.
 *
 * The next task is synthesised rather than fetched: the server auto-claimed it
 * for this user as part of returning `nextForm` (§5), so `assignee` is known, and
 * everything else the component needs comes from the same process instance.
 */
async function followChain(chain: FormChain) {
    const openNext = async (next: NonNullable<FormChain['nextTask']>) => {
        chainedTask.value = {
            ...(activeTask.value as Task),
            id:         next.taskId,
            name:       next.taskName ?? '',
            assignment: { assignee: userInfo.value?.user.username },
        } as Task;
        step.value += 1;
        waiting.value = false;
        await getTaskForm();
    };

    if (hasNextForm(chain)) {
        await openNext(chain.nextTask);
        return;
    }

    if (isPending(chain) && chain.resume?.streamUrl) {
        waiting.value = true;
        chainAbort.value?.abort();
        chainAbort.value = new AbortController();

        const resolved = await awaitChain(chain.resume.streamUrl, chainAbort.value.signal);
        if (!waiting.value) return;   // the user selected another task meanwhile

        if (hasNextForm(resolved)) {
            await openNext(resolved.nextTask);
            return;
        }
    }

    // Wizard over — the list behind this panel is stale (the steps just completed
    // are gone, and any auto-claimed task is new), so refresh it.
    waiting.value   = false;
    completed.value = true;
    emit('refresh');
}

/** Current values without validating — for draft saves. */
function getCurrentVars(): Record<string, any> {
    if (isCustom.value) return customViewRef.value?.getVariables() ?? { ...formData.value };
    return { ...formData.value, ...(renderer.value?.getData() ?? {}) };
}

async function saveTask() {
    if (!activeTask.value?.id) return;
    saving.value = true;
    saved.value  = false;
    try {
        let vars = getCurrentVars();

        vars = await renderer.value!.resolveFiles(
            vars, $api.files,
            activeTask.value.processInstanceId,
            activeTask.value.id,
        );

        await $api.tasks.updateVariables(activeTask.value.id, vars);

        saved.value = true;
        setTimeout(() => { saved.value = false; }, 3000);
    } catch (err: any) {
        toast.add({
            severity: 'error',
            summary:  'Save failed',
            detail:   err?.response?.data?.message ?? err?.message ?? 'Could not save progress.',
            life:     5000,
        });
    } finally {
        saving.value = false;
    }
}

function submitForm() {
    // Vueform's Finish button knows nothing about an in-flight completion, so a
    // double-click would otherwise open a second confirm and submit twice.
    if (loading.value || saving.value) return;
    onApprove(
        confirm,
        'Are you sure you want to submit this form?\nThis will advance the task to the next stage.',
        async () => {
            if (isCustom.value) {
                completeTask(getCurrentVars());
                return;
            }

            const result = await renderer.value?.submit();
            // ok:false means the renderer refused and is showing its own messages.
            if (!result?.ok) return;

            let variables = { ...formData.value, ...result.data };

            try {
                variables = await renderer.value!.resolveFiles(
                    variables, $api.files,
                    activeTask.value?.processInstanceId,
                    activeTask.value?.id,
                );
            } catch (err: any) {
                toast.add({
                    severity: 'error',
                    summary:  'File upload failed',
                    detail:   err?.response?.data?.message ?? err?.message ?? 'Could not upload file.',
                    life:     6000,
                });
                return;
            }

            completeTask(variables);
        },
    );
}

// ── Form loading ─────────────────────────────────────────────────────────────

async function getTaskForm() {
    try {
        loading.value  = true;
        customView.value = null;
        const { formSchema: schema, formData: data, multiStep } = await $api.tasks.getTaskForm(activeTask.value?.id as string);
        formSchema.value = schema;
        formData.value   = data ?? {};
        isWizard.value   = multiStep === true;

        if (schema?.type === 'custom' && schema.key) {
            const loader = CUSTOM_TASK_VIEWS[schema.key];
            if (loader) {
                const mod = await loader();
                customView.value = markRaw(mod.default);
            } else {
                toast.add({ severity: 'warn', summary: 'Unknown view', detail: `No custom task view registered for key "${schema.key}"`, life: 5000 });
            }
        }
    } catch (error) {
        const errorInfo = parseApiError(error);
        toast.add({ ...errorInfo, life: 3000 });
    } finally {
        loading.value = false;
    }
}

const isTaskAssignedToUser = () => activeTask.value?.assignment?.assignee === userInfo.value?.user.username;
const canEditForm = computed(() => isTaskAssignedToUser());

watch(() => props.task, () => {
    // A new selection from the list ends any wizard in progress: drop the shadow
    // task and cancel a subscription that would otherwise resolve into it.
    chainAbort.value?.abort();
    chainedTask.value = null;
    waiting.value     = false;
    step.value        = 1;
    completed.value   = false;
    getTaskForm();
    userInfo.value  = $api.authService.getAccessInfo();
}, { immediate: true });

onUnmounted(() => chainAbort.value?.abort());
</script>

<template>
    <!-- ── Confirmation panel ──────────────────────────────────────────────── -->
    <div
        v-if="completed"
        class="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center"
    >
        <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <i class="pi pi-check text-green-600 dark:text-green-400" style="font-size: 2rem" />
        </div>
        <h2 class="text-2xl font-semibold text-(--layout-accent-color)">Task completed!</h2>
        <p class="text-zinc-500 dark:text-zinc-400 max-w-sm">
            The task <strong>{{ activeTask?.name }}</strong> was submitted successfully and is now progressing to the next stage.
        </p>
        <Button
            label="Back to task list"
            icon="pi pi-arrow-left"
            severity="secondary"
            @click="emit('refresh')"
        />
    </div>

    <!-- ── Waiting for the next wizard step (chain `pending`) ─────────────── -->
    <div
        v-else-if="waiting"
        class="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center"
    >
        <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-zinc-800 flex items-center justify-center">
            <i class="pi pi-spin pi-spinner text-surface-400" style="font-size: 2rem" />
        </div>
        <h2 class="text-xl font-semibold text-(--layout-accent-color)">Processing your answers…</h2>
        <p class="text-zinc-500 dark:text-zinc-400 max-w-sm">
            We're preparing the next step of this form. This usually takes a few seconds.
        </p>
    </div>

    <!-- ── Form panel ─────────────────────────────────────────────────────── -->
    <div v-else>

        <!-- Wizard step indicator -->
        <div
            v-if="isWizard"
            class="px-4 pt-3 text-xs font-medium uppercase tracking-wide text-surface-400"
        >
            Stage {{ step }}
        </div>

        <!-- Test mode banner -->
        <div
            v-if="activeTask?.testMode"
            class="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm"
        >
            <i class="pi pi-flask text-base shrink-0" />
            <span><strong>Test run</strong> — this task is part of a test process instance. Submissions will be recorded but no real actions will occur.</span>
        </div>

        <!-- Custom Vue component renderer -->
        <component
            v-if="isCustom && customView"
            :is="customView"
            ref="customViewRef"
            :task="task"
            :variables="formData"
            :read-only="!isTaskAssignedToUser()"
        />

        <div
            v-else-if="isCustom && !customView && !loading"
            class="flex flex-col items-center gap-2 py-12 text-surface-400"
        >
            <i class="pi pi-exclamation-triangle text-2xl" />
            <span class="text-sm">Custom view not found for key "{{ formSchema?.key }}"</span>
        </div>

        <!-- form-js / JSON Schema / Vueform. PrimeVue actions below drive submission. -->
        <FormRenderer
            v-else
            ref="renderer"
            class="p-4"
            :schema="formSchema"
            :data="formData"
            :read-only="!canEditForm"
            @finish="submitForm"
        />

        <!-- Action bar — shared across all form types -->
        <div class="flex flex-row items-center justify-between p-3">
            <span v-if="saved" class="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <i class="pi pi-check-circle" /> Progress saved
            </span>
            <span v-else />
            <div class="flex gap-2">
                <Button
                    size="small"
                    severity="secondary"
                    icon="pi pi-save"
                    label="Save"
                    :loading="saving"
                    :disabled="!isTaskAssignedToUser() || loading"
                    @click="saveTask"
                />
                <!-- A paginated form submits from its own Finish button on the last page. -->
                <Button
                    v-if="!renderer?.hasSteps"
                    size="small"
                    icon="pi pi-send"
                    label="Submit"
                    :loading="loading"
                    :disabled="!isTaskAssignedToUser() || saving"
                    @click="submitForm"
                />
            </div>
        </div>
    </div>
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
