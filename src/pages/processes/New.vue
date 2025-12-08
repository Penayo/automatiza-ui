<script setup lang="ts">
import { ref } from 'vue';
import { Dialog, useToast, FileUpload } from 'primevue';
import { $api } from '../../services/api';

const $emit = defineEmits(['created']);
const toast = useToast();
const visible = ref(true);
const loading = ref(false);

const handleFileUpload = async (event: any) => {
    const file = event.files[0];
    if (!file) return;

    loading.value = true;
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
        const bpmnXml = e.target?.result as string;
        const result = await $api.processes.saveProcess({ bpmnXml });
        toast.add({ severity: 'success', summary: 'Success', detail: 'Proceso guardado exitosamente!', life: 3000 });
            $emit('created', result);
            visible.value = false;
        };
        reader.readAsText(file);
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar el proceso', life: 3000 });
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <Dialog
        v-model:visible="visible"
        modal
        header="Nuevo Proceso"
        :style="{ width: '30rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        @after-hide="$router.go(-1)"
    >
        <div class="m-0">
            <FileUpload
                mode="basic"
                :auto="true"
                accept=".bpmn,.xml"
                :maxFileSize="1000000"
                @upload="handleFileUpload"
                :loading="loading"
                chooseLabel="Seleccionar archivo BPMN"
            />
            <small class="block mt-2 text-gray-500">
                Seleccione un archivo BPMN (.bpmn o .xml) para cargar un nuevo proceso.
            </small>
        </div>
    </Dialog>
</template>
