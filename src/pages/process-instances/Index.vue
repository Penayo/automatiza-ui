<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Page from '../../components/Page.vue';
import { DataTable, Column, Button, useToast, Select, InputText } from 'primevue';
import { $api, type PageResponse } from '../../services/api';
import { useRouter } from 'vue-router';
import type { ProcessInstance, ProcessInstanceQuery } from '../../services/ProcessesService';
import type { ProcessDefinition } from '../../services/ProcessesService';

const $router = useRouter();
const items = ref<PageResponse<ProcessInstance>>();
const selectedItem = ref<ProcessInstance | null>(null);
const toast = useToast();

const loading = ref(false);
const pageRef = ref<InstanceType<typeof Page>>();
const processes = ref<ProcessDefinition[]>([]);
const selectedProcess = ref<String | null>(null);
const search = ref('');
const rowsPerPage = ref(15);
const params = ref({ page: 1, rowsPerPage: rowsPerPage.value });

const fetchProcesses = async () => {
  try {
    processes.value = await $api.processes.getAllProcessDefinitions();
    if (processes.value.length && !selectedProcess.value) {
      selectedProcess.value = processes.value[0].id as string;
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar los procesos', life: 3000 });
  }
};

const fetchData = async () => {
  loading.value = true;
  const pageRequest: ProcessInstanceQuery = { ...params.value };

  try {
    pageRequest.search = search.value;
    pageRequest.processId = selectedProcess.value as string;

    const data = await $api.processes.getAllProcessInstances(pageRequest);

    items.value = data as PageResponse<ProcessInstance>;
  } catch (error) {
    console.log(error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar las instancias', life: 3000 });
  } finally {
    loading.value = false;
  }
};

const onPageChange = ({ page, rows }: { page: number, rows: number }) => {
	rowsPerPage.value = rows
	params.value = { page: page + 1, rowsPerPage: rows }
	fetchData();
};

onMounted(async () => {
  await fetchProcesses();
});
</script>

<template>
  <Page title="Instancias del Proceso" ref="pageRef">
    <template v-slot:actions>
      <div class="flex items-center gap-2">
        
      </div>      
      <Button variant="text" size="" rounded icon="pi pi-refresh" @click="fetchData()" />
      <Button
        severity="info"
        :disabled="!selectedItem"
        label="Details"
        icon="pi pi-info-circle"
        @click="$router.push({ name: 'ProcessInstanceDetail', params: { id: selectedItem?.id } })"
      />
    </template>

    <Select
      v-model="selectedProcess"
      :options="processes"
      optionLabel="name"
      optionValue="processId"
      placeholder="Seleccionar proceso"
      style="min-width: 220px;"
      @change="fetchData()"
    />

    <div class="flex flex-row justify-between">
        <div class="col-span-10 mt-2">
            <InputText
                v-model="search"
                placeholder="Search"
                class="w-full"
                @keydown.enter="fetchData()"
            />
        </div>
    </div>

    <DataTable
      v-model:selection="selectedItem"
      :value="items?.rows"
      :totalRecords="items?.totalRecords"
      :loading="loading"
      selectionMode="single"
      dataKey="_id"
      class="rounded-2xl!"
      :paginator="(items?.totalRecords || 0) / rowsPerPage > 1"
      :rows="rowsPerPage"
      :rowsPerPageOptions="[5, 10, 20, 40]"
      @page="onPageChange"
      :lazy="true"
			scrollable
			:scrollHeight="(pageRef?.$el.clientHeight - 225) + 'px'"
    >
      <Column field="id" header="Instance ID"></Column>
      <Column field="status" header="Status"></Column>
      <Column field="createdAt" header="Created At">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleString() }}
        </template>
      </Column>
      <Column field="completedAt" header="Completed At">
        <template #body="{ data }">
          {{ data.completedAt ? new Date(data.completedAt).toLocaleString() : '-' }}
        </template>
      </Column>
    </DataTable>
    <router-view></router-view>
  </Page>
</template>