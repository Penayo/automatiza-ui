<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, Button, Tabs, TabList, Tab, TabPanels, TabPanel } from 'primevue';
import { useTheme } from '@/composables/useTheme';
import { $api } from '@services/api';
import type { Datasource, SaveDatasourceDto, DatasourceOperation } from '@services/DatasourcesService';
import type { IRole } from '@services/RoleService';
import { findPreset } from './presets';
import PresetPicker from './components/PresetPicker.vue';
import GeneralTab from './components/GeneralTab.vue';
import QueryShapeTab from './components/QueryShapeTab.vue';
import OperationsTab from './components/OperationsTab.vue';
import FieldConfigTab from './components/FieldConfigTab.vue';
import AccessControlTab from './components/AccessControlTab.vue';
import TestTab from './components/TestTab.vue';

const route  = useRoute();
const router = useRouter();
const toast  = useToast();
const { isDark } = useTheme();

const loading   = ref(false);
const saving    = ref(false);
/** Set once the datasource exists — from the route, or after the first create. */
const editingId = ref<string | null>((route.params.id as string | undefined) ?? null);

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
    loadGroupOptions();
    const result = await $api.roles.fetchRoles({ keys: [] });
    roleOptions.value = Array.isArray(result) ? result : (result.rows ?? []);
});

onMounted(async () => {
    if (!editingId.value) return;
    loading.value = true;
    try {
        loadDatasource(await $api.datasources.findById(editingId.value));
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load the datasource.', life: 4000 });
        router.push({ name: 'DatasourcesIndex' });
    } finally {
        loading.value = false;
    }
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
 * The path segment currently standing in for this datasource's resource —
 * `vehicles` in a freshly applied preset, or whatever the key was when an
 * existing row was opened.
 *
 * The key is how the rest of the product names a datasource, so an author who
 * renames it expects `/vehicles` to become `/customers` rather than to be left
 * pointing at the preset's example table. Only a segment that still matches is
 * rewritten, so a hand-edited path simply stops tracking instead of being
 * clobbered.
 */
const resourceSegment = ref<string | null>(null);

/** Rewrite whole path segments equal to `from` — never a substring of one. */
function renameResourceSegment(from: string | null, to: string) {
    if (!from || !to || from === to) return;

    let ops: any[];
    try {
        const parsed = JSON.parse(operationsJson.value);
        if (!Array.isArray(parsed)) return;
        ops = parsed;
    } catch {
        return; // mid-edit and unparseable — leave the author's text alone
    }

    let changed = false;
    for (const op of ops) {
        if (typeof op?.path !== 'string') continue;
        const next = op.path.split('/').map((s: string) => (s === from ? to : s)).join('/');
        if (next !== op.path) { op.path = next; changed = true; }
    }
    if (changed) operationsJson.value = JSON.stringify(ops, null, 2);
}

// An emptied key is someone retyping, not a rename to nothing: hold the segment
// until a real one arrives.
watch(() => form.value.key, (next) => {
    if (!next) return;
    renameResourceSegment(resourceSegment.value, next);
    resourceSegment.value = next;
});

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

    // The key survives a preset, so paths adopt it immediately rather than
    // waiting for the next keystroke in it.
    resourceSegment.value = preset.resourceSegment;
    if (form.value.key) {
        renameResourceSegment(resourceSegment.value, form.value.key);
        resourceSegment.value = form.value.key;
    }

    jsonError.value = wireError.value = headersError.value = '';
    toast.add({
        severity: 'info', summary: `${preset.name} applied`,
        detail: 'Adjust the paths and fields, then use Test to confirm against the real API.',
        life: 4000,
    });
}

function loadDatasource(ds: Datasource) {
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
    resourceSegment.value = ds.key || null;
    paginationWireJson.value = JSON.stringify({
        params:         ds.pagination?.params,
        headers:        ds.pagination?.headers,
        requestHeaders: ds.pagination?.requestHeaders,
    }, null, 2);
    defaultHeadersJson.value = JSON.stringify(ds.defaultHeaders ?? {}, null, 2);
    jsonError.value = wireError.value = headersError.value = '';
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
            const created = await $api.datasources.create(dto);
            editingId.value = created.id;
            toast.add({ severity: 'success', summary: 'Created', detail: `"${dto.name}" created.`, life: 3000 });
            // Stay on the page — the Test tab needs the saved datasource.
            router.replace({ name: 'DatasourceEdit', params: { id: created.id } });
        }
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
    <div class="p-6 flex flex-col gap-4">

        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <Button icon="pi pi-arrow-left" text rounded size="small" v-tooltip.top="'Back to datasources'"
                        @click="router.push({ name: 'DatasourcesIndex' })" />
                <div>
                    <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">
                        {{ editingId ? form.name || 'Datasource' : 'New Datasource' }}
                    </h1>
                    <code v-if="editingId && form.key" class="text-xs text-surface-400">{{ form.key }}</code>
                </div>
            </div>
            <Button label="Save" icon="pi pi-check" size="small" :loading="saving" :disabled="loading" @click="save" />
        </div>

        <div v-if="loading" class="py-10 text-center text-surface-400">
            <i class="pi pi-spin pi-spinner" />
        </div>

        <div v-else class="flex flex-col gap-4">

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
                            :datasource-key="form.key"
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
                            :editing-id="editingId"
                            :datasource-key="form.key"
                            :parsed-operation-keys="parsedOperationKeys"
                            :is-dark="isDark"
                        />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>
    </div>
</template>
