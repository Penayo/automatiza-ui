<script setup lang="ts">
import { ref, computed } from 'vue';
import { Drawer } from 'primevue';
import { marked } from 'marked';

import feelMd         from '@docs/feel-expressions.md?raw';
import timersMd       from '@docs/timer-events.md?raw';
import variablesMd    from '@docs/process-variables.md?raw';
import serviceTasksMd from '@docs/service-tasks.md?raw';

const pages = [
    { slug: 'feel-expressions',  label: 'FEEL Expressions',  icon: 'pi pi-code',     content: feelMd },
    { slug: 'timer-events',      label: 'Timer Events',       icon: 'pi pi-clock',    content: timersMd },
    { slug: 'process-variables', label: 'Process Variables',  icon: 'pi pi-database', content: variablesMd },
    { slug: 'service-tasks',     label: 'Service Tasks',      icon: 'pi pi-cog',      content: serviceTasksMd },
];

const visible = defineModel<boolean>('visible', { default: false });
const activePage = ref(pages[0]);

const html = computed(() => marked.parse(activePage.value.content) as string);
</script>

<template>
    <!-- Slide-out drawer -->
    <Drawer
        v-model:visible="visible"
        position="right"
        :style="{ width: '720px' }"
        :pt="{ root: { class: 'flex flex-col' } }"
    >
        <template #header>
            <div class="flex items-center gap-2">
                <i class="pi pi-book text-primary" />
                <span class="font-semibold text-base">Documentation</span>
            </div>
        </template>

        <div class="flex h-full overflow-hidden -m-5">
            <!-- Topic nav -->
            <nav class="w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 flex flex-col gap-1 overflow-y-auto">
                <button
                    v-for="page in pages"
                    :key="page.slug"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors w-full"
                    :class="activePage.slug === page.slug
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
                    @click="activePage = page"
                >
                    <i :class="[page.icon, 'shrink-0']" />
                    <span class="leading-tight">{{ page.label }}</span>
                </button>
            </nav>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6">
                <div class="prose text-sm" v-html="html" />
            </div>
        </div>
    </Drawer>
</template>

<style scoped>
.prose :deep(h1) { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--p-text-color, inherit); }
.prose :deep(h2) { font-size: 1.05rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.4rem; padding-bottom: 0.2rem; border-bottom: 1px solid var(--p-surface-border, #e5e7eb); color: var(--p-text-color, inherit); }
.prose :deep(h3) { font-size: 0.95rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.2rem; color: var(--p-text-color, inherit); }
.prose :deep(p)  { margin-bottom: 0.6rem; line-height: 1.7; color: var(--p-text-color, inherit); }
.prose :deep(ul), .prose :deep(ol) { padding-left: 1.25rem; margin-bottom: 0.6rem; }
.prose :deep(li) { margin-bottom: 0.2rem; line-height: 1.6; }
.prose :deep(code) { font-family: ui-monospace, monospace; font-size: 0.82em; background: #ede9fe; color: #4f46e5; padding: 0.1em 0.35em; border-radius: 4px; }
:global(.dark) .prose :deep(code) { background: #3b3653; color: #c4b5fd; }
.prose :deep(pre) { background: var(--p-surface-900, #18181b); color: #e4e4e7; padding: 0.85rem 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 0.75rem; font-size: 0.82rem; line-height: 1.6; }
.prose :deep(pre code) { background: none; color: inherit; padding: 0; }
.prose :deep(table) { width: 100%; border-collapse: collapse; margin-bottom: 0.75rem; font-size: 0.85rem; }
.prose :deep(th) { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 2px solid var(--p-surface-border, #e5e7eb); font-weight: 600; }
.prose :deep(td) { padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--p-surface-border, #e5e7eb); vertical-align: top; }
.prose :deep(hr) { border: none; border-top: 1px solid var(--p-surface-border, #e5e7eb); margin: 1.25rem 0; }
.prose :deep(strong) { font-weight: 600; }
</style>
