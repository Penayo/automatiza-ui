<script setup lang="ts">
import { ref, computed } from 'vue';
import {
    useToast, useConfirm, Button, DataTable, Column, Dialog, InputText, InputNumber,
    Select, ToggleSwitch, Tag, IconField, InputIcon, Message,
    Tabs, TabList, Tab, TabPanels, TabPanel,
} from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { useTheme } from '@/composables/useTheme';
import { $api } from '@services/api';
import type {
    Datasource, SaveDatasourceDto, DatasourceOperation, TestResult, HealthResult,
} from '@services/DatasourcesService';
import { DATASOURCE_PRESETS, findPreset } from './presets';
import { onApprove } from '@/utils/common';
import { useTableQuery, ROWS_PER_PAGE_OPTIONS } from '@/composables/useTableQuery';

const toast   = useToast();
const confirm = useConfirm();
const { isDark } = useTheme();

// ── List ──────────────────────────────────────────────────────────────────────
const {
    items, totalRecords, loading, search,
    firstRow, rowsPerPage, reload, onPage, onSort,
} = useTableQuery<Datasource>({
    load: (params) => $api.datasources.getPage(params),
});

// Health is checked on demand — it costs an outbound request, so it is not run
// for every row on every page load.
const health = ref<Record<string, HealthResult | 'loading'>>({});

async function checkHealth(ds: Datasource) {
    health.value = { ...health.value, [ds.key]: 'loading' };
    try {
        health.value = { ...health.value, [ds.key]: await $api.datasources.health(ds.key) };
    } catch {
        health.value = { ...health.value, [ds.key]: { status: 'unhealthy', message: 'Check failed' } };
    }
}

const healthSeverity = (s?: string) =>
    s === 'healthy' ? 'success' : s === 'unhealthy' ? 'danger' : 'secondary';

// ── Editor ────────────────────────────────────────────────────────────────────
const dialogVisible = ref(false);
const saving        = ref(false);
const editingId     = ref<string | null>(null);

const AUTH_TYPES  = ['none', 'basic', 'bearer', 'apiKey'];
const FILTER_MODES = ['params', 'composed'];
const SORT_MODES  = ['none', 'param', 'params'];
const PAGE_STYLES = ['page', 'offset', 'range', 'none'];
const TOTAL_FROM  = ['none', 'body', 'header'];

function emptyForm(): SaveDatasourceDto {
    return {
        key: '', name: '', description: '', baseUrl: '',
        auth: { type: 'none' },
        timeoutMs: 10000,
        filterStyle: { mode: 'params' },
        sortStyle: { mode: 'none' },
        pagination: { style: 'none', total: { from: 'none' } },
        operations: [],
        healthCheck: '',
        enabled: true,
    };
}

const form = ref<SaveDatasourceDto>(emptyForm());

/**
 * Operations are authored as JSON rather than through a nested visual builder.
 * The shape is recursive (operations → filters → templates → notFound matchers)
 * and every field is meaningful, so a form would be both large and lossy. The
 * Test action below is what makes this workable: paste, run, see the composed
 * URL and the real response side by side.
 */
const operationsJson = ref('[]');
const jsonError      = ref('');

/**
 * The pagination *wire* maps and default headers. Structured selects cover
 * `style` and `total`; these three are free-form key→template maps whose names
 * are whatever the remote API happens to call them, so they are edited as JSON.
 */
const paginationWireJson = ref('{}');
const defaultHeadersJson = ref('{}');
const wireError          = ref('');
const headersError       = ref('');

/** Parse an editor's text, recording the failure against its own error ref. */
function parseJson<T>(text: string, errorRef: { value: string }, fallback: T): T | null {
    const raw = (text ?? '').trim();
    if (!raw) { errorRef.value = ''; return fallback; }
    try {
        errorRef.value = '';
        return JSON.parse(raw) as T;
    } catch (e: any) {
        errorRef.value = e?.message ?? 'Invalid JSON';
        return null;
    }
}

// ── Presets ───────────────────────────────────────────────────────────────────
// Files under ./presets, not database rows — see that folder's README.
const selectedPreset = ref<string | null>(null);
const presetDetail   = computed(() => findPreset(selectedPreset.value));

/**
 * Copy a preset's values into the form. A preset is a starting point only:
 * afterwards the datasource is independent of it, so re-applying is the way to
 * reset rather than an update mechanism.
 */
function applyPreset(id: string | null) {
    const preset = findPreset(id);
    if (!preset) return;

    const t = preset.template;

    // key/name stay untouched — they identify *this* datasource, not the flavour.
    form.value.baseUrl     = t.baseUrl ?? form.value.baseUrl;
    form.value.timeoutMs   = t.timeoutMs ?? form.value.timeoutMs;
    form.value.auth        = { ...(t.auth ?? { type: 'none' }) };
    form.value.filterStyle = { ...(t.filterStyle ?? { mode: 'params' }) };
    form.value.sortStyle   = { ...(t.sortStyle ?? { mode: 'none' }) };
    form.value.pagination  = {
        style: t.pagination?.style ?? 'none',
        total: { ...(t.pagination?.total ?? { from: 'none' }) },
    };
    form.value.healthCheck = t.healthCheck ?? '';

    paginationWireJson.value = JSON.stringify({
        params:         t.pagination?.params,
        headers:        t.pagination?.headers,
        requestHeaders: t.pagination?.requestHeaders,
    }, null, 2);
    defaultHeadersJson.value = JSON.stringify(t.defaultHeaders ?? {}, null, 2);
    operationsJson.value     = JSON.stringify(t.operations ?? [], null, 2);

    jsonError.value = wireError.value = headersError.value = '';
    toast.add({
        severity: 'info', summary: `${preset.name} applied`,
        detail: 'Adjust the paths and fields, then use Test to confirm against the real API.',
        life: 4000,
    });
}

function openNew() {
    editingId.value = null;
    selectedPreset.value = null;
    form.value = emptyForm();
    operationsJson.value = '[]';
    paginationWireJson.value = '{}';
    defaultHeadersJson.value = '{}';
    jsonError.value = wireError.value = headersError.value = '';
    resetTest();
    dialogVisible.value = true;
}

function openEdit(ds: Datasource) {
    editingId.value = ds.id;
    selectedPreset.value = null;
    form.value = {
        key: ds.key, name: ds.name, description: ds.description ?? '',
        baseUrl: ds.baseUrl,
        // Credential values are never returned (§4) — only *Configured flags.
        // Leaving them out means an unchanged save keeps the stored secret ref.
        auth: { ...ds.auth },
        defaultHeaders: ds.defaultHeaders,
        timeoutMs: ds.timeoutMs ?? 10000,
        filterStyle: { ...ds.filterStyle },
        sortStyle: { ...(ds.sortStyle ?? { mode: 'none' }) },
        pagination: JSON.parse(JSON.stringify(ds.pagination ?? { style: 'none' })),
        operations: [],
        healthCheck: ds.healthCheck ?? '',
        enabled: ds.enabled,
    };
    operationsJson.value = JSON.stringify(ds.operations ?? [], null, 2);
    paginationWireJson.value = JSON.stringify({
        params:         ds.pagination?.params,
        headers:        ds.pagination?.headers,
        requestHeaders: ds.pagination?.requestHeaders,
    }, null, 2);
    defaultHeadersJson.value = JSON.stringify(ds.defaultHeaders ?? {}, null, 2);
    jsonError.value = wireError.value = headersError.value = '';
    resetTest();
    dialogVisible.value = true;
}

function parseOperations(): DatasourceOperation[] | null {
    const parsed = parseJson<DatasourceOperation[]>(operationsJson.value, jsonError, []);
    if (parsed === null) return null;
    if (!Array.isArray(parsed)) {
        jsonError.value = 'Operations must be a JSON array.';
        return null;
    }
    return parsed;
}

const parsedOperationKeys = computed(() => {
    try {
        const ops = JSON.parse(operationsJson.value);
        return Array.isArray(ops) ? ops.map((o: any) => o?.key).filter(Boolean) : [];
    } catch { return []; }
});

// ── Index columns picker ────────────────────────────────────────────────────────
// A structured helper over the operations JSON: the browse index shows the query
// operation's result.fields, so let the admin toggle each field's visibility and
// sortability here rather than hand-editing `inList`/`sortable` in the JSON.
function parsedOpsOrNull(): any[] | null {
    try {
        const ops = JSON.parse(operationsJson.value);
        return Array.isArray(ops) ? ops : null;
    } catch { return null; }
}

/** The operation the browse page indexes: the one keyed `browse`, else the first query. */
const primaryQueryOp = computed(() => {
    const ops = parsedOpsOrNull();
    if (!ops) return null;
    return ops.find((o: any) => o?.kind === 'query' && o?.key === 'browse')
        ?? ops.find((o: any) => o?.kind === 'query')
        ?? null;
});

const indexFields = computed<any[]>(() => primaryQueryOp.value?.result?.fields ?? []);

function setFieldFlag(fieldName: string, prop: 'inList' | 'sortable', value: boolean) {
    const ops = parsedOpsOrNull();
    if (!ops) return;
    const opKey = primaryQueryOp.value?.key;
    const op = ops.find((o: any) => o?.kind === 'query' && o?.key === opKey);
    const field = op?.result?.fields?.find((f: any) => f.name === fieldName);
    if (!field) return;
    field[prop] = value;
    operationsJson.value = JSON.stringify(ops, null, 2);
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
    const operations = parseOperations();
    const wire       = parseJson<Record<string, any>>(paginationWireJson.value, wireError, {});
    const headers    = parseJson<Record<string, string>>(defaultHeadersJson.value, headersError, {});

    if (!operations || wire === null || headers === null) {
        toast.add({ severity: 'warn', summary: 'Invalid JSON', detail: 'Fix the highlighted editor before saving.', life: 4000 });
        return;
    }

    const dto: SaveDatasourceDto = {
        ...form.value,
        pagination: {
            ...form.value.pagination,
            params:         wire.params,
            headers:        wire.headers,
            requestHeaders: wire.requestHeaders,
        },
        defaultHeaders: Object.keys(headers).length ? headers : undefined,
        operations,
        healthCheck: form.value.healthCheck || undefined,
    };

    // Strip credential fields that were not re-entered, so an edit does not
    // overwrite a stored secret reference with an empty string.
    const auth: any = { ...dto.auth };
    for (const k of ['value', 'username', 'password', 'token']) {
        if (!auth[k]) delete auth[k];
        delete auth[`${k}Configured`];
    }
    dto.auth = auth;

    saving.value = true;
    try {
        if (editingId.value) {
            await $api.datasources.update(editingId.value, dto);
            toast.add({ severity: 'success', summary: 'Updated', detail: `"${dto.name}" updated.`, life: 3000 });
        } else {
            await $api.datasources.create(dto);
            toast.add({ severity: 'success', summary: 'Created', detail: `"${dto.name}" created.`, life: 3000 });
        }
        dialogVisible.value = false;
        await reload();
    } catch (err: any) {
        // The backend's cross-field rules (§7.1 filter contributions, §9.2
        // idempotency gate, healthCheck resolution) report here.
        toast.add({
            severity: 'error', summary: 'Could not save',
            detail: err?.response?.data?.message ?? 'Save failed.', life: 6000,
        });
    } finally {
        saving.value = false;
    }
}

// ── Test action (§10.3) ───────────────────────────────────────────────────────
const testOperation = ref('');
const testInputJson = ref('{\n  "filters": { "search": "ABC" },\n  "limit": 5,\n  "offset": 0\n}');
const testRunning   = ref(false);
const testResult    = ref<TestResult | null>(null);
const testInputError = ref('');

function resetTest() {
    testOperation.value = '';
    testResult.value = null;
    testInputError.value = '';
}

async function runTest() {
    if (!editingId.value) {
        toast.add({ severity: 'warn', summary: 'Save first', detail: 'Test runs against the saved declaration.', life: 4000 });
        return;
    }
    const input = parseJson<Record<string, any>>(testInputJson.value, testInputError, {});
    if (input === null) return;

    testRunning.value = true;
    try {
        testResult.value = await $api.datasources.test(form.value.key, testOperation.value, input);
    } catch (err: any) {
        testResult.value = { ok: false, error: err?.response?.data?.message ?? 'Request failed' };
    } finally {
        testRunning.value = false;
    }
}

const pretty = (v: any) => JSON.stringify(v, null, 2);

// ── Delete ────────────────────────────────────────────────────────────────────
function remove(ds: Datasource) {
    onApprove(confirm, `Delete "${ds.name}"? Processes referencing it will fail.`, async () => {
        try {
            await $api.datasources.remove(ds.id);
            toast.add({ severity: 'success', summary: 'Deleted', detail: `"${ds.name}" deleted.`, life: 3000 });
            await reload();
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete.', life: 3000 });
        }
    });
}
</script>

<template>
    <div class="p-6">

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Datasources</h1>
                <p class="text-sm text-surface-400 mt-0.5">
                    Declared external data APIs. The platform stores the declaration — the data stays in the remote system.
                </p>
            </div>
            <div class="flex items-center gap-2">
                <IconField>
                    <InputIcon><i class="pi pi-search" /></InputIcon>
                    <InputText v-model="search" placeholder="Search datasources..." size="small" style="width: 220px" />
                </IconField>
                <Button icon="pi pi-refresh" size="small" text rounded v-tooltip.top="'Refresh'" @click="reload" />
                <Button label="New Datasource" icon="pi pi-plus" size="small" @click="openNew" />
            </div>
        </div>

        <!-- Table -->
        <DataTable
            :value="items" :loading="loading" dataKey="id" size="small" lazy paginator
            :first="firstRow" :rows="rowsPerPage" :totalRecords="totalRecords"
            :rowsPerPageOptions="ROWS_PER_PAGE_OPTIONS" @page="onPage" @sort="onSort"
        >
            <template #empty>
                <div class="text-center py-6 text-surface-400">
                    No datasources yet. Declare one to let processes and forms reach an external API.
                </div>
            </template>

            <Column field="key" header="Key" sortable style="width: 14rem">
                <template #body="{ data }">
                    <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-1 rounded">{{ data.key }}</code>
                </template>
            </Column>
            <Column field="name" header="Name" sortable />
            <Column field="baseUrl" header="Base URL">
                <template #body="{ data }">
                    <span class="text-xs text-surface-500">{{ data.baseUrl }}</span>
                </template>
            </Column>
            <Column header="Operations" style="width: 8rem">
                <template #body="{ data }">
                    <span class="text-xs">{{ data.operations?.length ?? 0 }}</span>
                </template>
            </Column>
            <Column header="Enabled" style="width: 7rem">
                <template #body="{ data }">
                    <Tag :value="data.enabled ? 'Enabled' : 'Disabled'"
                         :severity="data.enabled ? 'success' : 'secondary'" />
                </template>
            </Column>
            <Column header="Health" style="width: 11rem">
                <template #body="{ data }">
                    <div class="flex items-center gap-2">
                        <Tag v-if="health[data.key] && health[data.key] !== 'loading'"
                             :value="(health[data.key] as HealthResult).status"
                             :severity="healthSeverity((health[data.key] as HealthResult).status)"
                             v-tooltip.top="(health[data.key] as HealthResult).message" />
                        <Button icon="pi pi-heart" size="small" text rounded
                                :loading="health[data.key] === 'loading'"
                                v-tooltip.top="'Run health check'" @click="checkHealth(data)" />
                    </div>
                </template>
            </Column>
            <Column style="width: 7rem">
                <template #body="{ data }">
                    <div class="flex gap-1 justify-end">
                        <Button icon="pi pi-pencil" size="small" text rounded @click="openEdit(data)" />
                        <Button icon="pi pi-trash" size="small" text rounded severity="danger" @click="remove(data)" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Editor -->
        <Dialog v-model:visible="dialogVisible" modal
                :header="editingId ? 'Edit Datasource' : 'New Datasource'"
                :style="{ width: '58rem' }">

            <div class="flex flex-col gap-4">

                <!-- Preset -->
                <div class="rounded p-3" style="background: var(--p-content-hover-background)">
                    <div class="flex items-end gap-3">
                        <div class="flex-1">
                            <label class="text-xs font-medium">Start from a preset</label>
                            <Select
                                v-model="selectedPreset" :options="DATASOURCE_PRESETS"
                                optionLabel="name" optionValue="id" showClear
                                placeholder="Choose an API flavour…" size="small" class="w-full"
                            />
                        </div>
                        <Button label="Apply" icon="pi pi-bolt" size="small" :disabled="!selectedPreset"
                                @click="applyPreset(selectedPreset)" />
                    </div>

                    <div v-if="presetDetail" class="mt-3 text-xs flex flex-col gap-2">
                        <div class="flex items-center gap-2">
                            <Tag :value="presetDetail.verified ? 'verified' : 'not verified'"
                                 :severity="presetDetail.verified ? 'success' : 'warn'" />
                            <span class="text-surface-500">{{ presetDetail.verified ?? 'Written from documentation — confirm with Test before trusting it.' }}</span>
                            <a v-if="presetDetail.docsUrl" :href="presetDetail.docsUrl" target="_blank"
                               rel="noopener" class="ml-auto text-primary">API docs ↗</a>
                        </div>
                        <p class="text-surface-500">{{ presetDetail.description }}</p>
                        <ul class="list-disc pl-4 text-surface-500 flex flex-col gap-0.5">
                            <li v-for="(note, i) in presetDetail.notes" :key="i">{{ note }}</li>
                        </ul>
                        <p class="text-surface-400">
                            Presets live in <code>src/pages/admin/datasources/presets/</code> — edit the JSON there to change one.
                        </p>
                    </div>
                </div>

                <Tabs value="general">
                    <TabList>
                        <Tab value="general">General</Tab>
                        <Tab value="query">Query shape</Tab>
                        <Tab value="operations">Operations</Tab>
                        <Tab value="test">Test</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel value="general" class="flex flex-col gap-4">

                <!-- Identity -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-medium">Key</label>
                        <InputText v-model="form.key" class="w-full" size="small" placeholder="vehicles" />
                        <small class="text-surface-400">Referenced by service tasks and lookup fields.</small>
                    </div>
                    <div>
                        <label class="text-xs font-medium">Name</label>
                        <InputText v-model="form.name" class="w-full" size="small" placeholder="Vehicles" />
                    </div>
                </div>

                <div>
                    <label class="text-xs font-medium">Base URL</label>
                    <InputText v-model="form.baseUrl" class="w-full" size="small" placeholder="https://api.example.com" />
                    <small class="text-surface-400">
                        Must be http(s). Hosts resolving to private or link-local addresses are blocked unless allowlisted.
                    </small>
                </div>

                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="text-xs font-medium">Timeout (ms)</label>
                        <InputNumber v-model="form.timeoutMs" class="w-full" size="small" :min="1" :max="60000" />
                    </div>
                    <div>
                        <label class="text-xs font-medium">Health Check Operation</label>
                        <Select v-model="form.healthCheck" :options="parsedOperationKeys" class="w-full" size="small"
                                showClear placeholder="none" />
                    </div>
                    <div class="flex items-end gap-2 pb-1">
                        <ToggleSwitch v-model="form.enabled" />
                        <span class="text-sm">Enabled</span>
                    </div>
                </div>

                <!-- Auth -->
                <div class="border-t pt-3">
                    <h3 class="text-sm font-semibold mb-2">Authentication</h3>
                    <div class="grid grid-cols-3 gap-3">
                        <Select v-model="form.auth.type" :options="AUTH_TYPES" size="small" class="w-full" />
                        <template v-if="form.auth.type === 'apiKey'">
                            <InputText v-model="form.auth.name" size="small" placeholder="header/param name" />
                            <Select v-model="form.auth.apiKeyLocation" :options="['header', 'query']" size="small" />
                        </template>
                    </div>

                    <div v-if="form.auth.type !== 'none'" class="grid grid-cols-2 gap-3 mt-3">
                        <div v-if="form.auth.type === 'bearer'">
                            <label class="text-xs font-medium">Token</label>
                            <InputText v-model="form.auth.token" class="w-full" size="small" placeholder="secrets.MY_TOKEN" />
                        </div>
                        <div v-if="form.auth.type === 'apiKey'">
                            <label class="text-xs font-medium">Value</label>
                            <InputText v-model="form.auth.value" class="w-full" size="small" placeholder="secrets.MY_KEY" />
                        </div>
                        <template v-if="form.auth.type === 'basic'">
                            <div>
                                <label class="text-xs font-medium">Username</label>
                                <InputText v-model="form.auth.username" class="w-full" size="small" placeholder="secrets.API_USER" />
                            </div>
                            <div>
                                <label class="text-xs font-medium">Password</label>
                                <InputText v-model="form.auth.password" class="w-full" size="small" placeholder="secrets.API_PASSWORD" />
                            </div>
                        </template>
                    </div>

                    <Message v-if="form.auth.type !== 'none'" severity="secondary" size="small" class="mt-2" :closable="false">
                        Credentials are stored as <code>secrets.KEY</code> references only — a literal value is rejected.
                        Leave blank when editing to keep the stored secret.
                    </Message>
                </div>

                        </TabPanel>

                        <TabPanel value="query" class="flex flex-col gap-4">

                <!-- Filter style -->
                <div class="border-t pt-3">
                    <h3 class="text-sm font-semibold mb-2">Filter Style</h3>
                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="text-xs font-medium">Mode</label>
                            <Select v-model="form.filterStyle.mode" :options="FILTER_MODES" class="w-full" size="small" />
                        </div>
                        <template v-if="form.filterStyle.mode === 'composed'">
                            <div>
                                <label class="text-xs font-medium">Param</label>
                                <InputText v-model="form.filterStyle.param" class="w-full" size="small" placeholder="where" />
                            </div>
                            <div>
                                <label class="text-xs font-medium">Join</label>
                                <InputText v-model="form.filterStyle.join" class="w-full" size="small" placeholder="~and" />
                            </div>
                        </template>
                    </div>
                    <small class="text-surface-400">
                        <b>params</b> — one query param per filter, operator inside the value (PostgREST).
                        <b>composed</b> — all filters merged into one param (NocoDB).
                    </small>
                </div>

                <!-- Sort style -->
                <div class="border-t pt-3">
                    <h3 class="text-sm font-semibold mb-2">Sort Style</h3>
                    <div class="grid grid-cols-4 gap-3">
                        <div>
                            <label class="text-xs font-medium">Mode</label>
                            <Select v-model="form.sortStyle!.mode" :options="SORT_MODES" class="w-full" size="small" />
                        </div>
                        <template v-if="form.sortStyle!.mode === 'param'">
                            <div>
                                <label class="text-xs font-medium">Param</label>
                                <InputText v-model="form.sortStyle!.param" class="w-full" size="small" placeholder="order" />
                            </div>
                            <div>
                                <label class="text-xs font-medium">Asc template</label>
                                <InputText v-model="form.sortStyle!.asc" class="w-full" size="small" :placeholder="'{{field}}.asc'" />
                            </div>
                            <div>
                                <label class="text-xs font-medium">Desc template</label>
                                <InputText v-model="form.sortStyle!.desc" class="w-full" size="small" :placeholder="'{{field}}.desc'" />
                            </div>
                        </template>
                        <template v-else-if="form.sortStyle!.mode === 'params'">
                            <div>
                                <label class="text-xs font-medium">Field param</label>
                                <InputText v-model="form.sortStyle!.fieldParam" class="w-full" size="small" placeholder="sortBy" />
                            </div>
                            <div>
                                <label class="text-xs font-medium">Dir param</label>
                                <InputText v-model="form.sortStyle!.dirParam" class="w-full" size="small" placeholder="sortDir" />
                            </div>
                            <div>
                                <label class="text-xs font-medium">Asc / Desc value</label>
                                <div class="flex gap-1">
                                    <InputText v-model="form.sortStyle!.ascValue" class="w-full" size="small" placeholder="asc" />
                                    <InputText v-model="form.sortStyle!.descValue" class="w-full" size="small" placeholder="desc" />
                                </div>
                            </div>
                        </template>
                    </div>
                    <small class="text-surface-400">
                        <b>param</b> — one sort param, e.g. PostgREST <code>?order=age.desc</code>
                        (asc template <span v-pre><code>{{field}}.asc</code></span>, NocoDB desc <span v-pre><code>-{{field}}</code></span>).
                        <b>params</b> — two params, e.g. <code>?sortBy=age&sortDir=desc</code>. <b>none</b> — no sorting.
                    </small>
                </div>

                <!-- Pagination -->
                <div class="border-t pt-3">
                    <h3 class="text-sm font-semibold mb-2">Pagination</h3>
                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="text-xs font-medium">Style</label>
                            <Select v-model="form.pagination.style" :options="PAGE_STYLES" class="w-full" size="small" />
                        </div>
                        <div>
                            <label class="text-xs font-medium">Total from</label>
                            <Select v-model="form.pagination.total!.from" :options="TOTAL_FROM" class="w-full" size="small" />
                        </div>
                        <div v-if="form.pagination.total?.from === 'body'">
                            <label class="text-xs font-medium">Body path</label>
                            <InputText v-model="form.pagination.total!.path" class="w-full" size="small" placeholder="pageInfo.totalRows" />
                        </div>
                        <template v-if="form.pagination.total?.from === 'header'">
                            <div>
                                <label class="text-xs font-medium">Header</label>
                                <InputText v-model="form.pagination.total!.header" class="w-full" size="small" placeholder="Content-Range" />
                            </div>
                            <div>
                                <label class="text-xs font-medium">Format</label>
                                <Select v-model="form.pagination.total!.format" :options="['int', 'content-range']" class="w-full" size="small" />
                            </div>
                        </template>
                    </div>
                    <small class="text-surface-400">
                        Style and total source are independent. <code>range</code> pages by request header;
                        a total may still need <code>Prefer: count=exact</code> in the operation's request headers.
                    </small>

                    <div class="mt-3">
                        <label class="text-xs font-medium">Wire config</label>
                        <div style="height: 170px">
                            <JsonEditor
                                v-model:text="paginationWireJson"
                                mode="text"
                                :dark-theme="isDark"
                                :main-menu-bar="false"
                                :navigation-bar="false"
                                style="height: 100%"
                                @update:text="wireError = ''"
                            />
                        </div>
                        <Message v-if="wireError" severity="error" size="small" class="mt-1" :closable="false">{{ wireError }}</Message>
                        <!-- v-pre: the placeholder braces are literal text, not interpolation. -->
                        <small v-else class="text-surface-400">
                            <code>params</code> (page/offset styles), <code>headers</code> (range style),
                            <code>requestHeaders</code> (sent to obtain a total). Placeholders:
                            <span v-pre><code>{{page}}</code> <code>{{limit}}</code> <code>{{offset}}</code> <code>{{end}}</code></span>.
                        </small>
                    </div>
                </div>

                <!-- Default headers -->
                <div class="border-t pt-3">
                    <h3 class="text-sm font-semibold mb-2">Default Headers</h3>
                    <div style="height: 120px">
                        <JsonEditor
                            v-model:text="defaultHeadersJson"
                            mode="text"
                            :dark-theme="isDark"
                            :main-menu-bar="false"
                            :navigation-bar="false"
                            style="height: 100%"
                            @update:text="headersError = ''"
                        />
                    </div>
                    <Message v-if="headersError" severity="error" size="small" class="mt-1" :closable="false">{{ headersError }}</Message>
                    <small v-else class="text-surface-400">Applied to every operation; an operation's own headers win per key.</small>
                </div>

                        </TabPanel>

                        <TabPanel value="operations" class="flex flex-col gap-4">

                <!-- Operations -->
                <div class="border-t pt-3">
                    <h3 class="text-sm font-semibold mb-2">Operations</h3>
                    <div style="height: 380px">
                        <JsonEditor
                            v-model:text="operationsJson"
                            mode="text"
                            :dark-theme="isDark"
                            :main-menu-bar="false"
                            :navigation-bar="false"
                            style="height: 100%"
                            @update:text="jsonError = ''"
                        />
                    </div>
                    <Message v-if="jsonError" severity="error" size="small" class="mt-1" :closable="false">{{ jsonError }}</Message>
                    <small v-else class="text-surface-400">
                        JSON array. Each operation needs <code>key</code>, <code>kind</code> (query/single/write),
                        <code>method</code>, <code>path</code>, and — for reads — a <code>result</code> mapping.
                    </small>
                </div>

                <!-- Index columns -->
                <div v-if="primaryQueryOp" class="border-t pt-3">
                    <h3 class="text-sm font-semibold mb-1">Index Columns</h3>
                    <small class="text-surface-400 block mb-2">
                        Which fields of the <code>{{ primaryQueryOp.key }}</code> query show in the Data browse grid.
                        The details view always shows every field.
                        <span v-if="form.sortStyle!.mode === 'none'">Add a Sort Style above to enable column sorting.</span>
                    </small>
                    <div v-if="!indexFields.length" class="text-xs text-surface-400 py-2">
                        This query has no <code>result.fields</code> declared yet.
                    </div>
                    <table v-else class="w-full text-sm">
                        <thead>
                            <tr class="text-xs text-surface-500">
                                <th class="text-left font-medium py-1">Field</th>
                                <th class="font-medium w-24 text-center">In index</th>
                                <th class="font-medium w-24 text-center">Sortable</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="f in indexFields" :key="f.name" class="border-t border-surface-100 dark:border-surface-800">
                                <td class="py-1.5">
                                    {{ f.label ?? f.name }}
                                    <span class="text-surface-400 text-xs">({{ f.name }})</span>
                                </td>
                                <td class="text-center">
                                    <ToggleSwitch
                                        :model-value="f.inList !== false"
                                        @update:model-value="(v: boolean) => setFieldFlag(f.name, 'inList', v)"
                                    />
                                </td>
                                <td class="text-center">
                                    <ToggleSwitch
                                        :model-value="f.sortable !== false"
                                        :disabled="form.sortStyle!.mode === 'none'"
                                        @update:model-value="(v: boolean) => setFieldFlag(f.name, 'sortable', v)"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                        </TabPanel>

                        <TabPanel value="test" class="flex flex-col gap-4">

                <!-- Test -->
                <div class="border-t pt-3">
                    <h3 class="text-sm font-semibold mb-2">Test</h3>
                    <div v-if="!editingId" class="text-xs text-surface-400 mb-2">
                        Save the datasource first — the test runs against the stored declaration.
                    </div>
                    <div class="flex gap-2 items-start">
                        <Select v-model="testOperation" :options="parsedOperationKeys" placeholder="operation"
                                size="small" style="width: 12rem" :disabled="!editingId" />
                        <div class="flex-1" style="height: 150px">
                            <JsonEditor
                                v-model:text="testInputJson"
                                mode="text"
                                :dark-theme="isDark"
                                :main-menu-bar="false"
                                :navigation-bar="false"
                                style="height: 100%"
                                @update:text="testInputError = ''"
                            />
                        </div>
                        <Button label="Run" icon="pi pi-play" size="small" :loading="testRunning"
                                :disabled="!editingId || !testOperation" @click="runTest" />
                    </div>
                    <Message v-if="testInputError" severity="error" size="small" class="mt-1" :closable="false">{{ testInputError }}</Message>

                    <div v-if="testResult" class="mt-3">
                        <Message v-if="!testResult.ok" severity="error" size="small" :closable="false">
                            {{ testResult.error }}
                        </Message>

                        <div v-if="testResult.trace" class="grid grid-cols-2 gap-3 mt-2">
                            <div>
                                <div class="text-xs font-medium mb-1">Request sent</div>
                                <pre class="text-[11px] bg-surface-100 dark:bg-zinc-900 p-2 rounded overflow-auto max-h-60">{{ testResult.trace.request.method }} {{ testResult.trace.request.url }}
{{ pretty({ params: testResult.trace.request.params, headers: testResult.trace.request.headers }) }}</pre>
                            </div>
                            <div>
                                <div class="text-xs font-medium mb-1">Raw response ({{ testResult.trace.response.status }})</div>
                                <pre class="text-[11px] bg-surface-100 dark:bg-zinc-900 p-2 rounded overflow-auto max-h-60">{{ pretty(testResult.trace.response.headers) }}
{{ pretty(testResult.trace.response.body) }}</pre>
                            </div>
                        </div>

                        <div v-if="testResult.result" class="mt-2">
                            <div class="text-xs font-medium mb-1">Mapped result</div>
                            <pre class="text-[11px] bg-surface-100 dark:bg-zinc-900 p-2 rounded overflow-auto max-h-48">{{ pretty(testResult.result) }}</pre>
                        </div>
                    </div>
                </div>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </div>

            <template #footer>
                <Button label="Cancel" text size="small" @click="dialogVisible = false" />
                <Button label="Save" icon="pi pi-check" size="small" :loading="saving" @click="save" />
            </template>
        </Dialog>
    </div>
</template>
