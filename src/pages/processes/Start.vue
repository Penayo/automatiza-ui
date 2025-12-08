<script setup lang="ts">
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '../../forms.scss';

import { onMounted, ref } from 'vue';
import { Button, Dialog, useToast } from 'primevue';
import { useRoute } from 'vue-router';
import JsonEditor from 'vue3-ts-jsoneditor';
import { $api } from '../../services/api';
import type { ProcessDefinition, ProcessVariables } from '../../services/ProcessesService';
import { Form } from "@bpmn-io/form-js";
import type { IForm } from '../../services/FormsService';

const toast = useToast();
const route = useRoute();
const visible = ref(true);
const process = ref<ProcessDefinition>();
const formRef = ref(null);
const formSchema = ref<IForm | null>(null);
const formViewer = ref()
const loading = ref(false);
const processVars = ref('{}');

const fetchProcess = async () => {
    loading.value = true;
    try {
        const { id } = route.params;
        process.value = await $api.processes.findById(id as string);
        formSchema.value = await $api.processes.getStartForm(id as string);
    } catch (error) {
        console.log(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar el proceso', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const handleSubmit = async (variables: Record<string, any>) => {
    try {
        const { id } = route.params;
        await $api.processes.startProcess(id as string, { variables });
        toast.add({ severity: 'success', summary: 'Success', detail: 'Proceso iniciado exitosamente!', life: 3000 });
        visible.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al iniciar el proceso', life: 3000 });
    }
};

const buildForm = () => {
    const form = new Form({ container: formRef.value });
    formViewer.value = form;
    form.importSchema(formSchema.value, {}).then(() => { console.log(form); });

    form.on('submit', (event: { data: ProcessVariables, errors: Error[] }) => {
        console.log(event.data, event.errors);
        handleSubmit(event.data);
    });
}

const submitForm = () => {
    if (formViewer.value && formSchema.value) {
        formViewer.value.submit()
    } else {
        handleSubmit(JSON.parse(processVars.value))
    }
}

const cancelStart = () => visible.value = false

onMounted(async () => {
    await fetchProcess();
    buildForm()
});
</script>

<template>
    <Dialog
        v-model:visible="visible"
        maximizable
        modal
        :header="`Start process: ${process?.name}`"
        :style="{ width: '40rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        @after-hide="$router.go(-1)"
    >
        <div v-if="loading" class="flex justify-center">
            <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
        </div>
        <div v-else class="m-0">
            <div v-if="formSchema" ref="formRef" class="formjs-dark" />
            <div class="" v-else>
                <h3 class="text-lg pb-2">Process Variables</h3>
                <json-editor
                    mode="text"
                    v-model:text="processVars"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    :darkTheme="true"
                    height="200"
                />
                <div class="flex flex-row justify-end p-3 gap-3">
                    <Button severity="secondary" @click="cancelStart">Cancelar</Button>
                    <Button @click="submitForm">Iniciar</Button>
                </div>
            </div>
        </div>
    </Dialog>
</template>
