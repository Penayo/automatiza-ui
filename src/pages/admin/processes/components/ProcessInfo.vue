<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useToast, Button, InputText, Textarea, ToggleSwitch } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition, UpdateProcessMetaDto } from '@services/ProcessesService';

const props = defineProps<{
    processId?:        string;
    initialMeta:       UpdateProcessMetaDto;
    readonly?:         boolean;
    /** Credential for the unlisted link, used only when publiclyStartable is off. */
    publicStartToken?: string;
}>();

const emit = defineEmits<{
    saved: [updated: ProcessDefinition];
    'token-changed': [publicStartToken: string];
}>();

const toast = useToast();

const meta = ref<UpdateProcessMetaDto>({ ...props.initialMeta });
watch(() => props.initialMeta, (v) => { meta.value = { ...v }; }, { deep: true });

const saving       = ref(false);
const contactInput = ref('');
const groupInput   = ref('');
const userInput    = ref('');

// ── Chip helpers ──────────────────────────────────────────────────────────────

function removeFromList(list: string[], i: number) { list.splice(i, 1); }

function addContact() {
    const v = contactInput.value.trim();
    if (v && !meta.value.responsibleContacts!.includes(v)) meta.value.responsibleContacts!.push(v);
    contactInput.value = '';
}

function addGroup() {
    const v = groupInput.value.trim();
    if (v && !meta.value.starterGroups!.includes(v)) meta.value.starterGroups!.push(v);
    groupInput.value = '';
}

function addUser() {
    const v = userInput.value.trim();
    if (v && !meta.value.starterUsers!.includes(v)) meta.value.starterUsers!.push(v);
    userInput.value = '';
}

// ── Public start link ─────────────────────────────────────────────────────────

/**
 * Two shapes, never a third: an open campaign link with no credential in it, or an
 * unlisted link carrying publicStartToken. The webhookToken is a machine credential
 * and deliberately never appears here.
 */
const startUrl = computed(() => {
    if (!props.processId) return '';
    const base = `${window.location.origin}/start/${props.processId}`;
    if (meta.value.publiclyStartable) return base;
    return props.publicStartToken ? `${base}?token=${props.publicStartToken}` : base;
});

/** A restricted process rejects anonymous starts whatever the link says. */
const isRestricted = computed(() =>
    (meta.value.starterGroups?.length ?? 0) > 0 || (meta.value.starterUsers?.length ?? 0) > 0,
);

/** True once the toggle differs from what the server has — the link isn't live yet. */
const linkDirty = computed(
    () => !!meta.value.publiclyStartable !== !!props.initialMeta.publiclyStartable,
);

/**
 * Mints or rotates the unlisted-link token. Also covers processes deployed before
 * publicStartToken existed, which carry none until they are redeployed.
 */
const rotating = ref(false);
async function rotateStartToken() {
    if (!props.processId) return;
    rotating.value = true;
    try {
        const { publicStartToken } = await $api.processes.regenerateToken(props.processId, 'public');
        if (publicStartToken) emit('token-changed', publicStartToken);
        toast.add({
            severity: 'success',
            summary: 'Start token updated',
            detail: 'Previously shared links no longer work.',
            life: 3000,
        });
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.message ?? 'Could not update the token', life: 4000 });
    } finally {
        rotating.value = false;
    }
}

async function copyStartUrl() {
    if (!startUrl.value) return;
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(startUrl.value);
    } else {
        const ta = document.createElement('textarea');
        ta.value = startUrl.value; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    toast.add({ severity: 'success', summary: 'Copied', detail: 'Start link copied to clipboard', life: 2000 });
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
    saving.value = true;
    try {
        const updated = await $api.processes.updateProcessMeta(props.processId!, meta.value);
        emit('saved', updated);
        toast.add({ severity: 'success', summary: 'Saved', detail: 'Process metadata updated.', life: 3000 });
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.message ?? 'Save failed', life: 4000 });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="max-w-2xl px-6 py-8 space-y-6">

        <!-- ── Description ───────────────────────────────────────────────── -->
        <div class="space-y-1.5">
            <label class="text-xs font-medium text-surface-400 uppercase tracking-wide">Description</label>
            <p v-if="readonly" class="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
                {{ meta.description || '—' }}
            </p>
            <Textarea
                v-else
                v-model="meta.description"
                rows="4"
                class="w-full"
                placeholder="Describe what this process does…"
                autoResize
            />
        </div>

        <!-- ── Responsible Contacts ───────────────────────────────────────── -->
        <div class="space-y-1.5">
            <label class="text-xs font-medium text-surface-400 uppercase tracking-wide">Responsible Contacts</label>
            <div v-if="!readonly" class="flex gap-2">
                <InputText v-model="contactInput" placeholder="email or name" class="flex-1" @keyup.enter="addContact" />
                <Button icon="pi pi-plus" severity="secondary" @click="addContact" />
            </div>
            <div class="flex flex-wrap gap-2 mt-1">
                <span
                    v-for="(c, i) in meta.responsibleContacts"
                    :key="c"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 text-xs"
                >
                    <i v-if="readonly" class="pi pi-envelope text-[10px]" />
                    {{ c }}
                    <button v-if="!readonly" class="text-surface-400 hover:text-surface-700 dark:hover:text-surface-100" @click="removeFromList(meta.responsibleContacts!, i)">×</button>
                </span>
                <span v-if="readonly && !meta.responsibleContacts?.length" class="text-sm text-surface-400">—</span>
            </div>
        </div>

        <!-- ── Starter Roles ──────────────────────────────────────────────── -->
        <div class="space-y-1.5">
            <label class="text-xs font-medium text-surface-400 uppercase tracking-wide">Starter Roles</label>
            <p class="text-xs text-surface-500">
                {{ readonly ? 'Roles allowed to start this process.' : 'Roles allowed to start this process. Leave empty for open access.' }}
            </p>
            <div v-if="!readonly" class="flex gap-2">
                <InputText v-model="groupInput" placeholder="ROLE_NAME" class="flex-1" @keyup.enter="addGroup" />
                <Button icon="pi pi-plus" severity="secondary" @click="addGroup" />
            </div>
            <div class="flex flex-wrap gap-2 mt-1">
                <span
                    v-for="(g, i) in meta.starterGroups"
                    :key="g"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs"
                >
                    {{ g }}
                    <button v-if="!readonly" class="text-blue-400/60 hover:text-blue-700 dark:hover:text-blue-200" @click="removeFromList(meta.starterGroups!, i)">×</button>
                </span>
                <span v-if="readonly && !meta.starterGroups?.length" class="text-sm text-surface-400">Open — anyone can start</span>
            </div>
        </div>

        <!-- ── Starter Users ──────────────────────────────────────────────── -->
        <div class="space-y-1.5">
            <label class="text-xs font-medium text-surface-400 uppercase tracking-wide">Starter Users</label>
            <p class="text-xs text-surface-500">
                {{ readonly ? 'Specific users allowed to start this process.' : 'Specific usernames allowed to start this process.' }}
            </p>
            <div v-if="!readonly" class="flex gap-2">
                <InputText v-model="userInput" placeholder="username" class="flex-1" @keyup.enter="addUser" />
                <Button icon="pi pi-plus" severity="secondary" @click="addUser" />
            </div>
            <div class="flex flex-wrap gap-2 mt-1">
                <span
                    v-for="(u, i) in meta.starterUsers"
                    :key="u"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs"
                >
                    {{ u }}
                    <button v-if="!readonly" class="text-violet-400/60 hover:text-violet-700 dark:hover:text-violet-200" @click="removeFromList(meta.starterUsers!, i)">×</button>
                </span>
                <span v-if="readonly && !meta.starterUsers?.length" class="text-sm text-surface-400">—</span>
            </div>
        </div>

        <!-- ── Public Start Link (admin-only: it can carry the unlisted token) ── -->
        <div v-if="processId && !readonly" class="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-700">
            <label class="text-xs font-medium text-surface-400 uppercase tracking-wide">Public Start Link</label>

            <div class="flex items-start gap-3">
                <ToggleSwitch v-model="meta.publiclyStartable" inputId="publiclyStartableToggle" class="mt-0.5" />
                <label for="publiclyStartableToggle" class="text-sm text-surface-700 dark:text-surface-300 cursor-pointer">
                    Anyone with the link can start this process
                    <span class="block text-xs text-surface-500 mt-0.5">
                        Turn on for links you distribute openly — campaigns, landing pages, QR codes.
                        Off means the link only works with its private token.
                    </span>
                </label>
            </div>

            <!-- Restricted processes reject anonymous starts no matter what the link says -->
            <div
                v-if="isRestricted"
                class="flex items-start gap-2 text-xs rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
            >
                <i class="pi pi-exclamation-triangle text-xs mt-0.5" />
                <span>
                    Starter roles or users are set, so this process always requires a login —
                    the link will send visitors to the sign-in page. Clear both lists for a truly public link.
                </span>
            </div>

            <div class="flex items-center gap-2">
                <code class="flex-1 truncate text-xs bg-surface-100 dark:bg-surface-800 rounded-lg px-3 py-2 text-surface-700 dark:text-surface-300 font-mono">
                    {{ startUrl }}
                </code>
                <button
                    class="shrink-0 p-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                    v-tooltip.top="'Copy start link'"
                    @click="copyStartUrl"
                >
                    <i class="pi pi-copy text-sm text-surface-500" />
                </button>
                <button
                    v-if="!meta.publiclyStartable"
                    class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                    v-tooltip.top="publicStartToken ? 'New token — links already shared stop working' : 'Generate a token for this link'"
                    :disabled="rotating"
                    @click="rotateStartToken"
                >
                    <i :class="rotating ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" class="text-xs" />
                    {{ publicStartToken ? 'Regenerate' : 'Generate' }}
                </button>
            </div>

            <p v-if="linkDirty" class="text-xs text-amber-600 dark:text-amber-400">
                <i class="pi pi-info-circle text-[10px]" />
                Save to apply this change — the link above is not live yet.
            </p>
            <p v-else-if="!meta.publiclyStartable && !publicStartToken" class="text-xs text-surface-500">
                This link needs a token — generate one, or turn on open access above.
            </p>
            <p v-else-if="!meta.publiclyStartable" class="text-xs text-surface-500">
                Unlisted link — treat it as a secret; anyone holding it can start the process.
            </p>
        </div>

        <!-- ── Save ──────────────────────────────────────────────────────── -->
        <div v-if="!readonly" class="flex justify-end pt-2">
            <Button label="Save" icon="pi pi-save" :loading="saving" @click="save" />
        </div>

    </div>
</template>
