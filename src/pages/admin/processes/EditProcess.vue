<script setup lang="ts">
import { onMounted, ref, computed, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, useConfirm } from 'primevue';
import { $api } from '@services/api';
import axios from 'axios';
import { onApprove } from '@/utils/common';
import type { ProcessDefinition, UpdateProcessMetaDto } from '@services/ProcessesService';
import type CamundaModelerType from '@pages/admin/modeler/components/CamundaModeler.vue';
import ProcessInfo      from './components/ProcessInfo.vue';
import ProcessInstances from './components/ProcessInstances.vue';
import ProcessStats     from './components/ProcessStats.vue';

// Lazy-loaded: pulls in the full bpmn-js/camunda-modeler stack, so keep it out
// of this route's initial chunk until the Diagram tab is actually opened.
const CamundaModelerLoading = {
    template: `<div class="h-full flex items-center justify-center text-surface-400">
        <i class="pi pi-spin pi-spinner text-xl" />
    </div>`,
};
const CamundaModeler = defineAsyncComponent({
    loader: () => import('@pages/admin/modeler/components/CamundaModeler.vue'),
    loadingComponent: CamundaModelerLoading,
    delay: 150,
});

const route   = useRoute();
const router  = useRouter();
const toast   = useToast();
const confirm = useConfirm();

const modelerRef = ref<InstanceType<typeof CamundaModelerType> | null>(null);
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
    publiclyStartable:   process.value?.publiclyStartable        ?? false,
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

        modelerRef.value?.markSaved();
        toast.add({ severity: 'success', summary: 'Saved', detail: `Diagram saved — v${saved?.version ?? ''}.`, life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save diagram.', life: 3000 });
    }
}

// ── Events from children ──────────────────────────────────────────────────────

function onInfoSaved(updated: ProcessDefinition) {
    process.value = updated;
}

// ── API start (machine-to-machine) section ───────────────────────────────────

const tokenMasked   = ref(true);
const regenerating  = ref(false);

const BASE = import.meta.env.VITE_API_HOST ?? 'http://localhost:3000';

// In production VITE_API_HOST is the relative "/api" (nginx proxies it to the engine),
// so absolutize it — this URL is meant to be copied into an external system.
const API_ORIGIN = BASE.startsWith('http') ? BASE : `${window.location.origin}${BASE}`;

const apiStartUrl = computed(() => {
    if (!process.value?.id) return null;
    return `${API_ORIGIN}/bpmn/processes/${process.value.id}/api-start`;
});

const displayedToken = computed(() => {
    const t = process.value?.webhookToken;
    if (!t) return '—';
    return tokenMasked.value ? t.slice(0, 6) + '•'.repeat(t.length - 6) : t;
});

async function copyText(text: string | null) {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
    } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    toast.add({ severity: 'success', summary: 'Copied', life: 1500 });
}

async function regenerateToken() {
    if (!process.value?.id) return;
    regenerating.value = true;
    try {
        const token = localStorage.getItem('token');
        const { data } = await axios.post(
            `${BASE}/bpmn/processes/${process.value.id}/regenerate-token`,
            {},
            { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        process.value = { ...process.value!, webhookToken: data.webhookToken };
        toast.add({ severity: 'success', summary: 'Token regenerated', detail: 'New token is now active.', life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not regenerate token.', life: 4000 });
    } finally {
        regenerating.value = false;
    }
}

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
    console.log(process.value)
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

            <div v-if="activeTab === 'info' && process">
                <ProcessInfo
                    :process-id="process.id!"
                    :initial-meta="initialMeta()"
                    :public-start-token="process.publicStartToken"
                    @saved="onInfoSaved"
                    @token-changed="(t: string) => process && (process.publicStartToken = t)"
                />

                <!-- ── Webhook / Public Link ────────────────────────────── -->
                <div class="max-w-2xl px-6 pb-10 space-y-4">
                    <div class="border-t border-surface-200 dark:border-surface-700 pt-6">
                        <h2 class="text-xs font-medium text-surface-400 uppercase tracking-wide mb-4">Integrations</h2>

                        <!-- API trigger URL (the human-facing link lives in ProcessInfo above) -->
                        <div class="space-y-1.5 mb-5">
                            <label class="text-xs font-medium text-surface-500">API Trigger URL</label>
                            <p class="text-xs text-surface-400">
                                For other systems, not for people. <code class="font-mono">POST</code> with
                                <code class="font-mono">Authorization: Bearer &lt;token&gt;</code> and a JSON body of
                                <code class="font-mono">{ "variables": { … } }</code> to start an instance.
                                To share the form with people, use the Public Start Link above.
                            </p>
                            <div class="flex items-center gap-2 mt-1">
                                <code class="flex-1 truncate text-xs bg-surface-100 dark:bg-surface-800 rounded-lg px-3 py-2 text-surface-700 dark:text-surface-300 font-mono">
                                    {{ apiStartUrl }}
                                </code>
                                <button
                                    class="shrink-0 p-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                                    v-tooltip.top="'Copy URL'"
                                    @click="copyText(apiStartUrl)"
                                >
                                    <i class="pi pi-copy text-sm text-surface-500" />
                                </button>
                            </div>
                        </div>

                        <!-- Token -->
                        <div class="space-y-1.5">
                            <label class="text-xs font-medium text-surface-500">API Token</label>
                            <p class="text-xs text-surface-400">
                                Secret. Send it as the <code class="font-mono">Bearer</code> token on the POST above —
                                never put it in a URL or a shared link. Regenerating breaks any integration using the old value.
                            </p>
                            <div class="flex items-center gap-2 mt-1">
                                <code class="flex-1 text-xs bg-surface-100 dark:bg-surface-800 rounded-lg px-3 py-2 text-surface-700 dark:text-surface-300 font-mono tracking-wider">
                                    {{ displayedToken }}
                                </code>
                                <button
                                    class="shrink-0 p-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                                    v-tooltip.top="tokenMasked ? 'Show token' : 'Hide token'"
                                    @click="tokenMasked = !tokenMasked"
                                >
                                    <i :class="tokenMasked ? 'pi pi-eye' : 'pi pi-eye-slash'" class="text-sm text-surface-500" />
                                </button>
                                <button
                                    class="shrink-0 p-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                                    v-tooltip.top="'Copy token'"
                                    @click="copyText(process.webhookToken ?? null)"
                                >
                                    <i class="pi pi-copy text-sm text-surface-500" />
                                </button>
                                <button
                                    class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                    v-tooltip.top="'Generate a new token — old token will stop working'"
                                    :disabled="regenerating"
                                    @click="regenerateToken"
                                >
                                    <i :class="regenerating ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" class="text-xs" />
                                    Regenerate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ProcessInstances
                v-else-if="activeTab === 'instances' && process"
                :process-id="process.processId"
                :process-definition-id="process.id!"
                :process-name="process.name"
            />

            <div v-else-if="activeTab === 'diagram'" class="h-full flex flex-col overflow-hidden">
                <CamundaModeler v-if="process" ref="modelerRef" :process="process" @save="saveDiagram" />
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
