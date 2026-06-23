<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button, Dialog, InputText, InputNumber, Select, ToggleSwitch, Tag, useToast } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { useTheme } from '@/composables/useTheme';
import { $api } from '@services/api';
import type { IApiMock, CreateApiMockDto, ApiMockScenario } from '@services/ApiMocksService';

const props = defineProps<{ visible: boolean; mock: IApiMock | null }>();
const emit  = defineEmits<{ 'update:visible': [v: boolean]; saved: [] }>();

const toast      = useToast();
const { isDark } = useTheme();
const saving     = ref(false);
const isEdit     = ref(false);

// ── Constants ─────────────────────────────────────────────────────────────────

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', '*'];
const STATUS_CODES = [200, 201, 204, 301, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];

// ── Form state ────────────────────────────────────────────────────────────────

const form = ref<CreateApiMockDto>({
    name: '', method: 'GET', url: '',
    scenarios: [{ name: 'Default', status: 200, body: null }],
    activeScenarioIndex: 0,
    behavior: { delayMs: 0 },
    enabled: true, tags: [],
});

const tagsText = ref('');

// ── Scenario management ───────────────────────────────────────────────────────

const selectedScenarioIdx = ref(0); // which scenario is open in the editor

const selectedScenario = computed<ApiMockScenario | null>(
    () => form.value.scenarios[selectedScenarioIdx.value] ?? null,
);

// Per-scenario JSON text (we keep a map so editing scenario A doesn't lose scenario B's draft)
const scenarioBodies = ref<Record<number, string>>({});
const bodyParseError = ref('');

function getBodyText(idx: number): string {
    if (idx in scenarioBodies.value) return scenarioBodies.value[idx];
    const body = form.value.scenarios[idx]?.body;
    return body != null ? JSON.stringify(body, null, 2) : '{}';
}

function setBodyText(idx: number, text: string) {
    scenarioBodies.value[idx] = text;
    bodyParseError.value = '';
}

const currentBodyText = computed({
    get: () => getBodyText(selectedScenarioIdx.value),
    set: (v: string) => setBodyText(selectedScenarioIdx.value, v),
});

function addScenario() {
    const n = form.value.scenarios.length + 1;
    form.value.scenarios.push({ name: `Scenario ${n}`, status: 200, body: null });
    selectedScenarioIdx.value = form.value.scenarios.length - 1;
}

function removeScenario(idx: number) {
    if (form.value.scenarios.length <= 1) return;
    form.value.scenarios.splice(idx, 1);
    delete scenarioBodies.value[idx];
    // Rebuild body map keys after splice
    const newBodies: Record<number, string> = {};
    Object.entries(scenarioBodies.value).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < idx) newBodies[ki] = v;
        else if (ki > idx) newBodies[ki - 1] = v;
    });
    scenarioBodies.value = newBodies;
    if (form.value.activeScenarioIndex >= form.value.scenarios.length)
        form.value.activeScenarioIndex = form.value.scenarios.length - 1;
    selectedScenarioIdx.value = Math.min(selectedScenarioIdx.value, form.value.scenarios.length - 1);
}

function setActive(idx: number) {
    form.value.activeScenarioIndex = idx;
}

function selectScenario(idx: number) {
    selectedScenarioIdx.value = idx;
}

// ── Load / reset ──────────────────────────────────────────────────────────────

watch(() => props.mock, (mock) => {
    bodyParseError.value  = '';
    scenarioBodies.value  = {};
    selectedScenarioIdx.value = 0;

    if (mock) {
        isEdit.value = true;
        form.value = {
            name:                mock.name,
            method:              mock.method,
            url:                 mock.url,
            scenarios:           mock.scenarios.map(s => ({ ...s })),
            activeScenarioIndex: mock.activeScenarioIndex ?? 0,
            behavior:            { ...mock.behavior },
            enabled:             mock.enabled,
            tags:                [...mock.tags],
        };
    } else {
        isEdit.value = false;
        form.value = {
            name: '', method: 'GET', url: '',
            scenarios: [{ name: 'Default', status: 200, body: null }],
            activeScenarioIndex: 0,
            behavior: { delayMs: 0 },
            enabled: true, tags: [],
        };
    }
    tagsText.value = form.value.tags.join(', ');
}, { immediate: true });

// ── Save ──────────────────────────────────────────────────────────────────────

function flushBodies(): boolean {
    for (let i = 0; i < form.value.scenarios.length; i++) {
        const text = getBodyText(i);
        if (!text.trim()) { form.value.scenarios[i].body = null; continue; }
        try {
            form.value.scenarios[i].body = JSON.parse(text);
        } catch (e: any) {
            selectedScenarioIdx.value = i;
            bodyParseError.value = `Scenario "${form.value.scenarios[i].name}" — invalid JSON: ${e.message}`;
            return false;
        }
    }
    return true;
}

async function save() {
    bodyParseError.value = '';
    if (!flushBodies()) return;
    form.value.tags = tagsText.value.split(',').map(t => t.trim()).filter(Boolean);

    saving.value = true;
    try {
        if (isEdit.value && props.mock?._id) {
            await $api.apiMocks.update(props.mock._id, form.value);
            toast.add({ severity: 'success', summary: 'Mock updated', life: 3000 });
        } else {
            await $api.apiMocks.create(form.value);
            toast.add({ severity: 'success', summary: 'Mock created', life: 3000 });
        }
        emit('saved');
        emit('update:visible', false);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save mock.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusSeverity = (s: number): 'success' | 'info' | 'warn' | 'danger' | 'secondary' =>
    s >= 500 ? 'danger' : s >= 400 ? 'warn' : s >= 200 ? 'success' : 'secondary';
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        :header="isEdit ? 'Edit API Mock' : 'New API Mock'"
        :style="{ width: '780px', maxHeight: '90vh' }"
    >
        <div class="flex flex-col gap-4 pt-1 overflow-y-auto" style="max-height: calc(90vh - 140px)">

            <!-- Method + URL + Name ──────────────────────────────────────────── -->
            <div class="flex gap-2">
                <div class="flex flex-col gap-1 w-28 shrink-0">
                    <label class="text-xs text-zinc-400">Method</label>
                    <Select v-model="form.method" :options="HTTP_METHODS" />
                </div>
                <div class="flex flex-col gap-1 flex-1">
                    <label class="text-xs text-zinc-400">URL (exact or wildcard *)</label>
                    <InputText v-model="form.url" placeholder="https://api.example.com/charges/*" class="w-full" />
                </div>
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-400">Name / description</label>
                <InputText v-model="form.name" placeholder="Stripe charge" class="w-full" />
            </div>

            <!-- Scenarios ───────────────────────────────────────────────────── -->
            <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                <legend class="text-xs font-semibold text-zinc-400 px-1">Response Scenarios</legend>

                <!-- Scenario pills ──────────────────────────────────────────── -->
                <div class="flex flex-wrap gap-2 mb-3">
                    <button
                        v-for="(scenario, idx) in form.scenarios"
                        :key="idx"
                        class="flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-colors"
                        :class="selectedScenarioIdx === idx
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'border-surface-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:border-primary-400'"
                        @click="selectScenario(idx)"
                    >
                        <!-- Active indicator -->
                        <span
                            class="w-2 h-2 rounded-full shrink-0 transition-colors"
                            :class="form.activeScenarioIndex === idx ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'"
                            v-tooltip.top="form.activeScenarioIndex === idx ? 'Active — this response is served' : 'Click ✓ to make active'"
                        />
                        <Tag
                            :value="`${scenario.status}`"
                            :severity="statusSeverity(scenario.status)"
                            class="font-mono text-xs py-0! px-1!"
                        />
                        <span class="max-w-24 truncate">{{ scenario.name }}</span>
                        <!-- Remove button -->
                        <span
                            v-if="form.scenarios.length > 1"
                            class="ml-0.5 text-zinc-400 hover:text-red-500 leading-none"
                            @click.stop="removeScenario(idx)"
                        >×</span>
                    </button>

                    <Button label="+ Add" size="small" text severity="secondary" class="text-xs! py-1!" @click="addScenario" />
                </div>

                <!-- Selected scenario editor ─────────────────────────────────  -->
                <div v-if="selectedScenario" class="flex flex-col gap-3">
                    <div class="flex gap-2 items-end">
                        <div class="flex flex-col gap-1 flex-1">
                            <label class="text-xs text-zinc-400">Scenario name</label>
                            <InputText v-model="selectedScenario.name" placeholder="Success, Error 422, Timeout…" size="small" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-1 w-32">
                            <label class="text-xs text-zinc-400">Status</label>
                            <Select v-model="selectedScenario.status" :options="STATUS_CODES" size="small" />
                        </div>
                        <Tag :value="`${selectedScenario.status}`" :severity="statusSeverity(selectedScenario.status)" class="font-mono mb-1" />
                        <Button
                            :label="form.activeScenarioIndex === selectedScenarioIdx ? '✓ Active' : 'Set Active'"
                            :severity="form.activeScenarioIndex === selectedScenarioIdx ? 'success' : 'secondary'"
                            size="small"
                            class="mb-1 shrink-0"
                            @click="setActive(selectedScenarioIdx)"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-zinc-400">Response Body (JSON)</label>
                        <div style="height: 220px">
                            <JsonEditor
                                :key="selectedScenarioIdx"
                                :text="currentBodyText"
                                @update:text="currentBodyText = $event"
                                :dark-theme="isDark"
                                mode="text"
                                :main-menu-bar="false"
                                :navigation-bar="false"
                                style="height: 100%"
                            />
                        </div>
                        <span v-if="bodyParseError" class="text-xs text-red-500">{{ bodyParseError }}</span>
                    </div>
                </div>
            </fieldset>

            <!-- Delay ───────────────────────────────────────────────────────── -->
            <fieldset class="border border-surface-200 dark:border-zinc-700 rounded-lg px-3 pt-1 pb-3">
                <legend class="text-xs font-semibold text-zinc-400 px-1">Delay</legend>
                <div class="flex gap-4 flex-wrap">
                    <div class="flex gap-2 items-center">
                        <label class="text-xs text-zinc-400 w-20 shrink-0">Delay (ms)</label>
                        <InputNumber v-model="form.behavior.delayMs" :min="0" :max="120000" showButtons inputClass="text-sm w-24" />
                    </div>
                    <div class="flex gap-2 items-center">
                        <label class="text-xs text-zinc-400 w-20 shrink-0">Jitter ± (ms)</label>
                        <InputNumber v-model="form.behavior.delayJitterMs" :min="0" :max="30000" showButtons inputClass="text-sm w-24" />
                    </div>
                </div>
                <p v-if="form.behavior.delayMs > 0" class="text-xs text-zinc-400 mt-2">
                    Response arrives after {{ form.behavior.delayMs }}ms<span
                        v-if="(form.behavior.delayJitterMs ?? 0) > 0"> ± {{ form.behavior.delayJitterMs }}ms jitter</span>.
                    Use this to test timeout handling.
                </p>
            </fieldset>

            <!-- Tags + Enabled ───────────────────────────────────────────────── -->
            <div class="flex gap-4 items-center">
                <div class="flex flex-col gap-1 flex-1">
                    <label class="text-xs text-zinc-400">Tags (comma separated)</label>
                    <InputText v-model="tagsText" placeholder="stripe, payments" class="w-full" size="small" />
                </div>
                <div class="flex gap-2 items-center pt-4">
                    <label class="text-xs text-zinc-400">Enabled</label>
                    <ToggleSwitch v-model="form.enabled" />
                </div>
            </div>

        </div>

        <template #footer>
            <Button label="Cancel" severity="secondary" text @click="emit('update:visible', false)" />
            <Button label="Save" icon="pi pi-check" :loading="saving" @click="save" />
        </template>
    </Dialog>
</template>
