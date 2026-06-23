<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { Button, useToast } from 'primevue';
import { $api } from '@services/api';
import { useRouter } from 'vue-router';
import type { ProcessDefinition } from '@services/ProcessesService';
import { trackProcessOpen, sortProcesses, type ProcessSort } from '@/composables/useRecentProcesses';

const $router = useRouter();
const toast   = useToast();
const all     = ref<ProcessDefinition[]>([]);
const search  = ref('');
const loading = ref(false);
const sort    = ref<ProcessSort>('recent');

const sortOptions: { label: string; value: ProcessSort }[] = [
    { label: 'Recent',  value: 'recent' },
    { label: 'A–Z',     value: 'az'     },
    { label: 'Newest',  value: 'newest' },
];

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    const list = q
        ? all.value.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.processId?.toLowerCase().includes(q),
          )
        : all.value;
    return sortProcesses(list, sort.value);
});

const fetchData = async () => {
    loading.value = true;
    try {
        all.value = await $api.processes.getAllProcessDefinitions();
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load processes', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const deployProcess = async (item: ProcessDefinition, e: MouseEvent) => {
    e.stopPropagation();
    try {
        await $api.processes.deployProcess(item._id as string);
        toast.add({ severity: 'success', summary: 'Deployed', detail: `${item.name} deployed successfully!`, life: 3000 });
        fetchData();
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to deploy process', life: 3000 });
    }
};

const openEdit  = (proc: ProcessDefinition) => {
    trackProcessOpen(proc.processId);
    $router.push({ name: 'ProcessEdit', params: { id: proc.id! } });
};
const openStart = (id: string, e: MouseEvent) => { e.stopPropagation(); $router.push({ name: 'ProcessStart', params: { id } }); };
const openNew   = () => $router.push({ name: 'ProcessNew' });

const copyLink = async (proc: ProcessDefinition, e: MouseEvent) => {
    e.stopPropagation();
    const token = proc.webhookToken ? `?token=${proc.webhookToken}` : '';
    const url = `${window.location.origin}/start/${proc.id}${token}`;
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
    } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
    toast.add({ severity: 'success', summary: 'Copied', detail: 'Start form link copied to clipboard', life: 2000 });
};

onMounted(fetchData);
</script>

<template>
    <div class="flex flex-col h-full overflow-hidden">

        <!-- ── Header bar ────────────────────────────────────────────────── -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-5 border-b border-surface-200 dark:border-surface-700">
            <div>
                <h1 class="text-2xl font-thin" style="color: var(--layout-title-color)">Processes</h1>
                <p class="text-sm text-surface-500 mt-0.5">Manage and deploy BPMN process definitions</p>
            </div>
            <div class="sm:ml-auto flex items-center gap-2">
                <div class="relative">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none" />
                    <input
                        v-model="search"
                        type="text"
                        placeholder="Search processes…"
                        class="bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg pl-9 pr-4 py-2 text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 focus:outline-none focus:ring-1 w-56"
                        style="--tw-ring-color: var(--layout-accent-color)"
                    />
                </div>
                <!-- Sort pills -->
                <div class="flex items-center rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden text-xs">
                    <button
                        v-for="opt in sortOptions"
                        :key="opt.value"
                        class="px-3 py-1.5 transition-colors"
                        :class="sort === opt.value
                            ? 'bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 font-medium'
                            : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'"
                        @click="sort = opt.value"
                    >{{ opt.label }}</button>
                </div>
                <Button variant="text" rounded icon="pi pi-refresh" @click="fetchData" :loading="loading" />
                <Button icon="pi pi-plus" label="New" @click="openNew" />
            </div>
        </div>

        <!-- ── Content ───────────────────────────────────────────────────── -->
        <div class="flex-1 overflow-auto p-6">

            <!-- Skeleton -->
            <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div v-for="i in 8" :key="i" class="h-44 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
            </div>

            <!-- Empty -->
            <div v-else-if="filtered.length === 0" class="flex flex-col items-center justify-center py-24 text-surface-400 gap-3">
                <i class="pi pi-inbox text-5xl" />
                <p class="text-sm">{{ search ? 'No processes match your search.' : 'No processes yet. Upload a BPMN file to get started.' }}</p>
                <Button v-if="!search" icon="pi pi-plus" label="New Process" size="small" @click="openNew" />
            </div>

            <!-- Card grid -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div
                    v-for="proc in filtered"
                    :key="proc.id"
                    class="group relative rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 transition-all duration-150 cursor-pointer overflow-hidden hover:shadow-md"
                    style="--hover-border: var(--layout-accent-color)"
                    @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--layout-accent-color)'"
                    @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.borderColor = ''"
                    @click="openEdit(proc)"
                >
                    <!-- Top accent line (appears on hover) -->
                    <div class="h-0.5 w-full opacity-0 group-hover:opacity-100 transition-opacity" style="background: var(--layout-accent-color)" />

                    <div class="p-5">
                        <!-- Icon + version -->
                        <div class="flex items-start justify-between mb-3">
                            <span class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-400 transition-colors"
                                :style="{ color: 'inherit' }"
                                :class="'group-hover:text-(--layout-accent-color)'"
                            >
                                <i class="pi pi-sitemap text-lg" />
                            </span>
                            <span class="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 font-mono">
                                v{{ proc.version ?? 1 }}
                            </span>
                        </div>

                        <!-- Name -->
                        <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-50 leading-snug mb-1.5 line-clamp-2">
                            {{ proc.name }}
                        </h2>

                        <!-- Description -->
                        <p class="text-xs text-surface-500 leading-relaxed line-clamp-2 min-h-8">
                            {{ proc.description || 'No description.' }}
                        </p>

                        <!-- Created date -->
                        <p class="text-[11px] text-surface-400 mt-3">
                            {{ proc.createdAt ? new Date(proc.createdAt).toLocaleDateString() : '' }}
                        </p>
                    </div>

                    <!-- Hover action bar (slides up from bottom) -->
                    <div class="absolute inset-x-0 bottom-0 flex items-center border-t border-surface-100 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 translate-y-full group-hover:translate-y-0 transition-transform duration-150">
                        <button
                            class="flex-1 flex items-center justify-center gap-1.5 text-xs text-surface-500 py-2.5 hover:text-surface-900 dark:hover:text-surface-50 transition-colors"
                            @click.stop="openEdit(proc)"
                        >
                            <i class="pi pi-file-edit" /> Edit
                        </button>
                        <div class="w-px h-4 bg-surface-200 dark:bg-surface-700" />
                        <button
                            class="flex-1 flex items-center justify-center gap-1.5 text-xs text-surface-500 py-2.5 hover:text-blue-500 transition-colors"
                            @click="openStart(proc.id!, $event)"
                        >
                            <i class="pi pi-play" /> Start
                        </button>
                        <div class="w-px h-4 bg-surface-200 dark:bg-surface-700" />
                        <button
                            class="flex-1 flex items-center justify-center gap-1.5 text-xs text-surface-500 py-2.5 hover:text-violet-500 transition-colors"
                            @click="deployProcess(proc, $event)"
                        >
                            <i class="pi pi-upload" /> Deploy
                        </button>
                        <template v-if="proc.hasStartForm">
                        <div class="w-px h-4 bg-surface-200 dark:bg-surface-700" />
                        <button
                            class="flex-1 flex items-center justify-center gap-1.5 text-xs text-surface-500 py-2.5 hover:text-emerald-500 transition-colors"
                            v-tooltip.top="'Copy shareable start form link'"
                            @click="copyLink(proc, $event)"
                        >
                            <i class="pi pi-link" /> Link
                        </button>
                        </template>
                    </div>
                </div>
            </div>

        </div>

        <router-view />
    </div>
</template>
