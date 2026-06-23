<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Dialog, Button, Select, InputText, InputNumber, Textarea, ToggleSwitch,
         Tabs, Tab, TabList, TabPanels, TabPanel, Tag, useToast } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { useTheme } from '@/composables/useTheme';
import { $api } from '@services/api';
import type { Task } from '@services/TasksService';

const props = defineProps<{ visible: boolean; task: Task | null }>();
const emit  = defineEmits<{ 'update:visible': [value: boolean]; saved: [] }>();

const toast      = useToast();
const { isDark } = useTheme();
const saving     = ref(false);
const activeTab  = ref('0');

// ── Service type routing ──────────────────────────────────────────────────────

const REST_TYPES  = ['io.camunda:http-json:1', 'io.camunda.connectors.HttpJson.v2', 'io.camunda.connectors.HttpJson.v2-hybrid'];
const EMAIL_TYPES = ['io.penayotech:smtp:1', 'io.camunda:email:1'];
const REPORT_TYPE = 'io.processlinker:report:v1';

const serviceFormType = computed(() => {
    const t = props.task?.service?.type ?? '';
    if (REST_TYPES.includes(t))  return 'rest';
    if (EMAIL_TYPES.includes(t)) return 'email';
    if (t === REPORT_TYPE)       return 'report';
    return 'json';
});

const serviceTypeLabel = computed(() => {
    const t = props.task?.service?.type ?? '';
    if (REST_TYPES.includes(t))                         return 'REST HTTP';
    if (EMAIL_TYPES.includes(t))                        return 'Email (SMTP)';
    if (t === REPORT_TYPE)                              return 'Report';
    if (t === 'io.camunda.connectors.OpenAI.v1')        return 'OpenAI';
    if (t === 'io.processlinker:esign:dropbox:v1')      return 'eSign (Dropbox)';
    if (t === 'io.processlinker:esign:docusign:v1')     return 'eSign (DocuSign)';
    return t || 'Service Task';
});

// ── Shared helpers ────────────────────────────────────────────────────────────

interface KVRow { key: string; value: string }
function objToRows(obj?: Record<string, string>): KVRow[] {
    return obj ? Object.entries(obj).map(([key, value]) => ({ key, value: String(value) })) : [];
}
function rowsToObj(rows: KVRow[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const r of rows) { if (r.key) out[r.key] = r.value; }
    return out;
}
function addRow(rows: KVRow[]) { rows.push({ key: '', value: '' }); }
function removeRow(rows: KVRow[], i: number) { rows.splice(i, 1); }

// ── REST form state ───────────────────────────────────────────────────────────

const rMethod      = ref('GET');
const rUrl         = ref('');
const rAuthType    = ref('noAuth');
const rApiKeyLoc   = ref('headers');
const rApiKeyName  = ref('');
const rApiKeyValue = ref('');
const rBasicUser   = ref('');
const rBasicPass   = ref('');
const rBearerToken = ref('');
const rHeaderRows  = ref<KVRow[]>([]);
const rQueryRows   = ref<KVRow[]>([]);
const rBodyRaw     = ref('');
const rResultVar   = ref('');
const rResultExpr  = ref('');
const rErrorExpr   = ref('');
const rStoreResp   = ref(false);
const rRetries     = ref(0);
const rRetryBackoff = ref('');
const rConnTimeout = ref(20);
const rReadTimeout = ref(20);

const methodOptions   = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const authOptions     = [
    { label: 'No Auth',      value: 'noAuth'  },
    { label: 'API Key',      value: 'apiKey'  },
    { label: 'Basic Auth',   value: 'basic'   },
    { label: 'Bearer Token', value: 'bearer'  },
];
const apiKeyLocOptions = [
    { label: 'Header', value: 'headers' },
    { label: 'Query',  value: 'query'   },
];
const hasBody = computed(() => ['POST', 'PUT', 'PATCH'].includes(rMethod.value));

function loadRest(c: Record<string, any>) {
    rMethod.value       = c.method ?? 'GET';
    rUrl.value          = c.url    ?? '';
    rAuthType.value     = c.authentication?.type          ?? 'noAuth';
    rApiKeyLoc.value    = c.authentication?.apiKeyLocation ?? 'headers';
    rApiKeyName.value   = c.authentication?.name          ?? '';
    rApiKeyValue.value  = c.authentication?.value         ?? '';
    rBasicUser.value    = c.authentication?.username      ?? '';
    rBasicPass.value    = c.authentication?.password      ?? '';
    rBearerToken.value  = c.authentication?.token         ?? '';
    rHeaderRows.value   = objToRows(c.headers);
    rQueryRows.value    = objToRows(typeof c.queryParameters === 'object' ? c.queryParameters : {});
    rBodyRaw.value      = typeof c.body === 'string' ? c.body
        : c.body != null ? JSON.stringify(c.body, null, 2) : '';
    rResultVar.value    = c.resultVariable   ?? '';
    rResultExpr.value   = c.resultExpression ?? '';
    rErrorExpr.value    = c.errorExpression  ?? '';
    rStoreResp.value    = c.storeResponse    ?? false;
    rRetries.value      = c.retries          ?? 0;
    rRetryBackoff.value = c.retryBackoff     ?? '';
    rConnTimeout.value  = c.connectionTimeoutInSeconds ?? 20;
    rReadTimeout.value  = c.readTimeoutInSeconds       ?? 20;
}

function buildRest(): Record<string, any> {
    const cfg: Record<string, any> = { method: rMethod.value, url: rUrl.value };
    if (rAuthType.value !== 'noAuth') {
        cfg.authentication = { type: rAuthType.value };
        if (rAuthType.value === 'apiKey')  { cfg.authentication.apiKeyLocation = rApiKeyLoc.value; cfg.authentication.name = rApiKeyName.value; cfg.authentication.value = rApiKeyValue.value; }
        if (rAuthType.value === 'basic')   { cfg.authentication.username = rBasicUser.value; cfg.authentication.password = rBasicPass.value; }
        if (rAuthType.value === 'bearer')  { cfg.authentication.token = rBearerToken.value; }
    }
    const headers = rowsToObj(rHeaderRows.value);
    if (Object.keys(headers).length) cfg.headers = headers;
    const query = rowsToObj(rQueryRows.value);
    if (Object.keys(query).length) cfg.queryParameters = query;
    if (hasBody.value && rBodyRaw.value.trim()) {
        try { cfg.body = JSON.parse(rBodyRaw.value); } catch { cfg.body = rBodyRaw.value; }
    }
    if (rResultVar.value)    cfg.resultVariable            = rResultVar.value;
    if (rResultExpr.value)   cfg.resultExpression          = rResultExpr.value;
    if (rErrorExpr.value)    cfg.errorExpression           = rErrorExpr.value;
    if (rStoreResp.value)    cfg.storeResponse             = true;
    if (rRetries.value > 0)  cfg.retries                   = rRetries.value;
    if (rRetryBackoff.value) cfg.retryBackoff              = rRetryBackoff.value;
    if (rConnTimeout.value !== 20) cfg.connectionTimeoutInSeconds = rConnTimeout.value;
    if (rReadTimeout.value !== 20) cfg.readTimeoutInSeconds       = rReadTimeout.value;
    return cfg;
}

// ── Email form state ──────────────────────────────────────────────────────────

const eHost        = ref('');
const ePort        = ref(587);
const eSecure      = ref(false);
const eAuthUser    = ref('');
const eAuthPass    = ref('');
const eSenderName  = ref('');
const eSenderFrom  = ref('');
const eTo          = ref('');
const eCc          = ref('');
const eBcc         = ref('');
const eSubject     = ref('');
const eBody        = ref('');
const eTemplateKey = ref('');
const eRetries     = ref(1);
const eRetryBackoff = ref('');

function loadEmail(c: Record<string, any>) {
    eHost.value        = c.host              ?? '';
    ePort.value        = c.port              ?? 587;
    eSecure.value      = c.secure            ?? false;
    eAuthUser.value    = c.auth?.username    ?? '';
    eAuthPass.value    = c.auth?.password    ?? '';
    eSenderName.value  = c.sender?.name      ?? '';
    eSenderFrom.value  = c.sender?.from      ?? '';
    eTo.value          = Array.isArray(c.to)  ? c.to.join(', ') : (c.to ?? '');
    eCc.value          = Array.isArray(c.cc)  ? c.cc.join(', ') : (c.cc ?? '');
    eBcc.value         = Array.isArray(c.bcc) ? c.bcc.join(', ') : (c.bcc ?? '');
    eSubject.value     = c.subject           ?? '';
    eBody.value        = c.body              ?? '';
    eTemplateKey.value = c.templateKey       ?? '';
    eRetries.value     = c.retries           ?? 1;
    eRetryBackoff.value = c.retryBackoff     ?? '';
}

function buildEmail(): Record<string, any> {
    const cfg: Record<string, any> = {
        host:   eHost.value,
        port:   ePort.value,
        secure: eSecure.value,
        auth:   { type: 'LOGIN', method: 'LOGIN', username: eAuthUser.value, password: eAuthPass.value },
        sender: { name: eSenderName.value, from: eSenderFrom.value },
        to:     eTo.value.split(',').map(s => s.trim()).filter(Boolean),
        subject: eSubject.value,
    };
    if (eCc.value)  cfg.cc  = eCc.value.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (eBcc.value) cfg.bcc = eBcc.value.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (eTemplateKey.value) cfg.templateKey = eTemplateKey.value;
    else if (eBody.value)   cfg.body        = eBody.value;
    if (eRetries.value > 0)  cfg.retries      = eRetries.value;
    if (eRetryBackoff.value) cfg.retryBackoff = eRetryBackoff.value;
    return cfg;
}

// ── Report form state ─────────────────────────────────────────────────────────

const rpKey        = ref('');
const rpInputs     = ref('');
const rpOutputVar  = ref('generatedReport');
const rpFilename   = ref('');
const rpRetries    = ref(1);
const rpRetryBackoff = ref('');

function loadReport(c: Record<string, any>) {
    rpKey.value         = c.reportKey      ?? '';
    rpInputs.value      = c.inputs != null ? (typeof c.inputs === 'string' ? c.inputs : JSON.stringify(c.inputs)) : '';
    rpOutputVar.value   = c.outputVariable ?? 'generatedReport';
    rpFilename.value    = c.filename       ?? '';
    rpRetries.value     = c.retries        ?? 1;
    rpRetryBackoff.value = c.retryBackoff  ?? '';
}

function buildReport(): Record<string, any> {
    const cfg: Record<string, any> = { reportKey: rpKey.value };
    if (rpInputs.value) {
        try { cfg.inputs = JSON.parse(rpInputs.value); } catch { cfg.inputs = rpInputs.value; }
    }
    if (rpOutputVar.value && rpOutputVar.value !== 'generatedReport') cfg.outputVariable = rpOutputVar.value;
    if (rpFilename.value) cfg.filename = rpFilename.value;
    if (rpRetries.value > 1)   cfg.retries      = rpRetries.value;
    if (rpRetryBackoff.value)  cfg.retryBackoff = rpRetryBackoff.value;
    return cfg;
}

// ── Test request state (declared before the immediate watch that resets it) ───

interface TestResult {
    status: number; statusText: string; durationMs: number;
    headers: Record<string, string>; body: any; error?: string;
}
const testing         = ref(false);
const testResult      = ref<TestResult | null>(null);
const showRespHeaders = ref(false);

const statusSeverity = (s: number) =>
    s >= 500 ? 'danger' : s >= 400 ? 'warn' : s >= 200 ? 'success' : 'secondary';

const formattedBody = computed(() => {
    if (!testResult.value?.body) return '';
    try { return JSON.stringify(testResult.value.body, null, 2); } catch { return String(testResult.value.body); }
});

async function runTest() {
    const config = getConfig();
    if (config === null) return;
    testing.value = true; testResult.value = null;
    try {
        testResult.value = await $api.tasks.testRestRequest(config);
    } catch (err: any) {
        testResult.value = { status: 0, statusText: 'Request failed', durationMs: 0, headers: {}, body: null,
            error: err?.response?.data?.message ?? err?.message ?? 'Unknown error' };
    } finally {
        testing.value = false;
    }
}

// ── Raw JSON state ────────────────────────────────────────────────────────────

const rawJson   = ref('');
const jsonError = ref('');

// ── Watch task ────────────────────────────────────────────────────────────────

watch(() => props.task, (task) => {
    activeTab.value   = '0';
    jsonError.value   = '';
    testResult.value  = null;
    showRespHeaders.value = false;
    const c = (task?.serviceConfig ?? {}) as Record<string, any>;
    if (serviceFormType.value === 'rest')   loadRest(c);
    if (serviceFormType.value === 'email')  loadEmail(c);
    if (serviceFormType.value === 'report') loadReport(c);
    rawJson.value = JSON.stringify(c, null, 2);
}, { immediate: true });

// Sync raw JSON when switching to that tab
watch(activeTab, (tab) => {
    if (tab === '1') { jsonError.value = ''; rawJson.value = JSON.stringify(buildConfig(), null, 2); }
});

// ── Build / get config ────────────────────────────────────────────────────────

function buildConfig(): Record<string, any> {
    if (serviceFormType.value === 'rest')   return buildRest();
    if (serviceFormType.value === 'email')  return buildEmail();
    if (serviceFormType.value === 'report') return buildReport();
    try { return JSON.parse(rawJson.value); } catch { return {}; }
}

function getConfig(): Record<string, any> | null {
    if (activeTab.value === '1') {
        try { return JSON.parse(rawJson.value); }
        catch (e: any) { jsonError.value = `Invalid JSON: ${e.message}`; return null; }
    }
    return buildConfig();
}

// ── Save ──────────────────────────────────────────────────────────────────────

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
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        :header="`Service Config — ${props.task?.name ?? ''} [${serviceTypeLabel}]`"
        :style="{ width: '780px', maxHeight: '90vh' }"
        :dismissableMask="true"
    >
        <div class="flex flex-col gap-4 overflow-y-auto" style="max-height: calc(90vh - 140px)">

            <Tabs v-model:value="activeTab">
                <TabList>
                    <Tab value="0">Form</Tab>
                    <Tab value="1">Raw JSON</Tab>
                </TabList>

                <TabPanels>

                    <!-- ══════════════════ FORM TAB ══════════════════════════ -->
                    <TabPanel value="0">
                        <div class="flex flex-col gap-5 pt-2">

                            <!-- ── No form available ─────────────────────── -->
                            <div v-if="serviceFormType === 'json'" class="text-sm text-zinc-400 py-4 text-center">
                                No structured form for this service type.<br/>
                                Use the <strong>Raw JSON</strong> tab to edit the config.
                            </div>

                            <!-- ── REST HTTP form ─────────────────────────── -->
                            <template v-if="serviceFormType === 'rest'">

                                <div class="flex gap-2">
                                    <Select v-model="rMethod" :options="methodOptions" class="w-28 shrink-0" />
                                    <InputText v-model="rUrl" placeholder="https://api.example.com/endpoint" class="flex-1" />
                                </div>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Authentication</legend>
                                    <div class="flex flex-col gap-3">
                                        <Select v-model="rAuthType" :options="authOptions" optionLabel="label" optionValue="value" class="w-48" />
                                        <template v-if="rAuthType === 'apiKey'">
                                            <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Location</span><Select v-model="rApiKeyLoc" :options="apiKeyLocOptions" optionLabel="label" optionValue="value" class="w-32" /></div>
                                            <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Name</span><InputText v-model="rApiKeyName" placeholder="X-API-Key" class="flex-1" /></div>
                                            <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Value</span><InputText v-model="rApiKeyValue" placeholder="secrets.my-api-key" class="flex-1" /></div>
                                        </template>
                                        <template v-else-if="rAuthType === 'basic'">
                                            <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Username</span><InputText v-model="rBasicUser" placeholder="secrets.my-user" class="flex-1" /></div>
                                            <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Password</span><InputText v-model="rBasicPass" type="password" placeholder="secrets.my-password" class="flex-1" /></div>
                                        </template>
                                        <template v-else-if="rAuthType === 'bearer'">
                                            <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Token</span><InputText v-model="rBearerToken" placeholder="secrets.my-token" class="flex-1" /></div>
                                        </template>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Headers</legend>
                                    <div class="flex flex-col gap-1">
                                        <div v-for="(row, i) in rHeaderRows" :key="i" class="flex gap-2 items-center">
                                            <InputText v-model="row.key" placeholder="Key" class="flex-1 text-sm" size="small" />
                                            <InputText v-model="row.value" placeholder="Value" class="flex-1 text-sm" size="small" />
                                            <Button icon="pi pi-times" severity="danger" text rounded size="small" @click="removeRow(rHeaderRows, i)" />
                                        </div>
                                        <Button label="Add header" icon="pi pi-plus" text size="small" class="self-start mt-1" @click="addRow(rHeaderRows)" />
                                    </div>
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Query Parameters</legend>
                                    <div class="flex flex-col gap-1">
                                        <div v-for="(row, i) in rQueryRows" :key="i" class="flex gap-2 items-center">
                                            <InputText v-model="row.key" placeholder="Key" class="flex-1 text-sm" size="small" />
                                            <InputText v-model="row.value" placeholder="Value" class="flex-1 text-sm" size="small" />
                                            <Button icon="pi pi-times" severity="danger" text rounded size="small" @click="removeRow(rQueryRows, i)" />
                                        </div>
                                        <Button label="Add parameter" icon="pi pi-plus" text size="small" class="self-start mt-1" @click="addRow(rQueryRows)" />
                                    </div>
                                </fieldset>

                                <fieldset v-if="hasBody" class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Body</legend>
                                    <Textarea v-model="rBodyRaw" rows="5" class="w-full font-mono text-sm" placeholder='{"key": "value"}' />
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Response Mapping</legend>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-32 shrink-0">Result Variable</span><InputText v-model="rResultVar" placeholder="response" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-32 shrink-0">Result Expression</span><InputText v-model="rResultExpr" placeholder="= {data: response.body}" class="flex-1 font-mono" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-32 shrink-0">Error Expression</span><InputText v-model="rErrorExpr" placeholder="= error" class="flex-1 font-mono" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-32 shrink-0">Store Response</span><ToggleSwitch v-model="rStoreResp" /></div>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Retries &amp; Timeouts</legend>
                                    <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-24 shrink-0">Retries</span><InputNumber v-model="rRetries" :min="0" :max="10" showButtons class="w-full" inputClass="text-sm" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-24 shrink-0">Backoff</span><InputText v-model="rRetryBackoff" placeholder="PT10S" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-24 shrink-0">Conn. timeout</span><InputNumber v-model="rConnTimeout" :min="1" suffix=" s" class="w-full" inputClass="text-sm" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-24 shrink-0">Read timeout</span><InputNumber v-model="rReadTimeout" :min="1" suffix=" s" class="w-full" inputClass="text-sm" /></div>
                                    </div>
                                </fieldset>

                                <!-- Test Request panel -->
                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Test Request</legend>
                                    <div class="flex flex-col gap-3">
                                        <Button label="Send Test Request" icon="pi pi-play" severity="secondary" :loading="testing" class="self-start" @click="runTest" />
                                        <div v-if="testResult" class="flex flex-col gap-2 text-sm">
                                            <div v-if="testResult.error" class="text-red-500 text-xs flex items-center gap-1">
                                                <i class="pi pi-times-circle" />{{ testResult.error }}
                                            </div>
                                            <div v-else class="flex items-center gap-3">
                                                <Tag :severity="statusSeverity(testResult.status)" :value="`${testResult.status} ${testResult.statusText}`" />
                                                <span class="text-xs text-zinc-400">{{ testResult.durationMs }} ms</span>
                                            </div>
                                            <button v-if="!testResult.error && Object.keys(testResult.headers).length" class="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 self-start" @click="showRespHeaders = !showRespHeaders">
                                                <i :class="showRespHeaders ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" style="font-size:0.65rem" />Response headers
                                            </button>
                                            <pre v-if="showRespHeaders && !testResult.error" class="text-xs font-mono bg-surface-100 dark:bg-zinc-900 rounded p-2 overflow-auto max-h-32 text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{{ JSON.stringify(testResult.headers, null, 2) }}</pre>
                                            <pre v-if="formattedBody" class="text-xs font-mono bg-surface-100 dark:bg-zinc-900 rounded p-2 overflow-auto max-h-64 text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{{ formattedBody }}</pre>
                                            <span v-else-if="!testResult.error" class="text-xs text-zinc-400">(empty body)</span>
                                        </div>
                                    </div>
                                </fieldset>

                            </template>

                            <!-- ── Email (SMTP) form ───────────────────────── -->
                            <template v-if="serviceFormType === 'email'">

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">SMTP Server</legend>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Host</span><InputText v-model="eHost" placeholder="smtp.example.com or secrets.smtp-host" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Port</span><InputNumber v-model="ePort" :min="1" :max="65535" class="w-36" inputClass="text-sm" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">TLS/SSL</span><ToggleSwitch v-model="eSecure" /></div>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Authentication</legend>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Username</span><InputText v-model="eAuthUser" placeholder="secrets.smtp-user" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Password</span><InputText v-model="eAuthPass" type="password" placeholder="secrets.smtp-password" class="flex-1" size="small" /></div>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Sender</legend>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">Name</span><InputText v-model="eSenderName" placeholder="My App" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-20 shrink-0">From</span><InputText v-model="eSenderFrom" placeholder="noreply@example.com" class="flex-1" size="small" /></div>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Recipients</legend>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-12 shrink-0">To</span><InputText v-model="eTo" placeholder="user@example.com, = recipientEmail" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-12 shrink-0">CC</span><InputText v-model="eCc" placeholder="optional" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-12 shrink-0">BCC</span><InputText v-model="eBcc" placeholder="optional" class="flex-1" size="small" /></div>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Message</legend>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-24 shrink-0">Subject</span><InputText v-model="eSubject" placeholder="Your subject" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-24 shrink-0">Template Key</span><InputText v-model="eTemplateKey" placeholder="my-email-template" class="flex-1" size="small" /></div>
                                        <div v-if="!eTemplateKey" class="flex flex-col gap-1">
                                            <span class="text-xs text-zinc-400">Body (HTML)</span>
                                            <Textarea v-model="eBody" rows="5" class="w-full font-mono text-sm" placeholder="<p>Hello {{name}}</p>" />
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Retries</legend>
                                    <div class="flex gap-4">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-16 shrink-0">Retries</span><InputNumber v-model="eRetries" :min="0" :max="10" showButtons inputClass="text-sm" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-16 shrink-0">Backoff</span><InputText v-model="eRetryBackoff" placeholder="PT10S" class="w-28" size="small" /></div>
                                    </div>
                                </fieldset>

                            </template>

                            <!-- ── Report form ────────────────────────────── -->
                            <template v-if="serviceFormType === 'report'">

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Report</legend>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-28 shrink-0">Report Key</span><InputText v-model="rpKey" placeholder="invoice-report" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-28 shrink-0">Output Variable</span><InputText v-model="rpOutputVar" placeholder="generatedReport" class="flex-1" size="small" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-28 shrink-0">Filename</span><InputText v-model="rpFilename" placeholder="report-{{id}}.pdf" class="flex-1" size="small" /></div>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Inputs (FEEL expression)</legend>
                                    <Textarea v-model="rpInputs" rows="4" class="w-full font-mono text-sm" placeholder="= { clientName: clientName, total: invoiceTotal }" />
                                </fieldset>

                                <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                                    <legend class="text-xs font-semibold text-zinc-400 px-1">Retries</legend>
                                    <div class="flex gap-4">
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-16 shrink-0">Retries</span><InputNumber v-model="rpRetries" :min="0" :max="10" showButtons inputClass="text-sm" /></div>
                                        <div class="flex gap-2 items-center"><span class="text-xs text-zinc-400 w-16 shrink-0">Backoff</span><InputText v-model="rpRetryBackoff" placeholder="PT10S" class="w-28" size="small" /></div>
                                    </div>
                                </fieldset>

                            </template>

                        </div>
                    </TabPanel>

                    <!-- ══════════════════ JSON TAB ══════════════════════════ -->
                    <TabPanel value="1">
                        <div class="flex flex-col gap-2 pt-2">
                            <div style="height: 420px">
                                <JsonEditor
                                    v-model:text="rawJson"
                                    :dark-theme="isDark"
                                    mode="text"
                                    :main-menu-bar="false"
                                    :navigation-bar="false"
                                    style="height: 100%"
                                    @update:text="jsonError = ''"
                                />
                            </div>
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
