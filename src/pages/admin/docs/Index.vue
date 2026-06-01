<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';

import feelMd          from '@docs/feel-expressions.md?raw';
import timersMd        from '@docs/timer-events.md?raw';
import variablesMd     from '@docs/process-variables.md?raw';
import serviceTasksMd  from '@docs/service-tasks.md?raw';

const pages = [
    { slug: 'feel-expressions', label: 'FEEL Expressions',   icon: 'pi pi-code',        content: feelMd },
    { slug: 'timer-events',     label: 'Timer Events',        icon: 'pi pi-clock',       content: timersMd },
    { slug: 'process-variables',label: 'Process Variables',   icon: 'pi pi-database',    content: variablesMd },
    { slug: 'service-tasks',    label: 'Service Tasks',       icon: 'pi pi-cog',         content: serviceTasksMd },
];

const route  = useRoute();
const router = useRouter();

const activePage = computed(() =>
    pages.find(p => p.slug === route.params.page) ?? pages[0]
);

const html = computed(() => marked.parse(activePage.value.content) as string);

// Redirect bare /admin/docs to the first page
watch(() => route.params.page, (page) => {
    if (!page) router.replace({ name: 'DocsPage', params: { page: pages[0].slug } });
}, { immediate: true });
</script>

<template>
    <div class="flex h-full">
        <!-- Docs sidebar -->
        <nav class="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-1 overflow-y-auto">
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2 mb-2">Documentation</p>
            <button
                v-for="page in pages"
                :key="page.slug"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors w-full"
                :class="activePage.slug === page.slug
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
                @click="router.push({ name: 'DocsPage', params: { page: page.slug } })"
            >
                <i :class="[page.icon, 'text-base shrink-0']" />
                {{ page.label }}
            </button>
        </nav>

        <!-- Content area -->
        <main class="flex-1 overflow-y-auto p-8 max-w-4xl">
            <div class="prose" v-html="html" />
        </main>
    </div>
</template>

<style scoped>
.prose :deep(h1) {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--p-text-color, inherit);
}
.prose :deep(h2) {
    font-size: 1.2rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--p-surface-border, #e5e7eb);
    color: var(--p-text-color, inherit);
}
.prose :deep(h3) {
    font-size: 1rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.25rem;
    color: var(--p-text-color, inherit);
}
.prose :deep(p) {
    margin-bottom: 0.75rem;
    line-height: 1.7;
    color: var(--p-text-color, inherit);
}
.prose :deep(ul), .prose :deep(ol) {
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
}
.prose :deep(li) {
    margin-bottom: 0.25rem;
    line-height: 1.6;
}
.prose :deep(code) {
    font-family: ui-monospace, monospace;
    font-size: 0.85em;
    background: #ede9fe;
    color: #4f46e5;
    padding: 0.1em 0.4em;
    border-radius: 4px;
}
:global(.dark) .prose :deep(code) {
    background: #3b3653;
    color: #c4b5fd;
}
.prose :deep(pre) {
    background: var(--p-surface-900, #18181b);
    color: #e4e4e7;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    overflow-x: auto;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    line-height: 1.6;
}
.prose :deep(pre code) {
    background: none;
    color: inherit;
    padding: 0;
}
.prose :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
    font-size: 0.9rem;
}
.prose :deep(th) {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid var(--p-surface-border, #e5e7eb);
    font-weight: 600;
    color: var(--p-text-color, inherit);
}
.prose :deep(td) {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--p-surface-border, #e5e7eb);
    vertical-align: top;
}
.prose :deep(hr) {
    border: none;
    border-top: 1px solid var(--p-surface-border, #e5e7eb);
    margin: 1.5rem 0;
}
.prose :deep(strong) {
    font-weight: 600;
}
.prose :deep(a) {
    color: var(--p-primary-color, #6366f1);
    text-decoration: underline;
}
</style>
