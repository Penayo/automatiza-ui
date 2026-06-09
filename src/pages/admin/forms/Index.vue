<script setup lang="ts">
import '@bpmn-io/form-js/dist/assets/form-js.css';
import '@bpmn-io/form-js/dist/assets/form-js-editor.css';
import '@/forms.scss';
import { FormEditor } from '@bpmn-io/form-js-editor';
import { Form } from '@bpmn-io/form-js';
import { DocumentListModule, DocumentListEditorModule } from '@/form-fields/DocumentListField';
import JsonEditor from 'vue3-ts-jsoneditor';

import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';
import { Button, InputText, Textarea, Dialog, SelectButton, Tag, useToast } from 'primevue';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';
import type { FormVariable } from '@services/FormVariablesService';
import FormField from '@components/form/FormField.vue';

const { isDark } = useTheme();
const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const id    = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !id.value);

const form    = ref<IForm | null>(null);
const loading = ref(false);
const saving  = ref(false);

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'designer' | 'json' | 'preview';
const activeTab = ref<Tab>('designer');
const jsonText  = ref('');
const jsonError = ref('');

// ── Editor ────────────────────────────────────────────────────────────────────
const editorRef = ref<HTMLDivElement>();
const editor    = ref<FormEditor | null>(null);

const EMPTY_SCHEMA = { type: 'default', components: [] };

function getSchema(): any {
    return editor.value?.getSchema?.() ?? form.value ?? EMPTY_SCHEMA;
}

function switchTab(tab: Tab) {
    if (tab === 'json') {
        jsonText.value = JSON.stringify(getSchema(), null, 2);
        jsonError.value = '';
    }
    if (tab === 'preview') {
        previewSchema.value = getSchema();
        mountPreview(previewSchema.value);
    }
    activeTab.value = tab;
}

function applyJsonToEditor() {
    try {
        const schema = JSON.parse(jsonText.value);
        editor.value?.importSchema(schema);
        activeTab.value = 'designer';
        jsonError.value = '';
        toast.add({ severity: 'success', summary: 'Applied', detail: 'JSON applied to designer.', life: 2000 });
    } catch (err: any) {
        jsonError.value = err?.message ?? 'Invalid JSON';
    }
}

// ── Preview ───────────────────────────────────────────────────────────────────
type ViewMode = 'desktop' | 'tablet' | 'mobile';
const viewMode = ref<ViewMode>('desktop');
const viewOptions = [
    { value: 'desktop', icon: 'pi pi-desktop',  label: 'Desktop' },
    { value: 'tablet',  icon: 'pi pi-tablet',   label: 'Tablet'  },
    { value: 'mobile',  icon: 'pi pi-mobile',   label: 'Mobile'  },
];
const canvasMaxWidth: Record<ViewMode, string> = {
    desktop: '100%', tablet: '768px', mobile: '390px',
};

const previewRef     = ref<HTMLDivElement>();
const previewSchema  = ref<any>(null);
const taskVarsJson   = ref('{\n  \n}');
const formOutputJson = ref('{}');
const varsJsonError  = ref('');
const allFormVars    = ref<FormVariable[]>([]);
const referencedKeys = ref<string[]>([]);

const resolvedFormVars = computed<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    for (const fv of allFormVars.value) {
        if (referencedKeys.value.includes(fv.key)) map[fv.key] = fv.items;
    }
    return map;
});

let previewInstance: any = null;

function destroyPreview() {
    previewInstance?.destroy();
    previewInstance = null;
    formOutputJson.value = '{}';
}

function extractExpressionKeys(schema: any): string[] {
    const keys = new Set<string>();
    const scan = (components: any[]) => {
        for (const c of components ?? []) {
            if (c.valuesExpression) {
                const m = String(c.valuesExpression).match(/^=\s*(\w+)/);
                if (m) keys.add(m[1]);
            }
            if (c.documentsExpression) {
                const m = String(c.documentsExpression).match(/^=?\s*(\w+)/);
                if (m) keys.add(m[1]);
            }
            if (c.components) scan(c.components);
        }
    };
    scan(schema?.components ?? []);
    return [...keys];
}

async function loadFormVars(schema: any) {
    try {
        allFormVars.value    = await $api.formVariables.getAll();
        referencedKeys.value = extractExpressionKeys(schema);
    } catch { /* non-fatal */ }
}

async function mountPreview(schema: any, taskData: object = {}) {
    if (!previewRef.value || !schema) return;
    destroyPreview();
    const merged = { ...resolvedFormVars.value, ...taskData };
    previewInstance = new Form({ container: previewRef.value, additionalModules: [DocumentListModule] });
    await previewInstance.importSchema(schema, merged);
    previewInstance.on('changed', (event: { data: Record<string, any> }) => {
        formOutputJson.value = JSON.stringify(event.data, null, 2);
    });
}

async function applyVars() {
    try {
        const data = JSON.parse(taskVarsJson.value);
        varsJsonError.value = '';
        await mountPreview(previewSchema.value, data);
    } catch (err: any) {
        varsJsonError.value = err?.message ?? 'Invalid JSON';
    }
}

// wait for previewRef to be in DOM when switching to preview
watch(activeTab, async (tab) => {
    if (tab === 'preview' && previewSchema.value && !previewInstance) {
        await loadFormVars(previewSchema.value);
        setTimeout(() => mountPreview(previewSchema.value), 50);
    }
});

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
    saving.value = true;
    try {
        const schema = getSchema() as IForm;
        schema.name        = metaName.value.trim();
        schema.description = metaDesc.value.trim() || undefined;
        const saved = await $api.forms.save(schema) as IForm;
        form.value = saved;
        if (isNew.value) router.replace({ name: 'FormsEdit', params: { id: saved.id } });
        toast.add({ severity: 'success', summary: 'Saved', detail: `"${saved.name}" saved.`, life: 3000 });
        metaVisible.value = false;
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? 'Could not save.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

function handleSave() {
    if (!metaName.value) { openMeta(); } else { save(); }
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
    if (isNew.value) return;
    loading.value = true;
    try {
        form.value = await $api.forms.findById(id.value!);
        metaName.value = form.value.name ?? '';
        metaDesc.value = form.value.description ?? '';
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load form.', life: 4000 });
        router.push({ name: 'FormsList' });
    } finally {
        loading.value = false;
    }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
    await load();

    if (!editorRef.value) return;
    const formEditor = new FormEditor({
        container: editorRef.value,
        additionalModules: [DocumentListModule, DocumentListEditorModule],
    });
    await formEditor.importSchema(form.value ?? EMPTY_SCHEMA);
    editor.value = formEditor;
});

onUnmounted(() => {
    editor.value?.destroy();
    destroyPreview();
});
</script>

<template>
    <div class="flex flex-col" style="height: 100vh">

        <!-- ── Toolbar ────────────────────────────────────────────────────── -->
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
                    <span class="font-semibold truncate" style="color: var(--layout-title-color)">
                        {{ form?.name ?? 'New Form' }}
                    </span>
                    <span v-if="form?.version" class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500">
                        v{{ form.version }}
                    </span>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex items-center gap-1 bg-surface-100 dark:bg-zinc-800 rounded-lg p-1">
                <button
                    v-for="tab in ([
                        { key: 'designer', icon: 'pi-objects-column', label: 'Designer' },
                        { key: 'json',     icon: 'pi-code',           label: 'JSON'     },
                        { key: 'preview',  icon: 'pi-eye',            label: 'Preview'  },
                    ] as const)"
                    :key="tab.key"
                    @click="switchTab(tab.key)"
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
            <Button label="Save" icon="pi pi-save" size="small" :loading="saving" @click="handleSave" />
        </div>

        <!-- ── Content ───────────────────────────────────────────────────── -->
        <div v-if="loading" class="flex-1 flex items-center justify-center text-surface-400">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <template v-else>

            <!-- Designer tab: v-show keeps editor mounted -->
            <div v-show="activeTab === 'designer'" class="flex-1 min-h-0">
                <div
                    ref="editorRef"
                    :class="isDark ? 'formjs-dark' : 'formjs-light'"
                    style="height: 100%;"
                />
            </div>

            <!-- JSON tab -->
            <div v-if="activeTab === 'json'" class="flex-1 min-h-0 flex flex-col">
                <div class="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
                    <p class="text-xs text-surface-400">
                        Raw form-js schema JSON. Edit and click "Apply" to update the designer.
                    </p>
                    <div class="flex items-center gap-2">
                        <span v-if="jsonError" class="text-xs text-red-500">{{ jsonError }}</span>
                        <Button
                            label="Apply to designer"
                            icon="pi pi-arrow-left"
                            size="small"
                            @click="applyJsonToEditor"
                        />
                    </div>
                </div>
                <div class="flex-1 min-h-0 json-editor-fill">
                    <JsonEditor
                        v-model:text="jsonText"
                        mode="text"
                        :mainMenuBar="false"
                        :navigationBar="false"
                        :darkTheme="isDark"
                        @change="jsonError = ''"
                    />
                </div>
            </div>

            <!-- Preview tab -->
            <div v-if="activeTab === 'preview'" class="flex-1 min-h-0 flex overflow-hidden">

                <!-- Left: inputs -->
                <div class="flex flex-col border-r border-surface-200 dark:border-surface-700 shrink-0 overflow-y-auto" style="width: 300px;">

                    <!-- Viewport selector -->
                    <div class="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
                        <span class="text-xs font-semibold uppercase tracking-wide opacity-60">Viewport</span>
                        <SelectButton
                            v-model="viewMode"
                            :options="viewOptions"
                            option-value="value"
                            :pt="{ pcButton: { root: { style: 'padding: 0.25rem 0.5rem; font-size:0.75rem;' } } }"
                        >
                            <template #option="{ option }">
                                <i :class="option.icon" />
                            </template>
                        </SelectButton>
                    </div>

                    <!-- Form variables -->
                    <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-700 shrink-0">
                        <p class="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Form variables</p>
                        <div v-if="referencedKeys.length === 0" class="text-xs opacity-50 italic">No expression references.</div>
                        <div v-else class="flex flex-wrap gap-1">
                            <Tag
                                v-for="key in referencedKeys" :key="key"
                                :value="key"
                                :severity="resolvedFormVars[key] ? 'success' : 'warn'"
                                style="font-size: 0.7rem;"
                            />
                        </div>
                    </div>

                    <!-- Task variables -->
                    <div class="flex flex-col gap-2 px-4 py-3 flex-1">
                        <div class="flex items-center justify-between">
                            <p class="text-xs font-semibold uppercase tracking-wide opacity-60">Task variables</p>
                            <div class="flex gap-1">
                                <Button label="Apply" size="small" @click="applyVars" />
                                <Button label="Reset" size="small" severity="secondary" @click="taskVarsJson = '{\n  \n}'; mountPreview(previewSchema)" />
                            </div>
                        </div>
                        <p v-if="varsJsonError" class="text-xs text-red-500">{{ varsJsonError }}</p>
                        <Textarea
                            v-model="taskVarsJson"
                            :rows="8"
                            class="w-full font-mono text-xs resize-none"
                            placeholder='{ "myVar": "value" }'
                        />

                        <!-- Output -->
                        <p class="text-xs font-semibold uppercase tracking-wide opacity-60 mt-2">Form output</p>
                        <pre class="text-xs p-2 rounded bg-surface-100 dark:bg-zinc-800 overflow-auto flex-1">{{ formOutputJson }}</pre>
                    </div>
                </div>

                <!-- Right: form canvas -->
                <div
                    :class="isDark ? 'formjs-dark' : 'formjs-light'"
                    class="flex-1 min-w-0 overflow-y-auto p-6 flex flex-col items-center bg-surface-50 dark:bg-zinc-900"
                >
                    <div
                        :style="{ width: '100%', maxWidth: canvasMaxWidth[viewMode], transition: 'max-width 0.25s ease' }"
                    >
                        <div ref="previewRef" />
                    </div>
                </div>
            </div>

        </template>

        <!-- ── Save dialog ───────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="metaVisible"
            :header="isNew ? 'Name your form' : 'Edit form info'"
            modal
            :style="{ width: '400px' }"
            :draggable="false"
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

    </div>
</template>

<style scoped>
.json-editor-fill :deep(.vue-ts-json-editor) {
    height: 100% !important;
}
</style>
