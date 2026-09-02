<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { useToast } from 'primevue';
import axios from 'axios';
import type { ProcessDefinition, UpdateProcessMetaDto } from '@services/ProcessesService';
import ProcessInfo from '../components/ProcessInfo.vue';
import { processEditKey } from '../processEditContext';

const { process, setProcess } = inject(processEditKey)!;

const toast = useToast();

/** Initial meta snapshot passed down to ProcessInfo */
const initialMeta = (): UpdateProcessMetaDto => ({
    description:         process.value?.description         ?? '',
    responsibleContacts: [...(process.value?.responsibleContacts ?? [])],
    starterGroups:       [...(process.value?.starterGroups       ?? [])],
    starterUsers:        [...(process.value?.starterUsers        ?? [])],
    publiclyStartable:   process.value?.publiclyStartable        ?? false,
});

function onInfoSaved(updated: ProcessDefinition) {
    setProcess(updated);
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
        setProcess({ ...process.value!, webhookToken: data.webhookToken });
        toast.add({ severity: 'success', summary: 'Token regenerated', detail: 'New token is now active.', life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not regenerate token.', life: 4000 });
    } finally {
        regenerating.value = false;
    }
}
</script>

<template>
    <div v-if="process">
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
</template>
