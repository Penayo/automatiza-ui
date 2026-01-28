<script setup lang="ts">
import { Form } from "@bpmn-io/form-js";
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '../../../../forms.scss';

import { ref, onMounted, watch } from 'vue';
import type { Task } from '../../../../services/TasksService';
import { $api } from '../../../../services/api';
import type { IForm } from '../../../../services/FormsService';
import { Button, useConfirm, useToast } from 'primevue';
import type { ProcessVariables } from "../../../../services/ProcessesService";
import { onApprove } from "../../../../utils/common";
import { parseApiError } from "../../../../utils/error";
import type { IAccess } from "../../../../services/AuthService.ts";

const toast = useToast();
const confirm = useConfirm();


const props = defineProps<{
    task: Task | null,
}>();
const emit = defineEmits(['refresh']);

const formSchema = ref<IForm | null>(null);
const formRef = ref(null);
const formViewer = ref<Form>();
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
        formSchema.value = data;
    } catch (error) {
        const errorInfo = parseApiError(error);
        toast.add({ ...errorInfo, life: 3000 });
    } finally {
        loading.value = false
    }
}

function submitForm() {
    async function onConfirm() {
        if(formViewer.value) {
            formViewer.value.submit()
        }
    }

    onApprove(confirm, `Está seguro de procesar el formulario?\nEsto enviará la tarea a la siguiente etapa!`, onConfirm)
}

const isTaskAssignedToUser = () => props.task?.assignee === userInfo.value?.user.username;

watch(() => props.task, () => {
    getTaskForm()
    userInfo.value = $api.authService.getAccessInfo();
    console.log('USER INFO', userInfo.value, props.task?.assignee);

    if(isTaskAssignedToUser()) {
        formViewer.value?.setProperty('readOnly', false);
    } else {
        formViewer.value?.setProperty('readOnly', true);
    }

}, { immediate: true })

watch(formSchema, () => {
    console.log('FORM SCHEMA CHANGED', formSchema.value);

    if (formViewer.value) {
        formViewer.value.destroy();
        formViewer.value = undefined;
    }

    if (!formSchema.value || !props.task) {
        return;
    };

    const form = new Form({ container: formRef.value });

    formViewer.value = form;

    form.importSchema(formSchema.value, formSchema.value.metadata)
        .then(() => {
            if (props.task?.assignee !== userInfo.value?.user.username) {
                formViewer.value?.setProperty('readOnly', true);
            }
        });

    form.on('submit', (event: { data: ProcessVariables, errors: Error[] }) => {
        console.log(event.data, event.errors);
        completeTask(event.data);
    });
})

onMounted(() => {
  // Fetch form schema if needed
});
</script>

<template>
    <div>
        <div ref="formRef" class="formjs-dark" />
        <div class="flex flex-row gap-2 justify-end p-3">
            <Button size="small" severity="secondary" :disabled="!isTaskAssignedToUser()">Guardar</Button>
            <Button size="small" @click="submitForm" :disabled="!isTaskAssignedToUser()">Procesar</Button>
        </div>
    </div>
</template>
