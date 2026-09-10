<script setup lang="ts">
/**
 * Properties panel.
 *
 * Stays this small because each element's editable props are described *as a Vueform
 * schema* in the registry and rendered by a real <Vueform>. Adding an element type is a
 * data edit in src/formbuilder/registry, never a change here.
 *
 * The field name is deliberately NOT part of that schema: it is the schema key, so
 * editing it remounts the element and drops focus. It gets its own input, committed on
 * blur.
 */
import { computed, ref, watch, nextTick } from 'vue';
import { InputText, Message } from 'primevue';
import { clonePlain } from '@/formbuilder/clone';
import { getElementDef } from '@/formbuilder/registry';
import type { BuilderApi } from '@/formbuilder/useFormBuilder';

const props = defineProps<{ builder: BuilderApi }>();

const node = computed(() => props.builder.selectedNode.value);
const def = computed(() => (node.value ? getElementDef(node.value.type) : undefined));
const activeTabKey = ref<string>('general');

const activeTab = computed(() => {
    const tabs = def.value?.tabs ?? [];
    return tabs.find((t) => t.key === activeTabKey.value) ?? tabs[0];
});

/**
 * A tab whose schema is a function is built against the rest of the document — the
 * conditions editor needs the other fields' data paths to populate its picker.
 */
const activeSchema = computed(() => {
    const tab = activeTab.value;
    if (!tab) return null;
    return typeof tab.schema === 'function'
        ? tab.schema({ fieldPaths: props.builder.fieldPaths(node.value?.id) })
        : tab.schema;
});

// ── Name ──────────────────────────────────────────────────────────────────────
const nameDraft = ref('');
const nameError = ref<string | null>(null);

function commitName() {
    if (!node.value) return;
    if (nameDraft.value === node.value.name) {
        nameError.value = null;
        return;
    }
    nameError.value = props.builder.renameNode(node.value.id, nameDraft.value);
    if (nameError.value) nameDraft.value = node.value.name;
}

// ── Props form ────────────────────────────────────────────────────────────────
const propForm$ = ref<any>(null);
/** Guards the write-back while we are loading values into the form. */
const loading = ref(false);

async function loadIntoForm() {
    const current = node.value;
    const tab = activeTab.value;
    if (!current || !tab || !propForm$.value) return;

    loading.value = true;
    const data = tab.toForm ? tab.toForm(current.props) : current.props;
    propForm$.value.update?.(clonePlain(data));
    await nextTick();
    loading.value = false;
}

function onPropsChange() {
    const current = node.value;
    const tab = activeTab.value;
    if (loading.value || !current || !tab || !propForm$.value) return;

    const raw = propForm$.value.data ?? {};
    props.builder.patchProps(current.id, tab.fromForm ? tab.fromForm(raw, current.props) : raw);
}

// Reload only when the selection or the tab changes — reloading on every prop
// mutation would make the panel fight its own writes.
watch(
    () => [node.value?.id, activeTab.value?.key, propForm$.value] as const,
    ([id]) => {
        if (!id) return;
        nameDraft.value = node.value?.name ?? '';
        nameError.value = null;
        void loadIntoForm();
    },
    { immediate: true },
);

watch(
    () => node.value?.type,
    () => { activeTabKey.value = 'general'; },
);
</script>

<template>
    <div class="flex h-full flex-col overflow-y-auto border-l border-surface-200 dark:border-surface-700">
        <div v-if="!node" class="p-4 text-sm opacity-60">
            Select an element on the canvas to edit its properties.
        </div>

        <template v-else>
            <div class="border-b border-surface-200 px-3 py-2 dark:border-surface-700">
                <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-60">
                    <i :class="['pi', def?.icon ?? 'pi-question']" />
                    {{ def?.label ?? node.type }}
                </div>

                <label class="mb-1 block text-[11px] font-medium opacity-70">Field name</label>
                <InputText
                    v-model="nameDraft"
                    class="w-full"
                    size="small"
                    :invalid="!!nameError"
                    @blur="commitName"
                    @keyup.enter="commitName"
                />
                <Message v-if="nameError" severity="error" size="small" variant="simple" class="mt-1">
                    {{ nameError }}
                </Message>
                <p v-else class="mt-1 text-[11px] opacity-50">
                    Data path <code class="font-mono">{{ props.builder.pathOf(node.id) }}</code>
                </p>
            </div>

            <!-- Tabs appear from M2 onward; a single tab renders without chrome. -->
            <div
                v-if="(def?.tabs.length ?? 0) > 1"
                class="flex gap-1 border-b border-surface-200 px-2 py-1 dark:border-surface-700"
            >
                <button
                    v-for="tab in def?.tabs"
                    :key="tab.key"
                    type="button"
                    class="rounded px-2 py-1 text-xs"
                    :class="tab.key === activeTab?.key
                        ? 'bg-surface-200 font-medium dark:bg-surface-700'
                        : 'opacity-70 hover:bg-surface-100 dark:hover:bg-surface-800'"
                    @click="activeTabKey = tab.key"
                >
                    {{ tab.label }}
                </button>
            </div>

            <div class="p-3">
                <Vueform
                    v-if="activeTab && activeSchema"
                    :key="`${node.id}:${activeTab.key}`"
                    ref="propForm$"
                    :schema="activeSchema"
                    :endpoint="false"
                    :display-errors="false"
                    size="sm"
                    sync
                    @change="onPropsChange"
                />
            </div>
        </template>
    </div>
</template>
