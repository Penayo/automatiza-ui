<script setup lang="ts">
import { Tabs, Tab, TabList, TabPanels, TabPanel, Button, useToast, useConfirm } from 'primevue';
import TaskData from './TaskData.vue';
import TaskForm from './TaskForm.vue';
import type { Task } from "../../../services/TasksService"
import { $api } from '../../../services/api';
import { onApprove } from '../../../utils/common';

const toast = useToast();
const confirm= useConfirm();

const props = defineProps<{
    currentTask: Task | null
}>();
const emit = defineEmits(['refresh']);

async function claimTask() {
    async function onConfirm() {
        try {
            await $api.tasks.assignTask(props.currentTask?.id as string);
            emit('refresh')
        } catch(error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Error assigning task!', life: 3000 })
        }
    }

    onApprove(confirm, 'Esta seguro de asignarse la tarea?', onConfirm)
}

async function unclaimTask() {
    async function onConfirm() {
        try {
            await $api.tasks.unassignTask(props.currentTask?.id as string);
            emit('refresh')
        } catch(error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Error unassigning task!', life: 3000 })
        }
    }

    onApprove(confirm, 'Esta seguro de liberar la tarea?', onConfirm)
}

</script>

<template>
    <div class="flex flex-col items-center justify-center p-4 m-4" v-if="!props.currentTask">
        <i class="pi pi-info-circle" style="font-size: 2rem" />
        <h3 class="text-4xl text-emerald-500 font-thin">Seleccione una tarea</h3>
    </div>

    <div class="w-full" v-else>
        <div class="px-5 pt-3">
            <h3 class="text-emerald-500 text-3xl font-thin">{{ props.currentTask?.name }}</h3>

            <div
                v-if="props.currentTask?.processInfo?.correlationKey"
                class="col-12 font-thin text-emerald-500 pt-2"
            >
                <span>{{ props.currentTask?.processInfo.correlationLabel }}:</span>
                {{ props.currentTask?.variables?.[props.currentTask?.processInfo.correlationKey] }}
            </div>

            <h3 class="text-sm font-bold">{{ props.currentTask?.processName ?? props.currentTask.processInfo.name }}</h3>            
            <div class="flex flex-row justify-between">
                <div class=""></div>
                <div class="">
                    <Button v-if="!props.currentTask?.assignee" rounded text @click="claimTask">Asignarme</Button>
                    <Button v-else rounded text @click="unclaimTask">Liberar</Button>
                </div>
            </div>
        </div>

        <Tabs value="0">
            <TabList>
                <Tab value="0">Formulario</Tab>
                <Tab value="1">Datos de la tarea</Tab>
                <Tab value="2">Historial de cambios</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="0">
                    <TaskForm :task="props.currentTask" @refresh="emit('refresh')" />
                </TabPanel>
                <TabPanel value="1">
                    <TaskData :task="props.currentTask" @refresh="emit('refresh')" />
                </TabPanel>
                <TabPanel value="2">
                    <p class="m-0">
                        Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam,
                        eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo
                        enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui
                        ratione voluptatem sequi nesciunt. Consectetur, adipisci velit, sed quia non numquam eius modi.
                    </p>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>
