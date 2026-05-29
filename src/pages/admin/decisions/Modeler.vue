<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, Button } from 'primevue';
import { $api } from '@services/api';
import type { DecisionDefinition } from '@services/DecisionsService';
import DmnModeler from './components/DmnModeler.vue';

const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const id            = computed(() => route.params.id as string | undefined);
const isNew         = computed(() => !id.value);
const decision      = ref<DecisionDefinition | null>(null);
const loading       = ref(false);
const saving        = ref(false);
const deploying     = ref(false);
const modelerRef    = ref<InstanceType<typeof DmnModeler> | null>(null);

// ── Load existing ────────────────────────────────────────────────────────────

async function load() {
    if (isNew.value) return;
    loading.value = true;
    try {
        decision.value = await $api.decisions.findById(id.value!);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load decision.', life: 4000 });
        router.push({ name: 'DecisionsList' });
    } finally {
        loading.value = false;
    }
}

// ── Save (always new version) ─────────────────────────────────────────────────

async function save() {
    if (!modelerRef.value) return;
    saving.value = true;
    try {
        await modelerRef.value.saveXml();   // triggers @save → onSave()
    } finally {
        saving.value = false;
    }
}

async function onSave(xml: string) {
    saving.value = true;
    try {
        const saved = await $api.decisions.save({
            dmnXml:      xml,
            description: decision.value?.description,
        });
        decision.value = saved;
        toast.add({
            severity: 'success',
            summary:  'Saved',
            detail:   `"${saved.name}" saved as version ${saved.version}.`,
            life:     3000,
        });
        // Update URL if this was a new decision
        if (isNew.value) {
            router.replace({ name: 'DecisionEdit', params: { id: saved.id } });
        }
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save decision.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

// ── Deploy ────────────────────────────────────────────────────────────────────

async function deploy() {
    if (!decision.value) return;
    deploying.value = true;
    try {
        const deployed = await $api.decisions.deploy(decision.value.id);
        decision.value = deployed;
        toast.add({ severity: 'success', summary: 'Deployed', detail: `"${deployed.name}" is now active.`, life: 3000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not deploy decision.', life: 4000 });
    } finally {
        deploying.value = false;
    }
}

onMounted(load);
</script>

<template>
    <div class="flex flex-col" style="height: 100vh">

        <!-- ── Toolbar ──────────────────────────────────────────────────────── -->
        <div class="flex items-center gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-zinc-950 shrink-0">
            <Button
                icon="pi pi-arrow-left"
                text
                rounded
                size="small"
                v-tooltip.right="'Back to decisions'"
                @click="router.push({ name: 'DecisionsList' })"
            />

            <div class="flex-1 min-w-0">
                <span v-if="loading" class="text-sm text-surface-400">Loading…</span>
                <div v-else-if="decision" class="flex items-center gap-2">
                    <span class="font-semibold truncate" style="color: var(--layout-title-color)">
                        {{ decision.name }}
                    </span>
                    <span class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500">
                        v{{ decision.version }}
                    </span>
                    <span
                        v-if="decision.deployedAt"
                        class="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    >
                        Deployed
                    </span>
                    <span
                        v-else
                        class="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    >
                        Draft
                    </span>
                </div>
                <span v-else class="text-sm text-surface-400">New Decision</span>
            </div>

            <!-- Save -->
            <Button
                label="Save new version"
                icon="pi pi-save"
                size="small"
                severity="secondary"
                :loading="saving"
                @click="save"
            />

            <!-- Deploy (only when a saved decision exists and is not yet deployed) -->
            <Button
                v-if="decision && !decision.deployedAt"
                label="Deploy"
                icon="pi pi-cloud-upload"
                size="small"
                :loading="deploying"
                @click="deploy"
            />

            <!-- Re-deploy badge (already deployed) -->
            <span
                v-if="decision?.deployedAt"
                class="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"
            >
                <i class="pi pi-check-circle" /> Active
            </span>
        </div>

        <!-- ── Modeler canvas ────────────────────────────────────────────────── -->
        <div v-if="!loading" class="flex-1 min-h-0">
            <DmnModeler
                ref="modelerRef"
                :xml="decision?.dmnXml ?? null"
                @save="onSave"
            />
        </div>

        <!-- Loading skeleton -->
        <div v-else class="flex-1 flex items-center justify-center text-surface-400">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

    </div>
</template>
