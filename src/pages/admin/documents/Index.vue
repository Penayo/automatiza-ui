<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { DataTable, Column, Tag, Button, InputText, Select, DatePicker, Paginator } from 'primevue';
import { $api } from '@services/api';
import { AuthService } from '@services/AuthService';
import type { ProcessDocumentRecord, DocumentListParams } from '@services/FilesService';

const authService  = new AuthService();
const accessInfo   = authService.getAccessInfo();
const isSuperAdmin = computed(() =>
    Array.isArray(accessInfo?.user?.roles) && accessInfo!.user.roles.includes('SUPER_ADMIN'),
);

// ── Filters ──────────────────────────────────────────────────────────────────
const search   = ref('');
const source   = ref<string | null>(null);
const dateFrom = ref<Date | null>(null);
const dateTo   = ref<Date | null>(null);

const sourceOptions = [
    { label: 'All sources',   value: null },
    { label: 'User upload',   value: 'user_upload' },
    { label: 'Report task',   value: 'report_task' },
    { label: 'E-Sign output', value: 'esign_output' },
];

// ── Pagination ────────────────────────────────────────────────────────────────
const page    = ref(1);
const limit   = ref(20);
const total   = ref(0);

// ── Data ──────────────────────────────────────────────────────────────────────
const docs    = ref<ProcessDocumentRecord[]>([]);
const loading = ref(false);

async function load() {
    loading.value = true;
    try {
        const params: DocumentListParams = {
            page:  page.value,
            limit: limit.value,
        };
        if (search.value)   params.search   = search.value;
        if (source.value)   params.source   = source.value as any;
        if (dateFrom.value) params.from     = dateFrom.value.toISOString();
        if (dateTo.value)   params.to       = dateTo.value.toISOString();

        const res = await $api.files.listAllDocuments(params);
        docs.value  = res.data;
        total.value = res.total;
    } finally {
        loading.value = false;
    }
}

function onPageChange(event: { page: number; rows: number }) {
    page.value  = event.page + 1;
    limit.value = event.rows;
    load();
}

function clearFilters() {
    search.value   = '';
    source.value   = null;
    dateFrom.value = null;
    dateTo.value   = null;
    page.value     = 1;
    load();
}

// Debounced search
let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { page.value = 1; load(); }, 400);
});

watch([source, dateFrom, dateTo], () => { page.value = 1; load(); });

onMounted(load);

// ── Helpers ───────────────────────────────────────────────────────────────────
const signedUrls = ref<Record<string, string>>({});

async function openDocument(doc: ProcessDocumentRecord) {
    if (signedUrls.value[doc.id]) {
        window.open(signedUrls.value[doc.id], '_blank', 'noopener,noreferrer');
        return;
    }
    const url = await $api.files.refreshSignedUrl(doc.r2Key);
    signedUrls.value[doc.id] = url;
    window.open(url, '_blank', 'noopener,noreferrer');
}

function formatSize(bytes: number): string {
    if (!bytes)               return '—';
    if (bytes < 1024)         return `${bytes} B`;
    if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceLabel(s: string): string {
    return ({ user_upload: 'User Upload', report_task: 'Report', esign_output: 'E-Sign' })[s] ?? s;
}

function sourceSeverity(s: string): string {
    return ({ user_upload: 'info', report_task: 'success', esign_output: 'warn' })[s] ?? 'secondary';
}

function formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
    <div class="flex flex-col h-full gap-4 p-6">

        <!-- Header -->
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-semibold text-surface-800 dark:text-surface-100">Documents</h1>
            <span class="text-sm text-surface-400">{{ total }} total</span>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-3 items-end">
            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-500">Search</label>
                <InputText
                    v-model="search"
                    placeholder="Filename…"
                    class="w-56"
                    size="small"
                />
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-500">Source</label>
                <Select
                    v-model="source"
                    :options="sourceOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="All sources"
                    class="w-44"
                    size="small"
                />
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-500">From</label>
                <DatePicker
                    v-model="dateFrom"
                    date-format="yy-mm-dd"
                    placeholder="Start date"
                    class="w-40"
                    size="small"
                    show-button-bar
                />
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-500">To</label>
                <DatePicker
                    v-model="dateTo"
                    date-format="yy-mm-dd"
                    placeholder="End date"
                    class="w-40"
                    size="small"
                    show-button-bar
                />
            </div>

            <Button
                label="Clear"
                icon="pi pi-times"
                severity="secondary"
                size="small"
                text
                @click="clearFilters"
            />
        </div>

        <!-- Table -->
        <DataTable
            :value="docs"
            :loading="loading"
            size="small"
            striped-rows
            empty-message="No documents found."
            class="flex-1"
        >
            <Column header="Filename" style="min-width: 200px">
                <template #body="{ data }">
                    <button
                        class="text-sm text-left flex items-center gap-1.5 hover:underline"
                        style="color: var(--p-primary-color);"
                        @click="openDocument(data)"
                    >
                        <i class="pi pi-file text-xs shrink-0" />
                        {{ data.filename }}
                    </button>
                </template>
            </Column>

            <Column header="Process / Task" style="min-width: 200px">
                <template #body="{ data }">
                    <span class="text-sm">
                        {{ [data.processName, data.taskName].filter(Boolean).join(' / ') || '—' }}
                    </span>
                </template>
            </Column>

            <Column header="Source" style="width: 120px">
                <template #body="{ data }">
                    <Tag
                        :value="sourceLabel(data.source)"
                        :severity="sourceSeverity(data.source)"
                        style="font-size: 0.7rem;"
                    />
                </template>
            </Column>

            <Column header="Size" style="width: 90px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ formatSize(data.size) }}</span>
                </template>
            </Column>

            <Column header="Type" style="width: 130px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400 font-mono">{{ data.mimeType }}</span>
                </template>
            </Column>

            <Column v-if="isSuperAdmin" header="Tenant" style="width: 130px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400 font-mono">{{ data.tenantId ?? '—' }}</span>
                </template>
            </Column>

            <Column header="Uploaded" style="width: 160px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ formatDate(data.createdAt) }}</span>
                </template>
            </Column>

            <Column style="width: 48px">
                <template #body="{ data }">
                    <button
                        v-tooltip.top="'Open in new tab'"
                        class="text-surface-400 hover:text-primary transition-colors"
                        @click="openDocument(data)"
                    >
                        <i class="pi pi-external-link text-sm" />
                    </button>
                </template>
            </Column>
        </DataTable>

        <!-- Pagination -->
        <Paginator
            :rows="limit"
            :total-records="total"
            :rows-per-page-options="[10, 20, 50]"
            @page="onPageChange"
        />
    </div>
</template>
