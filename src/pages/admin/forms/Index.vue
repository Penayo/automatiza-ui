<script setup lang="ts">
import { onMounted, nextTick, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button, InputText, Textarea, Dialog, useToast } from 'primevue';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';
import FormField from '@components/form/FormField.vue';
import FormDesignerTab from './components/FormDesignerTab.vue';
import FormJsonTab     from './components/FormJsonTab.vue';
import FormPreviewTab  from './components/FormPreviewTab.vue';

const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const id    = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !id.value);

const form    = ref<IForm | null>(null);
const loading = ref(false);
const saving  = ref(false);

// ── Schema helpers ────────────────────────────────────────────────────────────
const EMPTY_SCHEMA = { type: 'default', components: [] };

function toFormJsSchema(f: IForm): object {
    return { id: f.id, type: f.type ?? 'default', schemaVersion: f.schemaVersion, components: f.components ?? [] };
}

const initialSchema = computed(() =>
    form.value ? toFormJsSchema(form.value) : EMPTY_SCHEMA,
);

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'designer' | 'json' | 'preview';
const activeTab       = ref<Tab>('designer');
const designerRef     = ref<InstanceType<typeof FormDesignerTab> | null>(null);
const schemaSnapshot  = ref<object>(EMPTY_SCHEMA);

// Called on every designer edit via commandStack.changed — keeps schemaSnapshot live.
function onDesignerSchemaChange(schema: any) {
    schemaSnapshot.value = schema;
}

function switchTab(tab: Tab) {
    // Also capture on tab switch as a safety net (e.g. if commandStack event missed).
    if (activeTab.value === 'designer') {
        const current = designerRef.value?.getSchema();
        if (current) schemaSnapshot.value = current;
    }
    activeTab.value = tab;
}

async function onJsonApply(schema: any) {
    // Switch to designer first so the container is visible (non-zero dimensions)
    // before calling importSchema — form-js needs a rendered container to import into.
    activeTab.value = 'designer';
    await nextTick();
    try {
        await designerRef.value?.importSchema(schema);
        schemaSnapshot.value = schema;
        toast.add({ severity: 'success', summary: 'Applied', detail: 'JSON applied to designer.', life: 2000 });
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Apply failed', detail: err?.message ?? 'Could not apply schema.', life: 4000 });
    }
}

// ── Save dialog ───────────────────────────────────────────────────────────────
const metaVisible = ref(false);
const metaName    = ref('');
const metaDesc    = ref('');

function openMeta() {
    metaName.value = form.value?.name ?? '';
    metaDesc.value = form.value?.description ?? '';
    metaVisible.value = true;
}

async function save() {
    if (!metaName.value.trim()) { openMeta(); return; }
    saving.value = true;
    try {
        const schema = (designerRef.value?.getSchema() ?? schemaSnapshot.value) as IForm;
        schema.name        = metaName.value.trim();
        schema.description = metaDesc.value.trim() || undefined;
        const saved = await $api.forms.save(schema) as IForm;
        form.value = saved;
        if (isNew.value) router.replace({ name: 'FormsEdit', params: { id: saved.id } });
        toast.add({ severity: 'success', summary: 'Saved', detail: `"${saved.name}" saved.`, life: 3000 });
        metaVisible.value = false;
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? 'Could not save.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

function handleSave() {
    if (!metaName.value) { openMeta(); } else { save(); }
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
    if (isNew.value) return;
    loading.value = true;
    try {
        form.value     = await $api.forms.findById(id.value!);
        metaName.value = form.value.name ?? '';
        metaDesc.value = form.value.description ?? '';
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load form.', life: 4000 });
        router.push({ name: 'FormsList' });
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    await load();
    await nextTick();
    schemaSnapshot.value = initialSchema.value;
});
</script>

<template>
    <div class="flex flex-col" style="height: 100vh">

        <!-- ── Toolbar ────────────────────────────────────────────────────── -->
        <div class="flex items-center gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-zinc-950 shrink-0">
            <Button
                icon="pi pi-arrow-left"
                text rounded size="small"
                v-tooltip.right="'Back to forms'"
                @click="router.push({ name: 'FormsList' })"
            />

            <div class="flex-1 min-w-0">
                <span v-if="loading" class="text-sm text-surface-400">Loading…</span>
                <div v-else class="flex items-center gap-2">
                    <span class="font-semibold truncate" style="color: var(--layout-title-color)">
                        {{ form?.name ?? 'New Form' }}
                    </span>
                    <span v-if="form?.version" class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500">
                        v{{ form.version }}
                    </span>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex items-center gap-1 bg-surface-100 dark:bg-zinc-800 rounded-lg p-1">
                <button
                    v-for="tab in ([
                        { key: 'designer', icon: 'pi-objects-column', label: 'Designer' },
                        { key: 'json',     icon: 'pi-code',           label: 'JSON'     },
                        { key: 'preview',  icon: 'pi-eye',            label: 'Preview'  },
                    ] as const)"
                    :key="tab.key"
                    @click="switchTab(tab.key)"
                    class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    :class="activeTab === tab.key
                        ? 'bg-white dark:bg-zinc-700 text-surface-900 dark:text-white shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
                >
                    <i :class="'pi ' + tab.icon" style="font-size: 0.75rem" />
                    {{ tab.label }}
                </button>
            </div>

            <Button icon="pi pi-pencil" size="small" text rounded v-tooltip.left="'Edit name'" @click="openMeta" />
            <Button label="Save" icon="pi pi-save" size="small" :loading="saving" @click="handleSave" />
        </div>

        <!-- ── Loading state ─────────────────────────────────────────────── -->
        <div v-if="loading" class="flex-1 flex items-center justify-center text-surface-400">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <!-- ── Tab content ───────────────────────────────────────────────── -->
        <template v-else>

            <!-- Designer: v-show keeps FormEditor DOM alive across tab switches -->
            <FormDesignerTab
                v-show="activeTab === 'designer'"
                ref="designerRef"
                :schema="initialSchema"
                class="flex-1 min-h-0"
                @schema-change="onDesignerSchemaChange"
            />

            <FormJsonTab
                v-if="activeTab === 'json'"
                :schema="schemaSnapshot"
                @apply="onJsonApply"
            />

            <FormPreviewTab
                v-if="activeTab === 'preview'"
                :schema="schemaSnapshot"
            />

        </template>

        <!-- ── Save dialog ───────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="metaVisible"
            :header="isNew ? 'Name your form' : 'Edit form info'"
            modal
            :style="{ width: '400px' }"
            :draggable="false"
        >
            <div class="flex flex-col gap-4 py-2">
                <FormField label="Name" label-for="fname">
                    <InputText id="fname" v-model="metaName" class="w-full" placeholder="e.g. Customer Intake" />
                </FormField>
                <FormField label="Description" label-for="fdesc">
                    <Textarea id="fdesc" v-model="metaDesc" rows="2" class="w-full" placeholder="Optional" auto-resize />
                </FormField>
            </div>
            <template #footer>
                <Button label="Cancel" severity="secondary" text @click="metaVisible = false" />
                <Button label="Save" icon="pi pi-check" :disabled="!metaName.trim()" @click="save" />
            </template>
        </Dialog>

    </div>
</template>
