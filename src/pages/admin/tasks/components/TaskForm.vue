<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Task } from '@services/TasksService';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';
import { Button, useConfirm, useToast } from 'primevue';
import { onApprove } from "@/utils/common";
import { parseApiError } from "@/utils/error";
import type { IAccess } from "@services/AuthService.ts";

import FormRenderer from '@components/forms/FormRenderer.vue';
const toast = useToast();
const confirm = useConfirm();


const props = defineProps<{
    task: Task | null,
}>();
const emit = defineEmits(['refresh']);

const formSchema = ref<IForm | null>(null);
const renderer = ref<InstanceType<typeof FormRenderer> | null>(null);
const loading = ref<boolean>(false)
const userInfo = ref<IAccess | null>(null);

async function completeTask(variables: any) {
    try {
        loading.value = true
        await $api.tasks.completeTask(props.task?.id as string, { variables })
        formSchema.value = null;
        toast.add({ severity: 'success', summary: 'Success', detail: 'Task completed successfully!', life: 3000 });    
        emit('refresh');
    } catch (error) {
        const errorInfo = parseApiError(error);
        toast.add({ ...errorInfo, life: 6000 });
    } finally {
        loading.value = false
    }
}

async function getTaskForm() {
    try {
        loading.value = true
        const data = await $api.tasks.getTaskForm(props.task?.id as string)
        formSchema.value = data.formSchema;
    } catch (error) {
        const errorInfo = parseApiError(error);
        toast.add({ ...errorInfo, life: 3000 });
    } finally {
        loading.value = false
    }
}

function submitForm() {
    async function onConfirm() {
        const result = await renderer.value?.submit();
        // ok:false means the renderer refused and is showing its own messages.
        if (result?.ok) completeTask(result.data);
    }

    onApprove(confirm, `Está seguro de procesar el formulario?\nEsto enviará la tarea a la siguiente etapa!`, onConfirm)
}

const isTaskAssignedToUser = () => props.task?.assignment?.assignee === userInfo.value?.user.username;

watch(() => props.task, () => {
    getTaskForm()
    userInfo.value = $api.authService.getAccessInfo();
}, { immediate: true })

onMounted(() => {
  // Fetch form schema if needed
});
</script>

<template>
    <div>
        <!-- Test mode banner -->
        <div
            v-if="props.task?.testMode"
            class="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm"
        >
            <i class="pi pi-flask text-base shrink-0" />
            <span><strong>Test run</strong> — this task is part of a test process instance.</span>
        </div>
        <FormRenderer
            ref="renderer"
            :schema="formSchema"
            :data="formSchema?.metadata ?? {}"
            :read-only="!isTaskAssignedToUser()"
        />
        <div class="flex flex-row gap-2 justify-end p-3">
            <Button size="small" severity="secondary" :disabled="!isTaskAssignedToUser()">Guardar</Button>
            <Button size="small" @click="submitForm" :disabled="!isTaskAssignedToUser()">Procesar</Button>
        </div>
    </div>
</template>
