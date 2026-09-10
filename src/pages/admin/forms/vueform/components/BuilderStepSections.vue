<script setup lang="ts">
/**
 * The canvas when the form is paginated.
 *
 * Steps are NOT a nesting level — Vueform partitions a flat schema by element name, so
 * `doc.nodes` stays one array and each section renders a contiguous slice of it. That
 * is why every section passes an `offset` down: a drop at local position 0 in step 2
 * is a drop at some global index in the root list.
 *
 * The trailing "Shown on every step" section is the unassigned bucket made visible. An
 * element in no step is active on every page (Vueform only ever deactivates elements a
 * step owns), so leaving that state nameless would make it look like a bug. It renders
 * last because that is exactly where Vueform's `orderedSchema` appends unlisted
 * elements — the canvas stays faithful to the rendered order.
 */
import { computed, ref } from 'vue';
import { Button, InputText, Dialog } from 'primevue';
import { conditionsTab } from '@/formbuilder/registry/common';
import type { BuilderApi } from '@/formbuilder/useFormBuilder';
import type { BuilderDndApi } from '@/formbuilder/useBuilderDnd';
import BuilderNodeList from './BuilderNodeList.vue';

const props = defineProps<{ builder: BuilderApi; dnd: BuilderDndApi }>();

/** Each section plus where its slice starts in the flat root list. */
const sections = computed(() => {
    let offset = 0;
    const out = props.builder.steps.value.map((step) => {
        const nodes = props.builder.nodesInStep(step.id);
        const section = { step, nodes, offset };
        offset += nodes.length;
        return section;
    });
    return { steps: out, unassignedOffset: offset };
});

const unassigned = computed(() => props.builder.nodesInStep(null));

// ── Header drag-reorder ───────────────────────────────────────────────────────
// Steps are reordered by dragging their headers. Deliberately separate from the node
// drag-and-drop: this moves an entry in doc.steps, and normalizeStepsInPlace then
// re-partitions the flat node list — no node splicing at all.
const draggingStepId = ref<string | null>(null);
const stepDropIndex = ref<number | null>(null);

function onStepDragStart(stepId: string, ev: DragEvent) {
    draggingStepId.value = stepId;
    if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move';
        // Firefox refuses to start a drag with no payload.
        ev.dataTransfer.setData('text/plain', stepId);
    }
}

function onStepDragOver(index: number, ev: DragEvent) {
    if (!draggingStepId.value) return;
    ev.preventDefault();
    stepDropIndex.value = index;
}

function onStepDrop() {
    if (draggingStepId.value !== null && stepDropIndex.value !== null) {
        props.builder.moveStepTo(draggingStepId.value, stepDropIndex.value);
    }
    endStepDrag();
}

function endStepDrag() {
    draggingStepId.value = null;
    stepDropIndex.value = null;
}

// ── Step settings (M3) ────────────────────────────────────────────────────────
const settingsStepId = ref<string | null>(null);
const settingsForm$ = ref<any>(null);

const settingsStep = computed(() =>
    props.builder.steps.value.find((s) => s.id === settingsStepId.value) ?? null,
);

/**
 * Built per open so the condition field picker lists the document's live data paths —
 * the same context-aware tab schema the element properties panel uses.
 */
const settingsSchema = computed(() => {
    const conditions = conditionsTab();
    const conditionSchema = typeof conditions.schema === 'function'
        ? conditions.schema({ fieldPaths: props.builder.fieldPaths() })
        : conditions.schema;

    return {
        label: { type: 'text', label: 'Page title' },
        ...conditionSchema,
        show_previous: { type: 'toggle', label: 'Show Previous', columns: 4 },
        show_next: { type: 'toggle', label: 'Show Next', columns: 4 },
        show_finish: { type: 'toggle', label: 'Show Finish', columns: 4 },
        label_previous: { type: 'text', label: 'Previous text', columns: 4 },
        label_next: { type: 'text', label: 'Next text', columns: 4 },
        label_finish: { type: 'text', label: 'Finish text', columns: 4 },
    };
});

function openSettings(stepId: string) {
    settingsStepId.value = stepId;
}

function loadSettings() {
    const step = settingsStep.value;
    if (!step || !settingsForm$.value) return;

    const conditions = conditionsTab();
    const projected = conditions.toForm ? conditions.toForm({ conditions: step.conditions ?? [] }) : {};

    settingsForm$.value.update?.(JSON.parse(JSON.stringify({
        label: step.label,
        conditions: projected.conditions ?? [],
        // A missing entry means "use the default", which is shown as on.
        show_previous: step.buttons?.previous !== false,
        show_next: step.buttons?.next !== false,
        show_finish: step.buttons?.finish !== false,
        label_previous: step.labels?.previous ?? '',
        label_next: step.labels?.next ?? '',
        label_finish: step.labels?.finish ?? '',
    })));
}

function saveSettings() {
    const step = settingsStep.value;
    if (!step || !settingsForm$.value) return;
    const data = settingsForm$.value.data ?? {};

    const conditions = conditionsTab();
    const built = conditions.fromForm
        ? conditions.fromForm(data, { conditions: step.conditions ?? [] })
        : { conditions: [] };

    // Only non-default entries are stored, so a plain step compiles to two keys.
    const buttons: Record<string, boolean> = {};
    if (data.show_previous === false) buttons.previous = false;
    if (data.show_next === false) buttons.next = false;
    if (data.show_finish === false) buttons.finish = false;

    const labels: Record<string, string> = {};
    for (const key of ['previous', 'next', 'finish'] as const) {
        const text = String(data[`label_${key}`] ?? '').trim();
        if (text) labels[key] = text;
    }

    props.builder.patchStep(step.id, {
        label: String(data.label ?? step.label).trim() || step.label,
        conditions: (built.conditions as unknown[]) ?? [],
        buttons,
        labels,
    });
    settingsStepId.value = null;
}

// ── Inline label editing ──────────────────────────────────────────────────────
const editingId = ref<string | null>(null);
const draft = ref('');

function startEdit(stepId: string, label: string) {
    editingId.value = stepId;
    draft.value = label;
}

function commitEdit() {
    if (editingId.value && draft.value.trim()) {
        props.builder.renameStep(editingId.value, draft.value.trim());
    }
    editingId.value = null;
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <section
            v-for="(section, i) in sections.steps"
            :key="section.step.id"
            class="rounded-lg border border-surface-200 dark:border-surface-700"
        >
            <header
                class="flex items-center gap-2 rounded-t-lg border-b border-surface-200 bg-surface-50 px-3 py-1.5 dark:border-surface-700 dark:bg-zinc-900"
                :class="[
                    draggingStepId === section.step.id ? 'opacity-40' : '',
                    stepDropIndex === i && draggingStepId && draggingStepId !== section.step.id
                        ? 'ring-2 ring-(--layout-accent-color)' : '',
                ]"
                @dragover="onStepDragOver(i, $event)"
                @drop.prevent="onStepDrop"
            >
                <i
                    class="pi pi-bars cursor-grab text-[11px] opacity-30 hover:opacity-70 active:cursor-grabbing"
                    draggable="true"
                    v-tooltip.bottom="'Drag to reorder this step'"
                    @dragstart="onStepDragStart(section.step.id, $event)"
                    @dragend="endStepDrag"
                />
                <span class="text-[11px] font-semibold uppercase tracking-wide opacity-50">
                    Step {{ i + 1 }}
                </span>

                <InputText
                    v-if="editingId === section.step.id"
                    v-model="draft"
                    size="small"
                    autofocus
                    class="h-6 py-0 text-xs"
                    @blur="commitEdit"
                    @keyup.enter="commitEdit"
                    @keyup.escape="editingId = null"
                />
                <button
                    v-else
                    type="button"
                    class="truncate text-sm font-medium hover:underline"
                    title="Rename this step"
                    @click="startEdit(section.step.id, section.step.label)"
                >
                    {{ section.step.label }}
                </button>

                <span
                    class="text-[11px]"
                    :class="section.nodes.length ? 'opacity-40' : 'text-amber-600 dark:text-amber-500'"
                >
                    <template v-if="section.nodes.length">
                        {{ section.nodes.length }} field{{ section.nodes.length === 1 ? '' : 's' }}
                    </template>
                    <template v-else>empty page</template>
                </span>

                <i
                    v-if="section.step.conditions?.length"
                    class="pi pi-filter text-[11px] text-(--layout-accent-color)"
                    v-tooltip.bottom="'This page is shown conditionally'"
                />

                <div class="ml-auto flex items-center gap-0.5">
                    <Button
                        icon="pi pi-chevron-up" text rounded size="small"
                        :disabled="i === 0"
                        v-tooltip.bottom="'Move step up'"
                        @click="props.builder.moveStep(section.step.id, -1)"
                    />
                    <Button
                        icon="pi pi-chevron-down" text rounded size="small"
                        :disabled="i === sections.steps.length - 1"
                        v-tooltip.bottom="'Move step down'"
                        @click="props.builder.moveStep(section.step.id, 1)"
                    />
                    <Button
                        icon="pi pi-cog" text rounded size="small"
                        v-tooltip.bottom="'Step settings — visibility and buttons'"
                        @click="openSettings(section.step.id)"
                    />
                    <Button
                        icon="pi pi-trash" text rounded size="small" severity="danger"
                        v-tooltip.bottom="'Delete step — its fields move to the neighbouring step'"
                        @click="props.builder.removeStep(section.step.id)"
                    />
                </div>
            </header>

            <div class="p-2">
                <BuilderNodeList
                    :nodes="section.nodes"
                    :parent-id="null"
                    :offset="section.offset"
                    :step-id="section.step.id"
                    :builder="props.builder"
                    :dnd="props.dnd"
                />

                <div
                    v-if="!section.nodes.length"
                    class="rounded border border-dashed border-surface-300 px-2 py-6 text-center text-[11px] opacity-50 dark:border-surface-600"
                    @dragover.stop="props.dnd.overSlot({ parentId: null, index: section.offset, stepId: section.step.id }, $event)"
                    @drop.stop="props.dnd.drop($event)"
                >
                    Drop fields here — this page is empty
                </div>
            </div>
        </section>

        <div class="flex justify-center">
            <Button label="Add step" icon="pi pi-plus" size="small" text @click="props.builder.addStep()" />
        </div>

        <!-- The unassigned bucket, named rather than hidden. -->
        <section
            class="rounded-lg border border-dashed"
            :class="unassigned.length
                ? 'border-amber-400 dark:border-amber-600'
                : 'border-surface-200 dark:border-surface-700'"
        >
            <header class="flex items-center gap-2 px-3 py-1.5">
                <i class="pi pi-eye text-[11px] opacity-40" />
                <span class="text-xs font-medium opacity-70">Shown on every step</span>
                <span v-if="unassigned.length" class="text-[11px] text-amber-600 dark:text-amber-500">
                    {{ unassigned.length }} field{{ unassigned.length === 1 ? '' : 's' }}
                </span>
                <span v-else class="text-[11px] opacity-40">empty</span>
            </header>

            <div class="px-2 pb-2">
                <BuilderNodeList
                    :nodes="unassigned"
                    :parent-id="null"
                    :offset="sections.unassignedOffset"
                    :step-id="null"
                    :builder="props.builder"
                    :dnd="props.dnd"
                />

                <div
                    v-if="!unassigned.length"
                    class="rounded px-2 py-3 text-center text-[11px] opacity-40"
                    @dragover.stop="props.dnd.overSlot({ parentId: null, index: sections.unassignedOffset, stepId: null }, $event)"
                    @drop.stop="props.dnd.drop($event)"
                >
                    Fields dropped here appear on every page and are always submitted
                </div>
            </div>
        </section>

        <Dialog
            :visible="!!settingsStepId"
            modal
            header="Step settings"
            :style="{ width: '32rem' }"
            :draggable="false"
            @update:visible="settingsStepId = null"
            @show="loadSettings"
        >
            <Vueform
                v-if="settingsStep"
                ref="settingsForm$"
                :key="settingsStep.id"
                :schema="settingsSchema"
                :endpoint="false"
                :display-errors="false"
                size="sm"
                sync
            />
            <p class="mt-3 text-[11px] opacity-60">
                A page with conditions is skipped entirely when they are not met — its
                fields are then neither shown nor submitted.
            </p>

            <template #footer>
                <Button label="Cancel" severity="secondary" text size="small" @click="settingsStepId = null" />
                <Button label="Apply" icon="pi pi-check" size="small" @click="saveSettings" />
            </template>
        </Dialog>
    </div>
</template>
