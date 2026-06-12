<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AiChatPanel from '@components/chat/AiChatPanel.vue';
import { useRoute, useRouter } from 'vue-router';
import { Button, InputText, Textarea, Dialog, Splitter, SplitterPanel, useToast } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import FormField from '@components/form/FormField.vue';
import JsonSchemaPreview from './components/JsonSchemaPreview.vue';
import SchemaCatalogDrawer from './components/SchemaCatalogDrawer.vue';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';
import { useTheme } from '@/composables/useTheme.ts';

const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const id    = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !id.value);
const { isDark } = useTheme();

function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const form    = ref<IForm | null>(null);
const loading = ref(false);
const saving  = ref(false);

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'schema' | 'preview';
const activeTab     = ref<Tab>('schema');
const catalogVisible = ref(false);

// ── Schemas ───────────────────────────────────────────────────────────────────
const DEFAULT_SCHEMA = JSON.stringify({
    type: 'object',
    title: 'My Form',
    description: '',
    properties: {
        name: { type: 'string', title: 'Name' },
    },
    required: [],
}, null, 2);

const schemaText      = ref(DEFAULT_SCHEMA);
const uiSchemaText    = ref('{}');
const errorSchemaText = ref('{}');

const parsedSchema      = ref<Record<string, any>>(JSON.parse(DEFAULT_SCHEMA));
const parsedUiSchema    = ref<Record<string, any>>({});
const parsedErrorSchema = ref<Record<string, any>>({});

function onSchemaChange(content: any) {
    const text = content?.text ?? (content?.json !== undefined ? JSON.stringify(content.json, null, 2) : null);
    if (text !== null) {
        schemaText.value = text;
        try { parsedSchema.value = JSON.parse(text); } catch { /* keep last valid */ }
    }
}

function onUiSchemaChange(content: any) {
    const text = content?.text ?? (content?.json !== undefined ? JSON.stringify(content.json, null, 2) : null);
    if (text !== null) {
        uiSchemaText.value = text;
        try { parsedUiSchema.value = JSON.parse(text); } catch { /* keep last valid */ }
    }
}

function onErrorSchemaChange(content: any) {
    const text = content?.text ?? (content?.json !== undefined ? JSON.stringify(content.json, null, 2) : null);
    if (text !== null) {
        errorSchemaText.value = text;
        try { parsedErrorSchema.value = JSON.parse(text); } catch { /* keep last valid */ }
    }
}

// ── Save dialog ───────────────────────────────────────────────────────────────
const metaVisible = ref(false);
const metaName    = ref('');
const metaDesc    = ref('');

function openMeta() {
    metaName.value = form.value?.name ?? '';
    metaDesc.value = form.value?.description ?? '';
    metaVisible.value = true;
}

async function save() {
    if (!metaName.value.trim()) { openMeta(); return; }

    for (const [label, text] of [
        ['JSON Schema', schemaText.value],
        ['UI Schema',   uiSchemaText.value],
        ['Error Schema', errorSchemaText.value],
    ] as [string, string][]) {
        try { JSON.parse(text); } catch {
            toast.add({ severity: 'error', summary: `Invalid ${label}`, detail: `Fix the ${label} before saving.`, life: 3000 });
            return;
        }
    }

    saving.value = true;
    try {
        const payload: IForm = {
            ...(form.value ?? {}),
            id:           form.value?.id ?? generateId(),
            name:         metaName.value.trim(),
            description:  metaDesc.value.trim() || undefined,
            type:         'jsonschema',
            schemaVersion: 1,
            version:      form.value?.version ?? 1,
            components:   [],
            jsonSchema:   JSON.parse(schemaText.value),
            uiSchema:     JSON.parse(uiSchemaText.value),
            errorSchema:  JSON.parse(errorSchemaText.value),
        } as IForm;

        const saved = await $api.forms.save(payload) as IForm;
        form.value = saved;
        if (isNew.value) router.replace({ name: 'JsonSchemaEdit', params: { id: saved.id } });
        toast.add({ severity: 'success', summary: 'Saved', detail: `"${saved.name}" saved.`, life: 3000 });
        metaVisible.value = false;
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? 'Could not save.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
    if (isNew.value) return;
    loading.value = true;
    try {
        form.value = await $api.forms.findById(id.value!);
        metaName.value = form.value.name ?? '';
        metaDesc.value = form.value.description ?? '';
        if (form.value.jsonSchema) {
            schemaText.value   = JSON.stringify(form.value.jsonSchema, null, 2);
            parsedSchema.value = form.value.jsonSchema;
        }
        if (form.value.uiSchema) {
            uiSchemaText.value   = JSON.stringify(form.value.uiSchema, null, 2);
            parsedUiSchema.value = form.value.uiSchema;
        }
        if (form.value.errorSchema) {
            errorSchemaText.value   = JSON.stringify(form.value.errorSchema, null, 2);
            parsedErrorSchema.value = form.value.errorSchema;
        }
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load form.', life: 4000 });
        router.push({ name: 'FormsList' });
    } finally {
        loading.value = false;
    }
}

onMounted(load);

const aiContext = computed(() => ({
    schema:   parsedSchema.value,
    uiSchema: parsedUiSchema.value,
}));
</script>

<template>
    <div class="flex flex-col" style="height: 100vh;">

        <!-- ── Toolbar ──────────────────────────────────────────────────────── -->
        <div class="flex items-center gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-zinc-950 shrink-0">
            <Button
                icon="pi pi-arrow-left"
                text rounded size="small"
                v-tooltip.right="'Back to forms'"
                @click="router.push({ name: 'FormsList' })"
            />

            <div class="flex-1 min-w-0">
                <span v-if="loading" class="text-sm text-surface-400">Loading…</span>
                <div v-else class="flex items-center gap-2">
                    <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
                        JSON Schema
                    </span>
                    <span class="font-semibold truncate" style="color: var(--layout-title-color)">
                        {{ form?.name ?? 'New JSON Schema Form' }}
                    </span>
                    <span v-if="form?.version" class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500">
                        v{{ form.version }}
                    </span>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex items-center gap-1 bg-surface-100 dark:bg-zinc-800 rounded-lg p-1">
                <button
                    v-for="tab in [
                        { key: 'schema',  icon: 'pi-code', label: 'Schema'  },
                        { key: 'preview', icon: 'pi-eye',  label: 'Preview' },
                    ]"
                    :key="tab.key"
                    @click="activeTab = tab.key as Tab"
                    class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    :class="activeTab === tab.key
                        ? 'bg-white dark:bg-zinc-700 text-surface-900 dark:text-white shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
                >
                    <i :class="'pi ' + tab.icon" style="font-size: 0.75rem" />
                    {{ tab.label }}
                </button>
            </div>

            <Button icon="pi pi-pencil" size="small" text rounded v-tooltip.left="'Edit name'" @click="openMeta" />
            <Button label="Save" icon="pi pi-save" size="small" :loading="saving" @click="save" />
            <Button
                icon="pi pi-book"
                label="Field Catalog"
                size="small"
                text
                v-tooltip.bottom="'Browse field types & snippets'"
                @click="catalogVisible = true"
            />
        </div>

        <!-- ── Loading ─────────────────────────────────────────────────────── -->
        <div v-if="loading" class="flex-1 flex items-center justify-center text-surface-400">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <template v-else>
            <!-- ── Tab: Schema — resizable three-panel split ───────────────── -->
            <Splitter
                v-show="activeTab === 'schema'"
                class="flex-1 min-h-0 schema-splitter"
                :gutter-size="5"
            >
                <!-- Left: JSON Schema -->
                <SplitterPanel :size="60" :min-size="20" class="flex flex-col min-w-0">
                    <div class="flex items-center justify-between px-4 py-1.5 border-b border-surface-200 dark:border-surface-700 shrink-0 text-xs text-surface-500 bg-surface-50 dark:bg-zinc-900">
                        <span class="font-medium">JSON Schema</span>
                        <a href="https://json-schema.org/understanding-json-schema/" target="_blank" rel="noopener"
                           class="hover:opacity-80 flex items-center gap-1 opacity-60">
                            Docs <i class="pi pi-external-link" style="font-size:0.65rem" />
                        </a>
                    </div>
                    <JsonEditor
                        v-model:text="schemaText"
                        mode="text"
                        :mainMenuBar="false"
                        :navigationBar="false"
                        style="flex: 1; min-height: 0;"
                        @change="onSchemaChange"
                        @update:text="schemaText = $event"
                        :darkTheme="isDark"
                    />
                </SplitterPanel>

                <!-- Right: UI Schema (top) + Error Schema (bottom) — nested vertical splitter -->
                <SplitterPanel :size="40" :min-size="20" class="flex flex-col min-w-0">
                    <Splitter layout="vertical" class="flex-1 min-h-0" :gutter-size="5">

                        <!-- UI Schema -->
                        <SplitterPanel :size="50" :min-size="15" class="flex flex-col min-w-0">
                            <div class="flex items-center justify-between px-4 py-1.5 border-b border-surface-200 dark:border-surface-700 shrink-0 text-xs text-surface-500 bg-surface-50 dark:bg-zinc-900">
                                <span class="font-medium">UI Schema</span>
                                <a href="https://vue-json-schema-form.lljj.me/en/schema/ui-schema.html" target="_blank" rel="noopener"
                                   class="hover:opacity-80 flex items-center gap-1 opacity-60">
                                    Docs <i class="pi pi-external-link" style="font-size:0.65rem" />
                                </a>
                            </div>
                            <JsonEditor
                                v-model:text="uiSchemaText"
                                mode="text"
                                :mainMenuBar="false"
                                :navigationBar="false"
                                style="flex: 1; min-height: 0;"
                                @change="onUiSchemaChange"
                                @update:text="uiSchemaText = $event"
                                :darkTheme="isDark"
                            />
                        </SplitterPanel>

                        <!-- Error Schema -->
                        <SplitterPanel :size="50" :min-size="15" class="flex flex-col min-w-0">
                            <div class="flex items-center justify-between px-4 py-1.5 border-b border-surface-200 dark:border-surface-700 shrink-0 text-xs text-surface-500 bg-surface-50 dark:bg-zinc-900">
                                <span class="font-medium">Error Schema</span>
                                <a href="https://vue-json-schema-form.lljj.me/en/schema/error-schema.html" target="_blank" rel="noopener"
                                   class="hover:opacity-80 flex items-center gap-1 opacity-60">
                                    Docs <i class="pi pi-external-link" style="font-size:0.65rem" />
                                </a>
                            </div>
                            <JsonEditor
                                v-model:text="errorSchemaText"
                                mode="text"
                                :mainMenuBar="false"
                                :navigationBar="false"
                                style="flex: 1; min-height: 0;"
                                @change="onErrorSchemaChange"
                                @update:text="errorSchemaText = $event"
                                :darkTheme="isDark"
                            />
                        </SplitterPanel>

                    </Splitter>
                </SplitterPanel>
            </Splitter>

            <!-- ── Tab: Preview ─────────────────────────────────────────────── -->
            <JsonSchemaPreview
                v-if="activeTab === 'preview'"
                :schema="parsedSchema"
                :ui-schema="parsedUiSchema"
                :error-schema="parsedErrorSchema"
                class="flex-1 min-h-0"
                @submit="(data) => toast.add({ severity: 'info', summary: 'Submit', detail: JSON.stringify(data), life: 4000 })"
            />
        </template>

        <!-- ── Save dialog ───────────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="metaVisible"
            :header="isNew ? 'Name your form' : 'Edit form info'"
            modal :style="{ width: '400px' }" :draggable="false"
        >
            <div class="flex flex-col gap-4 py-2">
                <FormField label="Name" label-for="fname">
                    <InputText id="fname" v-model="metaName" class="w-full" placeholder="e.g. Customer Intake" />
                </FormField>
                <FormField label="Description" label-for="fdesc">
                    <Textarea id="fdesc" v-model="metaDesc" rows="2" class="w-full" placeholder="Optional" auto-resize />
                </FormField>
            </div>
            <template #footer>
                <Button label="Cancel" severity="secondary" text @click="metaVisible = false" />
                <Button label="Save" icon="pi pi-check" :disabled="!metaName.trim()" @click="save" />
            </template>
        </Dialog>

        <!-- ── Field Catalog ────────────────────────────────────────────────── -->
        <SchemaCatalogDrawer v-model:visible="catalogVisible" />
    </div>

    <!-- ── AI assistant — visible in both Schema and Preview tabs ─────────── -->
    <AiChatPanel context-type="form-designer" :context="aiContext" />
</template>

<style>
/* Splitter gutter — matches app border colors and shows a subtle active state */
.schema-splitter .p-splitter-gutter {
    background: var(--p-surface-200, #e5e7eb);
    transition: background 0.15s;
}
.dark .schema-splitter .p-splitter-gutter {
    background: var(--p-zinc-700, #3f3f46);
}
.schema-splitter .p-splitter-gutter:hover,
.schema-splitter .p-splitter-gutter-handle {
    background: #10b981; /* emerald-500 */
}
</style>
