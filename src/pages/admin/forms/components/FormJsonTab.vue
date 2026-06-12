<script setup lang="ts">
import JsonEditor from 'vue3-ts-jsoneditor';
import { Button } from 'primevue';
import { useTheme } from '@/composables/useTheme';
import { ref, watch } from 'vue';

const props = defineProps<{ schema: object }>();
const emit  = defineEmits<{ apply: [schema: any] }>();

const { isDark } = useTheme();

// jsonText is the source of truth for the current editor content.
// v-model:text keeps it in sync with the editor, and we also capture
// @update:text explicitly so we never miss an update.
const jsonText  = ref(JSON.stringify(props.schema, null, 2));
const jsonError = ref('');

watch(() => props.schema, (s) => {
    jsonText.value  = JSON.stringify(s, null, 2);
    jsonError.value = '';
});

function apply() {
    try {
        const schema = JSON.parse(jsonText.value);
        jsonError.value = '';
        emit('apply', schema);
    } catch (err: any) {
        jsonError.value = err?.message ?? 'Invalid JSON';
    }
}
</script>

<template>
    <div class="flex-1 min-h-0 flex flex-col">
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
                    @click="apply"
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
                @update:text="jsonText = $event"
            />
        </div>
    </div>
</template>

<style scoped>
.json-editor-fill :deep(.vue-ts-json-editor) {
    height: 100% !important;
}
</style>
