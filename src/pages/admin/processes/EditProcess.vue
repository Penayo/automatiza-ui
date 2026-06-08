<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition, UpdateProcessMetaDto } from '@services/ProcessesService';
import CamundaModeler from '@pages/admin/modeler/components/CamundaModeler.vue';
import ProcessInfo      from './components/ProcessInfo.vue';
import ProcessInstances from './components/ProcessInstances.vue';
import ProcessStats     from './components/ProcessStats.vue';

const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const process   = ref<ProcessDefinition | null>(null);
const loading   = ref(false);
const activeTab = ref<'info' | 'diagram' | 'instances' | 'stats'>('info');

const tabs = [
    { key: 'info',      label: 'Info',      icon: 'pi pi-info-circle' },
    { key: 'instances', label: 'Instances', icon: 'pi pi-list'       },
    { key: 'diagram',   label: 'Diagram',   icon: 'pi pi-sitemap'    },
    { key: 'stats',     label: 'Stats',     icon: 'pi pi-chart-bar'  },
] as const;


// ── Derived props for child components ────────────────────────────────────────

/** Initial meta snapshot passed down to ProcessInfo */
const initialMeta = (): UpdateProcessMetaDto => ({
    description:         process.value?.description         ?? '',
    responsibleContacts: [...(process.value?.responsibleContacts ?? [])],
    starterGroups:       [...(process.value?.starterGroups       ?? [])],
    starterUsers:        [...(process.value?.starterUsers        ?? [])],
});

// ── Load ──────────────────────────────────────────────────────────────────────

async function fetchProcess() {
    loading.value = true;
    try {
        process.value = await $api.processes.findById(route.params.id as string);
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.message ?? 'Failed to load process', life: 4000 });
    } finally {
        loading.value = false;
    }
}

// ── Diagram save (handled here since CamundaModeler is used inline) ───────────

async function saveDiagram(xml: string) {
    if (!process.value) return;
    try {
        process.value.bpmnXml = xml;
        const saved = await $api.processes.saveProcess(process.value) as ProcessDefinition | null;

        // Backend always creates a new ProcessDefinition document (new id, incremented version).
        // Update local state so subsequent starts/stats use the new version.
        if (saved?.id) {
            process.value = saved;
            // Replace URL so the page stays bound to the latest version's id.
            router.replace({ name: 'ProcessEdit', params: { id: saved.id } });
        }

        toast.add({ severity: 'success', summary: 'Saved', detail: `Diagram saved — v${saved?.version ?? ''}.`, life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save diagram.', life: 3000 });
    }
}

// ── Events from children ──────────────────────────────────────────────────────

function onInfoSaved(updated: ProcessDefinition) {
    // Keep the local process in sync so the top-bar name/version stays current
    process.value = updated;
}

onMounted(fetchProcess);
</script>

<template>
    <div class="flex flex-col h-full overflow-hidden">

        <!-- ── Top bar ──────────────────────────────────────────────────── -->
        <div class="flex items-center gap-3 px-6 py-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
            <button
                class="text-surface-400 hover:text-surface-700 dark:hover:text-surface-100 transition-colors mr-4"
                @click="router.push({ name: 'ProcessesIndex' })"
            >
                <i class="pi pi-arrow-left" />
            </button>

            <div v-if="loading" class="h-5 w-48 rounded bg-surface-200 dark:bg-surface-700 animate-pulse" />
            <div v-else class="flex-1 min-w-0">
                <h1 class="text-lg font-semibold leading-tight truncate" style="color: var(--layout-title-color)">
                    {{ process?.name }}
                </h1>
                <p class="text-xs text-surface-400 mt-0.5">v{{ process?.version ?? 1 }} · {{ process?.processId }}</p>
            </div>
        </div>

        <!-- ── Tab strip ─────────────────────────────────────────────────── -->
        <div class="flex px-6 border-b border-surface-200 dark:border-surface-700 shrink-0">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                class="px-4 py-2.5 text-sm border-b-2 transition-colors flex items-center gap-1.5"
                :class="activeTab === tab.key
                    ? 'font-medium border-(--layout-accent-color)'
                    : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'"
                :style="activeTab === tab.key
                    ? 'color: var(--layout-title-color); border-bottom-color: var(--layout-accent-color)'
                    : ''"
                @click="activeTab = tab.key"
            >
                <i :class="tab.icon" class="text-sm" />
                {{ tab.label }}
            </button>
        </div>

        <!-- ── Tab content ───────────────────────────────────────────────── -->
        <div class="flex-1 overflow-auto">

            <ProcessInfo
                v-if="activeTab === 'info' && process"
                :process-id="process.id!"
                :initial-meta="initialMeta()"
                @saved="onInfoSaved"
            />

            <ProcessInstances
                v-else-if="activeTab === 'instances' && process"
                :process-id="process.processId"
                :process-definition-id="process.id!"
            />

            <div v-else-if="activeTab === 'diagram'" class="h-full" style="min-height: calc(100vh - 190px)">
                <CamundaModeler v-if="process" :process="process" @save="saveDiagram" />
            </div>

            <ProcessStats
                v-else-if="activeTab === 'stats' && process"
                :process-definition-id="process.processId"
            />

        </div>
    </div>

    <!-- Child route outlet — renders Detail dialog when an instance is selected -->
    <RouterView />
</template>
