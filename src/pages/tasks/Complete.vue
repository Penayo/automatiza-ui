<script setup lang="ts">
import { ref } from 'vue';
import { Dialog, useToast } from 'primevue';
import { useRoute } from 'vue-router';
import { $api } from '../../services/api';
import type { Task } from '../../services/TasksService';

const toast = useToast();
const route = useRoute();
const visible = ref(true);
const task = ref<Task>();
const loading = ref(false);
const variables = ref<Record<string, any>>({});

const fetchTask = async () => {
    loading.value = true;
    try {
        const { id } = route.params;
        task.value = await $api.tasks.findById(id as string) as Task;
    } catch (error) {
        console.log(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar la tarea', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const completeTask = async () => {
    try {
        const { id } = route.params;
        await $api.tasks.completeTask(id as string, { variables: variables.value });
        toast.add({ severity: 'success', summary: 'Success', detail: 'Tarea completada exitosamente!', life: 3000 });
        visible.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al completar la tarea', life: 3000 });
    }
};

fetchTask();
</script>

<template>
  <Dialog
    v-model:visible="visible"
    maximizable
    modal
    header="Completar Tarea"
    :style="{ width: '50rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    @after-hide="$router.go(-1)"
  >
    <div v-if="loading" class="flex justify-center">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>
    <div v-else class="m-0">
      <div class="mb-4">
        <h3 class="m-0">{{ task?.name }}</h3>
        <p class="text-gray-500">{{ task?.processName }} (v{{ task?.processVersion }})</p>
      </div>

      <!-- Here we'll render the form based on task type -->
      <div class="mb-4">
        <pre class="p-2 bg-gray-100 rounded">{{ JSON.stringify(task?.variables, null, 2) }}</pre>
      </div>

      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="visible = false" />
        <Button label="Complete" icon="pi pi-check" @click="completeTask" />
      </div>
    </div>
  </Dialog>
</template>