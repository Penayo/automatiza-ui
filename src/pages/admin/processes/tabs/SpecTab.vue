<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { Button, InputText, Textarea, useToast } from 'primevue';
import { v4 as uuidv4 } from 'uuid';
import { $api } from '@services/api';
import type { ProcessSpec, ProcessSpecSections, SpecItem } from '@services/ProcessesService';
import UnsavedChangesDialog from '@components/UnsavedChangesDialog.vue';
import { useUnsavedGuard } from '@/composables/useUnsavedGuard';
import { processEditKey } from '../processEditContext';

const { process } = inject(processEditKey)!;

const toast = useToast();

type ListSection = 'description' | 'acceptanceCriteria' | 'actionsConditions' | 'tasksActivities';

const LIST_SECTIONS: { key: ListSection; label: string; hint: string }[] = [
    { key: 'description',        label: 'Description',        hint: 'What the process does, one point per line.' },
    { key: 'acceptanceCriteria', label: 'Acceptance Criteria', hint: 'How you know it works. One criterion per line.' },
    { key: 'actionsConditions',  label: 'Actions / Conditions', hint: 'Decisions, rules and branches the process has to honour.' },
    { key: 'tasksActivities',    label: 'Tasks / Activities',  hint: 'The steps, in the order they happen.' },
];

const empty = (): ProcessSpecSections => ({
    motivation: '',
    goalImpact: '',
    description: [],
    acceptanceCriteria: [],
    actionsConditions: [],
    tasksActivities: [],
});

const form    = ref<ProcessSpecSections>(empty());
const meta    = ref<ProcessSpec | null>(null);
const loading = ref(false);
const saving  = ref(false);

/** The last-saved snapshot, for the dirty check. */
const baseline = ref(JSON.stringify(empty()));
const isDirty  = computed(() => JSON.stringify(form.value) !== baseline.value);

function newItem(): SpecItem {
    // Not crypto.randomUUID: that is undefined outside a secure context (http on a LAN IP).
    return { id: uuidv4(), text: '' };
}

// ── Inline editing ────────────────────────────────────────────────────────────
// Lines read as text and turn into an input on click, so a written spec reads like
// a document rather than a form. One line is editable at a time.

const editingId = ref<string | null>(null);

function startEdit(item: SpecItem) {
    editingId.value = item.id;
}

/** Free-text sections share the one-editor-at-a-time state, keyed by field name. */
function startEditText(field: 'motivation' | 'goalImpact') {
    editingId.value = field;
}

/** The input lives inside a v-for, where a template ref would collect into an array. */
function focusOnMount(vnode: any) {
    (vnode.el as HTMLInputElement | undefined)?.focus();
}

/** Enter, Escape or a click elsewhere commits. A line left blank is dropped. */
function stopEdit(section: ListSection, index: number) {
    const item = form.value[section][index];
    if (item && !item.text.trim()) form.value[section].splice(index, 1);
    editingId.value = null;
}

function addItem(section: ListSection) {
    const item = newItem();
    form.value[section].push(item);
    startEdit(item);
}

function removeItem(section: ListSection, index: number) {
    if (form.value[section][index]?.id === editingId.value) editingId.value = null;
    form.value[section].splice(index, 1);
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function fetchSpec(definitionId: string) {
    loading.value = true;
    try {
        const spec = await $api.processes.getSpec(definitionId);
        meta.value = spec;
        form.value = {
            motivation:         spec.motivation,
            goalImpact:         spec.goalImpact,
            description:        [...spec.description],
            acceptanceCriteria: [...spec.acceptanceCriteria],
            actionsConditions:  [...spec.actionsConditions],
            tasksActivities:    [...spec.tasksActivities],
        };
        baseline.value = JSON.stringify(form.value);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load the spec', life: 4000 });
    } finally {
        loading.value = false;
    }
}

// The process is fetched by the parent, so wait for it rather than reading the route.
watch(() => process.value?.id, (id) => { if (id) fetchSpec(id); }, { immediate: true });

// ── Save ──────────────────────────────────────────────────────────────────────

async function save(): Promise<boolean> {
    const id = process.value?.id;
    if (!id) return false;

    saving.value = true;
    try {
        const spec = await $api.processes.saveSpec(id, form.value);
        meta.value = spec;
        // Blank lines are dropped server-side — take back what was actually stored.
        form.value = {
            motivation:         spec.motivation,
            goalImpact:         spec.goalImpact,
            description:        [...spec.description],
            acceptanceCriteria: [...spec.acceptanceCriteria],
            actionsConditions:  [...spec.actionsConditions],
            tasksActivities:    [...spec.tasksActivities],
        };
        baseline.value = JSON.stringify(form.value);
        toast.add({ severity: 'success', summary: 'Saved', detail: 'Spec saved.', life: 3000 });
        return true;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save the spec.', life: 4000 });
        return false;
    } finally {
        saving.value = false;
    }
}

const guard = useUnsavedGuard({
    isDirty: () => isDirty.value,
    // Saving the spec never changes the definition id, so there is nothing to retarget.
    save: async () => await save(),
});

const savedLabel = computed(() => {
    if (!meta.value?.updatedAt) return 'Not saved yet';
    const when = new Date(meta.value.updatedAt).toLocaleString();
    return meta.value.updatedBy ? `Saved ${when} by ${meta.value.updatedBy}` : `Saved ${when}`;
});
</script>

<template>
    <div class="px-6 py-6 max-w-3xl space-y-10">

        <div v-if="loading" class="space-y-3">
            <div class="h-4 w-40 rounded bg-surface-200 dark:bg-surface-700 animate-pulse" />
            <div class="h-24 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
        </div>

        <template v-else>
            <!-- ── Free-text sections ───────────────────────────────────── -->
            <div class="space-y-1.5">
                <h2 class="text-base font-semibold text-(--layout-accent-color) border-b-2 border-(--layout-accent-color) pb-1.5">
                    Motivation
                </h2>
                <p class="text-xs text-surface-400">Why this process exists — the problem it solves.</p>
                <Textarea
                    v-if="editingId === 'motivation'"
                    v-model="form.motivation"
                    rows="4"
                    class="w-full"
                    autoResize
                    @vue:mounted="focusOnMount"
                    @keyup.esc="editingId = null"
                    @blur="editingId = null"
                />
                <button
                    v-else
                    type="button"
                    class="w-full text-left text-sm whitespace-pre-wrap px-3 py-2 rounded-lg border border-transparent hover:border-surface-200 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                    v-tooltip.top="'Click to edit'"
                    @click="startEditText('motivation')"
                >
                    <span v-if="form.motivation">{{ form.motivation }}</span>
                    <span v-else class="text-surface-400 italic">Nothing yet.</span>
                </button>
            </div>

            <div class="space-y-1.5">
                <h2 class="text-base font-semibold text-(--layout-accent-color) border-b-2 border-(--layout-accent-color) pb-1.5">
                    Goal / Impact
                </h2>
                <p class="text-xs text-surface-400">What changes once it works.</p>
                <Textarea
                    v-if="editingId === 'goalImpact'"
                    v-model="form.goalImpact"
                    rows="4"
                    class="w-full"
                    autoResize
                    @vue:mounted="focusOnMount"
                    @keyup.esc="editingId = null"
                    @blur="editingId = null"
                />
                <button
                    v-else
                    type="button"
                    class="w-full text-left text-sm whitespace-pre-wrap px-3 py-2 rounded-lg border border-transparent hover:border-surface-200 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                    v-tooltip.top="'Click to edit'"
                    @click="startEditText('goalImpact')"
                >
                    <span v-if="form.goalImpact">{{ form.goalImpact }}</span>
                    <span v-else class="text-surface-400 italic">Nothing yet.</span>
                </button>
            </div>

            <!-- ── Item list sections ───────────────────────────────────── -->
            <div v-for="section in LIST_SECTIONS" :key="section.key" class="space-y-1.5">
                <h2 class="text-base font-semibold text-(--layout-accent-color) border-b-2 border-(--layout-accent-color) pb-1.5">
                    {{ section.label }}
                </h2>
                <p class="text-xs text-surface-400">{{ section.hint }}</p>

                <div class="space-y-2 mt-2">
                    <div
                        v-for="(item, i) in form[section.key]"
                        :key="item.id"
                        class="flex items-center gap-2 group"
                    >
                        <InputText
                            v-if="editingId === item.id"
                            v-model="item.text"
                            class="flex-1"
                            :placeholder="`${section.label} line`"
                            @vue:mounted="focusOnMount"
                            @keyup.enter="stopEdit(section.key, i)"
                            @keyup.esc="stopEdit(section.key, i)"
                            @blur="stopEdit(section.key, i)"
                        />
                        <button
                            v-else
                            type="button"
                            class="flex-1 text-left text-sm px-3 py-2 rounded-lg border border-transparent hover:border-surface-200 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                            v-tooltip.top="'Click to edit'"
                            @click="startEdit(item)"
                        >
                            {{ item.text }}
                        </button>
                        <Button
                            icon="pi pi-times"
                            severity="secondary"
                            text
                            rounded
                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                            v-tooltip.top="'Remove line'"
                            @click="removeItem(section.key, i)"
                        />
                    </div>

                    <p v-if="!form[section.key].length" class="text-xs text-surface-400 italic">
                        Nothing yet.
                    </p>

                    <Button
                        icon="pi pi-plus"
                        label="Add line"
                        size="small"
                        severity="secondary"
                        text
                        @click="addItem(section.key)"
                    />
                </div>
            </div>

            <!-- ── Save bar ─────────────────────────────────────────────── -->
            <div class="flex items-center gap-3 border-t border-surface-200 dark:border-surface-700 pt-4">
                <Button label="Save" icon="pi pi-save" :loading="saving" :disabled="!isDirty" @click="save" />
                <span class="text-xs text-surface-400">{{ savedLabel }}</span>
                <span v-if="isDirty" class="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
            </div>
        </template>
    </div>

    <UnsavedChangesDialog
        v-model:visible="guard.promptVisible.value"
        :saving="guard.saving.value"
        header="Unsaved spec changes"
        message="This spec has changes that were never saved. Leaving the Spec tab discards them."
        @cancel="guard.cancel"
        @discard="guard.discard"
        @save="guard.saveAndLeave"
        @hide="guard.onPromptHide"
    />
</template>
