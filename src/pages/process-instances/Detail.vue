<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Dialog, Tab, TabList, TabPanel, TabPanels, Tabs, Toolbar, useToast } from 'primevue';
import { useRoute } from 'vue-router';
import { $api } from '../../services/api';
import type { ProcessInstance } from '../../services/ProcessesService';
import DataItem from '../../components/data/DataItem.vue';
import VariableList from '../../components/data/VariableList.vue';
import TaskList from './components/TaskList.vue';
import PauseProcessInstance from './components/PauseProcessInstance.vue';
import ResumeProcessInstance from './components/ResumeProcessInstance.vue';
import ProcessInstanceLog from './components/ProcessInstanceLog.vue';

const toast = useToast();
const route = useRoute();
const visible = ref(true);
const instance = ref<ProcessInstance>();
const loading = ref(false);

const fetchInstance = async () => {
  loading.value = true;
  instance.value = undefined;
  try {
    const { id } = route.params;
    instance.value = await $api.processes.getInstance(id as string);
  } catch (error) {
    console.log(error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar la instancia', life: 3000 });
  } finally {
    loading.value = false;
  }
};

onMounted(fetchInstance);
</script>

<template>
  <Dialog
    v-model:visible="visible"
    maximizable
    modal
    :header="instance ? instance.processDefinition.name : 'Detalles de la Instancia'"
    :style="{ width: '60rem', 'min-height': '40rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    @after-hide="$router.go(-1)"
  >
    <div v-if="loading" class="flex justify-center">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>

    <div v-else>
      <Toolbar v-if="instance?.status !== 'COMPLETED'">
          <template #start>
          </template>

          <template #center>
          </template>

          <template #end>
            <PauseProcessInstance v-if="instance?.status == 'RUNNING'" :instance-id="instance?.id" @paused="fetchInstance" />
            <ResumeProcessInstance v-if="instance?.status == 'PAUSED'" :instance-id="instance?.id" @resumed="fetchInstance" />
          </template>
      </Toolbar>

      <Tabs value="0">
        <TabList>
            <Tab value="0">Instance Data</Tab>
            <Tab value="1">Tasks</Tab>
            <Tab value="3">Log</Tab>
            <Tab value="4">Exceptions</Tab>
        </TabList>
        <TabPanels class="overflow-y-auto" style="height: calc(100vh - 270px)">
            <TabPanel value="0">
              <div  class="flex flex-col mt-4 gap-4">
                <div class="flex flex-col gap-3 text-zinc-600 dark:text-zinc-200">

                  <DataItem icon="pi pi-key" label="Instance Id:" :value="instance?.id" />
                  <DataItem icon="pi pi-ellipsis-h" label="Version:" :value="instance?.processDefinition.version" />

                  <DataItem v-if="instance?.status != 'COMPLETED'" icon="pi pi-circle" class="uppercase" label="Estado:" :value="instance?.status" />
                  <DataItem v-else icon="pi pi-check-circle" class="uppercase border-emerald-700 border rounded-full" label="Estado:" :value="instance?.status" />

                  <DataItem icon="pi pi-calendar" label="Creado el:" :value="instance?.createdAt" />
                  <DataItem icon="pi pi-calendar" label="Completado el:" :value="instance?.completedAt" />
                </div>

                <div class="col-12">
                  <h3 class="text-lg font-semibold pb-3">Variables List</h3>
                  <VariableList :variables="instance?.variables" />
                </div>
              </div>
            </TabPanel>

            <TabPanel value="1">
              <TaskList :processInstanceId="instance?.id" />
            </TabPanel>

            <TabPanel value="3">
              <ProcessInstanceLog :processInstanceId="instance?.id" />
            </TabPanel>

            <TabPanel value="4">
              <div v-if="instance?.exceptions?.length" class="col-12">
                <h3>Excepciones</h3>
                <div v-for="exception in instance.exceptions" :key="exception.taskId" class="p-2 rounded mb-2">
                  <p><strong>Task ID:</strong> {{ exception.taskId }}</p>
                  <p><strong>Fecha:</strong> {{ new Date(exception.createdAt).toLocaleString() }}</p>
                  <pre class="p-2 bg-red-100 rounded">{{ JSON.stringify(exception.error, null, 2) }}</pre>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
      </Tabs>
    </div>
  </Dialog>
</template>