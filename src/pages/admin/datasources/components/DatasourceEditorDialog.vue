<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast, Button, Dialog, Tabs, TabList, Tab, TabPanels, TabPanel } from 'primevue';
import { useTheme } from '@/composables/useTheme';
import { $api } from '@services/api';
import type { Datasource, SaveDatasourceDto, DatasourceOperation } from '@services/DatasourcesService';
import type { IRole } from '@services/RoleService';
import { findPreset } from '../presets';
import PresetPicker from './PresetPicker.vue';
import GeneralTab from './GeneralTab.vue';
import QueryShapeTab from './QueryShapeTab.vue';
import OperationsTab from './OperationsTab.vue';
import FieldConfigTab from './FieldConfigTab.vue';
import AccessControlTab from './AccessControlTab.vue';
import TestTab from './TestTab.vue';

const toast = useToast();
const { isDark } = useTheme();

const emit = defineEmits<{
    (e: 'saved'): void;
}>();

const dialogVisible = ref(false);
const saving        = ref(false);
const editingId     = ref<string | null>(null);

function emptyForm(): SaveDatasourceDto {
    return {
        key: '', name: '', description: '', group: '', baseUrl: '',
        auth: { type: 'none' },
        timeoutMs: 10000,
        filterStyle: { mode: 'params' },
        sortStyle: { mode: 'none' },
        pagination: { style: 'none', total: { from: 'none' } },
        operations: [],
        healthCheck: '',
        createOperation: '',
        updateOperation: '',
        permissions: { read: [], create: [], update: [] },
        enabled: true,
    };
}

const form = ref<SaveDatasourceDto>(emptyForm());

// ── Roles (§10.6) — for the read/create/update role MultiSelects ────────────
const roleOptions = ref<IRole[]>([]);

/** Groups already in use (§3) — suggestions only; the Select stays editable so a new one can be typed. */
const groupOptions = ref<string[]>([]);

onMounted(async () => {
    const result = await $api.roles.fetchRoles({ keys: [] });
    roleOptions.value = Array.isArray(result) ? result : (result.rows ?? []);
});

async function loadGroupOptions() {
    try {
        const all = await $api.datasources.getAll();
        groupOptions.value = [...new Set(all.map(d => d.group).filter((g): g is string => !!g))].sort();
    } catch {
        // suggestions only — the field still accepts a freely typed group
    }
}

/** Operations a `createOperation`/`updateOperation` Select may point at — writes only. */
const writeOperationKeys = computed(() => {
    try {
        const ops = JSON.parse(operationsJson.value);
        return Array.isArray(ops) ? ops.filter((o: any) => o?.kind === 'write').map((o: any) => o?.key).filter(Boolean) : [];
    } catch { return []; }
});

/**
 * Operations are authored as JSON rather than through a nested visual builder.
 * The shape is recursive (operations → filters → templates → notFound matchers)
 * and every field is meaningful, so a form would be both large and lossy. The
 * Test action is what makes this workable: paste, run, see the composed URL
 * and the real response side by side.
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

// ── Presets ───────────────────────────────────────────────────────────────
// Files under ../presets, not database rows — see that folder's README.
const selectedPreset = ref<string | null>(null);

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

const testTabRef = ref<InstanceType<typeof TestTab> | null>(null);

function openNew() {
    editingId.value = null;
    selectedPreset.value = null;
    form.value = emptyForm();
    operationsJson.value = '[]';
    paginationWireJson.value = '{}';
    defaultHeadersJson.value = '{}';
    jsonError.value = wireError.value = headersError.value = '';
    testTabRef.value?.reset();
    loadGroupOptions();
    dialogVisible.value = true;
}

function openEdit(ds: Datasource) {
    editingId.value = ds.id;
    selectedPreset.value = null;
    form.value = {
        key: ds.key, name: ds.name, description: ds.description ?? '', group: ds.group ?? '',
        baseUrl: ds.baseUrl,
        auth: { ...ds.auth },
        defaultHeaders: ds.defaultHeaders,
        timeoutMs: ds.timeoutMs ?? 10000,
        filterStyle: { ...ds.filterStyle },
        sortStyle: { ...(ds.sortStyle ?? { mode: 'none' }) },
        pagination: JSON.parse(JSON.stringify(ds.pagination ?? { style: 'none' })),
        operations: [],
        healthCheck: ds.healthCheck ?? '',
        createOperation: ds.createOperation ?? '',
        updateOperation: ds.updateOperation ?? '',
        permissions: {
            read:   [...(ds.permissions?.read ?? [])],
            create: [...(ds.permissions?.create ?? [])],
            update: [...(ds.permissions?.update ?? [])],
        },
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
    testTabRef.value?.reset();
    loadGroupOptions();
    dialogVisible.value = true;
}

defineExpose({ openNew, openEdit });

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

// ── Save ──────────────────────────────────────────────────────────────────
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
        createOperation: form.value.createOperation || undefined,
        updateOperation: form.value.updateOperation || undefined,
        permissions: {
            read:   form.value.permissions?.read?.length ? form.value.permissions.read : undefined,
            create: form.value.permissions?.create?.length ? form.value.permissions.create : undefined,
            update: form.value.permissions?.update?.length ? form.value.permissions.update : undefined,
        },
    };

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
        emit('saved');
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
</script>

<template>
    <Dialog v-model:visible="dialogVisible" modal
            :header="editingId ? 'Edit Datasource' : 'New Datasource'"
            :style="{ width: '58rem' }">

        <div class="flex flex-col gap-4">

            <PresetPicker v-model="selectedPreset" @apply="applyPreset" />

            <Tabs value="general">
                <TabList>
                    <Tab value="general">General</Tab>
                    <Tab value="query">Query shape</Tab>
                    <Tab value="operations">Operations</Tab>
                    <Tab value="fields">Field Configuration</Tab>
                    <Tab value="access">Access Control</Tab>
                    <Tab value="test">Test</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel value="general">
                        <GeneralTab v-model:form="form" :parsed-operation-keys="parsedOperationKeys" :group-options="groupOptions" />
                    </TabPanel>

                    <TabPanel value="query">
                        <QueryShapeTab
                            v-model:form="form"
                            v-model:pagination-wire-json="paginationWireJson"
                            v-model:default-headers-json="defaultHeadersJson"
                            v-model:wire-error="wireError"
                            v-model:headers-error="headersError"
                            :is-dark="isDark"
                        />
                    </TabPanel>

                    <TabPanel value="operations">
                        <OperationsTab
                            v-model:operations-json="operationsJson"
                            v-model:json-error="jsonError"
                            :is-dark="isDark"
                        />
                    </TabPanel>

                    <TabPanel value="fields">
                        <FieldConfigTab
                            v-model:operations-json="operationsJson"
                            :sort-style-mode="form.sortStyle!.mode"
                        />
                    </TabPanel>

                    <TabPanel value="access">
                        <AccessControlTab
                            v-model:form="form"
                            :role-options="roleOptions"
                            :write-operation-keys="writeOperationKeys"
                        />
                    </TabPanel>

                    <TabPanel value="test">
                        <TestTab
                            ref="testTabRef"
                            :editing-id="editingId"
                            :datasource-key="form.key"
                            :parsed-operation-keys="parsedOperationKeys"
                            :is-dark="isDark"
                        />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>

        <template #footer>
            <Button label="Cancel" text size="small" @click="dialogVisible = false" />
            <Button label="Save" icon="pi pi-check" size="small" :loading="saving" @click="save" />
        </template>
    </Dialog>
</template>
