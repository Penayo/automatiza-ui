<script setup lang="ts">
import { Form } from "@bpmn-io/form-js";
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@/forms.scss';

import { ref, watch, onMounted } from 'vue';
import { useTheme } from '@/composables/useTheme';

const { isDark } = useTheme();
import type { Task } from '@services/TasksService';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';
import { Button, useConfirm, useToast } from 'primevue';
import type { ProcessVariables } from "@services/ProcessesService";
import { onApprove } from "@/utils/common";
import { parseApiError } from "@/utils/error";
import type { IAccess } from "@services/AuthService.ts";

const toast    = useToast();
const confirm  = useConfirm();

const props = defineProps<{ task: Task | null }>();
const emit  = defineEmits(['refresh']);

const formSchema  = ref<IForm | null>(null);
const formRef     = ref(null);
const formViewer  = ref<Form>();
const loading     = ref<boolean>(false);
const userInfo    = ref<IAccess | null>(null);
const completed   = ref<boolean>(false);   // ← confirmation state

// ── Task completion ──────────────────────────────────────────────────────────

async function completeTask(variables: any) {
    try {
        loading.value = true;
        await $api.tasks.completeTask(props.task?.id as string, { variables });
        formSchema.value = null;
        completed.value  = true;           // show confirmation panel
        emit('refresh');
    } catch (error) {
        const errorInfo = parseApiError(error);
        toast.add({ ...errorInfo, life: 6000 });
    } finally {
        loading.value = false;
    }
}

function submitForm() {
    onApprove(
        confirm,
        'Are you sure you want to submit this form?\nThis will advance the task to the next stage.',
        async () => { if (formViewer.value) formViewer.value.submit(); },
    );
}

// ── Form loading ─────────────────────────────────────────────────────────────

async function getTaskForm() {
    try {
        loading.value = true;
        const data = await $api.tasks.getTaskForm(props.task?.id as string);
        formSchema.value = data;
    } catch (error) {
        const errorInfo = parseApiError(error);
        toast.add({ ...errorInfo, life: 3000 });
    } finally {
        loading.value = false;
    }
}

const isTaskAssignedToUser = () => props.task?.assignee === userInfo.value?.user.username;

watch(() => props.task, () => {
    completed.value  = false;             // reset on task change
    getTaskForm();
    userInfo.value = $api.authService.getAccessInfo();

    if (isTaskAssignedToUser()) {
        formViewer.value?.setProperty('readOnly', false);
    } else {
        formViewer.value?.setProperty('readOnly', true);
    }
}, { immediate: true });

watch(formSchema, () => {
    if (formViewer.value) {
        formViewer.value.destroy();
        formViewer.value = undefined;
    }

    if (!formSchema.value || !props.task) return;

    const form = new Form({ container: formRef.value });
    formViewer.value = form;

    form.importSchema(formSchema.value, formSchema.value.metadata).then(() => {
        if (!isTaskAssignedToUser()) {
            formViewer.value?.setProperty('readOnly', true);
        }
    });

    form.on('submit', (event: { data: ProcessVariables; errors: Error[] }) => {
        completeTask(event.data);
    });
});

onMounted(() => {});
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
            The task <strong>{{ props.task?.name }}</strong> was submitted successfully and is now progressing to the next stage.
        </p>
        <Button
            label="Back to task list"
            icon="pi pi-arrow-left"
            severity="secondary"
            @click="emit('refresh')"
        />
    </div>

    <!-- ── Form panel ─────────────────────────────────────────────────────── -->
    <div v-else>
        <div ref="formRef" :class="isDark ? 'formjs-dark' : 'formjs-light'" />
        <div class="flex flex-row gap-2 justify-end p-3">
            <Button size="small" severity="secondary" :disabled="!isTaskAssignedToUser()">Save</Button>
            <Button size="small" :loading="loading" @click="submitForm" :disabled="!isTaskAssignedToUser()">Submit</Button>
        </div>
    </div>
</template>
