<script setup lang="ts">
import { Form } from '@bpmn-io/form-js';
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@/forms.scss';

import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { $taskPublic } from '@services/TaskPublicService';
import type { TaskFormData } from '@services/TaskPublicService';
import { useTheme } from '@/composables/useTheme';
import { FilesService } from '@services/FilesService';
import { resolveFormFiles } from '@/utils/form-files';

const filesService = new FilesService();

// ── Theme ─────────────────────────────────────────────────────────────────────
const { isDark } = useTheme();
const companyName = import.meta.env.VITE_COMPANY_NAME ?? 'Process Linker';

// ── Route ─────────────────────────────────────────────────────────────────────
const route = useRoute();
const token = route.params.token as string;

// ── State ─────────────────────────────────────────────────────────────────────
const data      = ref<TaskFormData | null>(null);
const loading   = ref(true);
const submitting = ref(false);

type PageState = 'loading' | 'form' | 'done' | 'used' | 'notfound' | 'error';
const state     = ref<PageState>('loading');
const errorMsg  = ref('');

// bpmn-io form
const formRef    = ref<HTMLElement | null>(null);
const formViewer = ref<Form>();

// Key-value fallback (when no BPMN form schema)
interface KVRow { key: string; value: string }
const kvRows = ref<KVRow[]>([{ key: '', value: '' }]);
function addRow()             { kvRows.value.push({ key: '', value: '' }); }
function removeRow(i: number) { kvRows.value.splice(i, 1); if (!kvRows.value.length) addRow(); }
function buildVariables(): Record<string, any> {
    return Object.fromEntries(kvRows.value.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value]));
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
    state.value = 'loading';
    try {
        data.value = await $taskPublic.getForm(token);
        state.value = 'form';
    } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404)      state.value = 'notfound';
        else if (status === 410) state.value = 'used';
        else {
            errorMsg.value = err?.response?.data?.message ?? 'Something went wrong.';
            state.value    = 'error';
        }
    } finally {
        loading.value = false;
    }
}

// ── Mount BPMN form once data is loaded ───────────────────────────────────────
watch(state, (s) => {
    if (s !== 'form' || !data.value?.formSchema) return;
    setTimeout(() => {
        if (!formRef.value) return;
        const form = new Form({ container: formRef.value });
        formViewer.value = form;
        form.importSchema(data.value!.formSchema, data.value!.formData ?? {});
        form.on('submit', async (event: { data: Record<string, any>; errors: any[] }) => {
            console.log('[TaskFormPage] form submitted, raw event.data:', event.data);
            try {
                const resolvedData = await resolveFormFiles(event.data, filesService, form);
                submit(resolvedData);
            } catch (err: any) {
                console.error('[TaskFormPage] file upload failed, aborting submit:', err);
                errorMsg.value = err?.response?.data?.message ?? err?.message ?? 'File upload failed. Please try again.';
                state.value    = 'error';
            }
        });
    }, 0);
});

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit(variables: Record<string, any>) {
    submitting.value = true;
    try {
        await $taskPublic.complete(token, variables);
        formViewer.value?.destroy();
        state.value = 'done';
    } catch (err: any) {
        const status = err?.response?.status;
        if (status === 410) { state.value = 'used'; return; }
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
        submit(buildVariables());
    }
}

onMounted(load);
</script>

<template>
    <div class="min-h-screen flex flex-col bg-surface-50 dark:bg-zinc-950">

        <!-- ── Header ─────────────────────────────────────────────────────── -->
        <header class="bg-white dark:bg-zinc-900 border-b border-surface-200 dark:border-zinc-800 shadow-sm shrink-0">
            <div class="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
                <!-- Logo / brand mark -->
                <div class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                     style="background: var(--p-primary-500, #6366f1)">
                    <i class="pi pi-sitemap text-white text-base" />
                </div>

                <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-surface-400 leading-none">
                        {{ companyName }}
                    </p>
                    <p v-if="data?.processName" class="text-sm font-semibold text-surface-800 dark:text-surface-100 truncate leading-snug mt-0.5">
                        {{ data.processName }}
                    </p>
                </div>
            </div>
        </header>

        <!-- ── Body ──────────────────────────────────────────────────────── -->
        <main class="flex-1 flex flex-col items-center px-4 py-10">
            <div class="w-full max-w-2xl">

                <!-- Loading skeleton -->
                <div v-if="state === 'loading'" class="space-y-4">
                    <div class="h-6 w-2/3 rounded bg-surface-200 dark:bg-zinc-800 animate-pulse" />
                    <div class="h-4 w-1/2 rounded bg-surface-100 dark:bg-zinc-800/60 animate-pulse" />
                    <div class="h-48 rounded-xl bg-surface-100 dark:bg-zinc-800/60 animate-pulse mt-6" />
                </div>

                <!-- Not found -->
                <div v-else-if="state === 'notfound'" class="flex flex-col items-center gap-4 py-16 text-center">
                    <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-zinc-800 flex items-center justify-center">
                        <i class="pi pi-link text-surface-400 text-2xl" />
                    </div>
                    <h2 class="text-lg font-semibold text-surface-700 dark:text-surface-200">Link not found</h2>
                    <p class="text-sm text-surface-400 max-w-xs">
                        This link is invalid or has expired. Please contact the person who sent it to you.
                    </p>
                </div>

                <!-- Already used -->
                <div v-else-if="state === 'used'" class="flex flex-col items-center gap-4 py-16 text-center">
                    <div class="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <i class="pi pi-lock text-amber-500 text-2xl" />
                    </div>
                    <h2 class="text-lg font-semibold text-surface-700 dark:text-surface-200">Already submitted</h2>
                    <p class="text-sm text-surface-400 max-w-xs">
                        This form has already been filled in and submitted. Each link can only be used once.
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
                        <h2 class="text-xl font-semibold text-surface-800 dark:text-surface-100">Thank you!</h2>
                        <p class="text-sm text-surface-500 mt-1 max-w-xs">
                            Your response has been recorded. You may close this page.
                        </p>
                    </div>
                </div>

                <!-- Form -->
                <div v-else-if="state === 'form' && data">

                    <!-- Task title + description -->
                    <div class="mb-6">
                        <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-50">
                            {{ data.taskName }}
                        </h1>
                        <p v-if="data.documentation" class="text-sm text-surface-500 mt-1 leading-relaxed">
                            {{ data.documentation }}
                        </p>
                    </div>

                    <!-- Card wrapper -->
                    <div class="rounded-2xl border border-surface-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">

                        <!-- bpmn-io form -->
                        <div v-if="data.formSchema" class="p-6">
                            <div ref="formRef" :class="isDark ? 'formjs-dark' : 'formjs-light'" />
                            <div class="flex justify-end mt-5 pt-4 border-t border-surface-100 dark:border-zinc-800">
                                <button
                                    class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity"
                                    style="background: var(--p-primary-500, #6366f1)"
                                    :class="submitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'"
                                    :disabled="submitting"
                                    @click="submitForm"
                                >
                                    <i v-if="submitting" class="pi pi-spin pi-spinner" />
                                    <i v-else class="pi pi-send" />
                                    {{ submitting ? 'Submitting…' : 'Submit' }}
                                </button>
                            </div>
                        </div>

                        <!-- No BPMN form: key-value variable editor -->
                        <div v-else class="p-6">
                            <p class="text-xs text-surface-400 mb-4">
                                Add any information relevant to this task, or submit with no variables.
                            </p>

                            <div class="space-y-2 mb-3">
                                <div v-for="(row, i) in kvRows" :key="i" class="flex items-center gap-2">
                                    <input
                                        v-model="row.key"
                                        type="text"
                                        placeholder="Field name"
                                        class="flex-1 rounded-lg border border-surface-200 dark:border-zinc-700 bg-surface-50 dark:bg-zinc-800 text-sm px-3 py-2 focus:outline-none focus:ring-1 min-w-0 text-surface-900 dark:text-surface-100"
                                        style="--tw-ring-color: var(--p-primary-500, #6366f1)"
                                    />
                                    <input
                                        v-model="row.value"
                                        type="text"
                                        placeholder="Value"
                                        class="flex-1 rounded-lg border border-surface-200 dark:border-zinc-700 bg-surface-50 dark:bg-zinc-800 text-sm px-3 py-2 focus:outline-none focus:ring-1 min-w-0 text-surface-900 dark:text-surface-100"
                                        style="--tw-ring-color: var(--p-primary-500, #6366f1)"
                                    />
                                    <button
                                        class="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                                        @click="removeRow(i)"
                                    >
                                        <i class="pi pi-times text-xs" />
                                    </button>
                                </div>
                            </div>

                            <button
                                class="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors mb-6"
                                @click="addRow"
                            >
                                <i class="pi pi-plus text-[10px]" /> Add field
                            </button>

                            <div class="flex justify-end pt-4 border-t border-surface-100 dark:border-zinc-800">
                                <button
                                    class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity"
                                    style="background: var(--p-primary-500, #6366f1)"
                                    :class="submitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'"
                                    :disabled="submitting"
                                    @click="submitForm"
                                >
                                    <i v-if="submitting" class="pi pi-spin pi-spinner" />
                                    <i v-else class="pi pi-send" />
                                    {{ submitting ? 'Submitting…' : 'Submit' }}
                                </button>
                            </div>
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
