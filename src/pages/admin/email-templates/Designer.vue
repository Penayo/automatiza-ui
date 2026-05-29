<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast, Button, InputText, Textarea, Dialog } from 'primevue';
import { $api } from '@services/api';
import type { EmailTemplateDefinition } from '@services/EmailTemplatesService';
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
async function load() {
    if (isNew.value) return;

    loading.value = true;
    try {
        template.value = await $api.emailTemplates.findById(id.value!);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load email template.', life: 4000 });
        router.push({ name: 'EmailTemplatesList' });
    } finally {
        loading.value = false;
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

onMounted(load);
</script>

<template>
    <div class="flex flex-col" style="height: 100vh">

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
                        {{ template?.name ?? 'New Email Template' }}
                    </span>
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
            />
        </div>

        <div v-else class="flex-1 flex items-center justify-center text-surface-400">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <!-- ── Meta dialog ─────────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="metaVisible"
            :header="isNew ? 'Name your template' : 'Edit template info'"
            modal
            :style="{ width: '420px' }"
            :draggable="false"
        >
            <div class="flex flex-col gap-4 py-2">
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Key <span class="text-red-500">*</span></label>
                    <InputText
                        v-model="metaKey"
                        placeholder="e.g. welcome-email"
                        class="font-mono"
                        :disabled="!isNew"
                    />
                    <p class="text-xs text-surface-400">Used as <code>templateKey</code> in SMTP service task config. Cannot be changed after creation.</p>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
                    <InputText v-model="metaName" placeholder="e.g. Welcome Email" />
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
