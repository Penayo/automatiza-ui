<script setup lang="ts">
import '@/forms.scss';
import { Form } from '@bpmn-io/form-js';
import { DocumentListModule } from '@/form-fields/DocumentListField';
import { LinkModule } from '@/form-fields/LinkField';
import { Button, SelectButton, Tag } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { useTheme } from '@/composables/useTheme';
import { $api } from '@services/api';
import type { FormVariable } from '@services/FormVariablesService';
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ schema: object }>();

const { isDark } = useTheme();

// ── Viewport ──────────────────────────────────────────────────────────────────
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

// ── Variables ─────────────────────────────────────────────────────────────────
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

// ── Form viewer ───────────────────────────────────────────────────────────────
const previewRef  = ref<HTMLDivElement>();
let   formViewer: any = null;

function destroyViewer() {
    formViewer?.destroy();
    formViewer = null;
    formOutputJson.value = '{}';
}

async function mountViewer(taskData: object = {}) {
    if (!previewRef.value) return;
    destroyViewer();
    const merged = { ...resolvedFormVars.value, ...taskData };
    formViewer = new Form({ container: previewRef.value, additionalModules: [DocumentListModule, LinkModule] });
    await formViewer.importSchema(props.schema, merged);
    formViewer.on('changed', (event: { data: Record<string, any> }) => {
        formOutputJson.value = JSON.stringify(event.data, null, 2);
    });
}

async function applyVars() {
    try {
        const data = JSON.parse(taskVarsJson.value);
        varsJsonError.value = '';
        await mountViewer(data);
    } catch (err: any) {
        varsJsonError.value = err?.message ?? 'Invalid JSON';
    }
}

function reset() {
    taskVarsJson.value = '{\n  \n}';
    mountViewer();
}

watch(() => props.schema, () => mountViewer());

onMounted(async () => {
    try { allFormVars.value = await $api.formVariables.getAll(); } catch { /* non-fatal */ }
    referencedKeys.value = extractExpressionKeys(props.schema);
    setTimeout(() => mountViewer(), 50);
});

onUnmounted(destroyViewer);
</script>

<template>
    <div class="flex-1 min-h-0 flex overflow-hidden">

        <!-- Left: controls -->
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
            <div class="flex flex-col px-4 py-3 gap-2" style="flex: 1; min-height: 0;">
                <div class="flex items-center justify-between shrink-0">
                    <p class="text-xs font-semibold uppercase tracking-wide opacity-60">Task variables</p>
                    <div class="flex gap-1">
                        <Button label="Apply" size="small" @click="applyVars" />
                        <Button label="Reset" size="small" severity="secondary" @click="reset" />
                    </div>
                </div>
                <p v-if="varsJsonError" class="text-xs text-red-500 shrink-0">{{ varsJsonError }}</p>
                <JsonEditor
                    v-model:text="taskVarsJson"
                    mode="text"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    style="flex: 1; min-height: 180px;"
                    @update:text="taskVarsJson = $event"
                />

                <p class="text-xs font-semibold uppercase tracking-wide opacity-60 shrink-0">Form output</p>
                <JsonEditor
                    :model-value="{ text: formOutputJson }"
                    mode="text"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    :read-only="true"
                    style="flex: 1; min-height: 120px;"
                />
            </div>
        </div>

        <!-- Right: form canvas -->
        <div
            :class="isDark ? 'formjs-dark' : 'formjs-light'"
            class="flex-1 min-w-0 overflow-y-auto p-6 flex flex-col items-center bg-surface-50 dark:bg-zinc-900"
        >
            <div :style="{ width: '100%', maxWidth: canvasMaxWidth[viewMode], transition: 'max-width 0.25s ease' }">
                <div ref="previewRef" />
            </div>
        </div>

    </div>
</template>
