<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Dialog, Button, Select, InputText, InputNumber, Textarea, ToggleSwitch, Tabs, Tab, TabList, TabPanels, TabPanel, Tag, useToast } from 'primevue';
import { $api } from '@services/api';
import type { Task } from '@services/TasksService';

const props = defineProps<{
    visible: boolean;
    task: Task | null;
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    saved: [];
}>();

const toast  = useToast();
const saving = ref(false);
const activeTab = ref('0');

// ── Form state ────────────────────────────────────────────────────────────────

interface KVRow { key: string; value: string }

const method      = ref('GET');
const url         = ref('');
const authType    = ref('noAuth');
const apiKeyLoc   = ref('headers');
const apiKeyName  = ref('');
const apiKeyValue = ref('');
const basicUser   = ref('');
const basicPass   = ref('');
const bearerToken = ref('');
const headerRows  = ref<KVRow[]>([]);
const queryRows   = ref<KVRow[]>([]);
const bodyRaw     = ref('');
const resultVar   = ref('');
const resultExpr  = ref('');
const errorExpr   = ref('');
const storeResp   = ref(false);
const retries     = ref(0);
const retryBackoff = ref('');
const connTimeout = ref(20);
const readTimeout = ref(20);

// Raw JSON tab
const rawJson  = ref('');
const jsonError = ref('');

const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const authOptions   = [
    { label: 'No Auth',    value: 'noAuth'  },
    { label: 'API Key',    value: 'apiKey'  },
    { label: 'Basic Auth', value: 'basic'   },
    { label: 'Bearer Token', value: 'bearer' },
];
const apiKeyLocOptions = [
    { label: 'Header', value: 'headers' },
    { label: 'Query',  value: 'query'   },
];

const hasBody = computed(() => ['POST', 'PUT', 'PATCH'].includes(method.value));

// ── Config ↔ Form conversion ──────────────────────────────────────────────────

function objToRows(obj: Record<string, string> | undefined): KVRow[] {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
}

function rowsToObj(rows: KVRow[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const r of rows) { if (r.key) out[r.key] = r.value; }
    return out;
}

function loadFromConfig(config: Record<string, any>) {
    method.value      = config.method       ?? 'GET';
    url.value         = config.url          ?? '';
    authType.value    = config.authentication?.type ?? 'noAuth';
    apiKeyLoc.value   = config.authentication?.apiKeyLocation ?? 'headers';
    apiKeyName.value  = config.authentication?.name  ?? '';
    apiKeyValue.value = config.authentication?.value ?? '';
    basicUser.value   = config.authentication?.username ?? '';
    basicPass.value   = config.authentication?.password ?? '';
    bearerToken.value = config.authentication?.token ?? '';
    headerRows.value  = objToRows(config.headers);
    queryRows.value   = objToRows(
        typeof config.queryParameters === 'object' ? config.queryParameters : {},
    );
    bodyRaw.value     = typeof config.body === 'string'
        ? config.body
        : config.body != null ? JSON.stringify(config.body, null, 2) : '';
    resultVar.value   = config.resultVariable   ?? '';
    resultExpr.value  = config.resultExpression ?? '';
    errorExpr.value   = config.errorExpression  ?? '';
    storeResp.value   = config.storeResponse    ?? false;
    retries.value     = config.retries          ?? 0;
    retryBackoff.value = config.retryBackoff    ?? '';
    connTimeout.value = config.connectionTimeoutInSeconds ?? 20;
    readTimeout.value = config.readTimeoutInSeconds       ?? 20;
}

function buildConfig(): Record<string, any> {
    const cfg: Record<string, any> = {
        method: method.value,
        url:    url.value,
    };

    if (authType.value !== 'noAuth') {
        cfg.authentication = { type: authType.value };
        if (authType.value === 'apiKey') {
            cfg.authentication.apiKeyLocation = apiKeyLoc.value;
            cfg.authentication.name  = apiKeyName.value;
            cfg.authentication.value = apiKeyValue.value;
        } else if (authType.value === 'basic') {
            cfg.authentication.username = basicUser.value;
            cfg.authentication.password = basicPass.value;
        } else if (authType.value === 'bearer') {
            cfg.authentication.token = bearerToken.value;
        }
    }

    const headers = rowsToObj(headerRows.value);
    if (Object.keys(headers).length) cfg.headers = headers;

    const query = rowsToObj(queryRows.value);
    if (Object.keys(query).length) cfg.queryParameters = query;

    if (hasBody.value && bodyRaw.value.trim()) {
        try { cfg.body = JSON.parse(bodyRaw.value); }
        catch { cfg.body = bodyRaw.value; }
    }

    if (resultVar.value)   cfg.resultVariable   = resultVar.value;
    if (resultExpr.value)  cfg.resultExpression  = resultExpr.value;
    if (errorExpr.value)   cfg.errorExpression   = errorExpr.value;
    if (storeResp.value)   cfg.storeResponse     = true;
    if (retries.value > 0) cfg.retries           = retries.value;
    if (retryBackoff.value) cfg.retryBackoff     = retryBackoff.value;
    if (connTimeout.value !== 20) cfg.connectionTimeoutInSeconds = connTimeout.value;
    if (readTimeout.value !== 20) cfg.readTimeoutInSeconds       = readTimeout.value;

    return cfg;
}

// Sync raw JSON when switching to JSON tab
watch(activeTab, (tab) => {
    if (tab === '1') {
        jsonError.value = '';
        rawJson.value = JSON.stringify(buildConfig(), null, 2);
    }
});

// ── Watch task prop ───────────────────────────────────────────────────────────

watch(() => props.task, (task) => {
    activeTab.value = '0';
    jsonError.value = '';
    testResult.value = null;
    const config = task?.serviceConfig ?? {};
    loadFromConfig(config);
    rawJson.value = JSON.stringify(config, null, 2);
}, { immediate: true });

// ── Save ──────────────────────────────────────────────────────────────────────

function getConfig(): Record<string, any> | null {
    if (activeTab.value === '1') {
        try {
            return JSON.parse(rawJson.value);
        } catch (e: any) {
            jsonError.value = `Invalid JSON: ${e.message}`;
            return null;
        }
    }
    return buildConfig();
}

async function save() {
    const config = getConfig();
    if (config === null) return;

    saving.value = true;
    try {
        await $api.tasks.updateServiceConfig(props.task!.id, config);
        toast.add({ severity: 'success', summary: 'Service config saved', life: 3000 });
        emit('saved');
        emit('update:visible', false);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not update service config.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

// ── Test request ──────────────────────────────────────────────────────────────

interface TestResult {
    status: number;
    statusText: string;
    durationMs: number;
    headers: Record<string, string>;
    body: any;
    error?: string;
}

const testing     = ref(false);
const testResult  = ref<TestResult | null>(null);
const showRespHeaders = ref(false);

const statusSeverity = (s: number) => {
    if (s >= 500) return 'danger';
    if (s >= 400) return 'warn';
    if (s >= 200) return 'success';
    return 'secondary';
};

async function runTest() {
    const config = getConfig();
    if (config === null) return;

    testing.value    = true;
    testResult.value = null;
    try {
        testResult.value = await $api.tasks.testRestRequest(config);
    } catch (err: any) {
        testResult.value = {
            status:     0,
            statusText: 'Request failed',
            durationMs: 0,
            headers:    {},
            body:       null,
            error:      err?.response?.data?.message ?? err?.message ?? 'Unknown error',
        };
    } finally {
        testing.value = false;
    }
}

const formattedBody = computed(() => {
    if (!testResult.value?.body) return '';
    try { return JSON.stringify(testResult.value.body, null, 2); }
    catch { return String(testResult.value.body); }
});

// ── Key-value helpers ─────────────────────────────────────────────────────────

function addRow(rows: KVRow[]) { rows.push({ key: '', value: '' }); }
function removeRow(rows: KVRow[], i: number) { rows.splice(i, 1); }
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        :header="`Service Config — ${props.task?.name ?? ''}`"
        :style="{ width: '780px', maxHeight: '90vh' }"
        :dismissableMask="true"
        class="overflow-hidden"
    >
        <div class="flex flex-col gap-4 overflow-y-auto" style="max-height: calc(90vh - 140px)">

            <Tabs v-model:value="activeTab">
                <TabList>
                    <Tab value="0">Form</Tab>
                    <Tab value="1">Raw JSON</Tab>
                </TabList>

                <TabPanels>

                    <!-- ── Form tab ──────────────────────────────────────── -->
                    <TabPanel value="0">
                        <div class="flex flex-col gap-5 pt-2">

                            <!-- Method + URL -->
                            <div class="flex gap-2">
                                <Select
                                    v-model="method"
                                    :options="methodOptions"
                                    class="w-28 shrink-0"
                                />
                                <InputText v-model="url" placeholder="https://api.example.com/endpoint" class="flex-1" />
                            </div>

                            <!-- Authentication -->
                            <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                <legend class="text-xs font-semibold text-zinc-400 px-1">Authentication</legend>
                                <div class="flex flex-col gap-3">
                                    <Select
                                        v-model="authType"
                                        :options="authOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        class="w-48"
                                    />
                                    <template v-if="authType === 'apiKey'">
                                        <div class="flex gap-2 items-center">
                                            <span class="text-xs text-zinc-400 w-16 shrink-0">Location</span>
                                            <Select v-model="apiKeyLoc" :options="apiKeyLocOptions" optionLabel="label" optionValue="value" class="w-32" />
                                        </div>
                                        <div class="flex gap-2 items-center">
                                            <span class="text-xs text-zinc-400 w-16 shrink-0">Name</span>
                                            <InputText v-model="apiKeyName" placeholder="X-API-Key" class="flex-1" />
                                        </div>
                                        <div class="flex gap-2 items-center">
                                            <span class="text-xs text-zinc-400 w-16 shrink-0">Value</span>
                                            <InputText v-model="apiKeyValue" placeholder="secrets.my-api-key" class="flex-1" />
                                        </div>
                                    </template>
                                    <template v-else-if="authType === 'basic'">
                                        <div class="flex gap-2 items-center">
                                            <span class="text-xs text-zinc-400 w-16 shrink-0">Username</span>
                                            <InputText v-model="basicUser" placeholder="secrets.my-user" class="flex-1" />
                                        </div>
                                        <div class="flex gap-2 items-center">
                                            <span class="text-xs text-zinc-400 w-16 shrink-0">Password</span>
                                            <InputText v-model="basicPass" type="password" placeholder="secrets.my-password" class="flex-1" />
                                        </div>
                                    </template>
                                    <template v-else-if="authType === 'bearer'">
                                        <div class="flex gap-2 items-center">
                                            <span class="text-xs text-zinc-400 w-16 shrink-0">Token</span>
                                            <InputText v-model="bearerToken" placeholder="secrets.my-token" class="flex-1" />
                                        </div>
                                    </template>
                                </div>
                            </fieldset>

                            <!-- Headers -->
                            <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                <legend class="text-xs font-semibold text-zinc-400 px-1">Headers</legend>
                                <div class="flex flex-col gap-1">
                                    <div v-for="(row, i) in headerRows" :key="i" class="flex gap-2 items-center">
                                        <InputText v-model="row.key"   placeholder="Key"   class="flex-1 text-sm" size="small" />
                                        <InputText v-model="row.value" placeholder="Value" class="flex-1 text-sm" size="small" />
                                        <Button icon="pi pi-times" severity="danger" text rounded size="small" @click="removeRow(headerRows, i)" />
                                    </div>
                                    <Button label="Add header" icon="pi pi-plus" text size="small" class="self-start mt-1" @click="addRow(headerRows)" />
                                </div>
                            </fieldset>

                            <!-- Query Parameters -->
                            <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                <legend class="text-xs font-semibold text-zinc-400 px-1">Query Parameters</legend>
                                <div class="flex flex-col gap-1">
                                    <div v-for="(row, i) in queryRows" :key="i" class="flex gap-2 items-center">
                                        <InputText v-model="row.key"   placeholder="Key"   class="flex-1 text-sm" size="small" />
                                        <InputText v-model="row.value" placeholder="Value" class="flex-1 text-sm" size="small" />
                                        <Button icon="pi pi-times" severity="danger" text rounded size="small" @click="removeRow(queryRows, i)" />
                                    </div>
                                    <Button label="Add parameter" icon="pi pi-plus" text size="small" class="self-start mt-1" @click="addRow(queryRows)" />
                                </div>
                            </fieldset>

                            <!-- Body -->
                            <fieldset v-if="hasBody" class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                <legend class="text-xs font-semibold text-zinc-400 px-1">Body</legend>
                                <Textarea
                                    v-model="bodyRaw"
                                    rows="5"
                                    class="w-full font-mono text-sm"
                                    placeholder='{"key": "value"}'
                                />
                            </fieldset>

                            <!-- Response Mapping -->
                            <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                <legend class="text-xs font-semibold text-zinc-400 px-1">Response Mapping</legend>
                                <div class="flex flex-col gap-2">
                                    <div class="flex gap-2 items-center">
                                        <span class="text-xs text-zinc-400 w-32 shrink-0">Result Variable</span>
                                        <InputText v-model="resultVar" placeholder="response" class="flex-1" size="small" />
                                    </div>
                                    <div class="flex gap-2 items-center">
                                        <span class="text-xs text-zinc-400 w-32 shrink-0">Result Expression</span>
                                        <InputText v-model="resultExpr" placeholder="= {data: response.body}" class="flex-1 font-mono" size="small" />
                                    </div>
                                    <div class="flex gap-2 items-center">
                                        <span class="text-xs text-zinc-400 w-32 shrink-0">Error Expression</span>
                                        <InputText v-model="errorExpr" placeholder="= error" class="flex-1 font-mono" size="small" />
                                    </div>
                                    <div class="flex gap-2 items-center">
                                        <span class="text-xs text-zinc-400 w-32 shrink-0">Store Response</span>
                                        <ToggleSwitch v-model="storeResp" />
                                    </div>
                                </div>
                            </fieldset>

                            <!-- Retries & Timeouts -->
                            <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                <legend class="text-xs font-semibold text-zinc-400 px-1">Retries &amp; Timeouts</legend>
                                <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div class="flex gap-2 items-center">
                                        <span class="text-xs text-zinc-400 w-24 shrink-0">Retries</span>
                                        <InputNumber v-model="retries" :min="0" :max="10" showButtons class="w-full" inputClass="text-sm" />
                                    </div>
                                    <div class="flex gap-2 items-center">
                                        <span class="text-xs text-zinc-400 w-24 shrink-0">Backoff</span>
                                        <InputText v-model="retryBackoff" placeholder="PT10S" class="flex-1" size="small" />
                                    </div>
                                    <div class="flex gap-2 items-center">
                                        <span class="text-xs text-zinc-400 w-24 shrink-0">Conn. timeout</span>
                                        <InputNumber v-model="connTimeout" :min="1" suffix=" s" class="w-full" inputClass="text-sm" />
                                    </div>
                                    <div class="flex gap-2 items-center">
                                        <span class="text-xs text-zinc-400 w-24 shrink-0">Read timeout</span>
                                        <InputNumber v-model="readTimeout" :min="1" suffix=" s" class="w-full" inputClass="text-sm" />
                                    </div>
                                </div>
                            </fieldset>

                            <!-- Test Request panel -->
                            <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                <legend class="text-xs font-semibold text-zinc-400 px-1">Test Request</legend>
                                <div class="flex flex-col gap-3">
                                    <Button
                                        label="Send Test Request"
                                        icon="pi pi-play"
                                        severity="secondary"
                                        :loading="testing"
                                        class="self-start"
                                        @click="runTest"
                                    />

                                    <div v-if="testResult" class="flex flex-col gap-2 text-sm">
                                        <!-- Status line -->
                                        <div v-if="testResult.error" class="text-red-500 text-xs flex items-center gap-1">
                                            <i class="pi pi-times-circle" />
                                            {{ testResult.error }}
                                        </div>
                                        <div v-else class="flex items-center gap-3">
                                            <Tag
                                                :severity="statusSeverity(testResult.status)"
                                                :value="`${testResult.status} ${testResult.statusText}`"
                                            />
                                            <span class="text-xs text-zinc-400">{{ testResult.durationMs }} ms</span>
                                        </div>

                                        <!-- Response headers (collapsible) -->
                                        <button
                                            v-if="!testResult.error && Object.keys(testResult.headers).length"
                                            class="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 self-start"
                                            @click="showRespHeaders = !showRespHeaders"
                                        >
                                            <i :class="showRespHeaders ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" style="font-size:0.65rem" />
                                            Response headers
                                        </button>
                                        <pre v-if="showRespHeaders && !testResult.error" class="text-xs font-mono bg-surface-100 dark:bg-zinc-900 rounded p-2 overflow-auto max-h-32 text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{{ JSON.stringify(testResult.headers, null, 2) }}</pre>

                                        <!-- Response body -->
                                        <pre
                                            v-if="formattedBody"
                                            class="text-xs font-mono bg-surface-100 dark:bg-zinc-900 rounded p-2 overflow-auto max-h-64 text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap"
                                        >{{ formattedBody }}</pre>
                                        <span v-else-if="!testResult.error" class="text-xs text-zinc-400">(empty body)</span>
                                    </div>
                                </div>
                            </fieldset>

                        </div>
                    </TabPanel>

                    <!-- ── Raw JSON tab ──────────────────────────────────── -->
                    <TabPanel value="1">
                        <div class="flex flex-col gap-2 pt-2">
                            <textarea
                                v-model="rawJson"
                                rows="22"
                                spellcheck="false"
                                class="w-full font-mono text-sm rounded border
                                       bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100
                                       px-3 py-2 resize-y focus:outline-none focus:ring-1
                                       focus:ring-(--layout-accent-color)"
                                :class="jsonError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'"
                                @input="jsonError = ''"
                            />
                            <span v-if="jsonError" class="text-xs text-red-500">{{ jsonError }}</span>
                        </div>
                    </TabPanel>

                </TabPanels>
            </Tabs>

        </div>

        <template #footer>
            <Button label="Cancel" severity="secondary" text @click="emit('update:visible', false)" />
            <Button label="Save" icon="pi pi-check" :loading="saving" @click="save" />
        </template>
    </Dialog>
</template>
