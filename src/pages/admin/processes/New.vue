<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button, Dialog, InputText, useToast, FileUpload } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition } from '@services/ProcessesService';
import CamundaModeler from '@pages/admin/modeler/components/CamundaModeler.vue';
import { skeletonBpmn } from '@/utils/bpmn';

const toast  = useToast();
const router = useRouter();

const visible   = ref(true);
const name      = ref('');
const creating  = ref(false);
const loadedXml = ref<string | null>(null);

const loadedProcess = computed(() =>
    loadedXml.value ? ({ bpmnXml: loadedXml.value } as ProcessDefinition) : undefined,
);

const canCreate = computed(() => name.value.trim().length > 0 && !creating.value);

/**
 * Spec-first: the process is created from a skeleton diagram so it has a real
 * ProcessDefinition (and so the spec has its name to key on), then opens on the
 * Spec tab with nothing but the intent to write.
 */
async function createFromSpec() {
    if (!canCreate.value) return;
    creating.value = true;
    try {
        const created = await $api.processes.saveProcess({ bpmnXml: skeletonBpmn(name.value.trim()) } as ProcessDefinition);
        const id = (created as ProcessDefinition | null)?.id;
        if (!id) throw new Error('No process id returned');

        visible.value = false;
        // Navigate straight there: this dialog renders into the list's <router-view>,
        // which binds no listener, so an emit would reach nothing.
        router.replace({ name: 'ProcessEditSpec', params: { id } });
    } catch (err) {
        console.error('Failed to create process from spec', err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create the process', life: 4000 });
    } finally {
        creating.value = false;
    }
}

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
        const created = await $api.processes.saveProcess({ bpmnXml: xml } as ProcessDefinition);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Process saved successfully!', life: 3000 });
        visible.value = false;

        const id = (created as ProcessDefinition | null)?.id;
        if (id) router.replace({ name: 'ProcessEditSpec', params: { id } });
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
        :style="loadedXml ? { width: '90vw', height: '85vh' } : { width: '32rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        @after-hide="$router.go(-1)"
    >
        <div v-if="!loadedXml" class="m-0 space-y-5">
            <!-- Start from a spec — the default path -->
            <div class="space-y-1.5">
                <label class="text-xs font-medium text-surface-500">Process name</label>
                <InputText
                    v-model="name"
                    class="w-full"
                    placeholder="e.g. Employee Onboarding"
                    autofocus
                    @keyup.enter="createFromSpec"
                />
                <p class="text-xs text-surface-400">
                    Start by writing what the process is for. The diagram comes after — you can model it
                    on the Diagram tab whenever you are ready.
                </p>
            </div>

            <Button
                label="Start from a spec"
                icon="pi pi-file-edit"
                class="w-full"
                :loading="creating"
                :disabled="!canCreate"
                @click="createFromSpec"
            />

            <!-- Or upload an existing diagram -->
            <div class="flex items-center gap-3 pt-1">
                <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
                <span class="text-xs text-surface-400">or</span>
                <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
            </div>

            <div>
                <FileUpload
                    mode="basic"
                    accept=".bpmn,.xml"
                    :maxFileSize="1000000"
                    @select="handleFileSelect"
                    chooseLabel="Select BPMN file"
                />
                <small class="block mt-2 text-surface-400">
                    Upload an existing BPMN file (.bpmn or .xml) instead.
                </small>
            </div>
        </div>

        <div v-else style="height: 70vh">
            <CamundaModeler :process="loadedProcess" @save="handleSave" />
        </div>
    </Dialog>
</template>
