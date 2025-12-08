<script setup lang="ts">
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel, Panel } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { $api } from '../../../services/api';
import type { Task } from '../../../services/TasksService';
import JsonEditor from 'vue3-ts-jsoneditor';
import { ref, watch } from 'vue';

const props = defineProps<{
    processInstanceId?: string;
}>();

const tasks = ref<Task[]>([]);
const selectedTask = ref<Task | null>(null);
const loading = ref(false);

const getTasks = async () => {
    const selectedCopy = selectedTask.value

    loading.value = true;
    tasks.value = await $api.processes.getInstanceTasks(props.processInstanceId as string);
    loading.value = false;
    
    if (selectedCopy) {
        setTimeout(() => {
            selectedTask.value = tasks.value.find(task => task.id == selectedCopy?.id) as Task;
        }, 700)
    }
};

watch(() => props.processInstanceId, async (newVal) => {
    if (newVal) {
        await getTasks();
    }
}, { immediate: true });

</script>

<template>
    <Accordion class="-mx-3" multiple>
        <AccordionPanel v-for="task in tasks" :value="task.id">
            <AccordionHeader>
                <div class="flex items-center gap-2">
                    <i v-if="task.type == 'bpmn:UserTask'" class="pi pi-users pi-briefcase"></i>
                    <i v-else class="pi pi-cog"></i>
                    <span class="font-bold">{{ task.name }}</span>
                </div>
            </AccordionHeader>
            <AccordionContent>
                <p class="m-0">
                    <json-editor
                        :modelValue="task"
                        :mainMenuBar="false"
                        :navigationBar="false"
                        :statusBar="false"
                        :darkTheme="true"
                        :readOnly="true"
                        height="250"
                    />
                </p>
            </AccordionContent>
        </AccordionPanel>
    </Accordion>
</template>