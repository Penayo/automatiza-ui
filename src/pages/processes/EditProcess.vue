<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { type ProcessDefinition } from '../../services/ProcessesService';
import CamundaModeler from '../modeler/components/CamundaModeler.vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue';
import { $api } from '../../services/api';

const process = ref<ProcessDefinition | null>(null);
const route = useRoute();
const toast = useToast();

onMounted(async () => {
    const processDefId = route.params.id as string
    if (!processDefId) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error: id must be provided!', life: 3000 })
    }

    process.value = await $api.processes.findById(processDefId);
})

async function saveProcess(xml: string) {
    if (process.value) {
        try {
            process.value.bpmnXml = xml;
            await $api.processes.saveProcess(process.value)
            toast.add({ severity: 'success', summary: 'Success', detail: 'Proceso guardado correctamente!', life: 3000 });
        } catch(error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Error: No se pudo guardar los cambios!', life: 3000 })
        }
    }
}

</script>

<template>
    <CamundaModeler v-if="process" :process="process" @save="saveProcess" />
</template>