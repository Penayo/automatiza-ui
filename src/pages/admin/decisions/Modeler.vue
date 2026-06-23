<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, Button } from 'primevue';
import { useTheme } from '@/composables/useTheme';
import { $api } from '@services/api';
import type { DecisionDefinition } from '@services/DecisionsService';
import DmnModeler from './components/DmnModeler.vue';
import CodeEditor from '@components/CodeEditor.vue';
import AiChatPanel from '@components/chat/AiChatPanel.vue';

const { isDark } = useTheme();
const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const id         = computed(() => route.params.id as string | undefined);
const isNew      = computed(() => !id.value);
const decision   = ref<DecisionDefinition | null>(null);
const loading    = ref(false);
const saving     = ref(false);
const deploying  = ref(false);
const modelerRef = ref<InstanceType<typeof DmnModeler> | null>(null);

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'designer' | 'xml' | 'preview';
const activeTab  = ref<Tab>('designer');
const xmlText    = ref('');
const xmlError   = ref('');
const currentXml = ref('');

async function switchTab(tab: Tab) {
    const xml = await modelerRef.value?.getXml() ?? decision.value?.dmnXml ?? '';
    currentXml.value = xml;
    if (tab === 'xml') {
        xmlText.value  = xml;
        xmlError.value = '';
    }
    if (tab === 'preview') {
        previewResult.value = null;
    }
    activeTab.value = tab;
}

// ── AI context ────────────────────────────────────────────────────────────────
const aiContext = computed(() => ({
    decisionId:  decision.value?.decisionId,
    name:        decision.value?.name,
    version:     decision.value?.version,
    deployedAt:  decision.value?.deployedAt,
    activeTab:   activeTab.value,
    dmnXml:      activeTab.value === 'xml' ? xmlText.value : currentXml.value,
}));

async function applyXmlToDesigner() {
    const domErr = xmlWellFormedError(xmlText.value);
    if (domErr) { xmlError.value = domErr; return; }

    try {
        await modelerRef.value?.importXml(xmlText.value);
        activeTab.value = 'designer';
        xmlError.value  = '';
        toast.add({ severity: 'success', summary: 'Applied', detail: 'XML applied to designer.', life: 2000 });
    } catch (err: any) {
        xmlError.value = err?.message ?? 'Invalid DMN XML';
    }
}

function xmlWellFormedError(text: string): string | null {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (!err) return null;
    const line = err.textContent?.match(/line (\d+)/i)?.[1];
    const col  = err.textContent?.match(/column (\d+)/i)?.[1];
    return `Malformed XML${line ? ` at line ${line}${col ? `, col ${col}` : ''}` : ''} — check all tags are properly closed and namespaces are declared.`;
}

// ── Preview ───────────────────────────────────────────────────────────────────
const previewVarsText = ref('{\n  \n}');
const previewResult   = ref<{ outputs: Record<string, any>; matchedRules: number[] } | null>(null);
const previewError    = ref('');
const evaluating      = ref(false);

async function evaluate() {
    if (!decision.value?.id) {
        previewError.value = 'Save the decision first before evaluating.';
        return;
    }
    previewError.value = '';
    let variables: Record<string, any> = {};
    try {
        variables = JSON.parse(previewVarsText.value);
    } catch (err: any) {
        previewError.value = 'Invalid JSON: ' + (err?.message ?? '');
        return;
    }
    evaluating.value = true;
    try {
        previewResult.value = await $api.decisions.evaluate(decision.value.id, variables);
    } catch (err: any) {
        previewError.value = err?.response?.data?.message ?? 'Evaluation failed.';
    } finally {
        evaluating.value = false;
    }
}

// ── Load ──────────────────────────────────────────────────────────────────────
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
        if (decision.value?.dmnXml) currentXml.value = decision.value.dmnXml;
    }
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
    if (!modelerRef.value) return;
    saving.value = true;
    try {
        await modelerRef.value.saveXml();
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
                text rounded size="small"
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
                    >Deployed</span>
                    <span
                        v-else
                        class="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    >Draft</span>
                </div>
                <span v-else class="text-sm text-surface-400">New Decision</span>
            </div>

            <!-- Tabs -->
            <div class="flex items-center gap-1 bg-surface-100 dark:bg-zinc-800 rounded-lg p-1">
                <button
                    v-for="tab in ([
                        { key: 'designer', icon: 'pi-objects-column', label: 'Designer' },
                        { key: 'xml',      icon: 'pi-code',           label: 'XML'      },
                        { key: 'preview',  icon: 'pi-play',           label: 'Preview'  },
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

            <!-- Save -->
            <Button
                label="Save new version"
                icon="pi pi-save"
                size="small"
                :loading="saving"
                @click="save"
            />

            <!-- Deploy -->
            <Button
                v-if="decision && !decision.deployedAt"
                label="Deploy"
                icon="pi pi-cloud-upload"
                size="small"
                :loading="deploying"
                @click="deploy"
            />
            <span
                v-if="decision?.deployedAt"
                class="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"
            >
                <i class="pi pi-check-circle" /> Active
            </span>
        </div>

        <!-- ── Content ────────────────────────────────────────────────────────── -->
        <div v-if="loading" class="flex-1 flex items-center justify-center text-surface-400">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <template v-else>

            <!-- Designer tab: v-show keeps dmn-js DOM alive -->
            <div v-show="activeTab === 'designer'" class="flex-1 min-h-0">
                <DmnModeler
                    ref="modelerRef"
                    :xml="decision?.dmnXml ?? null"
                    @save="onSave"
                />
            </div>

            <!-- XML tab -->
            <div v-if="activeTab === 'xml'" class="flex-1 min-h-0 flex flex-col">
                <div class="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
                    <p class="text-xs text-surface-400">
                        Raw DMN XML. Edit and click "Apply" to push changes back to the designer.
                    </p>
                    <div class="flex items-center gap-2">
                        <span v-if="xmlError" class="text-xs text-red-500">{{ xmlError }}</span>
                        <Button
                            label="Apply to designer"
                            icon="pi pi-arrow-left"
                            size="small"
                            @click="applyXmlToDesigner"
                        />
                    </div>
                </div>
                <div class="flex-1 min-h-0">
                    <CodeEditor
                        v-model="xmlText"
                        lang="xml"
                        :dark="isDark"
                        @update:modelValue="xmlError = ''"
                    />
                </div>
            </div>

            <!-- Preview tab -->
            <div v-if="activeTab === 'preview'" class="flex-1 min-h-0 flex overflow-hidden">

                <!-- Left: variables input -->
                <div class="flex flex-col border-r border-surface-200 dark:border-surface-700 shrink-0" style="width: 320px;">
                    <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-700 shrink-0">
                        <div class="flex items-center justify-between">
                            <span class="font-semibold" style="color: var(--layout-title-color)">Input Data</span>
                            <div class="flex flex-row gap-3">
                                <Button
                                    size="small"
                                    label="Evaluate"
                                    icon="pi pi-play"
                                    @click="evaluate"
                                />
                            </div>
                        </div>
                        <p class="text-xs text-surface-400 mt-1">
                            Enter the process variables as JSON to test this decision.
                        </p>
                        <p v-if="!decision?.id" class="text-xs text-amber-500 mt-1">Save the decision first to enable evaluation.</p>
                    </div>

                    <div class="flex-1 min-h-0 json-editor-fill">
                        <JsonEditor
                            v-model:text="previewVarsText"
                            mode="text"
                            :mainMenuBar="false"
                            :navigationBar="false"
                            :darkTheme="isDark"
                        />
                    </div>
                    <div class="px-4 py-3 border-t border-surface-200 dark:border-surface-700 shrink-0">
                        <p v-if="previewError" class="text-xs text-red-500 mb-2">{{ previewError }}</p>
                    </div>
                </div>

                <!-- Right: result -->
                <div class="flex-1 min-h-0 flex flex-col">
                    <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-700 shrink-0">
                        <p class="text-xs font-semibold uppercase tracking-wide opacity-60">Result</p>
                    </div>

                    <div v-if="!previewResult" class="flex-1 flex items-center justify-center text-surface-400 text-sm">
                        Enter variables and click Evaluate
                    </div>

                    <div v-else class="flex-1 min-h-0 flex flex-col gap-4 p-4 overflow-y-auto">
                        <!-- Outputs -->
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Outputs</p>
                            <div class="rounded border border-surface-200 dark:border-surface-700 overflow-hidden">
                                <table class="w-full text-sm">
                                    <tbody>
                                        <tr
                                            v-for="(val, key) in previewResult.outputs"
                                            :key="key"
                                            class="border-b border-surface-100 dark:border-surface-800 last:border-0"
                                        >
                                            <td class="px-3 py-2 font-mono text-xs font-medium text-surface-500 w-1/3">{{ key }}</td>
                                            <td class="px-3 py-2 font-mono text-xs">{{ JSON.stringify(val) }}</td>
                                        </tr>
                                        <tr v-if="Object.keys(previewResult.outputs).length === 0">
                                            <td colspan="2" class="px-3 py-2 text-xs text-surface-400 italic">No rows matched.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Matched rules -->
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Matched rules</p>
                            <div v-if="previewResult.matchedRules.length === 0" class="text-xs text-surface-400 italic">No rules matched.</div>
                            <div v-else class="flex gap-1 flex-wrap">
                                <span
                                    v-for="r in previewResult.matchedRules" :key="r"
                                    class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded"
                                >Rule {{ r }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </template>
    </div>

    <AiChatPanel context-type="dmn-designer" :context="aiContext" />
</template>

