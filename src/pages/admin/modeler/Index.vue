<script setup lang="ts">
import { useToast } from 'primevue';
import CamundaModeler from '@pages/admin/modeler/components/CamundaModeler.vue';
import { $api } from '@services/api';

const toast = useToast();

async function onSaveModel(xml: string) {
  console.log('onSaveModel', xml);
    try {
        await $api.processes.post({ bpmnXml: xml })
        toast.add({ severity: 'success', summary: 'Success', detail: 'Proceso guardado correctamente!', life: 3000 });
    } catch(error) {
      console.log(error)
      toast.add({ severity: 'error', summary: 'Error', detail: 'Error: No se pudo guardar el proceso!', life: 3000 })
    }
}
</script>

<template>
  <div>
    <CamundaModeler @save="onSaveModel" />
  </div>
</template>