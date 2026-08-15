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
    watchCanvasIframe();

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

// ── Mirror the heading-margin reset in the live canvas preview ──────────────
// The canvas renders inside a same-origin sandboxed iframe
// (`sandbox="allow-scripts allow-same-origin"`) that the library rewrites
// wholesale (open/write/close) on every content change — each rewrite fires
// a fresh 'load' event and wipes any <style> we injected on the previous
// pass. So instead of a one-time injection, we attach a persistent 'load'
// listener on the iframe ELEMENT itself (which survives the rewrites, only
// its document is replaced) and re-inject a tiny reset stylesheet every
// time. This is preview-only cosmetics — it never touches document/content
// state, so it can't interfere with typing, cursor position, or undo
// history. The actual outgoing email gets its fix from
// resetHeadingMargins() above, baked in as an inline style since this
// <style> tag never leaves the app.
function watchCanvasIframe() {
    const rootEl = (editorRef.value as any)?.$el as HTMLElement | undefined;
    if (!rootEl) return;

    const RESET_ID = 'ebb-heading-margin-reset';
    const inject = (iframe: HTMLIFrameElement) => {
        try {
            const doc = iframe.contentDocument;
            if (!doc?.head) return;
            let style = doc.getElementById(RESET_ID) as HTMLStyleElement | null;
            if (!style) {
                style = doc.createElement('style');
                style.id = RESET_ID;
                doc.head.appendChild(style);
            }
            style.textContent = 'h1,h2,h3,h4,h5,h6{margin:0}';
        } catch {
            // cross-origin — nothing we can do from here
        }
    };

    const attached = new WeakSet<HTMLIFrameElement>();
    const attach = (iframe: HTMLIFrameElement) => {
        if (attached.has(iframe)) return;
        attached.add(iframe);
        iframe.addEventListener('load', () => inject(iframe));
        inject(iframe); // covers content already written before we attached
    };

    const existing = rootEl.querySelector<HTMLIFrameElement>('.ebb-canvas__iframe');
    if (existing) attach(existing);

    // Keep watching indefinitely: a device/dark-mode preview toggle could
    // swap in a new iframe node rather than reusing the current one.
    const observer = new MutationObserver(() => {
        const iframe = rootEl.querySelector<HTMLIFrameElement>('.ebb-canvas__iframe');
        if (iframe) attach(iframe);
    });
    observer.observe(rootEl, { childList: true, subtree: true });
}

// ── Bake heading margins inline for email-client compatibility ──────────────
// Outlook, Gmail's app, and Yahoo strip or ignore <style> blocks, so a CSS
// reset in <mj-head> only works in browser-based clients. The h1-h6 tags the
// rich-text editor produces carry no styling of their own (or, per heading
// instance, an inconsistent longhand like margin-top from the WYSIWYG
// toolbar), so clients fall back to oversized UA defaults. An inline style
// is the only override that survives everywhere, so we force `margin:0` as
// the LAST declaration on each heading tag — later wins in the cascade for
// declarations within the same style attribute, so this beats any margin /
// margin-top / margin-block-start the editor already emitted — via string
// replacement, not DOM re-serialization, to avoid corrupting the MSO
// conditional comments / VML markup MJML emits for Outlook.
function resetHeadingMargins(html: string): string {
    return html.replace(/<(h[1-6])((?:\s+[^>]*)?)>/gi, (match, tag, attrs) => {
        const styleMatch = attrs.match(/\sstyle\s*=\s*"([^"]*)"/i);
        if (!styleMatch) return `<${tag}${attrs} style="margin:0">`;
        const mergedStyle = `${styleMatch[1].replace(/;\s*$/, '')};margin:0`;
        return `<${tag}${attrs.replace(styleMatch[0], ` style="${mergedStyle}"`)}>`;
    });
}

// ── Public API exposed to parent ─────────────────────────────────────────────
function exportDesign(): EmailExport {
    const design = editorRef.value?.getDesignJson?.() ?? currentDesign.value ?? {};
    const html   = resetHeadingMargins(editorRef.value?.getHtml?.() ?? currentHtml.value ?? '');
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
