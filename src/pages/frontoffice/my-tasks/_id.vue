<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue';
import TaskForm from '@pages/frontoffice/my-tasks/components/TaskForm.vue';
import type { Task } from '@services/TasksService';
import { $api } from '@services/api';
import { parseApiError } from '@/utils/error';

const route   = useRoute();
const toast   = useToast();
const task    = ref<Task | null>(null);
const loading = ref(false);

const fetchTask = async () => {
    loading.value = true;
    try {
        task.value = await $api.tasks.findById(route.params.taskId as string);
    } catch (error) {
        const errorInfo = parseApiError(error);
        toast.add({ ...errorInfo, life: 6000 });
    } finally {
        loading.value = false;
    }
};

onMounted(fetchTask);
</script>

<template>
    <div class="min-h-screen bg-zinc-950 text-zinc-100">
        <div class="max-w-2xl mx-auto px-6 py-10">

            <div v-if="loading" class="flex justify-center items-center h-64">
                <i class="pi pi-spin pi-spinner text-2xl text-zinc-400" />
            </div>

            <div v-else-if="!task" class="flex flex-col items-center justify-center py-20 text-zinc-500">
                <i class="pi pi-exclamation-circle text-4xl mb-3" />
                <p>Task not found.</p>
            </div>

            <div v-else>
                <h1 class="text-2xl font-semibold text-white">{{ task.name }}</h1>
                <p class="text-sm text-zinc-400 mt-1 mb-8">{{ task.processInfo?.name }}</p>
                <TaskForm :task="task" @refresh="fetchTask" />
            </div>

        </div>
    </div>
</template>
