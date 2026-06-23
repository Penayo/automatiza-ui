<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition } from '@services/ProcessesService';
import StartProcessDialog from './components/StartProcessDialog.vue';

const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const visible = ref(true);
const process = ref<ProcessDefinition>();

onMounted(async () => {
    try {
        process.value = await $api.processes.findById(route.params.id as string);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load process', life: 3000 });
    }
});

function onClose() {
    visible.value = false;
    router.go(-1);
}
</script>

<template>
    <StartProcessDialog
        :visible="visible"
        :processDefinitionId="(route.params.id as string)"
        :processName="process?.name"
        @update:visible="!$event && onClose()"
        @started="onClose"
    />
</template>
