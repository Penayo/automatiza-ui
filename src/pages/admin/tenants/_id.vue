<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button, InputText, InputNumber, ToggleSwitch, Message, Skeleton } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { $api } from '@services/api';
import type { ITenant, BrandingTheme, CompanyNameStyle, UpdateTenantDto } from '@services/TenantsService';
import { generateShades } from '@/composables/useTenantBranding';

const THEMES: { value: BrandingTheme; label: string; color: string }[] = [
    { value: 'sky',     label: 'Sky',     color: '#0ea5e9' },
    { value: 'indigo',  label: 'Indigo',  color: '#6366f1' },
    { value: 'violet',  label: 'Violet',  color: '#8b5cf6' },
    { value: 'fuchsia', label: 'Fuchsia', color: '#d946ef' },
    { value: 'pink',    label: 'Pink',    color: '#ec4899' },
    { value: 'rose',    label: 'Rose',    color: '#f43f5e' },
    { value: 'red',     label: 'Red',     color: '#ef4444' },
    { value: 'orange',  label: 'Orange',  color: '#f97316' },
    { value: 'amber',   label: 'Amber',   color: '#f59e0b' },
    { value: 'teal',    label: 'Teal',    color: '#14b8a6' },
    { value: 'emerald', label: 'Emerald', color: '#10b981' },
    { value: 'cyan',    label: 'Cyan',    color: '#06b6d4' },
    { value: 'slate',   label: 'Slate',   color: '#64748b' },
    { value: 'blue',    label: 'Blue',    color: '#3b82f6' },
    { value: 'navy',    label: 'Navy',    color: '#1e3d8a' },
    { value: 'garnet',  label: 'Garnet',  color: '#9e1a2c' },
    { value: 'coffee',  label: 'Coffee',  color: '#6f4e37' },
];

const route  = useRoute();
const router = useRouter();
const toast  = useToast();

const tenant  = ref<ITenant | null>(null);
const loading = ref(true);
const saving  = ref(false);
const error   = ref('');

const LOGO_SIZES: { value: number; label: string }[] = [
    { value: 24, label: 'XS' },
    { value: 32, label: 'S' },
    { value: 40, label: 'M' },
    { value: 56, label: 'L' },
    { value: 72, label: 'XL' },
];

const TITLE_STYLES: { value: CompanyNameStyle; label: string; preview: string }[] = [
    { value: 'display',    label: 'Display',    preview: 'text-lg font-bold tracking-tight' },
    { value: 'heading',    label: 'Heading',    preview: 'text-base font-bold' },
    { value: 'subheading', label: 'Subheading', preview: 'text-sm font-semibold' },
    { value: 'caption',    label: 'Caption',    preview: 'text-xs font-medium opacity-70' },
];

const name                  = ref('');
const theme                 = ref<BrandingTheme | null>(null);
const customPrimaryColor    = ref('');
const customSecondaryColor  = ref('');
const logoUrl               = ref('');
const logoDarkUrl           = ref('');
const logoSize              = ref(40);
const logoPadding           = ref(0);
const logoBgColor           = ref('');
const companyName           = ref('');
const showCompanyName       = ref(true);
const companyNameStyle      = ref<CompanyNameStyle>('subheading');

// Live preview color for the primary swatch when custom is set
const previewPrimaryColor = computed(() =>
    customPrimaryColor.value || THEMES.find(t => t.value === theme.value)?.color || null
);

function selectPreset(t: BrandingTheme) {
    theme.value = t;
    customPrimaryColor.value = '';  // preset overrides custom
}

function onCustomPrimaryChange() {
    if (customPrimaryColor.value) theme.value = null;  // custom overrides preset
}

async function load() {
    loading.value = true;
    try {
        const id = route.params.id as string;
        tenant.value      = await $api.tenants.findById(id);
        name.value        = tenant.value.name;
        theme.value                 = tenant.value.branding?.theme                ?? null;
        customPrimaryColor.value    = tenant.value.branding?.customPrimaryColor   ?? '';
        customSecondaryColor.value  = tenant.value.branding?.customSecondaryColor ?? '';
        logoUrl.value               = tenant.value.branding?.logoUrl              ?? '';
        logoDarkUrl.value           = tenant.value.branding?.logoDarkUrl          ?? '';
        logoSize.value              = tenant.value.branding?.logoSize             ?? 40;
        logoPadding.value           = tenant.value.branding?.logoPadding          ?? 0;
        logoBgColor.value           = tenant.value.branding?.logoBgColor          ?? '';
        companyName.value           = tenant.value.branding?.companyName          ?? '';
        showCompanyName.value       = tenant.value.branding?.showCompanyName      ?? true;
        companyNameStyle.value      = tenant.value.branding?.companyNameStyle     ?? 'subheading';
    } finally {
        loading.value = false;
    }
}

async function save() {
    saving.value = true;
    error.value  = '';
    try {
        const dto: UpdateTenantDto = {
            name: name.value || undefined,
            branding: {
                theme:                theme.value               ?? undefined,
                customPrimaryColor:   customPrimaryColor.value  || undefined,
                customSecondaryColor: customSecondaryColor.value || undefined,
                logoUrl:              logoUrl.value             || undefined,
                logoDarkUrl:          logoDarkUrl.value         || undefined,
                logoSize:             logoSize.value            || undefined,
                logoPadding:          logoPadding.value         ?? undefined,
                logoBgColor:          logoBgColor.value         || undefined,
                companyName:          companyName.value         || undefined,
                showCompanyName:      showCompanyName.value,
                companyNameStyle:     companyNameStyle.value,
            },
        };
        await $api.tenants.update(tenant.value!.id, dto);
        toast.add({ severity: 'success', summary: 'Saved', detail: 'Tenant updated', life: 3000 });
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Failed to save';
    } finally {
        saving.value = false;
    }
}

onMounted(load);
</script>

<template>
    <div class="flex flex-col h-full gap-6 p-6 max-w-xl">

        <!-- Header -->
        <div class="flex items-center gap-3">
            <Button icon="pi pi-arrow-left" text size="small" @click="router.push('/admin/tenants')" />
            <h1 class="text-xl font-semibold text-surface-800 dark:text-surface-100">
                <Skeleton v-if="loading" width="200px" height="1.5rem" />
                <template v-else>{{ tenant?.name }}</template>
            </h1>
        </div>

        <template v-if="loading">
            <Skeleton height="2.5rem" class="w-full" />
            <Skeleton height="2.5rem" class="w-full" />
            <Skeleton height="2.5rem" class="w-full" />
        </template>

        <template v-else>
            <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

            <!-- General -->
            <section class="flex flex-col gap-4">
                <h2 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">General</h2>

                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Name</label>
                    <InputText v-model="name" size="small" class="w-full" />
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-surface-400">Slug</label>
                    <code class="text-xs text-surface-400 font-mono bg-surface-100 dark:bg-zinc-800 px-3 py-2 rounded">
                        {{ tenant?.slug }}
                    </code>
                </div>
            </section>

            <hr class="border-surface-200 dark:border-zinc-700" />

            <!-- Branding -->
            <section class="flex flex-col gap-4">
                <h2 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">Frontoffice Branding</h2>

                <!-- Color section -->
                <div class="flex flex-col gap-4">
                    <h3 class="text-sm font-medium">Colors</h3>

                    <!-- Preset swatches -->
                    <div class="flex flex-col gap-2">
                        <label class="text-xs text-surface-400">Preset Theme</label>
                        <div class="flex flex-wrap gap-2">
                            <button
                                v-for="t in THEMES"
                                :key="t.value"
                                type="button"
                                v-tooltip.top="t.label"
                                class="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                                :style="{
                                    backgroundColor: t.color,
                                    borderColor: theme === t.value ? '#fff' : t.color,
                                    outline: theme === t.value ? `2px solid ${t.color}` : 'none',
                                    outlineOffset: '2px',
                                    boxShadow: theme === t.value ? `0 0 0 4px ${t.color}33` : 'none',
                                }"
                                @click="selectPreset(t.value)"
                            />
                            <button
                                v-if="theme || customPrimaryColor"
                                type="button"
                                v-tooltip.top="'Clear preset'"
                                class="w-7 h-7 rounded-full border-2 border-dashed border-surface-300 dark:border-zinc-600 text-surface-400 flex items-center justify-center hover:border-surface-400 transition-all text-xs"
                                @click="theme = null; customPrimaryColor = ''"
                            >✕</button>
                        </div>
                    </div>

                    <!-- Custom colors -->
                    <div class="flex flex-col gap-3">
                        <label class="text-xs text-surface-400">Custom Colors <span class="text-surface-300">(overrides preset)</span></label>
                        <div class="grid grid-cols-2 gap-3">

                            <!-- Primary -->
                            <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-medium">Primary</label>
                                <div class="flex items-center gap-2">
                                    <div
                                        class="w-8 h-8 rounded border border-surface-200 dark:border-zinc-700 overflow-hidden shrink-0 cursor-pointer"
                                        :style="{ backgroundColor: customPrimaryColor || previewPrimaryColor || '#e4e4e7' }"
                                    >
                                        <input
                                            type="color"
                                            :value="customPrimaryColor || previewPrimaryColor || '#0ea5e9'"
                                            class="opacity-0 w-full h-full cursor-pointer"
                                            @input="(e) => { customPrimaryColor = (e.target as HTMLInputElement).value; onCustomPrimaryChange(); }"
                                        />
                                    </div>
                                    <InputText
                                        :model-value="customPrimaryColor"
                                        @update:model-value="(v) => { customPrimaryColor = v ?? ''; onCustomPrimaryChange(); }"
                                        size="small"
                                        placeholder="#0ea5e9"
                                        class="w-full font-mono text-xs"
                                        maxlength="7"
                                    />
                                </div>
                                <!-- Shade preview -->
                                <div v-if="customPrimaryColor" class="flex gap-0.5 mt-1">
                                    <div
                                        v-for="(shade, key) in generateShades(customPrimaryColor)"
                                        :key="key"
                                        class="flex-1 h-3 rounded-sm"
                                        :style="{ backgroundColor: shade }"
                                        :title="`${key}: ${shade}`"
                                    />
                                </div>
                            </div>

                            <!-- Secondary -->
                            <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-medium">Secondary</label>
                                <div class="flex items-center gap-2">
                                    <div
                                        class="w-8 h-8 rounded border border-surface-200 dark:border-zinc-700 overflow-hidden shrink-0 cursor-pointer"
                                        :style="{ backgroundColor: customSecondaryColor || '#71717a' }"
                                    >
                                        <input
                                            type="color"
                                            :value="customSecondaryColor || '#71717a'"
                                            class="opacity-0 w-full h-full cursor-pointer"
                                            @input="(e) => customSecondaryColor = (e.target as HTMLInputElement).value"
                                        />
                                    </div>
                                    <InputText
                                        v-model="customSecondaryColor"
                                        size="small"
                                        placeholder="#71717a"
                                        class="w-full font-mono text-xs"
                                        maxlength="7"
                                    />
                                </div>
                                <div v-if="customSecondaryColor" class="flex gap-0.5 mt-1">
                                    <div
                                        v-for="(shade, key) in generateShades(customSecondaryColor)"
                                        :key="key"
                                        class="flex-1 h-3 rounded-sm"
                                        :style="{ backgroundColor: shade }"
                                        :title="`${key}: ${shade}`"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- Company Name -->
                <div class="flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <label class="text-sm font-medium">Company Name</label>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-surface-400">{{ showCompanyName ? 'Visible' : 'Hidden' }}</span>
                            <ToggleSwitch v-model="showCompanyName" />
                        </div>
                    </div>

                    <InputText
                        v-model="companyName"
                        size="small"
                        class="w-full"
                        placeholder="Shown in frontoffice header"
                        :disabled="!showCompanyName"
                    />

                    <!-- Title style picker -->
                    <div v-if="showCompanyName" class="flex flex-col gap-2">
                        <label class="text-xs text-surface-400">Title Style</label>
                        <div class="flex flex-wrap gap-2">
                            <button
                                v-for="s in TITLE_STYLES"
                                :key="s.value"
                                type="button"
                                class="px-3 py-1.5 rounded border transition-all"
                                :class="companyNameStyle === s.value
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                                    : 'border-surface-200 dark:border-zinc-700 text-surface-500 hover:border-surface-400'"
                                @click="companyNameStyle = s.value"
                            >
                                <span :class="s.preview">{{ companyName || s.label }}</span>
                            </button>
                        </div>
                        <small class="text-surface-400 text-xs">Preview uses the company name above.</small>
                    </div>
                </div>

                <!-- Logo -->
                <div class="flex flex-col gap-4">
                    <h3 class="text-sm font-medium">Logo</h3>

                    <!-- URLs -->
                    <div class="flex flex-col gap-3">
                        <div class="flex flex-col gap-1">
                            <label class="text-xs text-surface-400">Light Mode URL</label>
                            <InputText v-model="logoUrl" size="small" class="w-full" placeholder="https://..." />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-xs text-surface-400">Dark Mode URL <span class="text-surface-300">(falls back to light if empty)</span></label>
                            <InputText v-model="logoDarkUrl" size="small" class="w-full" placeholder="https://..." />
                        </div>
                    </div>

                    <!-- Size -->
                    <div class="flex flex-col gap-2">
                        <label class="text-xs text-surface-400">Size</label>
                        <div class="flex flex-wrap gap-2">
                            <button
                                v-for="s in LOGO_SIZES"
                                :key="s.value"
                                type="button"
                                class="px-3 py-1 rounded border text-xs transition-all"
                                :class="logoSize === s.value
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                                    : 'border-surface-200 dark:border-zinc-700 text-surface-500 hover:border-surface-400'"
                                @click="logoSize = s.value"
                            >{{ s.label }}</button>
                        </div>
                    </div>

                    <!-- Padding + Background color -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium">Padding (px)</label>
                            <InputNumber v-model="logoPadding" :min="0" :max="48" :step="4" size="small" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium">Background Color</label>
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-8 h-8 rounded border border-surface-200 dark:border-zinc-700 overflow-hidden shrink-0 cursor-pointer"
                                    :style="{ backgroundColor: logoBgColor || 'transparent' }"
                                >
                                    <input
                                        type="color"
                                        :value="logoBgColor || '#ffffff'"
                                        class="opacity-0 w-full h-full cursor-pointer"
                                        @input="(e) => logoBgColor = (e.target as HTMLInputElement).value"
                                    />
                                </div>
                                <InputText
                                    v-model="logoBgColor"
                                    size="small"
                                    placeholder="#ffffff"
                                    class="w-full font-mono text-xs"
                                    maxlength="7"
                                />
                                <button
                                    v-if="logoBgColor"
                                    type="button"
                                    class="text-surface-400 hover:text-surface-600 text-xs shrink-0"
                                    @click="logoBgColor = ''"
                                >✕</button>
                            </div>
                        </div>
                    </div>

                    <!-- Preview -->
                    <div v-if="logoUrl || logoDarkUrl" class="flex gap-4">
                        <div class="flex flex-col gap-1">
                            <span class="text-xs text-surface-400">Light</span>
                            <div
                                class="rounded border border-surface-200 w-fit"
                                :style="{
                                    padding: logoPadding + 'px',
                                    backgroundColor: logoBgColor || '#ffffff',
                                }"
                            >
                                <img
                                    :src="logoUrl || logoDarkUrl"
                                    alt="Light logo preview"
                                    class="object-contain block"
                                    :style="{ height: logoSize + 'px' }"
                                />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-xs text-surface-400">Dark</span>
                            <div
                                class="rounded border border-zinc-700 w-fit"
                                :style="{
                                    padding: logoPadding + 'px',
                                    backgroundColor: logoBgColor || '#18181b',
                                }"
                            >
                                <img
                                    :src="logoDarkUrl || logoUrl"
                                    alt="Dark logo preview"
                                    class="object-contain block"
                                    :style="{ height: logoSize + 'px' }"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Actions -->
            <div class="flex justify-end gap-2 pt-2">
                <Button label="Cancel" text size="small" @click="router.push('/admin/tenants')" />
                <Button label="Save Changes" size="small" :loading="saving" @click="save" />
            </div>
        </template>
    </div>
</template>
