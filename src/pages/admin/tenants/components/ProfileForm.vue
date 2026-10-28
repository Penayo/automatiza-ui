<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, InputText, Message } from 'primevue';
import type { TenantProfile } from '@services/TenantsService';

// Spec: tenants-and-multitenancy §2a. Every new process instance of the tenant gets
// this as its `tenant` variable (process-instance-runtime §2b).

const props = defineProps<{ profile?: TenantProfile }>();

type Custom = { key: string; value: string };

const form = ref({
    legalName: '', taxId: '', email: '', phone: '', website: '',
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: '' },
    signer:  { name: '', title: '' },
});
const custom = ref<Custom[]>([]);

// Same rule as the backend: the key becomes `tenant.custom.<key>` in FEEL.
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

const customErrors = computed(() => {
    const seen = new Set<string>();
    return custom.value.map(({ key }) => {
        const k = key.trim();
        if (!k) return 'Key is required';
        if (!KEY_RE.test(k)) return 'Letters, digits and _ only; must not start with a digit';
        if (seen.has(k)) return 'Duplicate key';
        seen.add(k);
        return null;
    });
});
const hasErrors = computed(() => customErrors.value.some(Boolean));

function load(p: TenantProfile = {}) {
    form.value = {
        legalName: p.legalName ?? '', taxId: p.taxId ?? '', email: p.email ?? '',
        phone: p.phone ?? '', website: p.website ?? '',
        address: {
            line1: p.address?.line1 ?? '', line2: p.address?.line2 ?? '', city: p.address?.city ?? '',
            state: p.address?.state ?? '', postalCode: p.address?.postalCode ?? '', country: p.address?.country ?? '',
        },
        signer: { name: p.signer?.name ?? '', title: p.signer?.title ?? '' },
    };
    custom.value = (p.custom ?? []).map(f => ({ ...f }));
}

watch(() => props.profile, load, { immediate: true });

defineExpose({
    hasErrors,
    /** The profile to PUT; the backend trims and drops blanks. */
    value: (): TenantProfile => ({
        ...form.value,
        custom: custom.value.map(f => ({ key: f.key.trim(), value: f.value })),
    }),
});
</script>

<template>
    <div class="flex flex-col gap-6">
        <Message severity="info" :closable="false">
            Every new process instance of this tenant starts with a <code>tenant</code> variable holding this profile,
            e.g. <code>= tenant.legalName</code>, <code>= tenant.address.state</code>, <code>= tenant.custom.ptin</code>.
            Changes apply to instances started after saving.
        </Message>

        <section class="flex flex-col gap-3 rounded-lg border border-surface-200 dark:border-zinc-700 p-4">
            <h3 class="text-sm font-medium">Company</h3>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-400">Legal Company Name <span class="text-surface-300">(defaults to the tenant name)</span></label>
                <InputText v-model="form.legalName" size="small" class="w-full" />
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">Tax ID</label>
                    <InputText v-model="form.taxId" size="small" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">Website</label>
                    <InputText v-model="form.website" size="small" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">Email</label>
                    <InputText v-model="form.email" size="small" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">Phone</label>
                    <InputText v-model="form.phone" size="small" class="w-full" />
                </div>
            </div>
        </section>

        <section class="flex flex-col gap-3 rounded-lg border border-surface-200 dark:border-zinc-700 p-4">
            <h3 class="text-sm font-medium">Address</h3>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-400">Line 1</label>
                <InputText v-model="form.address.line1" size="small" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-400">Line 2</label>
                <InputText v-model="form.address.line2" size="small" class="w-full" />
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">City</label>
                    <InputText v-model="form.address.city" size="small" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">State / Province</label>
                    <InputText v-model="form.address.state" size="small" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">Postal Code</label>
                    <InputText v-model="form.address.postalCode" size="small" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">Country</label>
                    <InputText v-model="form.address.country" size="small" class="w-full" />
                </div>
            </div>
        </section>

        <section class="flex flex-col gap-3 rounded-lg border border-surface-200 dark:border-zinc-700 p-4">
            <h3 class="text-sm font-medium">Default Signer</h3>
            <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">Name</label>
                    <InputText v-model="form.signer.name" size="small" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-surface-400">Title</label>
                    <InputText v-model="form.signer.title" size="small" class="w-full" />
                </div>
            </div>
        </section>

        <section class="flex flex-col gap-3 rounded-lg border border-surface-200 dark:border-zinc-700 p-4">
            <h3 class="text-sm font-medium">Custom Fields</h3>
            <small class="text-surface-400 text-xs">
                Anything else this tenant's documents need (license number, PTIN, ...). Read as <code>tenant.custom.&lt;key&gt;</code>.
            </small>
            <div v-for="(field, i) in custom" :key="i" class="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                <div class="flex flex-col gap-1">
                    <InputText v-model="field.key" size="small" placeholder="key" :invalid="!!customErrors[i]" class="w-full font-mono text-xs" />
                    <small v-if="customErrors[i]" class="text-red-500 text-xs">{{ customErrors[i] }}</small>
                </div>
                <InputText v-model="field.value" size="small" placeholder="value" class="w-full" />
                <Button icon="pi pi-trash" severity="danger" text size="small" aria-label="Remove field" @click="custom.splice(i, 1)" />
            </div>
            <div>
                <Button label="Add Field" icon="pi pi-plus" severity="secondary" size="small" :disabled="custom.length >= 50" @click="custom.push({ key: '', value: '' })" />
            </div>
        </section>
    </div>
</template>
