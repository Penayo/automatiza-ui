<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, Button, InputText, Textarea, Dialog, Tag } from 'primevue';
import { $api } from '@services/api';
import type { EmailTemplateDefinition, EmailTemplateType } from '@services/EmailTemplatesService';
import EmailDesigner from './components/EmailDesigner.vue';

const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const id    = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !id.value);

const template    = ref<EmailTemplateDefinition | null>(null);
const loading     = ref(false);
const saving      = ref(false);
const designerRef = ref<InstanceType<typeof EmailDesigner> | null>(null);

// New items pick their type from the tab they were created from (?type=block);
// existing items keep whatever type they were saved with.
const newType = computed<EmailTemplateType>(() => (route.query.type === 'block' ? 'block' : 'template'));
const type    = computed<EmailTemplateType>(() => template.value?.type ?? newType.value);
const isBlock = computed(() => type.value === 'block');

// Reusable blocks (headers/footers/…) offered in the designer's block panel.
// Excludes the item currently being edited so a block can't drag itself in.
const reusableBlocks = ref<EmailTemplateDefinition[]>([]);

async function loadReusableBlocks() {
    try {
        const blocks = await $api.emailTemplates.getAll({ filter: { type: { equalsTo: 'block' } } });
        reusableBlocks.value = blocks.filter((b) => b.id !== id.value);
    } catch {
        // Non-fatal: the designer still works without the reusable-block panel.
        reusableBlocks.value = [];
    }
}

// ── Meta dialog ───────────────────────────────────────────────────────────────
const metaVisible = ref(false);
const metaKey     = ref('');
const metaName    = ref('');
const metaDesc    = ref('');

function openMeta() {
    metaKey.value  = template.value?.key  ?? '';
    metaName.value = template.value?.name ?? '';
    metaDesc.value = template.value?.description ?? '';
    metaVisible.value = true;
}

// ── Load ──────────────────────────────────────────────────────────────────────
// `loading` is owned by the onMounted orchestration below so the designer only
// mounts once both the template AND the reusable-block list are ready — the
// editor's block panel is built once at mount, so the blocks must already be
// in hand by then.
async function load() {
    if (isNew.value) return;

    try {
        template.value = await $api.emailTemplates.findById(id.value!);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load email template.', life: 4000 });
        router.push({ name: 'EmailTemplatesList' });
    }
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
    if (!metaName.value.trim() || !metaKey.value.trim()) {
        openMeta();
        return;
    }

    saving.value = true;
    try {
        const exported = await designerRef.value?.exportDesign();
        if (!exported) throw new Error('Could not export design from editor.');

        const dto = {
            key:         metaKey.value.trim(),
            name:        metaName.value.trim(),
            description: metaDesc.value.trim() || undefined,
            type:        type.value,
            design:      exported.design,
            html:        exported.html,
        };

        if (isNew.value) {
            const saved = await $api.emailTemplates.create(dto);
            template.value = saved;
            router.replace({ name: 'EmailTemplateEdit', params: { id: saved.id } });
            toast.add({ severity: 'success', summary: 'Saved', detail: `"${saved.name}" created.`, life: 3000 });
        } else {
            const updated = await $api.emailTemplates.update(id.value!, dto);
            template.value = (updated as any)?.data ?? updated;
            toast.add({ severity: 'success', summary: 'Saved', detail: `"${dto.name}" updated.`, life: 3000 });
        }

        metaVisible.value = false;
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? err?.message ?? 'Could not save.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

function handleSave() {
    if (isNew.value && !metaName.value) {
        openMeta();
    } else {
        save();
    }
}

onMounted(async () => {
    loading.value = true;
    try {
        await Promise.all([load(), loadReusableBlocks()]);
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div class="flex flex-col" style="height: calc(100vh - 50px)">

        <!-- ── Toolbar ─────────────────────────────────────────────────────── -->
        <div class="flex items-center gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-zinc-950 shrink-0">
            <Button
                icon="pi pi-arrow-left"
                text rounded size="small"
                v-tooltip.right="'Back to email templates'"
                @click="router.push({ name: 'EmailTemplatesList' })"
            />

            <div class="flex-1 min-w-0">
                <span v-if="loading" class="text-sm text-surface-400">Loading…</span>
                <div v-else class="flex items-center gap-2">
                    <span class="font-semibold truncate" style="color: var(--layout-title-color)">
                        {{ template?.name ?? (isBlock ? 'New Block' : 'New Email Template') }}
                    </span>
                    <Tag :value="isBlock ? 'Block' : 'Template'" :severity="isBlock ? 'info' : 'secondary'" />
                    <span
                        v-if="template?.key"
                        class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500"
                    >
                        {{ template.key }}
                    </span>
                </div>
            </div>

            <!-- Edit metadata -->
            <Button
                icon="pi pi-pencil"
                size="small" text rounded
                v-tooltip.left="'Edit name & key'"
                @click="openMeta"
            />

            <!-- Save -->
            <Button
                label="Save"
                icon="pi pi-save"
                size="small"
                :loading="saving"
                @click="handleSave"
            />
        </div>

        <!-- ── Designer canvas ─────────────────────────────────────────────── -->
        <div v-if="!loading" class="flex-1 min-h-0 overflow-hidden">
            <EmailDesigner
                ref="designerRef"
                :design="template?.design ?? null"
                :reusable-blocks="reusableBlocks"
            />
        </div>

        <div v-else class="flex-1 flex items-center justify-center text-surface-400">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <!-- ── Meta dialog ─────────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="metaVisible"
            :header="isNew ? (isBlock ? 'Name your block' : 'Name your template') : 'Edit template info'"
            modal
            :style="{ width: '420px' }"
            :draggable="false"
        >
            <div class="flex flex-col gap-4 py-2">
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Key <span class="text-red-500">*</span></label>
                    <InputText
                        v-model="metaKey"
                        :placeholder="isBlock ? 'e.g. default-footer' : 'e.g. welcome-email'"
                        class="font-mono"
                        :disabled="!isNew"
                    />
                    <p class="text-xs text-surface-400">
                        {{ isBlock
                            ? 'Internal identifier for this block.'
                            : 'Used as templateKey in SMTP service task config.' }}
                        Cannot be changed after creation.
                    </p>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
                    <InputText v-model="metaName" :placeholder="isBlock ? 'e.g. Default Footer' : 'e.g. Welcome Email'" />
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Description</label>
                    <Textarea v-model="metaDesc" rows="2" placeholder="Optional" auto-resize />
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" severity="secondary" text @click="metaVisible = false" />
                <Button
                    label="Continue"
                    icon="pi pi-check"
                    :disabled="!metaKey.trim() || !metaName.trim()"
                    @click="save"
                />
            </template>
        </Dialog>

    </div>
</template>
