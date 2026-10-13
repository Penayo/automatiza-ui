<script setup lang="ts">
/**
 * The email as a recipient would get it: the compiled HTML run through Handlebars
 * with the same `{ variables }` context the engine's EmailsProcessor builds at send
 * time, so `{{variables.x}}`, `{{#each}}` and `{{#if}}` render from sample data.
 * Never saves or sends (email-templates spec §4a).
 */
import { computed, ref } from 'vue';
import { SelectButton, Splitter, SplitterPanel, Message } from 'primevue';
import Handlebars from 'handlebars';
import CodeEditor from '@components/CodeEditor.vue';
import { useTheme } from '@/composables/useTheme';

const props = defineProps<{ html: string }>();

/** Sample variables JSON, owned by the parent so it survives tab switches. */
const variablesJson = defineModel<string>('variables', { required: true });

const { isDark } = useTheme();

type ViewMode = 'desktop' | 'mobile';
const viewMode = ref<ViewMode>('desktop');
const viewOptions = [
    { value: 'desktop', icon: 'pi pi-desktop', label: 'Desktop' },
    { value: 'mobile',  icon: 'pi pi-mobile',  label: 'Mobile'  },
];
const frameWidth: Record<ViewMode, string> = { desktop: '100%', mobile: '390px' };

// Last valid value is kept while the JSON is mid-edit, so the preview doesn't blank out.
let lastVariables: Record<string, any> = {};
const parsed = computed<{ variables: Record<string, any>; error?: string }>(() => {
    try {
        const value = JSON.parse(variablesJson.value || '{}');
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return { variables: lastVariables, error: 'Sample variables must be a JSON object.' };
        }
        lastVariables = value;
        return { variables: value };
    } catch (e: any) {
        return { variables: lastVariables, error: `Invalid JSON: ${e?.message ?? e}` };
    }
});

const rendered = computed<{ html: string; error?: string }>(() => {
    try {
        const body = Handlebars.compile(props.html)({ variables: parsed.value.variables });
        // Links open in a new tab instead of navigating the preview frame.
        return { html: body.replace(/<head([^>]*)>/i, '<head$1><base target="_blank">') };
    } catch (e: any) {
        return { html: '', error: `Template error: ${e?.message ?? e}` };
    }
});
</script>

<template>
    <Splitter class="h-full border-0 rounded-none">
        <SplitterPanel :size="30" :min-size="20" class="flex flex-col min-h-0">
            <div class="px-3 py-2 text-xs font-semibold uppercase text-surface-500 border-b border-surface-200 dark:border-surface-700 shrink-0">
                Sample variables
            </div>
            <div class="flex-1 min-h-0">
                <CodeEditor v-model="variablesJson" lang="json" :dark="isDark" />
            </div>
            <Message v-if="parsed.error" severity="warn" size="small" class="m-2 shrink-0">{{ parsed.error }}</Message>
        </SplitterPanel>

        <SplitterPanel :size="70" :min-size="40" class="flex flex-col min-h-0">
            <div class="flex items-center justify-center px-3 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
                <SelectButton
                    v-model="viewMode"
                    :options="viewOptions"
                    option-value="value"
                    :allow-empty="false"
                    size="small"
                >
                    <template #option="{ option }">
                        <i :class="option.icon" v-tooltip.bottom="option.label" />
                    </template>
                </SelectButton>
            </div>
            <Message v-if="rendered.error" severity="error" size="small" class="m-2 shrink-0">{{ rendered.error }}</Message>
            <div class="flex-1 min-h-0 overflow-auto bg-surface-100 dark:bg-surface-900 flex justify-center">
                <iframe
                    v-if="!rendered.error"
                    :srcdoc="rendered.html"
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    title="Email preview"
                    class="h-full border-0 bg-white"
                    :style="{ width: frameWidth[viewMode] }"
                />
            </div>
        </SplitterPanel>
    </Splitter>
</template>
