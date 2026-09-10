<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button, InputText, Textarea, Dialog, Message, Splitter, SplitterPanel, useConfirm, useToast } from 'primevue';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';
import FormField from '@components/form/FormField.vue';
import UnsavedChangesDialog from '@components/UnsavedChangesDialog.vue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { useUnsavedGuard } from '@/composables/useUnsavedGuard';
import { provideFormBuilder } from '@/formbuilder/useFormBuilder';
import { useBuilderDnd, type DragPayload } from '@/formbuilder/useBuilderDnd';
import { buildPayload, loadPayload } from '@/formbuilder/payload';
import { compileSteps } from '@/formbuilder/steps';
import { decompile } from '@/formbuilder/decompile';
import { emptyDoc } from '@/formbuilder/types';
import BuilderPalette from './components/BuilderPalette.vue';
import BuilderCanvas from './components/BuilderCanvas.vue';
import BuilderProperties from './components/BuilderProperties.vue';
import BuilderOutline from './components/BuilderOutline.vue';
import BuilderPreviewTab from './components/BuilderPreviewTab.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const id = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !id.value);

const form = ref<IForm | null>(null);
const loading = ref(false);
const saving = ref(false);
/** Set when a stored builder tree had to be rebuilt from its schema — see loadPayload(). */
const rebuiltNotice = ref(false);

const builder = provideFormBuilder(emptyDoc());

const dnd = useBuilderDnd({
    onDropNew: (itemId, target) => builder.addNode(itemId, target),
    onDropMove: (nodeId, target) => builder.moveNode(nodeId, target),
    canDrop: (payload: DragPayload, target) =>
        payload.kind === 'new' ? builder.canDrop('', target) : builder.canDrop(payload.id, target),
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'designer' | 'json' | 'preview';
const activeTab = ref<Tab>('designer');

// ── Steps ─────────────────────────────────────────────────────────────────────

/** Top-level fields in no step. They render on EVERY page — see BuilderStepSections. */
const unassigned = computed(() => (builder.hasSteps.value ? builder.nodesInStep(null) : []));

/**
 * Shown once after an import that left fields unassigned. Not permanent: the
 * always-visible bucket is a legitimate state, so a standing warning would nag.
 */
const coverageNotice = ref(false);

/**
 * The sharp case, and the reason this warns permanently rather than informing.
 *
 * A step's `invalid` only considers its own elements, so a required field in no step
 * leaves `steps$.invalid` false: Vueform's Finish sails past its "jump to the first
 * invalid step" branch while the form's own submit has already bailed. The button
 * appears to do nothing.
 */
const unassignedRequired = computed(() => unassigned.value.filter((node) => {
    const rules = node.props.rules;
    if (typeof rules === 'string') return rules.split('|').some((r) => r.trim() === 'required');
    return Array.isArray(rules) && rules.some((r) => (typeof r === 'string' ? r : r?.[0]) === 'required');
}));

/** A page with no fields renders as an empty screen the user must click past. */
const emptySteps = computed(() => (builder.hasSteps.value
    ? builder.steps.value.filter((step) => builder.nodesInStep(step.id).length === 0)
    : []));

function moveAllToFirstStep() {
    const first = builder.steps.value[0];
    if (first) builder.assignAllUnassigned(first.id);
    coverageNotice.value = false;
}

function toggleSteps() {
    if (!builder.hasSteps.value) {
        builder.enableSteps();
        return;
    }
    // Destructive: keeping orphaned step ids would silently reorder the canvas if
    // pagination were turned back on. Undo covers a misclick.
    confirm.require({
        header: 'Turn off steps?',
        message: 'The pages are removed and every field goes back into one list. This can be undone.',
        acceptLabel: 'Turn off',
        rejectLabel: 'Cancel',
        acceptProps: { severity: 'danger', size: 'small' },
        rejectProps: { severity: 'secondary', text: true, size: 'small' },
        accept: () => builder.disableSteps(),
    });
}

// ── JSON tab ──────────────────────────────────────────────────────────────────
const jsonText = ref('');
const jsonError = ref('');

/** Reload the editor from the tree whenever the JSON tab is opened. */
function openJsonTab() {
    jsonText.value = JSON.stringify(builder.schema.value, null, 2);
    jsonError.value = '';
    activeTab.value = 'json';
}

/**
 * Replace the tree from hand-edited JSON.
 *
 * decompile() is lossy by design — node ids are re-minted and builder-only metadata
 * is dropped — so this is one undoable step rather than a merge.
 */
function applyJson() {
    jsonError.value = '';
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText.value);
    } catch (err: any) {
        jsonError.value = err?.message ?? 'Invalid JSON.';
        return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        jsonError.value = 'A Vueform schema is an object keyed by field name.';
        return;
    }

    builder.replaceNodes(decompile(parsed as any, builder.doc.value.formProps).nodes);
    activeTab.value = 'designer';
    // The import carries membership across by name, so anything renamed or newly added
    // lands unassigned — worth surfacing once, with a one-click fix.
    coverageNotice.value = unassigned.value.length > 0;
    toast.add({ severity: 'success', summary: 'Applied', detail: 'Schema applied to the designer.', life: 2000 });
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
function onKeydown(ev: KeyboardEvent) {
    if (activeTab.value !== 'designer') return;

    // Never steal keys from a field the user is typing in — the properties panel and
    // the name input are ordinary inputs with their own undo stack.
    const el = ev.target as HTMLElement | null;
    if (el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '')) return;

    const mod = ev.metaKey || ev.ctrlKey;

    if (mod && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) builder.redo(); else builder.undo();
        return;
    }
    if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); builder.redo(); return; }

    if (!builder.selectedId.value) return;

    if (mod && ev.key.toLowerCase() === 'd') {
        ev.preventDefault();
        builder.duplicateNode(builder.selectedId.value);
        return;
    }
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
        ev.preventDefault();
        builder.removeNode(builder.selectedId.value);
    }
}

window.addEventListener('keydown', onKeydown);
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

// ── Save dialog ───────────────────────────────────────────────────────────────
const metaVisible = ref(false);
const metaName = ref('');
const metaDesc = ref('');
const metaCode = ref('');

function openMeta() {
    metaName.value = form.value?.name ?? '';
    metaDesc.value = form.value?.description ?? '';
    metaCode.value = form.value?.code ?? form.value?.id ?? '';
    metaVisible.value = true;
}

/** Client-minted, matching how the JSON Schema editor seeds new forms. */
function generateId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `vf_${Date.now().toString(36)}`;
}

async function save() {
    if (!metaName.value.trim() || !metaCode.value.trim()) { openMeta(); return; }
    saving.value = true;
    try {
        const payload: IForm = {
            ...(form.value ?? {}),
            id: form.value?.id ?? generateId(),
            code: metaCode.value.trim(),
            name: metaName.value.trim(),
            description: metaDesc.value.trim() || undefined,
            type: 'vueform',
            schemaVersion: 1,
            version: form.value?.version ?? 1,
            // The backend keeps `components` for form-js; vueform forms store an empty
            // array exactly as JSON Schema forms do.
            components: [],
            vueform: buildPayload(builder.doc.value),
        } as IForm;

        const saved = await $api.forms.save(payload) as IForm;
        form.value = saved;
        builder.dirty.value = false;
        if (isNew.value) router.replace({ name: 'VueformEdit', params: { id: saved.id } });
        toast.add({ severity: 'success', summary: 'Saved', detail: `"${saved.name}" saved.`, life: 3000 });
        metaVisible.value = false;
    } catch (err: any) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.response?.data?.message ?? 'Could not save.',
            life: 4000,
        });
    } finally {
        saving.value = false;
    }
}

function handleSave() {
    if (!metaName.value || !metaCode.value) openMeta();
    else void save();
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
    if (isNew.value) return;
    loading.value = true;
    try {
        const loaded = await $api.forms.findById(id.value!);
        form.value = loaded;
        metaName.value = loaded.name ?? '';
        metaDesc.value = loaded.description ?? '';
        metaCode.value = loaded.code ?? loaded.id ?? '';

        const { doc, rebuilt } = loadPayload(loaded.vueform);
        builder.reset(doc);
        rebuiltNotice.value = rebuilt;
        coverageNotice.value = rebuilt && unassigned.value.length > 0;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load form.', life: 4000 });
        router.push({ name: 'FormsList' });
    } finally {
        loading.value = false;
    }
}

// Holds in-app navigation while the tree has unsaved edits, and covers the
// re-auth gate and the browser's own beforeunload via the shared registry.
const guard = useUnsavedGuard({
    isDirty: () => builder.dirty.value,
    save: async () => {
        if (!metaName.value.trim() || !metaCode.value.trim()) {
            // Nowhere to save to yet — the form has never been named.
            openMeta();
            return false;
        }
        await save();
        // A failed save leaves the tree dirty; staying put is the safe reading.
        return !builder.dirty.value;
    },
});

onMounted(load);
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
                    <span v-if="builder.dirty.value" class="text-xs text-amber-600">unsaved</span>
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
                    @click="tab.key === 'json' ? openJsonTab() : (activeTab = tab.key)"
                    class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    :class="activeTab === tab.key
                        ? 'bg-white dark:bg-zinc-700 text-surface-900 dark:text-white shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
                >
                    <i :class="'pi ' + tab.icon" style="font-size: 0.75rem" />
                    {{ tab.label }}
                </button>
            </div>

            <Button
                :icon="builder.hasSteps.value ? 'pi pi-clone' : 'pi pi-window-maximize'"
                size="small" text rounded
                :class="builder.hasSteps.value ? 'text-(--layout-accent-color)' : ''"
                v-tooltip.bottom="builder.hasSteps.value
                    ? 'Steps on — the form is split into pages'
                    : 'Split this form into steps'"
                @click="toggleSteps"
            />

            <Button
                icon="pi pi-undo" size="small" text rounded
                :disabled="!builder.canUndo.value"
                v-tooltip.bottom="'Undo (Ctrl+Z)'"
                @click="builder.undo()"
            />
            <Button
                icon="pi pi-refresh" size="small" text rounded
                :disabled="!builder.canRedo.value"
                v-tooltip.bottom="'Redo (Ctrl+Shift+Z)'"
                @click="builder.redo()"
            />

            <Button icon="pi pi-pencil" size="small" text rounded v-tooltip.left="'Edit name'" @click="openMeta" />
            <Button label="Save" icon="pi pi-save" size="small" :loading="saving" @click="handleSave" />
        </div>

        <Message
            v-if="rebuiltNotice"
            severity="warn"
            closable
            class="mx-4 mt-2 shrink-0"
            @close="rebuiltNotice = false"
        >
            This form's schema was changed outside the builder, so the layout tree was rebuilt from it.
            Nesting is intact and builder-only notes were reset. If the form has steps, field order was
            aligned to the step each field belongs to.
        </Message>

        <Message
            v-if="coverageNotice"
            severity="warn"
            closable
            class="mx-4 mt-2 shrink-0"
            @close="coverageNotice = false"
        >
            <div class="flex flex-wrap items-center gap-2">
                <span>
                    {{ unassigned.length }} field{{ unassigned.length === 1 ? '' : 's' }}
                    {{ unassigned.length === 1 ? 'is' : 'are' }} in no step, so
                    {{ unassigned.length === 1 ? 'it appears' : 'they appear' }} on every page.
                </span>
                <Button label="Move all to step 1" size="small" @click="moveAllToFirstStep" />
            </div>
        </Message>

        <Message v-if="emptySteps.length" severity="secondary" class="mx-4 mt-2 shrink-0">
            <span class="text-xs">
                {{ emptySteps.map(s => s.label).join(', ') }}
                {{ emptySteps.length === 1 ? 'has' : 'have' }} no fields, so
                {{ emptySteps.length === 1 ? 'it renders' : 'they render' }} as an empty page.
            </span>
        </Message>

        <Message v-if="unassignedRequired.length" severity="error" class="mx-4 mt-2 shrink-0">
            <div class="flex flex-wrap items-center gap-2">
                <span>
                    <strong>{{ unassignedRequired.map(n => n.name).join(', ') }}</strong>
                    {{ unassignedRequired.length === 1 ? 'is' : 'are' }} required but in no step.
                    Finish will refuse to submit without showing which page to fix.
                </span>
                <Button label="Move to step 1" size="small" severity="danger" @click="moveAllToFirstStep" />
            </div>
        </Message>

        <!-- ── Loading state ─────────────────────────────────────────────── -->
        <div v-if="loading" class="flex-1 flex items-center justify-center text-surface-400">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <!-- ── Tab content ───────────────────────────────────────────────── -->
        <template v-else>
            <!-- Panel widths are drag-resizable and remembered per browser via stateKey. -->
            <Splitter
                v-show="activeTab === 'designer'"
                class="flex-1 min-h-0 app-splitter"
                :gutter-size="5"
                state-key="vueform-builder-designer"
                state-storage="local"
            >
                <SplitterPanel :size="16" :min-size="10" class="flex flex-col min-w-0">
                    <BuilderPalette
                        :builder="builder"
                        :dragging="!!dnd.dragging.value"
                        @dragstart="(itemId, ev) => dnd.startPaletteDrag(itemId, ev)"
                    />
                </SplitterPanel>

                <SplitterPanel :size="47" :min-size="25" class="flex flex-col min-w-0">
                    <BuilderCanvas :builder="builder" :dnd="dnd" />
                </SplitterPanel>

                <SplitterPanel :size="14" :min-size="8" class="flex flex-col min-w-0">
                    <BuilderOutline :builder="builder" />
                </SplitterPanel>

                <SplitterPanel :size="23" :min-size="15" class="flex flex-col min-w-0">
                    <BuilderProperties :builder="builder" />
                </SplitterPanel>
            </Splitter>

            <div v-if="activeTab === 'json'" class="flex flex-1 min-h-0 flex-col p-4">
                <div class="mb-2 flex items-center gap-2">
                    <p class="flex-1 text-xs opacity-60">
                        The compiled Vueform schema. Applying replaces the designer tree —
                        field order and nesting are kept, builder-only notes are reset.
                    </p>
                    <Button label="Apply to designer" size="small" icon="pi pi-check" @click="applyJson" />
                </div>
                <Message v-if="jsonError" severity="error" size="small" class="mb-2">{{ jsonError }}</Message>
                <JsonEditor
                    v-model:text="jsonText"
                    mode="text"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    style="flex: 1; min-height: 0;"
                    @update:text="jsonText = $event"
                />
            </div>

            <BuilderPreviewTab
                v-if="activeTab === 'preview'"
                :schema="builder.schema.value"
                :steps="compileSteps(builder.doc.value)"
                class="flex-1 min-h-0"
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
                <FormField label="Code" label-for="fcode">
                    <InputText id="fcode" v-model="metaCode" class="w-full" placeholder="e.g. customer-intake" />
                    <small class="text-surface-400">Used to reference this form from the BPMN modeler.</small>
                </FormField>
                <FormField label="Description" label-for="fdesc">
                    <Textarea id="fdesc" v-model="metaDesc" rows="2" class="w-full" placeholder="Optional" auto-resize />
                </FormField>
            </div>
            <template #footer>
                <Button label="Cancel" severity="secondary" text @click="metaVisible = false" />
                <Button label="Save" icon="pi pi-check" :disabled="!metaName.trim() || !metaCode.trim()" @click="save" />
            </template>
        </Dialog>

        <UnsavedChangesDialog
            v-model:visible="guard.promptVisible.value"
            :saving="guard.saving.value"
            header="Unsaved form changes"
            message="This form has changes that were never saved. Leaving the builder discards them."
            @cancel="guard.cancel"
            @discard="guard.discard"
            @save="guard.saveAndLeave"
            @hide="guard.onPromptHide"
        />

    </div>
</template>
