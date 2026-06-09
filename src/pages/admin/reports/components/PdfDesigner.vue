<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef, toRaw } from 'vue';

const props = defineProps<{
    template?: Record<string, any> | null;
}>();

const emit = defineEmits<{
    'save': [template: Record<string, any>];
}>();

const containerRef = ref<HTMLElement | null>(null);

// null  = no error
// { kind: 'missing' } = package not installed
// { kind: 'runtime', message } = pdfme threw after import
const loadError = ref<{ kind: 'missing' | 'runtime'; message: string } | null>(null);

// Use shallowRef so Vue doesn't deeply observe the designer instance
const designer = shallowRef<any>(null);

async function mountDesigner() {
    // Guard: container must be in the DOM before we start
    if (!containerRef.value) return;

    loadError.value = null;

    let Designer: any, BLANK_PDF: string, schemas: any;

    // ── 1. Resolve packages (can throw if not installed) ──────────────────────
    try {
        [{ Designer }, { BLANK_PDF }, schemas] = await Promise.all([
            import('@pdfme/ui'),
            import('@pdfme/common'),
            import('@pdfme/schemas'),
        ]);
    } catch (err: any) {
        loadError.value = {
            kind:    'missing',
            message: err?.message ?? 'Could not import @pdfme/ui.',
        };
        console.error('[PdfDesigner] package load failed', err);
        return;
    }

    // ── 2. Guard again — component may have unmounted while imports were loading
    //       (e.g. parent set loading=true → v-if removed this component)
    if (!containerRef.value) return;

    // ── 3. Instantiate Designer (can throw for bad template / domContainer) ───
    try {
        const {
            text, image, table, line, rectangle, ellipse, barcodes,
            date, dateTime, time, checkbox, radioGroup, select,
            signature, svg, multiVariableText, list,
        } = schemas as any;

        const PLUGINS: Record<string, any> = {
            Text:              text,
            Image:             image,
            Table:             table,
            Line:              line,
            Rectangle:         rectangle,
            Ellipse:           ellipse,
            Date:              date,
            DateTime:          dateTime,
            Time:              time,
            Checkbox:          checkbox,
            RadioGroup:        radioGroup,
            Select:            select,
            Signature:         signature,
            SVG:               svg,
            MultiVariableText: multiVariableText,
            List:              list,
            ...(barcodes ?? {}),
        };

        const baseTemplate = props.template ?? { basePdf: BLANK_PDF, schemas: [[]] };
        console.log({ baseTemplate })
        designer.value = new Designer({
            domContainer: containerRef.value,
            template:     toRaw(baseTemplate) as any,
            plugins:      PLUGINS,
        });
    } catch (err: any) {
        loadError.value = {
            kind:    'runtime',
            message: err?.message ?? 'Designer failed to initialise.',
        };
        console.error('[PdfDesigner]', err);
    }
}

onMounted(mountDesigner);

onUnmounted(() => {
    designer.value?.destroy();
    designer.value = null;
});

watch(() => props.template, async (tpl) => {
    if (!designer.value) return;
    const { BLANK_PDF } = await import('@pdfme/common');
    designer.value.updateTemplate(tpl ?? { basePdf: BLANK_PDF, schemas: [[]] });
});

/** Called by the parent Designer page Save button */
function getTemplate(): Record<string, any> | null {
    return designer.value?.getTemplate() ?? props.template ?? null;
}

function updateTemplate(tpl: Record<string, any>) {
    designer.value?.updateTemplate(tpl);
}

defineExpose({ getTemplate, updateTemplate });
</script>

<template>
    <div class="w-full h-[calc(100vh)] relative">
        <!-- ── Error: package not installed ───────────────────────────────── -->
        <div
            v-if="loadError?.kind === 'missing'"
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8"
        >
            <div class="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <i class="pi pi-exclamation-circle text-red-500 text-2xl" />
            </div>
            <p class="text-sm font-medium text-surface-700 dark:text-surface-200">PDF Designer unavailable</p>
            <p class="text-xs text-surface-400 max-w-sm">{{ loadError.message }}</p>
            <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-3 py-1.5 rounded font-mono">
                npm install @pdfme/ui @pdfme/schemas @pdfme/common
            </code>
        </div>

        <!-- ── Error: runtime / bad template ──────────────────────────────── -->
        <div
            v-else-if="loadError?.kind === 'runtime'"
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8"
        >
            <div class="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <i class="pi pi-exclamation-triangle text-amber-500 text-2xl" />
            </div>
            <p class="text-sm font-medium text-surface-700 dark:text-surface-200">Designer failed to load</p>
            <p class="text-xs text-surface-400 max-w-sm break-all">{{ loadError.message }}</p>
        </div>

        <!-- ── Designer canvas ─────────────────────────────────────────────── -->
        <div v-else ref="containerRef" class="w-full h-full" />
    </div>
</template>

<style>
/* pdfme left sidebar: when many plugins exceed the sidebar height the auto
   scrollbar was overlapping the 45px-wide icon buttons. Force only Y scroll. */
.pdfme-designer-left-sidebar {
    overflow-x: hidden !important;
    overflow-y: auto !important;
    width: 70px !important;
}
</style>
