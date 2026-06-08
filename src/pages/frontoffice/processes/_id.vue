<script setup lang="ts">
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@/forms.scss';

import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition } from '@services/ProcessesService';
import type { IForm } from '@services/FormsService';
import { parseApiError } from '@/utils/error';
import ProcessInfo      from '@pages/admin/processes/components/ProcessInfo.vue';
import ProcessInstances from '@pages/admin/processes/components/ProcessInstances.vue';
import ProcessStats     from '@pages/admin/processes/components/ProcessStats.vue';
import StartProcessDialog from './components/StartProcessDialog.vue';

const route  = useRoute();
const router = useRouter();

const process       = ref<ProcessDefinition | null>(null);
const formSchema    = ref<IForm | null>(null);
const loading       = ref(false);
const error         = ref<string | null>(null);
const dialogVisible = ref(false);
const activeTab     = ref<'info' | 'instances' | 'stats'>('info');

const tabs = [
    { key: 'info',      label: 'Info',      icon: 'pi pi-info-circle' },
    { key: 'instances', label: 'Instances', icon: 'pi pi-list'        },
    { key: 'stats',     label: 'Stats',     icon: 'pi pi-chart-bar'   },
] as const;

// ── Load ─────────────────────────────────────────────────────────────────────

async function load() {
    loading.value = true;
    error.value   = null;
    try {
        const id = route.params.id as string;
        const [pd, form] = await Promise.allSettled([
            $api.processes.findById(id),
            $api.processes.getStartForm(id),
        ]);
        if (pd.status === 'rejected') throw pd.reason;
        process.value    = pd.value;
        formSchema.value = form.status === 'fulfilled' ? form.value : null;
    } catch (err) {
        const info = parseApiError(err);
        error.value = info.detail ?? info.summary;
    } finally {
        loading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <div class="flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">

        <!-- ── Page header ────────────────────────────────────────────────── -->
        <div class="border-b border-surface-200 dark:border-surface-700 px-6 py-4 flex items-center gap-3 shrink-0">
            <button
                class="text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors mr-4"
                @click="router.push({ name: 'FrontofficeProcesses' })"
            >
                <i class="pi pi-arrow-left" />
            </button>

            <div class="flex-1 min-w-0">
                <div v-if="loading" class="space-y-1">
                    <div class="h-5 w-48 rounded bg-surface-200 dark:bg-surface-700 animate-pulse" />
                    <div class="h-3 w-32 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
                </div>
                <div v-else>
                    <h1 class="text-xl font-semibold truncate" style="color: var(--layout-title-color)">
                        {{ process?.name ?? 'Process' }}
                    </h1>
                    <p v-if="process?.processId" class="text-xs text-surface-400 font-mono mt-0.5">
                        {{ process.processId }} · v{{ process?.version ?? 1 }}
                    </p>
                </div>
            </div>

            <Button
                v-if="!loading && !error && process"
                label="Start Process"
                icon="pi pi-play"
                @click="dialogVisible = true"
            />
        </div>

        <!-- ── Error ──────────────────────────────────────────────────────── -->
        <div v-if="error" class="flex flex-col items-center justify-center py-24 text-surface-400 gap-3">
            <i class="pi pi-exclamation-circle text-4xl" />
            <p class="text-sm">{{ error }}</p>
            <Button severity="secondary" size="small" label="Go back" icon="pi pi-arrow-left"
                    @click="router.push({ name: 'FrontofficeProcesses' })" />
        </div>

        <template v-else-if="process">

            <!-- ── Tab strip ──────────────────────────────────────────────── -->
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

            <!-- ── Tab content ─────────────────────────────────────────────── -->
            <div class="flex-1 overflow-auto">

                <!-- Loading skeleton (only on initial load inside Info tab) -->
                <div v-if="loading && activeTab === 'info'" class="max-w-2xl mx-auto px-6 py-10 space-y-4">
                    <div class="h-3 w-3/4 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
                    <div class="h-3 w-1/2 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
                    <div class="h-24 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse mt-6" />
                    <div class="h-24 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
                </div>

                <template v-else-if="activeTab === 'info'">
                    <ProcessInfo
                        :initial-meta="{
                            description:         process.description,
                            responsibleContacts: process.responsibleContacts,
                            starterGroups:       process.starterGroups,
                            starterUsers:        process.starterUsers,
                        }"
                        readonly
                    />

                    <!-- Meta row -->
                    <div class="max-w-2xl mx-auto px-6 pb-4 flex flex-wrap gap-4 text-xs text-surface-400">
                        <span v-if="process.createdAt">
                            <i class="pi pi-calendar mr-1" />
                            Created {{ new Date(process.createdAt).toLocaleDateString() }}
                        </span>
                        <span>
                            <i class="pi pi-tag mr-1" />
                            Version {{ process.version ?? 1 }}
                        </span>
                        <span v-if="!formSchema">
                            <i class="pi pi-info-circle mr-1" />
                            No start form — variables can be added before starting
                        </span>
                    </div>

                    <!-- Start CTA -->
                    <div class="max-w-2xl mx-auto px-6 pb-8">
                        <div class="rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 flex flex-col items-center gap-3 text-center">
                            <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: color-mix(in srgb, var(--layout-accent-color) 12%, transparent)">
                                <i class="pi pi-play text-lg" style="color: var(--layout-accent-color)" />
                            </div>
                            <p class="text-sm text-surface-600 dark:text-surface-400">
                                Ready to start <strong class="text-surface-900 dark:text-surface-100">{{ process.name }}</strong>?
                            </p>
                            <Button label="Start Process" icon="pi pi-play" @click="dialogVisible = true" />
                        </div>
                    </div>
                </template>

                <ProcessInstances
                    v-else-if="activeTab === 'instances'"
                    :process-id="process.processId"
                    :process-definition-id="process.id!"
                />

                <ProcessStats
                    v-else-if="activeTab === 'stats'"
                    :process-definition-id="process.processId"
                />

            </div>

        </template>

        <!-- ── Start Process Dialog ───────────────────────────────────────── -->
        <StartProcessDialog
            v-if="process"
            v-model:visible="dialogVisible"
            :process="process"
            :form-schema="formSchema"
        />

    </div>

    <!-- Needed for the instance detail dialog rendered by ProcessInstances -->
    <RouterView />
</template>
