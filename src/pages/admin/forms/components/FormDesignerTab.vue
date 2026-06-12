<script setup lang="ts">
import '@bpmn-io/form-js/dist/assets/form-js.css';
import '@bpmn-io/form-js/dist/assets/form-js-editor.css';
import '@/forms.scss';
import { FormEditor } from '@bpmn-io/form-js-editor';
import { DocumentListModule, DocumentListEditorModule } from '@/form-fields/DocumentListField';
import { LinkModule, LinkEditorModule } from '@/form-fields/LinkField';
import { useTheme } from '@/composables/useTheme';
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{ schema: object }>();
const emit  = defineEmits<{ schemaChange: [schema: any] }>();

const { isDark } = useTheme();

const containerRef = ref<HTMLDivElement>();
const editor       = ref<FormEditor | null>(null);

function getSchema(): any {
    return editor.value?.getSchema?.() ?? props.schema;
}

async function importSchema(schema: any) {
    await editor.value?.importSchema(schema);
}

onMounted(async () => {
    if (!containerRef.value) return;
    const formEditor = new FormEditor({
        container: containerRef.value,
        additionalModules: [DocumentListModule, DocumentListEditorModule, LinkModule, LinkEditorModule],
    });
    await formEditor.importSchema(props.schema);
    editor.value = formEditor;

    // Emit schema after every user edit so the parent can keep schemaSnapshot current
    // without relying on a point-in-time capture.
    formEditor.on('commandStack.changed', () => {
        emit('schemaChange', formEditor.getSchema());
    });
});

onUnmounted(() => {
    editor.value?.destroy();
    editor.value = null;
});

defineExpose({ getSchema, importSchema });
</script>

<template>
    <div
        ref="containerRef"
        :class="isDark ? 'formjs-dark' : 'formjs-light'"
        style="height: 100%;"
    />
</template>
