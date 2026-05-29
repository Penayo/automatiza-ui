<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { EmailEditor, createDefaultDocument } from '@lab2view/vue-email-editor';
import '@lab2view/vue-email-editor/style.css';
import { useTheme } from '@/composables/useTheme';

export interface EmailExport {
    design: Record<string, any>;
    html:   string;
}

const props = defineProps<{
    design?: Record<string, any> | null;
}>();

const { isDark } = useTheme();

// ── Theme definitions ────────────────────────────────────────────────────────
const LIGHT_THEME = {
    primaryColor:       '#3b82f6',  // blue-500
    primaryHover:       '#2563eb',  // blue-600
    primaryActive:      '#1d4ed8',  // blue-700
    backgroundColor:    '#ffffff',
    backgroundHover:    '#f4f4f5',  // zinc-100
    backgroundActive:   '#e4e4e7',  // zinc-200
    textPrimary:        '#18181b',  // zinc-900
    textSecondary:      '#3f3f46',  // zinc-700
    textMuted:          '#71717a',  // zinc-500
    borderColor:        '#e4e4e7',  // zinc-200
    borderColorHover:   '#d4d4d8',  // zinc-300
    canvasBg:           '#f4f4f5',  // zinc-100
    canvasBorder:       '#e4e4e7',  // zinc-200
    sidebarBg:          '#fafafa',  // zinc-50
    sidebarBorder:      '#e4e4e7',  // zinc-200
    panelHeaderBg:      '#f4f4f5',  // zinc-100
    toolbarBg:          '#ffffff',
    toolbarBorder:      '#e4e4e7',  // zinc-200
    selectionColor:     '#3b82f6',  // blue-500
    hoverColor:         '#f4f4f5',  // zinc-100
    dropIndicatorColor: '#3b82f6',  // blue-500
    borderRadius:       '6px',
};

const DARK_THEME = {
    primaryColor:       '#10b981',  // emerald-500  — matches sidebar active accent
    primaryHover:       '#059669',  // emerald-600
    primaryActive:      '#065f46',  // --layout-sidebar-active-bg
    backgroundColor:    '#27272a',  // --layout-header-bg
    backgroundHover:    '#3f3f46',  // --layout-header-border (one step lighter)
    backgroundActive:   '#3f3f46',  // --layout-sidebar-border
    textPrimary:        '#fafafa',  // --layout-header-text
    textSecondary:      '#d4d4d8',  // zinc-300
    textMuted:          '#a1a1aa',  // zinc-400
    borderColor:        '#3f3f46',  // --layout-header-border
    borderColorHover:   '#52525b',  // zinc-600
    canvasBg:           '#18181b',  // --layout-sidebar-bg (deepest)
    canvasBorder:       '#3f3f46',  // --layout-sidebar-border
    sidebarBg:          '#18181b',  // --layout-sidebar-bg
    sidebarBorder:      '#3f3f46',  // --layout-sidebar-border
    panelHeaderBg:      '#18181b',  // --layout-sidebar-bg
    toolbarBg:          '#27272a',  // --layout-header-bg
    toolbarBorder:      '#3f3f46',  // --layout-header-border
    selectionColor:     '#065f46',  // --layout-sidebar-active-bg
    hoverColor:         '#3f3f46',  // --layout-sidebar-border
    dropIndicatorColor: '#10b981',  // emerald-500
    borderRadius:       '6px',
};

const editorTheme = computed(() => isDark.value ? DARK_THEME : LIGHT_THEME);

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
        style="height: 100%; width: 100%;"
        @update:compiled-html="currentHtml = $event"
        @update:design-json="currentDesign = $event"
    />
</template>
