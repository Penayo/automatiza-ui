<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Splitter, SplitterPanel } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import TaskDetails from '@pages/admin/tasks/components/TaskDetails.vue';
import type { Task } from '@services/TasksService';
import TaskList from '@pages/admin/tasks/components/TaskList.vue';

const taskListRef = ref();
const selected = ref<Task | null>(null);
const isMobile     = ref(window.innerWidth < 768);

function onSelect(task: Task | null) {
    selected.value = task;
};

function getTasks() {
    taskListRef.value.getTasks();
};

function goBack() {
    selected.value = null;
}

function onResize() {
    isMobile.value = window.innerWidth < 768;
}

onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));
</script>

<template>
    <!--
        Desktop (md+): two-column split — list fixed-width on the left, details fill the right.
        Mobile (<md): single-panel — list OR detail, toggled by selection, with a back button.
    -->
    <div class="flex h-[calc(100vh-50px)] overflow-hidden">

        <!-- ── List panel ────────────────────────────────────────────────── -->
        <div
            class="flex flex-col border-r overflow-y-auto"
            :class="[
                isMobile && selected ? 'hidden' : 'flex',
                isMobile ? 'w-full' : 'w-80 xl:w-96 shrink-0',
            ]"
            style="border-color: var(--layout-sidebar-border);"
        >
            <TaskList ref="taskListRef" @select="onSelect" />
        </div>

        <!-- ── Detail panel ──────────────────────────────────────────────── -->
        <div
            class="flex-1 flex flex-col overflow-y-auto"
            :class="isMobile && !selected ? 'hidden' : 'flex'"
        >
            <!-- Back button (mobile only) -->
            <div
                v-if="isMobile && selected"
                class="flex items-center gap-2 px-3 py-2 border-b"
                style="border-color: var(--layout-sidebar-border);"
            >
                <Button
                    icon="pi pi-arrow-left"
                    text
                    size="small"
                    label="All tasks"
                    @click="goBack"
                />
            </div>

            <TaskDetails :current-task="selected" @refresh="getTasks" />
        </div>
    </div>
</template>
