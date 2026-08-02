<script setup lang="ts">
import { Form } from '@bpmn-io/form-js';
import { DocumentListModule } from '@/form-fields/DocumentListField';
import { LinkModule } from '@/form-fields/LinkField';
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@/forms.scss';

import { computed, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useTheme } from '@/composables/useTheme';
import { applyBrandingPalette, type TenantBranding } from '@/composables/useTenantBranding';

const BASE = import.meta.env.VITE_API_HOST ?? 'http://localhost:3000';

const { isDark } = useTheme();
const fallbackCompanyName = import.meta.env.VITE_COMPANY_NAME ?? 'Process Linker';

const route  = useRoute();
const router = useRouter();
const processId    = route.params.processId as string;
/** Only present for unlisted links; publicly startable processes carry no token. */
const startToken = route.query.token as string | undefined;

// ── State ─────────────────────────────────────────────────────────────────────
type PageState = 'loading' | 'form' | 'login-required' | 'forbidden' | 'done' | 'error';
const state        = ref<PageState>('loading');
const errorMsg     = ref('');
const processName  = ref('');
const description  = ref('');
const formSchema   = ref<any>(null);
const submitting   = ref(false);

// bpmn-io form
const formRef    = ref<HTMLElement | null>(null);
const formViewer = ref<Form>();

// ── Tenant branding ───────────────────────────────────────────────────────────
// This page is anonymous, so it cannot call /tenants/branding (that resolves the
// tenant from the JWT). Branding rides along in the public-start payload instead.
const pageRef  = ref<HTMLElement | null>(null);
const branding = ref<TenantBranding | null>(null);

const companyName = computed(() => branding.value?.companyName || fallbackCompanyName);
const logo        = computed(() =>
    (isDark.value ? branding.value?.logoDarkUrl : branding.value?.logoUrl) ?? branding.value?.logoUrl ?? null,
);
// Larger than the frontoffice header's: this is a landing page, often the first
// thing an external visitor sees, so the brand leads.
const logoStyle = computed(() => ({
    height:     `${branding.value?.logoSize ?? 56}px`,
    padding:    `${branding.value?.logoPadding ?? 0}px`,
    background: branding.value?.logoBgColor ?? 'transparent',
}));

/** Company name scale, honouring the tenant's companyNameStyle setting. */
const companyNameClass = computed(() => {
    switch (branding.value?.companyNameStyle) {
        case 'display':  return 'text-2xl font-bold';
        case 'heading':  return 'text-xl font-semibold';
        case 'caption':  return 'text-sm font-medium';
        default:         return 'text-lg font-semibold'; // subheading
    }
});
/** Brand color for buttons/accents, falling back to the PrimeVue primary. */
const accent = 'var(--fo-brand-500, var(--p-primary-500, #6366f1))';

// ── Auth helpers ──────────────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** The link's token, forwarded on both load and submit. */
function tokenParam(): string {
    return startToken ? `?token=${encodeURIComponent(startToken)}` : '';
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
    state.value = 'loading';
    try {
        const { data } = await axios.get(
            `${BASE}/bpmn/processes/${processId}/public-start${tokenParam()}`,
            { headers: authHeaders() },
        );
        processName.value = data.processName;
        description.value = data.description ?? '';
        formSchema.value  = data.formSchema ?? null;
        branding.value    = data.branding ?? null;
        applyBrandingPalette(pageRef.value, branding.value);
        state.value = 'form';
    } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401) {
            // 401 covers both "this link needs a login" and "this link's token is
            // missing or wrong" — show whichever the server actually said.
            errorMsg.value = err?.response?.data?.message ?? '';
            state.value = 'login-required';
        } else if (status === 403) {
            state.value = 'forbidden';
        } else {
            errorMsg.value = err?.response?.data?.message ?? 'Could not load the process.';
            state.value    = 'error';
        }
    }
}

// ── Mount BPMN form once data arrives ────────────────────────────────────────
watch(state, (s) => {
    if (s !== 'form' || !formSchema.value) return;
    setTimeout(() => {
        if (!formRef.value) return;
        const form = new Form({ container: formRef.value, additionalModules: [DocumentListModule, LinkModule] });
        formViewer.value = form;
        form.importSchema(formSchema.value, {});
        form.on('submit', (event: { data: Record<string, any>; errors: any[] }) => {
            submit(event.data);
        });
    }, 0);
});

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit(variables: Record<string, any>) {
    submitting.value = true;
    try {
        await axios.post(
            `${BASE}/bpmn/processes/${processId}/public-start${tokenParam()}`,
            { variables },
            { headers: authHeaders() },
        );
        formViewer.value?.destroy();
        state.value = 'done';
    } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401) { state.value = 'login-required'; return; }
        if (status === 403) { state.value = 'forbidden';      return; }
        errorMsg.value = err?.response?.data?.message ?? 'Submission failed. Please try again.';
        state.value    = 'error';
    } finally {
        submitting.value = false;
    }
}

function submitForm() {
    if (formViewer.value) {
        formViewer.value.submit();
    } else {
        submit({});
    }
}

function goLogin() {
    const tokenSuffix = startToken ? `?token=${encodeURIComponent(startToken)}` : '';
    const redirect = encodeURIComponent(`/start/${processId}${tokenSuffix}`);
    router.push(`/login?redirect=${redirect}`);
}

onMounted(load);
</script>

<template>
    <div ref="pageRef" class="min-h-screen flex flex-col bg-surface-50 dark:bg-zinc-950">

        <!-- ── Header ─────────────────────────────────────────────────────── -->
        <header class="bg-white dark:bg-zinc-900 border-b border-surface-200 dark:border-zinc-800 shadow-sm shrink-0">
            <div class="max-w-2xl mx-auto px-6 py-5 flex items-center gap-4">
                <img
                    v-if="logo"
                    :src="logo"
                    :alt="companyName"
                    class="shrink-0 w-auto object-contain rounded-lg"
                    :style="logoStyle"
                />
                <div v-else class="flex items-center justify-center w-14 h-14 rounded-xl shrink-0"
                     :style="{ background: accent }">
                    <i class="pi pi-sitemap text-white text-2xl" />
                </div>
                <div class="flex-1 min-w-0">
                    <p
                        v-if="branding?.showCompanyName !== false"
                        class="text-surface-800 dark:text-surface-100 leading-tight truncate"
                        :class="companyNameClass"
                    >
                        {{ companyName }}
                    </p>
                    <p v-if="processName" class="text-sm text-surface-500 dark:text-surface-400 truncate leading-snug mt-0.5">
                        {{ processName }}
                    </p>
                </div>
            </div>
        </header>

        <!-- ── Body ──────────────────────────────────────────────────────── -->
        <main class="flex-1 flex flex-col items-center px-4 py-10">
            <div class="w-full max-w-2xl">

                <!-- Loading -->
                <div v-if="state === 'loading'" class="space-y-4">
                    <div class="h-6 w-2/3 rounded bg-surface-200 dark:bg-zinc-800 animate-pulse" />
                    <div class="h-4 w-1/2 rounded bg-surface-100 dark:bg-zinc-800/60 animate-pulse" />
                    <div class="h-48 rounded-xl bg-surface-100 dark:bg-zinc-800/60 animate-pulse mt-6" />
                </div>

                <!-- Login required -->
                <div v-else-if="state === 'login-required'" class="flex flex-col items-center gap-5 py-16 text-center">
                    <div class="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <i class="pi pi-lock text-blue-500 text-2xl" />
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-surface-700 dark:text-surface-200">This link can't be opened</h2>
                        <p class="text-sm text-surface-400 mt-1 max-w-xs">
                            {{ errorMsg || 'You need to log in to access this process.' }}
                        </p>
                    </div>
                    <button
                        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                        :style="{ background: accent }"
                        @click="goLogin"
                    >
                        <i class="pi pi-sign-in" /> Log in to continue
                    </button>
                </div>

                <!-- Forbidden -->
                <div v-else-if="state === 'forbidden'" class="flex flex-col items-center gap-4 py-16 text-center">
                    <div class="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                        <i class="pi pi-ban text-red-500 text-2xl" />
                    </div>
                    <h2 class="text-lg font-semibold text-surface-700 dark:text-surface-200">Access denied</h2>
                    <p class="text-sm text-surface-400 max-w-xs">
                        Your account does not have permission to start this process.
                    </p>
                </div>

                <!-- Generic error -->
                <div v-else-if="state === 'error'" class="flex flex-col items-center gap-4 py-16 text-center">
                    <div class="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                        <i class="pi pi-exclamation-circle text-red-500 text-2xl" />
                    </div>
                    <h2 class="text-lg font-semibold text-surface-700 dark:text-surface-200">Something went wrong</h2>
                    <p class="text-sm text-surface-400 max-w-xs">{{ errorMsg }}</p>
                </div>

                <!-- Success -->
                <div v-else-if="state === 'done'" class="flex flex-col items-center gap-5 py-16 text-center">
                    <div class="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                        <i class="pi pi-check-circle text-green-500" style="font-size: 2.5rem" />
                    </div>
                    <div>
                        <h2 class="text-xl font-semibold text-surface-800 dark:text-surface-100">Process started!</h2>
                        <p class="text-sm text-surface-500 mt-1 max-w-xs">
                            Your submission has been received. You may close this page.
                        </p>
                    </div>
                </div>

                <!-- Form -->
                <div v-else-if="state === 'form'">
                    <div class="mb-6">
                        <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-50">{{ processName }}</h1>
                        <p v-if="description" class="text-sm text-surface-500 mt-1 leading-relaxed">{{ description }}</p>
                    </div>

                    <div class="rounded-2xl border border-surface-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">

                        <!-- bpmn-io form -->
                        <div v-if="formSchema" class="p-6">
                            <div ref="formRef" :class="isDark ? 'formjs-dark' : 'formjs-light'" />
                            <div class="flex justify-end mt-5 pt-4 border-t border-surface-100 dark:border-zinc-800">
                                <button
                                    class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity"
                                    :style="{ background: accent }"
                                    :class="submitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'"
                                    :disabled="submitting"
                                    @click="submitForm"
                                >
                                    <i v-if="submitting" class="pi pi-spin pi-spinner" />
                                    <i v-else class="pi pi-play" />
                                    {{ submitting ? 'Starting…' : 'Start process' }}
                                </button>
                            </div>
                        </div>

                        <!-- No form: simple start button -->
                        <div v-else class="p-6 flex flex-col items-center gap-4 py-10">
                            <p class="text-sm text-surface-500">Click below to start the process.</p>
                            <button
                                class="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white transition-opacity"
                                :style="{ background: accent }"
                                :class="submitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'"
                                :disabled="submitting"
                                @click="submitForm"
                            >
                                <i v-if="submitting" class="pi pi-spin pi-spinner" />
                                <i v-else class="pi pi-play" />
                                {{ submitting ? 'Starting…' : 'Start process' }}
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </main>

        <!-- ── Footer ─────────────────────────────────────────────────────── -->
        <footer class="shrink-0 py-4 text-center text-xs text-surface-400 dark:text-zinc-600">
            Powered by {{ companyName }}
        </footer>

    </div>
</template>
