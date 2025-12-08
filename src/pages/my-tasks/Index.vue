<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Splitter, SplitterPanel } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import TaskDetails from './components/TaskDetails.vue';
import type { Task } from '../../services/TasksService';
import TaskList from './components/TaskList.vue';

const taskListRef = ref();
const selected = ref<Task | null>(null);
const loading = ref(false);

function onSelect(task: Task | null) {
    selected.value = task;
};

function getTasks() {
    taskListRef.value.getTasks();
};
</script>

<template>
    <Splitter>
        <SplitterPanel class="flex justify-content-center" :size="30" :minSize="10">
            <TaskList ref="taskListRef" @select="onSelect" />
        </SplitterPanel>
        <SplitterPanel :size="75">
            <TaskDetails :current-task="selected" @refresh="getTasks" />
        </SplitterPanel>
    </Splitter>
</template>
