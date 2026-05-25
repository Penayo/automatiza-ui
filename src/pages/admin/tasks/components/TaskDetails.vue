<script setup lang="ts">
import { Tabs, Tab, TabList, TabPanels, TabPanel, Button, useToast, useConfirm } from 'primevue';
import TaskData from '@pages/frontoffice/my-tasks/components/TaskData.vue';
import TaskForm from '@pages/frontoffice/my-tasks/components/TaskForm.vue';
import type { Task } from "@services/TasksService"
import { $api } from '@services/api';
import { onApprove } from '@/utils/common';
import TaskSchedule from './TaskSchedule.vue';

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

async function updateTask(key: string, value: string) {
    // Implement API call to update task
    try {
        await $api.tasks.put(props.currentTask?.id as string, {
            [key]: value
        });
        toast.add({ severity: 'success', summary: 'Tarea actualizada', detail: `${key} ha sido actualizada correctamente.`, life: 3000 });
        emit('refresh');
    } catch (error) {
        console.error('Error updating task:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: `No se pudo actualizar ${key}.`, life: 3000 });
    }
}

</script>

<template>
    <div class="flex flex-col items-center justify-center p-4 m-4" v-if="!props.currentTask">
        <i class="pi pi-info-circle" style="font-size: 2rem" />
        <h3 class="text-4xl text-(--layout-accent-color) font-thin">Seleccione una tarea</h3>
    </div>

    <div class="w-full" v-else>
        <div class="px-5 pt-3">
            <h3 class="text-(--layout-accent-color) text-3xl font-thin">{{ props.currentTask?.name }}</h3>

            <div
                v-if="props.currentTask?.processInfo?.correlationKey"
                class="col-12 font-thin text-(--layout-accent-color) pt-2"
            >
                <span>{{ props.currentTask?.processInfo.correlationLabel }}:</span>
                {{ props.currentTask?.variables?.[props.currentTask?.processInfo.correlationKey] }}
            </div>

            <h3 class="text-sm font-bold">{{ props.currentTask.processInfo.name }}</h3>            
            <div class="flex flex-row justify-between">
                <div class="flex flex-row gap-6 mt-4">
                    <TaskSchedule
                        label="Duedate"
                        :value="props.currentTask?.dueDate" @date-set="d => updateTask('dueDate', d?.toISOString())"
                        :enabled="props.currentTask?.status !== 'COMPLETED'" />

                    <TaskSchedule
                        label="Follow up"
                        :value="props.currentTask?.followUpDate" @date-set="d => updateTask('followUpDate', d?.toISOString())"
                        :enabled="props.currentTask?.status !== 'COMPLETED'" />                        
                </div>
                <div class="">
                    <Button v-if="!props.currentTask?.assignee" size="small" @click="claimTask">Claim</Button>
                    <Button v-else size="small" @click="unclaimTask">Unclaim</Button>
                </div>
            </div>
        </div>

        <Tabs value="0">
            <TabList>
                <Tab value="0">Form</Tab>
                <Tab value="1">Task Info</Tab>
                <Tab value="2">Changes History</Tab>
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
