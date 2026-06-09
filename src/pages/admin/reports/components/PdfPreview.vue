<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, shallowRef, toRaw } from 'vue';
import { useToast, Button, Textarea } from 'primevue';

const props = defineProps<{
    template: Record<string, any> | null;
}>();

const toast       = useToast();
const viewerRef   = ref<HTMLElement | null>(null);
const viewer      = shallowRef<any>(null);
const inputJson   = ref('{}');
const loadError   = ref<string | null>(null);
const rendering   = ref(false);

// ── Build inputs skeleton from template schemas ────────────────────────────
function buildEmptyInputs(tpl: Record<string, any>): Record<string, string> {
    const fields: Record<string, string> = {};
    const schemas: any[][] = tpl?.schemas ?? [];
    for (const page of schemas) {
        for (const schema of page) {
            if (schema?.name) fields[schema.name] = '';
        }
    }
    return fields;
}

// ── Shared plugins loader (same set as PdfDesigner) ────────────────────────
async function loadPlugins() {
    const schemas = await import('@pdfme/schemas') as any;
    const {
        text, image, table, line, rectangle, ellipse, barcodes,
        date, dateTime, time, checkbox, radioGroup, select,
        signature, svg, multiVariableText, list,
    } = schemas;
    return {
        Text: text, Image: image, Table: table, Line: line,
        Rectangle: rectangle, Ellipse: ellipse,
        Date: date, DateTime: dateTime, Time: time,
        Checkbox: checkbox, RadioGroup: radioGroup, Select: select,
        Signature: signature, SVG: svg,
        MultiVariableText: multiVariableText, List: list,
        ...(barcodes ?? {}),
    };
}

// ── Mount / re-mount viewer ────────────────────────────────────────────────
async function mountViewer(tpl: Record<string, any>) {
    if (!viewerRef.value) return;

    viewer.value?.destroy();
    viewer.value = null;
    loadError.value = null;

    try {
        const [{ Viewer }, plugins] = await Promise.all([
            import('@pdfme/ui'),
            loadPlugins(),
        ]);

        if (!viewerRef.value) return;

        // Parse current inputJson — fall back to empty skeleton
        let inputs: Record<string, string>[];
        try {
            const parsed = JSON.parse(inputJson.value);
            inputs = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            inputs = [buildEmptyInputs(tpl)];
        }

        viewer.value = new (Viewer as any)({
            domContainer: viewerRef.value,
            template:     toRaw(tpl),
            inputs,
            plugins,
        });
    } catch (err: any) {
        loadError.value = err?.message ?? 'Preview failed to load.';
    }
}

// ── Render with current data ───────────────────────────────────────────────
async function render() {
    if (!props.template) return;
    rendering.value = true;
    try {
        let parsed: any;
        try {
            parsed = JSON.parse(inputJson.value);
        } catch {
            toast.add({ severity: 'error', summary: 'Invalid JSON', detail: 'Fix the data JSON before rendering.', life: 4000 });
            return;
        }
        const inputs = Array.isArray(parsed) ? parsed : [parsed];
        if (viewer.value) {
            viewer.value.updateTemplate(toRaw(props.template));
            viewer.value.setInputs(inputs);
        } else {
            await mountViewer(props.template);
        }
    } finally {
        rendering.value = false;
    }
}

// ── Populate data skeleton from template fields ────────────────────────────
function populateSkeleton() {
    if (!props.template) return;
    inputJson.value = JSON.stringify(buildEmptyInputs(props.template), null, 2);
}

onMounted(() => {
    if (props.template) {
        populateSkeleton();
        mountViewer(props.template);
    }
});

onUnmounted(() => {
    viewer.value?.destroy();
    viewer.value = null;
});

watch(() => props.template, (tpl) => {
    if (tpl) {
        populateSkeleton();
        mountViewer(tpl);
    }
});
</script>

<template>
    <div class="flex h-full min-h-0">

        <!-- ── Left: data input panel ──────────────────────────────────────── -->
        <div class="flex flex-col gap-3 p-4 border-r border-surface-200 dark:border-surface-700 shrink-0"
            style="width: 300px;">
            <div class="flex items-center justify-between">
                <span class="text-sm font-semibold" style="color: var(--layout-title-color)">Input Data</span>
                <div class="flex flex-row gap-3">
                    <Button
                        size="small"
                        text
                        icon="pi pi-refresh"
                        v-tooltip.top="'Fill with empty field names from template'"
                        @click="populateSkeleton"
                    />
                    <Button
                        size="small"
                        label="Render"
                        icon="pi pi-eye"
                        :loading="rendering"
                        :disabled="!template"
                        @click="render"
                    />
                </div>
            </div>
            <p class="text-xs text-surface-400 -mt-1">
                JSON object mapping template field names to values. Use an array for multiple pages.
            </p>
            <Textarea
                v-model="inputJson"
                class="w-full flex-1 font-mono text-xs"
                style="min-height: 260px; resize: vertical;"
                placeholder='{ "fieldName": "value" }'
                auto-resize
            />
        </div>

        <!-- ── Right: viewer ───────────────────────────────────────────────── -->
        <div class="flex-1 min-w-0 min-h-0 overflow-auto relative bg-surface-100 dark:bg-zinc-900">
            <div
                v-if="loadError"
                class="absolute inset-0 flex items-center justify-center"
            >
                <p class="text-sm text-red-500 px-6 text-center">{{ loadError }}</p>
            </div>
            <div
                v-else-if="!template"
                class="absolute inset-0 flex items-center justify-center text-surface-400 text-sm"
            >
                Save the report first to preview it.
            </div>
            <div v-else ref="viewerRef" class="w-full h-full" />
        </div>

    </div>
</template>
