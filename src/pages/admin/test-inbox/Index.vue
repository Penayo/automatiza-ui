<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Button, Tag, useToast, useConfirm } from 'primevue';
import dayjs from 'dayjs';
import { $api } from '@services/api';
import type { TestEmailLog } from '@services/TestEmailLogsService';
import { useTestEmailUnread } from '@/composables/useTestEmailUnread';


const toast   = useToast();
const confirm = useConfirm();
const { refresh: refreshUnreadCount } = useTestEmailUnread();

const emails    = ref<TestEmailLog[]>([]);
const loading   = ref(false);
const selected  = ref<TestEmailLog | null>(null);
const search    = ref('');

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return emails.value;
    return emails.value.filter(e =>
        e.subject.toLowerCase().includes(q) ||
        e.to.toLowerCase().includes(q) ||
        (e.from ?? '').toLowerCase().includes(q) ||
        (e.taskName ?? '').toLowerCase().includes(q),
    );
});

async function load() {
    loading.value = true;
    try {
        emails.value = await $api.testEmailLogs.findAll();
        if (emails.value.length > 0 && !selected.value) {
            selectEmail(emails.value[0]);
        }
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load test emails', life: 3000 });
    } finally {
        loading.value = false;
    }
}

function clearAll() {
    confirm.require({
        message: 'Delete all captured test emails? This cannot be undone.',
        header: 'Clear inbox',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Cancel', severity: 'secondary', text: true },
        acceptProps: { label: 'Delete all', severity: 'danger' },
        accept: async () => {
            await $api.testEmailLogs.deleteAll();
            emails.value   = [];
            selected.value = null;
            refreshUnreadCount();
            toast.add({ severity: 'success', summary: 'Cleared', detail: 'Test inbox cleared', life: 2000 });
        },
    });
}

async function selectEmail(email: TestEmailLog) {
    selected.value = email;
    if (!email.read) {
        email.read = true; // optimistic update
        await $api.testEmailLogs.markAsRead(email.id);
        refreshUnreadCount();
    }
}

function formatDate(d: string) {
    return dayjs(d).format('YYYY/MM/DD HH:mm');
}

// Build a full HTML document for the iframe so the email renders in isolation
const iframeSrc = computed(() => {
    if (!selected.value) return '';
    const html = selected.value.html ?? '';
    // Wrap bare fragments in a minimal document
    const doc = html.trimStart().startsWith('<!DOCTYPE') || html.trimStart().startsWith('<html')
        ? html
        : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:sans-serif;}</style></head><body>${html}</body></html>`;
    return `data:text/html;charset=utf-8,${encodeURIComponent(doc)}`;
});

onMounted(load);
</script>

<template>
    <div class="flex h-full overflow-hidden">

        <!-- ── Left panel: email list ───────────────────────────────────────── -->
        <div class="w-80 shrink-0 flex flex-col border-r border-surface-200 dark:border-surface-700 h-full overflow-hidden">

            <!-- Toolbar -->
            <div class="px-3 py-3 border-b border-surface-200 dark:border-surface-700 flex items-center gap-2 shrink-0">
                <span class="text-sm font-semibold flex-1" style="color: var(--layout-title-color)">
                    Test Inbox
                    <span v-if="emails.length" class="ml-1 text-xs font-normal text-surface-400">({{ emails.length }})</span>
                </span>
                <Button icon="pi pi-refresh" text size="small" severity="secondary" :loading="loading" @click="load" />
                <Button icon="pi pi-trash" text size="small" severity="danger" :disabled="!emails.length" @click="clearAll" />
            </div>

            <!-- Search -->
            <div class="px-3 py-2 shrink-0">
                <div class="relative">
                    <i class="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 text-xs pointer-events-none" />
                    <input
                        v-model="search"
                        type="text"
                        placeholder="Search emails…"
                        class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-xs pl-7 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-(--layout-accent-color)"
                    />
                </div>
            </div>

            <!-- Empty -->
            <div v-if="!loading && !filtered.length" class="flex flex-col items-center justify-center gap-2 flex-1 text-surface-400 text-sm px-4 text-center">
                <i class="pi pi-inbox text-3xl" />
                <p>{{ emails.length ? 'No results for your search.' : 'No test emails captured yet.\nStart a process in test mode to see emails here.' }}</p>
            </div>

            <!-- List -->
            <div class="flex-1 overflow-y-auto">
                <button
                    v-for="email in filtered"
                    :key="email.id"
                    class="w-full text-left px-3 py-3 border-b border-surface-100 dark:border-surface-800 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/60"
                    :class="selected?.id === email.id ? 'bg-surface-100 dark:bg-surface-800' : ''"
                    @click="selectEmail(email)"
                >
                    <div class="flex items-start justify-between gap-1 mb-0.5">
                        <span
                            class="text-sm truncate leading-tight"
                            :class="email.read
                                ? 'font-normal text-surface-500 dark:text-surface-200'
                                : 'font-bold text-surface-900 dark:text-surface-100'"
                        >
                            {{ email.subject }}
                        </span>
                        <span class="text-[10px] text-surface-400 shrink-0 mt-0.5">{{ formatDate(email.capturedAt) }}</span>
                    </div>
                    <p v-if="email.taskName" class="text-[10px] italic text-surface-400 truncate mt-0.5">
                        {{ email.taskName }}
                    </p>
                </button>
            </div>
        </div>

        <!-- ── Right panel: email detail ────────────────────────────────────── -->
        <div class="flex-1 flex flex-col h-full overflow-hidden">

            <!-- No selection -->
            <div v-if="!selected" class="flex flex-col items-center justify-center gap-3 flex-1 text-surface-400">
                <i class="pi pi-envelope-open text-5xl" />
                <p class="text-sm">Select an email to preview it</p>
            </div>

            <template v-else>
                <!-- Email header -->
                <div class="px-6 py-4 border-b border-surface-200 dark:border-surface-700 shrink-0 space-y-1">
                    <h2 class="text-base font-semibold" style="color: var(--layout-title-color)">{{ selected.subject }}</h2>
                    <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-surface-500">
                        <span v-if="selected.from"><span class="text-surface-400">From:</span> {{ selected.from }}</span>
                        <span><span class="text-surface-400">To:</span> {{ selected.to }}</span>
                        <span v-if="selected.cc"><span class="text-surface-400">Cc:</span> {{ selected.cc }}</span>
                        <span v-if="selected.bcc"><span class="text-surface-400">Bcc:</span> {{ selected.bcc }}</span>
                        <span><span class="text-surface-400">Date:</span> {{ formatDate(selected.capturedAt) }}</span>
                    </div>
                    <div class="flex flex-wrap gap-2 pt-1">
                        <Tag severity="warn" value="TEST — not sent" />
                        <Tag
                            v-if="selected.taskName"
                            severity="secondary"
                            :value="selected.taskName"
                            icon="pi pi-cog"
                        />
                        <Tag
                            severity="secondary"
                            :value="selected.processInstanceId"
                            icon="pi pi-link"
                            class="font-mono text-[10px]!"
                        />
                    </div>
                </div>

                <!-- HTML preview iframe -->
                <div class="flex-1 overflow-hidden bg-white">
                    <iframe
                        :src="iframeSrc"
                        class="w-full h-full border-0"
                        sandbox="allow-same-origin"
                        title="Email preview"
                    />
                </div>
            </template>
        </div>
    </div>
</template>
