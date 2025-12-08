<script setup lang="ts">
import { useToast, Dialog, DataTable, Column, InputIcon, IconField, InputText, Button } from 'primevue';
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { IForm } from '../../../services/FormsService';
import { $api } from '../../../services/api';

const props = defineProps<{
    visible: boolean
}>()

const emit = defineEmits(["hide", "load"])

const toast = useToast();
const $router = useRouter();

const selectedItem = ref<IForm | null>();
const loading = ref<boolean>(false);
const visible = ref<boolean>(false);
const forms = ref<IForm[]>();

const filters = {
    global: ref('')
};

watch(() => props.visible, (newVisible) => {
    visible.value = newVisible
})

const fetchData = async () => {
    loading.value = true;
    try {
        const data = await $api.forms.getAll();
        forms.value = data;
    } catch (error) {
        console.log(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar los procesos', life: 3000 });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchData()
})
</script>

<template>
    <Dialog
        v-model:visible="visible"
        maximizable
        modal
        header="Form List"
        :style="{ width: '50rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        @hide="emit('hide')"
    >
        <div v-if="loading" class="flex justify-center">
            <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
        </div>
        <div v-else class="m-0">
            <DataTable
                v-model:selection="selectedItem"
                :loading="loading"
                selectionMode="single"            
                :value="forms"
            >

                <template #header>
                    <div class="flex justify-between" style="margin-left: -15px; margin-right: -15px">
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" size="small" placeholder="Search" />
                        </IconField>
                        <div class="flex flex-row gap-3 justify-end">
                            <Button type="button" icon="pi pi-refresh" text severity="secondary" size="small" @click="fetchData" />
                            <Button
                                :disabled="!selectedItem"
                                type="button"
                                icon="pi pi-file-edit"
                                size="small"
                                label="Modificar"
                                @click="emit('load', selectedItem)"
                            />
                        </div>
                    </div>
                </template>
                <template #empty> No forms found. </template>

                <Column field="id" style="width: 150px;" header="Id"></Column>
                <Column field="name" header="Name"></Column>
                <Column field="version" style="width: 100px;" header="Version"></Column>
            </DataTable>
        </div>  
    </Dialog>
</template>