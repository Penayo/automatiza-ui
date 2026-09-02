<script setup lang="ts">
import { onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, useConfirm } from 'primevue';
import { $api } from '@services/api';
import { onApprove } from '@/utils/common';
import type { ProcessDefinition } from '@services/ProcessesService';
import { processEditKey } from './processEditContext';

const route   = useRoute();
const router  = useRouter();
const toast   = useToast();
const confirm = useConfirm();

const process = ref<ProcessDefinition | null>(null);
const loading = ref(false);

const tabs = [
    { name: 'ProcessEditSpec',      label: 'Spec',      icon: 'pi pi-file-edit'   },
    { name: 'ProcessEditInfo',      label: 'Info',      icon: 'pi pi-info-circle' },
    { name: 'ProcessEditInstances', label: 'Instances', icon: 'pi pi-list'       },
    { name: 'ProcessEditDiagram',   label: 'Diagram',   icon: 'pi pi-sitemap'    },
    { name: 'ProcessEditStats',     label: 'Stats',     icon: 'pi pi-chart-bar'  },
] as const;

/** A tab stays highlighted while one of its own child routes is active. */
const isActive = (name: string) => route.matched.some(r => r.name === name);

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

// A diagram save mints a new definition id and rewrites the URL — refetch on :id change,
// but not when only the tab segment changes.
watch(() => route.params.id, (id, prev) => {
    if (id && id !== prev && id !== process.value?.id) fetchProcess();
});

// Tab route components read the process through this instead of props, since
// <RouterView> children can't receive them.
provide(processEditKey, {
    process,
    loading,
    setProcess: (p: ProcessDefinition) => { process.value = p; },
});

// ── Export ───────────────────────────────────────────────────────────────────

function onExportBpmn() {
    if (!process.value?.bpmnXml) return;
    onApprove(confirm, 'Are you sure you want to export the process XML?', exportBpmn);
}

function exportBpmn() {
    if (!process.value?.bpmnXml) return;
    const blob = new Blob([process.value.bpmnXml], { type: 'application/xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${process.value.processId}-v${process.value.version ?? 1}.bpmn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

            <button
                v-if="process"
                class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                v-tooltip.top="'Export BPMN XML'"
                @click="onExportBpmn"
            >
                <i class="pi pi-download text-xs" />
                Export
            </button>
        </div>

        <!-- ── Tab strip ─────────────────────────────────────────────────── -->
        <div class="flex px-6 border-b border-surface-200 dark:border-surface-700 shrink-0">
            <RouterLink
                v-for="tab in tabs"
                :key="tab.name"
                :to="{ name: tab.name, params: { id: route.params.id } }"
                class="px-4 py-2.5 text-sm border-b-2 transition-colors flex items-center gap-1.5"
                :class="isActive(tab.name)
                    ? 'font-medium border-(--layout-accent-color)'
                    : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'"
                :style="isActive(tab.name)
                    ? 'color: var(--layout-title-color); border-bottom-color: var(--layout-accent-color)'
                    : ''"
            >
                <i :class="tab.icon" class="text-sm" />
                {{ tab.label }}
            </RouterLink>
        </div>

        <!-- ── Tab content — one lazily-loaded route component per tab ────── -->
        <div class="flex-1 overflow-auto">
            <RouterView />
        </div>
    </div>
</template>
