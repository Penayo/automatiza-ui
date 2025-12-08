<script setup lang="ts">
import { ref } from 'vue';
import { Button, Tag, useToast } from 'primevue';
import TaskSchedule from './TaskSchedule.vue';
import type { Task } from "../../../services/TasksService"
import { $api } from '../../../services/api';

const props = defineProps<{
    task: Task | null,
}>();
const emit = defineEmits(['refresh']);

const toast = useToast();

async function updateTask(key: string, value: string) {
    // Implement API call to update task
    try {
        await $api.tasks.put(props.task?.id as string, {
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
    <div class="p-4">
        <div class="font-bold m-0 mb-3">Estado: <Tag :severity="props.task?.status === 'COMPLETED' ? 'success' : 'warning'">{{ props.task?.status }}</Tag></div>
        <div class="font-bold m-0 mb-3">{{ props.task?.status === 'COMPLETED' ? 'Completado Por:' : 'Tomado Por:' }} <div class="text-normal">{{ props.task?.claimedBy }}</div></div>
        <div class="font-bold m-0 mb-3">Fecha de Creación: <div class="text-normal">{{ props.task?.createdAt }}</div></div>
        <div class="font-bold m-0 mb-3">Completado en fecha: <div class="text-normal">{{ props.task?.completedAt }}</div></div>
        <TaskSchedule label="Fecha de Vencimiento" :value="props.task?.dueDate" @date-set="d => updateTask('dueDate', d?.toISOString())" :enabled="props.task?.status !== 'COMPLETED'" />
        <TaskSchedule label="Fecha de Seguimiento" :value="props.task?.followUpDate" @date-set="d => updateTask('followUpDate', d?.toISOString())" :enabled="props.task?.status !== 'COMPLETED'" />
        <div class="font-bold m-0 mb-3">Grupos Candidatos: <div class="text-normal">{{ props.task?.candidateGroups }}</div></div>
        <div class="font-bold m-0 mb-3">Usuarios Candidatos: <div class="text-normal">{{ props.task?.candidateUsers }}</div></div>
        <h3 class="font-bold m-0 mb-3">Documentation</h3>
        <div>{{ props.task?.documentation }}</div>
    </div>
</template>
