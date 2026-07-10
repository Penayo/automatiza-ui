<script setup lang="ts">
import { ref, computed } from 'vue';
import { Dialog, useToast, FileUpload } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition } from '@services/ProcessesService';
import CamundaModeler from '@pages/admin/modeler/components/CamundaModeler.vue';

const $emit = defineEmits(['created']);
const toast = useToast();
const visible = ref(true);
const loadedXml = ref<string | null>(null);

const loadedProcess = computed(() =>
    loadedXml.value ? ({ bpmnXml: loadedXml.value } as ProcessDefinition) : undefined,
);

const handleFileSelect = (event: any) => {
    const file = event.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        loadedXml.value = e.target?.result as string;
    };
    reader.readAsText(file);
};

const handleSave = async (xml: string) => {
    try {
        const result = await $api.processes.saveProcess({ bpmnXml: xml });
        toast.add({ severity: 'success', summary: 'Success', detail: 'Process saved successfully!', life: 3000 });
        $emit('created', result);
        visible.value = false;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save process', life: 3000 });
    }
};
</script>

<template>
    <Dialog
        v-model:visible="visible"
        modal
        :header="loadedXml ? 'New Process — Review Diagram' : 'New Process'"
        :style="loadedXml ? { width: '90vw', height: '85vh' } : { width: '30rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        @after-hide="$router.go(-1)"
    >
        <div v-if="!loadedXml" class="m-0">
            <FileUpload
                mode="basic"
                accept=".bpmn,.xml"
                :maxFileSize="1000000"
                @select="handleFileSelect"
                chooseLabel="Select BPMN file"
            />
            <small class="block mt-2 text-gray-500">
                Select a BPMN file (.bpmn or .xml) to upload a new process.
            </small>
        </div>

        <div v-else style="height: 70vh">
            <CamundaModeler :process="loadedProcess" @save="handleSave" />
        </div>
    </Dialog>
</template>
