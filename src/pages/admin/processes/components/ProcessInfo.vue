<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToast, Button, InputText, Textarea } from 'primevue';
import { $api } from '@services/api';
import type { ProcessDefinition, UpdateProcessMetaDto } from '@services/ProcessesService';

const props = defineProps<{
    processId?:  string;          // required only when readonly=false
    initialMeta: UpdateProcessMetaDto;
    readonly?:   boolean;
}>();

const emit = defineEmits<{
    saved: [updated: ProcessDefinition];
}>();

const toast = useToast();

// Local copy — reactive to parent updates, but only mutated in edit mode
const meta = ref<UpdateProcessMetaDto>({ ...props.initialMeta });
watch(() => props.initialMeta, (v) => { meta.value = { ...v }; }, { deep: true });

const saving       = ref(false);
const contactInput = ref('');
const groupInput   = ref('');
const userInput    = ref('');

// ── Chip helpers (edit mode only) ─────────────────────────────────────────────

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

// ── Save (edit mode only) ─────────────────────────────────────────────────────

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

            <!-- Edit: input + add button -->
            <div v-if="!readonly" class="flex gap-2">
                <InputText v-model="contactInput" placeholder="email or name" class="flex-1" @keyup.enter="addContact" />
                <Button icon="pi pi-plus" severity="secondary" @click="addContact" />
            </div>

            <!-- Chips -->
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
            <p v-if="!readonly" class="text-xs text-surface-500">Roles allowed to start this process. Leave empty for open access.</p>
            <p v-else class="text-xs text-surface-500">Roles allowed to start this process.</p>

            <!-- Edit: input + add button -->
            <div v-if="!readonly" class="flex gap-2">
                <InputText v-model="groupInput" placeholder="ROLE_NAME" class="flex-1" @keyup.enter="addGroup" />
                <Button icon="pi pi-plus" severity="secondary" @click="addGroup" />
            </div>

            <!-- Chips -->
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
            <p v-if="!readonly" class="text-xs text-surface-500">Specific usernames allowed to start this process.</p>
            <p v-else class="text-xs text-surface-500">Specific users allowed to start this process.</p>

            <!-- Edit: input + add button -->
            <div v-if="!readonly" class="flex gap-2">
                <InputText v-model="userInput" placeholder="username" class="flex-1" @keyup.enter="addUser" />
                <Button icon="pi pi-plus" severity="secondary" @click="addUser" />
            </div>

            <!-- Chips -->
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

        <!-- ── Save (edit mode only) ──────────────────────────────────────── -->
        <div v-if="!readonly" class="flex justify-end pt-2">
            <Button label="Save" icon="pi pi-save" :loading="saving" @click="save" />
        </div>

    </div>
</template>
