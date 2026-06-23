<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, shallowRef } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { xml } from '@codemirror/lang-xml';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

type Lang = 'xml' | 'json';

const props = withDefaults(defineProps<{
    modelValue: string;
    lang?: Lang;
    dark?: boolean;
    readonly?: boolean;
}>(), {
    lang: 'xml',
    dark: false,
    readonly: false,
});

const emit = defineEmits<{ 'update:modelValue': [string] }>();

const containerRef = ref<HTMLElement | null>(null);
const view = shallowRef<EditorView | null>(null);
let ignoreNext = false;

function langExtension(l: Lang) {
    return l === 'json' ? json() : xml();
}

function buildState(content: string) {
    return EditorState.create({
        doc: content,
        extensions: [
            basicSetup,
            langExtension(props.lang),
            ...(props.dark ? [oneDark] : []),
            EditorView.editable.of(!props.readonly),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    ignoreNext = true;
                    emit('update:modelValue', update.state.doc.toString());
                }
            }),
            EditorView.theme({
                '&': { height: '100%', fontSize: '13px' },
                '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, monospace' },
            }),
        ],
    });
}

onMounted(() => {
    if (!containerRef.value) return;
    view.value = new EditorView({
        state: buildState(props.modelValue ?? ''),
        parent: containerRef.value,
    });
});

onUnmounted(() => {
    view.value?.destroy();
    view.value = null;
});

// Sync external modelValue changes into the editor
watch(() => props.modelValue, (val) => {
    if (ignoreNext) { ignoreNext = false; return; }
    const v = view.value;
    if (!v) return;
    const current = v.state.doc.toString();
    if (current === val) return;
    v.dispatch({ changes: { from: 0, to: current.length, insert: val ?? '' } });
});

// Rebuild when dark mode toggles (extensions can't be patched cheaply)
watch(() => props.dark, () => {
    const v = view.value;
    if (!v) return;
    v.setState(buildState(v.state.doc.toString()));
});
</script>

<template>
    <div ref="containerRef" class="code-editor-root" />
</template>

<style scoped>
.code-editor-root {
    height: 100%;
    overflow: hidden;
}
.code-editor-root :deep(.cm-editor) {
    height: 100%;
}
.code-editor-root :deep(.cm-editor.cm-focused) {
    outline: none;
}
</style>
