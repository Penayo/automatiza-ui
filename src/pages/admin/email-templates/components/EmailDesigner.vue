<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { EmailEditor, createDefaultDocument } from '@lab2view/vue-email-editor';
import '@lab2view/vue-email-editor/style.css';

export interface EmailExport {
    design: Record<string, any>;
    html:   string;
}

const props = defineProps<{
    design?: Record<string, any> | null;
}>();

// ── Theme ────────────────────────────────────────────────────────────────────
// The library owns all surface colors: its base stylesheet hardcodes the light
// surfaces (e.g. `.ebb-toolbar{background:#fff}`) and its built-in
// `html[data-theme=dark] .ebb-*` rules provide a coherent dark palette. Dark
// mode is activated globally by useTheme() setting `data-theme="dark"` on
// <html>, so we must NOT re-skin surfaces here — a second palette on the ~16
// themeable CSS vars only fights the library's dark rules and produces the
// two-tone mismatch. We override just the brand accent (emerald), which the
// library applies via `var(--ee-primary)` in both light and dark.
const editorTheme = {
    primaryColor:  '#10b981',  // emerald-500  (--layout-accent-color)
    primaryHover:  '#059669',  // emerald-600
    primaryActive: '#065f46',  // emerald-800  (--layout-sidebar-active-bg, dark)
};

// ── Internal reactive state ──────────────────────────────────────────────────
const currentMjml   = ref<string>('');   // required v-model (MJML source)
const currentHtml   = ref<string>('');
const currentDesign = ref<Record<string, any> | null>(null);
const editorRef     = ref<any>(null);

// ── Normalise a stored document against fresh defaults ───────────────────────
// The library requires headAttributes.defaultStyles to always be a valid object
// containing at least an 'mj-all' key. Older saves may be missing this field,
// causing setDocument to crash. Merging with createDefaultDocument() ensures all
// required fields are present while preserving the saved body and custom styles.
function normalizeDocument(stored: Record<string, any>) {
    const defaults = createDefaultDocument();
    return {
        ...defaults,
        ...stored,
        headAttributes: {
            ...defaults.headAttributes,
            ...(stored.headAttributes ?? {}),
            defaultStyles: {
                ...defaults.headAttributes.defaultStyles,   // guarantees mj-all exists
                ...(stored.headAttributes?.defaultStyles ?? {}),
            },
            fonts: stored.headAttributes?.fonts ?? defaults.headAttributes.fonts ?? [],
        },
    };
}

// ── Load saved design via imperative API once the editor is ready ────────────
// Two paths guard against timing ambiguity:
//   A) on('editor:ready', …)  — fires if the editor initialises asynchronously
//      after our onMounted runs (common with async MJML loading).
//   B) nextTick fallback       — fires if the editor was already ready before
//      our handler was registered (event does not replay for late subscribers).
// The `loaded` flag ensures setDocument is called exactly once.
onMounted(async () => {
    if (!props.design?.document) return;
    const doc = normalizeDocument(props.design.document);
    let loaded = false;

    const loadDoc = () => {
        if (loaded) return;
        loaded = true;
        try {
            editorRef.value?.setDocument(doc);
        } catch (e) {
            console.warn('[EmailDesigner] Could not restore saved design:', e);
        }
    };

    // Path A: async ready — register before nextTick so we don't miss the event
    editorRef.value?.on('editor:ready', loadDoc);

    // Path B: editor was already ready when onMounted ran
    await nextTick();
    loadDoc();
});

// ── Public API exposed to parent ─────────────────────────────────────────────
function exportDesign(): EmailExport {
    const design = editorRef.value?.getDesignJson?.() ?? currentDesign.value ?? {};
    const html   = editorRef.value?.getHtml?.()       ?? currentHtml.value   ?? '';
    return { design, html };
}

defineExpose({ exportDesign });
</script>

<template>
    <EmailEditor
        ref="editorRef"
        v-model="currentMjml"
        :theme="editorTheme"
        class="email-designer-fill"
        style="height: 100%; width: 100%;"
        @update:compiled-html="currentHtml = $event"
        @update:design-json="currentDesign = $event"
    />
</template>

<style scoped>

</style>
