<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue';
import CamundaModeler from '@pages/admin/modeler/components/CamundaModeler.vue';
import { $api } from '@services/api';

const toast = useToast();
const modelerRef = ref<InstanceType<typeof CamundaModeler> | null>(null);

async function onSaveModel(xml: string) {
    try {
        await $api.processes.post({ bpmnXml: xml })
        modelerRef.value?.markSaved();
        toast.add({ severity: 'success', summary: 'Success', detail: 'Proceso guardado correctamente!', life: 3000 });
    } catch(error) {
      console.log(error)
      toast.add({ severity: 'error', summary: 'Error', detail: 'Error: No se pudo guardar el proceso!', life: 3000 })
    }
}
</script>

<template>
  <div style="height: calc(100vh - 50px); display: flex; flex-direction: column; overflow: hidden;">
    <CamundaModeler ref="modelerRef" @save="onSaveModel" />
  </div>
</template>
