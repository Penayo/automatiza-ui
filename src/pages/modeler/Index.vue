<script setup lang="ts">
import CamundaModeler from './components/CamundaModeler.vue';

function onSaveModel(xml: string) {
  console.log('onSaveModel', xml);
}
</script>

<template>
  <div>
    <CamundaModeler @save="onSaveModel" />
  </div>
</template>