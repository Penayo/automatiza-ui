<script setup lang="ts">
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@/forms.scss';
import { Form } from '@bpmn-io/form-js';
import { DocumentListModule } from '@/form-fields/DocumentListField';
import { $api } from '@services/api';
import type { FormVariable } from '@services/FormVariablesService';

import { ref, watch, onUnmounted, computed } from 'vue';
import { Dialog, Button, Textarea, Tag, SelectButton } from 'primevue';
import { useTheme } from '@/composables/useTheme';

const { isDark } = useTheme();

const props = defineProps<{
    visible: boolean;
    schema:  object | null;
}>();
const emit = defineEmits<{ (e: 'hide'): void }>();

// ── viewport mode ─────────────────────────────────────────────────────────────

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const viewMode = ref<ViewMode>('desktop');
const viewOptions = [
    { value: 'desktop', icon: 'pi pi-desktop',  label: 'Desktop' },
    { value: 'tablet',  icon: 'pi pi-tablet',   label: 'Tablet'  },
    { value: 'mobile',  icon: 'pi pi-mobile',   label: 'Mobile'  },
];
const canvasMaxWidth: Record<ViewMode, string> = {
    desktop: '100%',
    tablet:  '768px',
    mobile:  '390px',
};

// ── state ─────────────────────────────────────────────────────────────────────

const formRef        = ref<HTMLDivElement>();
const taskVarsJson   = ref('{\n  \n}');
const formOutputJson = ref('{}');
const jsonError      = ref('');

const allFormVars    = ref<FormVariable[]>([]);
const referencedKeys = ref<string[]>([]);
const resolvedFormVars = computed<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    for (const fv of allFormVars.value) {
        if (referencedKeys.value.includes(fv.key)) map[fv.key] = fv.items;
    }
    return map;
});

let formInstance: any = null;

// ── helpers ───────────────────────────────────────────────────────────────────

function tryParse(src: string): { ok: true; data: object } | { ok: false; err: string } {
    try   { return { ok: true,  data: JSON.parse(src) }; }
    catch (e: any) { return { ok: false, err: e.message }; }
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
    scan((schema as any)?.components ?? []);
    return [...keys];
}

function destroyForm() {
    formInstance?.destroy();
    formInstance = null;
    formOutputJson.value = '{}';
}

function mergedData(taskData: object): object {
    return { ...resolvedFormVars.value, ...taskData };
}

async function mountForm(taskData: object = {}) {
    if (!formRef.value || !props.schema) return;
    destroyForm();
    formInstance = new Form({
        container:         formRef.value,
        additionalModules: [DocumentListModule],
    });
    await formInstance.importSchema(props.schema, mergedData(taskData));
    formInstance.on('changed', (event: { data: Record<string, any> }) => {
        formOutputJson.value = JSON.stringify(event.data, null, 2);
    });
}

async function loadFormVars() {
    try {
        allFormVars.value    = await $api.formVariables.getAll();
        referencedKeys.value = props.schema ? extractExpressionKeys(props.schema) : [];
    } catch { /* non-fatal */ }
}

// ── actions ───────────────────────────────────────────────────────────────────

async function applyVars() {
    const result = tryParse(taskVarsJson.value);
    if (!result.ok) { jsonError.value = result.err; return; }
    jsonError.value = '';
    if (!formInstance || !props.schema) return;
    await formInstance.importSchema(props.schema, mergedData(result.data));
}

function resetForm() {
    taskVarsJson.value   = '{\n  \n}';
    formOutputJson.value = '{}';
    jsonError.value      = '';
    mountForm({});
}

// ── lifecycle ─────────────────────────────────────────────────────────────────

watch(() => props.visible, async (visible) => {
    if (!visible) { destroyForm(); return; }
    viewMode.value = 'desktop';
    await loadFormVars();
    setTimeout(() => mountForm({}), 50);
});

watch(() => props.schema, async () => {
    if (!props.visible) return;
    referencedKeys.value = props.schema ? extractExpressionKeys(props.schema) : [];
    mountForm({});
});

onUnmounted(destroyForm);
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        header="Form Preview"
        :style="{ width: '95vw', height: '92vh' }"
        :pt="{
            content: { style: 'padding:0; height:100%; display:flex; flex-direction:column; overflow:hidden;' },
            header:  { style: 'padding:0.75rem 1.25rem; flex-shrink:0;' },
        }"
        @update:visible="emit('hide')"
    >
        <!-- ── Viewport toolbar ──────────────────────────────────────────── -->
        <div style="
            display:flex; align-items:center; justify-content:flex-end;
            padding:0.4rem 1rem;
            border-bottom:1px solid var(--p-content-border-color,#e5e7eb);
            flex-shrink:0;
            gap:0.5rem;
        ">
            <span style="font-size:0.75rem; opacity:0.5; margin-right:0.25rem;">Viewport</span>
            <SelectButton
                v-model="viewMode"
                :options="viewOptions"
                option-value="value"
                option-label="label"
                :pt="{
                    pcButton: { root: { style: 'padding: 0.3rem 0.75rem; font-size:0.8rem;' } }
                }"
            >
                <template #option="{ option }">
                    <i :class="option.icon" style="margin-right:0.3rem;" />
                    {{ option.label }}
                </template>
            </SelectButton>
        </div>

        <!-- ── Main area ─────────────────────────────────────────────────── -->
        <div style="flex:1; display:flex; overflow:hidden;">

            <!-- Form canvas -->
            <div
                :class="isDark ? 'formjs-dark' : 'formjs-light'"
                style="flex:1; min-width:0; overflow-y:auto; padding:1.5rem; display:flex; flex-direction:column; align-items:center;"
            >
                <div
                    :style="{
                        width: '100%',
                        maxWidth: canvasMaxWidth[viewMode],
                        transition: 'max-width 0.25s ease',
                    }"
                >
                    <div ref="formRef" />
                </div>
            </div>

            <!-- Right sidebar -->
            <div style="
                width:340px; flex-shrink:0;
                display:flex; flex-direction:column;
                border-left:1px solid var(--p-content-border-color,#e5e7eb);
                overflow:hidden;
            ">

                <!-- Form variables (auto-resolved) -->
                <div style="padding:0.75rem; border-bottom:1px solid var(--p-content-border-color,#e5e7eb); flex-shrink:0;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.4rem;">
                        <span style="font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; opacity:.7;">Form variables</span>
                        <span style="font-size:0.75rem; opacity:.5;">auto-resolved</span>
                    </div>
                    <div v-if="referencedKeys.length === 0" style="font-size:0.8rem; opacity:.5; font-style:italic;">
                        No valuesExpression references in this schema.
                    </div>
                    <div v-else style="display:flex; flex-wrap:wrap; gap:0.35rem;">
                        <Tag
                            v-for="key in referencedKeys" :key="key"
                            :value="key"
                            :severity="resolvedFormVars[key] ? 'success' : 'warn'"
                            :title="resolvedFormVars[key] ? `${resolvedFormVars[key].length} items loaded` : 'Not found'"
                            style="font-size:0.75rem; cursor:default;"
                        />
                    </div>
                </div>

                <!-- Task variables -->
                <div style="padding:0.75rem; border-bottom:1px solid var(--p-content-border-color,#e5e7eb); flex-shrink:0;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.4rem;">
                        <span style="font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; opacity:.7;">Task variables</span>
                        <div style="display:flex; gap:0.3rem;">
                            <Button label="Apply" size="small" @click="applyVars" />
                            <Button label="Reset" size="small" severity="secondary" @click="resetForm" />
                        </div>
                    </div>
                    <small v-if="jsonError" style="color:var(--p-red-500,#ef4444); display:block; margin-bottom:0.3rem;">{{ jsonError }}</small>
                    <Textarea
                        v-model="taskVarsJson"
                        :rows="10"
                        style="width:100%; font-family:monospace; font-size:12px; resize:none;"
                        placeholder='{ "myVar": "value" }'
                    />
                </div>

                <!-- Form output -->
                <div style="flex:1; display:flex; flex-direction:column; padding:0.75rem; overflow:hidden;">
                    <span style="font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; opacity:.7; margin-bottom:0.4rem; flex-shrink:0;">Form output</span>
                    <pre style="
                        flex:1; margin:0; padding:0.5rem; font-size:12px; overflow:auto;
                        border-radius:4px;
                        background:var(--p-surface-100,#f3f4f6);
                        color:var(--p-surface-700,#374151);
                    ">{{ formOutputJson }}</pre>
                </div>

            </div>
        </div>
    </Dialog>
</template>
