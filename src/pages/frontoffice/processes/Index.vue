<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition } from '@services/ProcessesService';
import { parseApiError } from '@/utils/error';
import { trackProcessOpen, sortProcesses, type ProcessSort } from '@/composables/useRecentProcesses';

const router  = useRouter();
const toast   = useToast();
const loading = ref(false);
const search  = ref('');
const sort    = ref<ProcessSort>('recent');
const all     = ref<ProcessDefinition[]>([]);

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

async function fetchProcesses() {
    loading.value = true;
    try {
        all.value = await $api.processes.getAllProcessDefinitions();
    } catch (err) {
        toast.add({ ...parseApiError(err), life: 6000 });
    } finally {
        loading.value = false;
    }
}

function open(proc: ProcessDefinition) {
    trackProcessOpen(proc.processId);
    router.push({ name: 'FrontofficeProcessDetail', params: { id: proc.id! } });
}

onMounted(fetchProcesses);
</script>

<template>
    <div class="min-h-screen bg-white dark:bg-zinc-950">
        <!-- Header bar -->
        <div class="border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-zinc-950 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
                <h1 class="text-xl font-semibold" style="color: var(--layout-title-color)">Processes</h1>
                <p class="text-sm text-surface-500 mt-0.5">Start a new process request</p>
            </div>
            <div class="sm:ml-auto flex flex-wrap items-center gap-2">
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
                <!-- Search -->
                <div class="relative w-full sm:w-64">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none" />
                    <input
                        v-model="search"
                        type="text"
                        placeholder="Search processes…"
                        class="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2 pl-9 text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 focus:outline-none focus:ring-1"
                        style="--tw-ring-color: var(--layout-accent-color)"
                    />
                </div>
            </div>
        </div>

        <!-- Skeleton -->
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            <div v-for="i in 6" :key="i" class="h-36 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
        </div>

        <!-- Empty -->
        <div v-else-if="filtered.length === 0" class="flex flex-col items-center justify-center py-24 text-surface-400 gap-3">
            <i class="pi pi-inbox text-5xl" />
            <p class="text-sm">{{ search ? 'No processes match your search.' : 'No processes available.' }}</p>
        </div>

        <!-- Cards grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            <button
                v-for="proc in filtered"
                :key="proc.id"
                class="group text-left rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-5 transition-all duration-150 cursor-pointer focus:outline-none hover:shadow-md"
                @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--layout-accent-color)'"
                @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.borderColor = ''"
                @click="open(proc)"
            >
                <!-- Icon + version pill -->
                <div class="flex items-start justify-between mb-3">
                    <span class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-400 transition-colors"
                          :class="'group-hover:text-(--layout-accent-color)'"
                    >
                        <i class="pi pi-sitemap text-lg" />
                    </span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 font-mono">
                        v{{ proc.version ?? 1 }}
                    </span>
                </div>

                <!-- Name -->
                <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-50 leading-snug mb-1 line-clamp-2">
                    {{ proc.name }}
                </h2>

                <!-- Description -->
                <p class="text-xs text-surface-500 leading-relaxed line-clamp-3">
                    {{ proc.description || 'No description provided.' }}
                </p>

                <!-- Footer -->
                <div class="mt-4 flex items-center gap-1 text-xs text-surface-400 transition-colors" style="">
                    <i class="pi pi-arrow-right text-[10px]" />
                    <span>Open</span>
                </div>
            </button>
        </div>
    </div>
</template>
