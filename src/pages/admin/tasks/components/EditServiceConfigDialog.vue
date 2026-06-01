<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, Button, useToast } from 'primevue';
import { $api } from '@services/api';
import type { Task } from '@services/TasksService';

const props = defineProps<{
    visible: boolean;
    task: Task | null;
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    saved: [];
}>();

const toast  = useToast();
const saving = ref(false);
const raw    = ref('');
const error  = ref('');

watch(() => props.task, (task) => {
    error.value = '';
    raw.value   = task?.serviceConfig
        ? JSON.stringify(task.serviceConfig, null, 2)
        : '{}';
}, { immediate: true });

function validate(): Record<string, any> | null {
    error.value = '';
    try {
        return JSON.parse(raw.value);
    } catch (e: any) {
        error.value = `Invalid JSON: ${e.message}`;
        return null;
    }
}

async function save() {
    const parsed = validate();
    if (parsed === null) return;

    saving.value = true;
    try {
        await $api.tasks.updateServiceConfig(props.task!.id, parsed);
        toast.add({ severity: 'success', summary: 'Service config saved', life: 3000 });
        emit('saved');
        emit('update:visible', false);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not update service config.', life: 4000 });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        :header="`Edit Service Config — ${props.task?.name ?? ''}`"
        :style="{ width: '720px' }"
        :dismissableMask="true"
    >
        <div class="flex flex-col gap-2">
            <textarea
                v-model="raw"
                rows="18"
                spellcheck="false"
                class="w-full font-mono text-sm rounded border
                       bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100
                       px-3 py-2 resize-y focus:outline-none focus:ring-1
                       focus:ring-(--layout-accent-color)"
                :class="error ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'"
                @input="error = ''"
            />
            <span v-if="error" class="text-xs text-red-500">{{ error }}</span>
        </div>

        <template #footer>
            <Button label="Cancel" severity="secondary" text @click="emit('update:visible', false)" />
            <Button label="Save" icon="pi pi-check" :loading="saving" @click="save" />
        </template>
    </Dialog>
</template>
