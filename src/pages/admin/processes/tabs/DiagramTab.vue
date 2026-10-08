<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { useRouter, type RouteLocationNormalized, type RouteLocationRaw } from 'vue-router';
import { useConfirm, useToast } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition, ProcessDefinitionVersion } from '@services/ProcessesService';
// Static import is fine: this whole tab is a lazily-loaded route component, so the
// bpmn-js/camunda-modeler stack stays out of the parent route's chunk either way.
import CamundaModeler from '@pages/admin/modeler/components/CamundaModeler.vue';
import UnsavedChangesDialog from '@components/UnsavedChangesDialog.vue';
import { useUnsavedGuard } from '@/composables/useUnsavedGuard';
import { processEditKey } from '../processEditContext';

const { process, setProcess } = inject(processEditKey)!;

const router = useRouter();
const toast  = useToast();
const confirm = useConfirm();

const modelerRef = ref<InstanceType<typeof CamundaModeler> | null>(null);

/**
 * Persists the current XML. The backend always creates a new ProcessDefinition
 * document (new id, incremented version), so the caller has to rebind the URL to
 * the returned id. Returns null when the save failed.
 */
async function persist(xml: string): Promise<ProcessDefinition | null> {
    if (!process.value || readOnly.value) return null;
    try {
        process.value.bpmnXml = xml;
        const saved = await $api.processes.saveProcess(process.value) as ProcessDefinition | null;

        if (saved?.id) setProcess(saved);
        modelerRef.value?.markSaved();
        toast.add({ severity: 'success', summary: 'Saved', detail: `Diagram saved — v${saved?.version ?? ''}.`, life: 3000 });
        return saved ?? process.value;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save diagram.', life: 3000 });
        return null;
    }
}

// ── Versions (docs/specs/design-versioning.spec.md §4) ────────────────────────
// Every version is its own definition id, so picking one navigates to that id; the
// page refetches on :id change. Anything older than the newest is read-only.
const versions = ref<ProcessDefinitionVersion[]>([]);
const versionOptions = computed(() => versions.value.map(v => ({ version: v.version, savedAt: v.createdAt })));
const readOnly = computed(() =>
    !!process.value && !!versions.value.length && (process.value.version ?? 1) < versions.value[0].version);

async function loadVersions(id: string | undefined) {
    // Already listed (we just navigated within the family): nothing new to fetch.
    if (!id || versions.value.some(v => v.id === id)) return;
    try {
        versions.value = await $api.processes.getVersions(id);
    } catch {
        versions.value = [];
    }
}
watch(() => process.value?.id, loadVersions, { immediate: true });

function selectVersion(version: number) {
    const target = versions.value.find(v => v.version === version);
    if (!target || target.id === process.value?.id) return;
    const go = () => router.push({ name: 'ProcessEditDiagram', params: { id: target.id } });
    // Same route, new :id — not a route leave, so the unsaved guard never sees it.
    if (modelerRef.value?.hasUnsavedChanges) {
        confirm.require({
            header: 'Discard unsaved changes?',
            message: 'Opening another version discards the diagram changes you have not saved.',
            acceptLabel: 'Discard',
            rejectLabel: 'Cancel',
            acceptProps: { severity: 'danger', size: 'small' },
            rejectProps: { severity: 'secondary', text: true, size: 'small' },
            accept: go,
        });
        return;
    }
    go();
}

/** The modeler's own Save button. */
async function saveDiagram(xml: string) {
    const saved = await persist(xml);
    // Replace URL so the page stays bound to the latest version's id — same tab.
    if (saved?.id) router.replace({ name: 'ProcessEditDiagram', params: { id: saved.id } });
}

// ── Unsaved-changes guard ────────────────────────────────────────────────────
// The modeler is unmounted as soon as another tab's route is entered, so edits
// that were never persisted are simply gone.

const guard = useUnsavedGuard({
    isDirty: () => !!modelerRef.value?.hasUnsavedChanges,
    save: async (to) => {
        if (!modelerRef.value) return true;
        const oldId = process.value?.id;
        const saved = await persist(await modelerRef.value.getSaveXml());
        // Save failed — the toast said so; keep the user on their diagram.
        if (!saved) return false;
        return saved.id ? retarget(to, oldId, saved.id) : true;
    },
});

/**
 * A save mints a new definition id, so a target route that was addressing the
 * definition we just superseded (another tab of this same page) has to be
 * retargeted — otherwise the user lands on the previous version.
 */
function retarget(to: RouteLocationNormalized, oldId: string | undefined, newId: string): boolean | RouteLocationRaw {
    if (!to.name || !oldId || oldId === newId || to.params.id !== oldId) return true;
    return { name: to.name, params: { ...to.params, id: newId }, query: to.query, hash: to.hash };
}
</script>

<template>
    <div class="h-full flex flex-col overflow-hidden">
        <CamundaModeler
            v-if="process"
            ref="modelerRef"
            :process="process"
            :versions="versionOptions"
            :read-only="readOnly"
            @save="saveDiagram"
            @select-version="selectVersion"
        />
    </div>

    <UnsavedChangesDialog
        v-model:visible="guard.promptVisible.value"
        :saving="guard.saving.value"
        header="Unsaved diagram changes"
        message="This diagram has changes that were never saved. Leaving the Diagram tab discards them."
        @cancel="guard.cancel"
        @discard="guard.discard"
        @save="guard.saveAndLeave"
        @hide="guard.onPromptHide"
    />
</template>
