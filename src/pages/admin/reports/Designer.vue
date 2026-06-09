<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, Button, InputText, Textarea, Dialog } from 'primevue';
import { $api } from '@services/api';
import type { ReportDefinition } from '@services/ReportsService';
import PdfDesigner from './components/PdfDesigner.vue';
import PdfPreview  from './components/PdfPreview.vue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { useTheme } from '@/composables/useTheme';

const { isDark } = useTheme();
const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const id    = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !id.value);

const report      = ref<ReportDefinition | null>(null);
const loading     = ref(false);
const saving      = ref(false);
const designerRef = ref<InstanceType<typeof PdfDesigner> | null>(null);

// ── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'designer' | 'json' | 'preview';
const activeTab  = ref<Tab>('designer');
const jsonText   = ref('');
const jsonError  = ref('');
const previewTpl = ref<Record<string, any> | null>(null);

function captureTemplate(): Record<string, any> {
    return designerRef.value?.getTemplate() ?? report.value?.template ?? {};
}

function switchTab(tab: Tab) {
    if (tab === 'json') {
        jsonText.value  = JSON.stringify(captureTemplate(), null, 2);
        jsonError.value = '';
    }
    if (tab === 'preview') {
        previewTpl.value = captureTemplate();
    }
    activeTab.value = tab;
}

function applyJsonToDesigner() {
    try {
        const tpl = JSON.parse(jsonText.value);
        designerRef.value?.updateTemplate(tpl);
        activeTab.value = 'designer';
        jsonError.value = '';
        toast.add({ severity: 'success', summary: 'Applied', detail: 'JSON applied to designer.', life: 2000 });
    } catch (err: any) {
        jsonError.value = err?.message ?? 'Invalid JSON';
    }
}

// ── Meta dialog ──────────────────────────────────────────────────────────────
const metaVisible = ref(false);
const metaKey     = ref('');
const metaName    = ref('');
const metaDesc    = ref('');

function openMeta() {
    metaKey.value   = report.value?.key         ?? '';
    metaName.value  = report.value?.name        ?? '';
    metaDesc.value  = report.value?.description ?? '';
    metaVisible.value = true;
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
    if (isNew.value) return;
    loading.value = true;
    try {
        report.value = await $api.reports.findById(id.value!);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load report.', life: 4000 });
        router.push({ name: 'ReportsList' });
    } finally {
        loading.value = false;
    }
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
    if (!metaName.value.trim() || !metaKey.value.trim()) { openMeta(); return; }

    saving.value = true;
    try {
        const template = captureTemplate();
        const dto = {
            key:         metaKey.value.trim(),
            name:        metaName.value.trim(),
            description: metaDesc.value.trim() || undefined,
            template,
        };

        if (isNew.value) {
            const saved = await $api.reports.create(dto);
            report.value = saved;
            router.replace({ name: 'ReportEdit', params: { id: saved.id } });
            toast.add({ severity: 'success', summary: 'Saved', detail: `"${saved.name}" created.`, life: 3000 });
        } else {
            const updated = await $api.reports.update(id.value!, dto);
            report.value = (updated as any)?.data ?? updated;
            toast.add({ severity: 'success', summary: 'Saved', detail: `"${dto.name}" updated.`, life: 3000 });
        }

        metaVisible.value = false;
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? 'Could not save.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

function handleSave() {
    if (isNew.value && !metaName.value) { openMeta(); } else { save(); }
}

onMounted(load);
</script>

<template>
    <div class="flex flex-col h-[calc(100vh-50px)]">

        <!-- ── Toolbar ─────────────────────────────────────────────────────── -->
        <div class="flex items-center gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-zinc-950 shrink-0">
            <Button
                icon="pi pi-arrow-left"
                text rounded size="small"
                v-tooltip.right="'Back to reports'"
                @click="router.push({ name: 'ReportsList' })"
            />

            <div class="flex-1 min-w-0">
                <span v-if="loading" class="text-sm text-surface-400">Loading…</span>
                <div v-else class="flex items-center gap-2">
                    <span class="font-semibold truncate" style="color: var(--layout-title-color)">
                        {{ report?.name ?? 'New Report' }}
                    </span>
                    <span
                        v-if="report?.key"
                        class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500"
                    >
                        {{ report.key }}
                    </span>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex items-center gap-1 bg-surface-100 dark:bg-zinc-800 rounded-lg p-1">
                <button
                    v-for="tab in ([{ key: 'designer', icon: 'pi-objects-column', label: 'Designer' }, { key: 'json', icon: 'pi-code', label: 'JSON' }, { key: 'preview', icon: 'pi-eye', label: 'Preview' }] as const)"
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

            <Button icon="pi pi-pencil" size="small" text rounded v-tooltip.left="'Edit name & key'" @click="openMeta" />
            <Button label="Save" icon="pi pi-save" size="small" :loading="saving" @click="handleSave" />
        </div>

        <!-- ── Content ────────────────────────────────────────────────────── -->
        <div v-if="loading" class="flex-1 flex items-center justify-center text-surface-400">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <template v-else>

            <!-- Designer tab: keep mounted with v-show so pdfme doesn't lose DOM state -->
            <div v-show="activeTab === 'designer'" class="flex-1 min-h-0 overflow-hidden">
                <PdfDesigner ref="designerRef" :template="report?.template ?? null" />
            </div>

            <!-- JSON tab -->
            <div v-if="activeTab === 'json'" class="flex-1 min-h-0 flex flex-col">
                <div class="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
                    <p class="text-xs text-surface-400">
                        Read and edit the raw pdfme template JSON. Click "Apply" to push changes back to the designer.
                    </p>
                    <div class="flex items-center gap-2">
                        <span v-if="jsonError" class="text-xs text-red-500">{{ jsonError }}</span>
                        <Button
                            label="Apply to designer"
                            icon="pi pi-arrow-left"
                            size="small"
                            @click="applyJsonToDesigner"
                        />
                    </div>
                </div>
                <div class="flex-1 min-h-0 json-editor-fill">
                    <JsonEditor
                        v-model:text="jsonText"
                        mode="text"
                        :mainMenuBar="false"
                        :navigationBar="false"
                        :darkTheme="isDark"
                        @change="jsonError = ''"
                    />
                </div>
            </div>

            <!-- Preview tab -->
            <div v-if="activeTab === 'preview'" class="flex-1 min-h-0 overflow-hidden">
                <PdfPreview :template="previewTpl" />
            </div>

        </template>

        <!-- ── Meta dialog ─────────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="metaVisible"
            :header="isNew ? 'Name your report' : 'Edit report info'"
            modal
            :style="{ width: '420px' }"
            :draggable="false"
        >
            <div class="flex flex-col gap-4 py-2">
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Key <span class="text-red-500">*</span></label>
                    <InputText v-model="metaKey" placeholder="e.g. invoice" class="font-mono" :disabled="!isNew" />
                    <p class="text-xs text-surface-400">Used to reference this report from Service Tasks. Cannot be changed after creation.</p>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
                    <InputText v-model="metaName" placeholder="e.g. Client Invoice" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Description</label>
                    <Textarea v-model="metaDesc" rows="2" placeholder="Optional" auto-resize />
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" severity="secondary" text @click="metaVisible = false" />
                <Button label="Continue" icon="pi pi-check" :disabled="!metaKey.trim() || !metaName.trim()" @click="save" />
            </template>
        </Dialog>

    </div>
</template>

<style scoped>
.json-editor-fill :deep(.vue-ts-json-editor) {
    height: 100% !important;
}
</style>
