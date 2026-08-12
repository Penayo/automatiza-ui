<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onApprove } from '@/utils/common';
import { Button, Dialog, Tab, TabList, TabPanel, TabPanels, Tabs, Tag, useToast, useConfirm } from 'primevue';
import { useRoute, useRouter } from 'vue-router';
import { $api } from '@services/api';
import type { ProcessInstance } from '@services/ProcessesService';
import DataItem from '@components/data/DataItem.vue';
import VariableList from '@components/data/VariableList.vue';
import TaskList from '@pages/admin/process-instances/components/TaskList.vue';
import PauseProcessInstance from '@pages/admin/process-instances/components/PauseProcessInstance.vue';
import ResumeProcessInstance from '@pages/admin/process-instances/components/ResumeProcessInstance.vue';
import ProcessInstanceLog from '@pages/admin/process-instances/components/ProcessInstanceLog.vue';
import ProcessInstanceTimeline from '@pages/admin/process-instances/components/ProcessInstanceTimeline.vue';
import DocumentsTab from '@components/data/DocumentsTab.vue';
import DiagramTab from '@pages/admin/process-instances/components/DiagramTab.vue';
import ExceptionsTab from '@pages/admin/process-instances/components/ExceptionsTab.vue';

const toast   = useToast();
const confirm = useConfirm();
const route   = useRoute();
const router  = useRouter();
const visible = ref(true);
const instance = ref<ProcessInstance>();
const loading = ref(false);

const dialogRef = ref<any>(null);

const activeTab = computed<string>({
  get: () => (route.query.tab as string) ?? '0',
  set: (val) => {
    router.replace({ query: { ...route.query, tab: val } });
  },
});

const fetchInstance = async () => {
  loading.value = true;
  instance.value = undefined;
  try {
    const id = (route.params.instanceId ?? route.params.id) as string;
    instance.value = await $api.processes.getInstance(id);
  } catch (error) {
    console.log(error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar la instancia', life: 3000 });
  } finally {
    loading.value = false;
  }
};

onMounted(fetchInstance);

function confirmTerminate() {
  onApprove(
    confirm,
    'This will cancel all active tasks and stop the process immediately.',
    async () => {
      try {
        await $api.processes.terminateInstance(instance.value!.id!);
        toast.add({ severity: 'success', summary: 'Terminated', detail: 'Process instance terminated.', life: 3000 });
        await fetchInstance();
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not terminate instance.', life: 3000 });
      }
    },
    { acceptPropsLabel: 'Terminate', acceptPropsSeverity: 'danger' },
  );
}
</script>

<template>
  <Dialog
    ref="dialogRef"
    v-model:visible="visible"
    maximizable
    modal
    :style="{ width: '60rem', 'min-height': '40rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    @show="dialogRef?.maximize()"
    @after-hide="$router.go(-1)"
  >
    <template #header>
      <div class="flex items-center justify-between w-full gap-6 pr-2">
        <span class="font-semibold text-lg truncate">
          {{ instance ? `${instance.processDefinition.name}${instance.testMode ? ' 🧪' : ''}` : 'Instance Details' }}
        </span>
        <div v-if="instance" class="flex items-center gap-2 shrink-0">
          <PauseProcessInstance v-if="instance.status === 'RUNNING'" :instance-id="instance.id" @paused="fetchInstance" />
          <ResumeProcessInstance v-if="instance.status === 'PAUSED'" :instance-id="instance.id" @resumed="fetchInstance" />
          <Button
            v-if="instance.status !== 'COMPLETED' && instance.status !== 'TERMINATED'"
            size="small"
            label="Terminate"
            severity="danger"
            icon="pi pi-times-circle"
            @click="confirmTerminate"
          />
        </div>
      </div>
    </template>
    <div v-if="loading" class="flex justify-center">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>

    <div v-else>
      <Tabs v-model:value="activeTab">
        <TabList>
            <Tab value="0">Instance Data</Tab>
            <Tab value="1">Tasks</Tab>
            <Tab value="2">Diagram</Tab>
            <Tab value="3">Log</Tab>
            <Tab value="4">Exceptions</Tab>
            <Tab value="5">Documents</Tab>
            <Tab value="6">Timeline</Tab>
        </TabList>
        <TabPanels class="overflow-y-auto" style="height: calc(100vh - 140px)">
            <TabPanel value="0">
              <div v-if="activeTab === '0'" class="flex flex-col mt-4 gap-4">
                <div class="flex flex-col gap-3 text-zinc-600 dark:text-zinc-200">

                  <Tag v-if="instance?.testMode" severity="warn" class="self-start mb-1">
                      🧪 TEST MODE — {{ instance.testType ?? 'auto-stub' }}
                  </Tag>
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
              <TaskList v-if="activeTab === '1'" ref="taskListRef" :processInstanceId="instance?.id" />
            </TabPanel>

            <TabPanel value="2" class="p-0! overflow-hidden!" style="height:100%;">
              <DiagramTab v-if="activeTab === '2'" :instance="instance" style="height:100%;" />
            </TabPanel>

            <TabPanel value="3">
              <ProcessInstanceLog v-if="activeTab === '3'" :processInstanceId="instance?.id" />
            </TabPanel>

            <TabPanel value="4">
              <ExceptionsTab v-if="activeTab === '4'" :processInstanceId="instance?.id" />
            </TabPanel>
            <TabPanel value="5">
              <DocumentsTab v-if="activeTab === '5'" :variables="instance?.variables" />
            </TabPanel>

            <TabPanel value="6">
              <ProcessInstanceTimeline v-if="activeTab === '6'" :processInstanceId="instance?.id" />
            </TabPanel>
          </TabPanels>
      </Tabs>
    </div>
  </Dialog>
</template>