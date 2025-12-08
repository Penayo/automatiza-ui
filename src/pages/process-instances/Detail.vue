<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Dialog, Tab, TabList, TabPanel, TabPanels, Tabs, Toolbar, useToast } from 'primevue';
import { useRoute } from 'vue-router';
import { $api } from '../../services/api';
import type { ProcessInstance } from '../../services/ProcessesService';
import DataItem from '../../components/data/DataItem.vue';
import TaskList from './components/TaskList.vue';
import PauseProcessInstance from './components/PauseProcessInstance.vue';
import ResumeProcessInstance from './components/ResumeProcessInstance.vue';

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
    header="Detalles de la Instancia"
    :style="{ width: '60rem', 'min-height': '40rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    @after-hide="$router.go(-1)"
  >
    <div v-if="loading" class="flex justify-center">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>

    <div v-else>
      <Toolbar>
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
        <TabPanels>
            <TabPanel value="0">
              <div  class="flex flex-col mt-4 gap-4">
                <div class="flex flex-col gap-3 text-zinc-600 dark:text-zinc-200">

                  <DataItem icon="pi pi-key" label="Id:" :value="instance?.id" />
                  <DataItem icon="pi pi-sitemap" label="Proceso:" :value="instance?.processDefinition.name" />
                  <DataItem icon="pi pi-ellipsis-h" label="Version:" :value="instance?.processDefinition.version" />

                  <DataItem v-if="instance?.status != 'COMPLETED'" icon="pi pi-circle" class="uppercase" label="Estado:" :value="instance?.status" />
                  <DataItem v-else icon="pi pi-check-circle" class="uppercase border-emerald-700 border rounded-full" label="Estado:" :value="instance?.status" />

                  <DataItem icon="pi pi-calendar" label="Creado el:" :value="instance?.createdAt" />
                  <DataItem icon="pi pi-calendar" label="Completado el:" :value="instance?.completedAt" />
                </div>

                <div class="col-12">
                  <h3>Variables</h3>
                  <pre class="p-2 rounded mb-3 text-sm">{{ JSON.stringify(instance?.variables, null, 2) }}</pre>
                </div>
              </div>
            </TabPanel>

            <TabPanel value="1">
              <TaskList :processInstanceId="instance?.id" />
            </TabPanel>

            <TabPanel value="3">
              <div v-if="instance?.log?.length" class="col-12 -mx-3">
                <div v-for="(log, index) in instance.log" :key="index" 
                    class="p-2 rounded mb-2 text-sm"
                    :class="{
                      'bg-emerald-700/40': log.type === 'info',
                      'bg-red-200': log.type === 'error',
                      'bg-yellow-500': log.type === 'warning'
                    }">
                  <div class="flex justify-between items-center">
                    <span><strong>{{ new Date(log.date).toLocaleString() }}</strong></span>
                    <span class="px-2 py-1 rounded text-xs"
                          :class="{
                            'bg-emerald-600': log.type === 'info',
                            'bg-red-400': log.type === 'error',
                            'bg-yellow-700': log.type === 'warning'
                          }">
                      {{ log.type.toUpperCase() }}
                    </span>
                  </div>
                  <p class="my-2">{{ log.message }}</p>
                  <pre v-if="log.variables" class="p-2 rounded">{{ JSON.stringify(log.variables, null, 2) }}</pre>
                </div>
              </div>
            </TabPanel>

            <TabPanel value="4">
              <div v-if="instance?.exceptions?.length" class="col-12">
                <h3>Excepciones</h3>
                <div v-for="exception in instance.exceptions" :key="exception.taskId" class="p-2 bg-red-50 rounded mb-2">
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