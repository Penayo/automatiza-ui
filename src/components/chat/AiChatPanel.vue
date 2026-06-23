<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import { marked, type Renderer } from 'marked';
import hljs from 'highlight.js';

// ── Code block registry — avoids encoding issues with data attributes ────────
const codeRegistry = new Map<string, string>();
let codeSeq = 0;

// ── Markdown renderer with highlight.js code blocks ───────────────────────────
const renderer = new (marked.Renderer as unknown as new () => Renderer)();

(renderer as any).code = ({ text, lang }: { text: string; lang?: string }) => {
    const id = `cb${++codeSeq}`;
    codeRegistry.set(id, text);
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    return `<div class="ai-code-wrapper"><button class="ai-copy-btn" data-cbid="${id}"><i class="pi pi-copy"></i> Copy</button><pre class="ai-pre"><code class="hljs language-${language}">${highlighted}</code></pre></div>`;
};

(renderer as any).codespan = ({ text }: { text: string }) =>
    `<code class="ai-inline-code">${text}</code>`;

marked.use({ renderer, breaks: true, gfm: true });

function renderMarkdown(text: string): string {
    return marked.parse(text) as string;
}

export type AiContextType = 'form-designer' | 'bpmn-designer' | 'dmn-designer' | 'report' | 'email';

const props = defineProps<{
    contextType: AiContextType;
    context:     Record<string, any>;
}>();

interface Message {
    role: 'user' | 'assistant';
    text: string;
}

const PANEL_LABELS: Record<AiContextType, string> = {
    'form-designer':  'Form Assistant',
    'bpmn-designer':  'Process Assistant',
    'dmn-designer':   'Decision Assistant',
    'report':         'Report Assistant',
    'email':          'Email Assistant',
};

const PANEL_HINTS: Record<AiContextType, string> = {
    'form-designer':  'Ask me anything about this schema — field types, validation, UI options, custom widgets…',
    'bpmn-designer':  'Ask about BPMN elements, gateway conditions, service task config…',
    'dmn-designer':   'Ask about decision table inputs, outputs, FEEL expressions, hit policies, rule design…',
    'report':         'Ask about report layout, filters, aggregations…',
    'email':          'Ask about template variables, email copy, formatting…',
};

const open      = ref(false);
const messages  = ref<Message[]>([]);
const input     = ref('');
const loading   = ref(false);
const streaming = ref('');
const msgsEl    = ref<HTMLElement>();
const inputEl   = ref<HTMLTextAreaElement>();

const label = computed(() => PANEL_LABELS[props.contextType]);
const hint  = computed(() => PANEL_HINTS[props.contextType]);

const baseUrl = import.meta.env.VITE_API_HOST as string;

function authHeader(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function scrollToBottom() {
    await nextTick();
    if (msgsEl.value) msgsEl.value.scrollTop = msgsEl.value.scrollHeight;
}

function autoResize(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function resetInputHeight() {
    if (inputEl.value) inputEl.value.style.height = 'auto';
}

async function send() {
    const text = input.value.trim();
    if (!text || loading.value) return;

    messages.value.push({ role: 'user', text });
    input.value = '';
    resetInputHeight();
    loading.value   = true;
    streaming.value = '';
    await scrollToBottom();

    try {
        const res = await fetch(`${baseUrl}/bpmn/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({
                contextType: props.contextType,
                context:     props.context,
                messages:    messages.value.map(m => ({ role: m.role, content: m.text })),
            }),
        });

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() ?? '';

            for (const part of parts) {
                if (!part.startsWith('data: ') || part.includes('[DONE]')) continue;
                try {
                    const { text } = JSON.parse(part.slice(6));
                    if (text) {
                        streaming.value += text;
                        await scrollToBottom();
                    }
                } catch { /* malformed chunk — skip */ }
            }
        }

        if (streaming.value) {
            messages.value.push({ role: 'assistant', text: streaming.value });
            streaming.value = '';
        }
    } catch {
        messages.value.push({ role: 'assistant', text: 'Sorry, something went wrong. Please try again.' });
    } finally {
        loading.value = false;
        await scrollToBottom();
    }
}

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
    }
}

function toggleOpen() {
    open.value = !open.value;
    if (open.value) nextTick(() => inputEl.value?.focus());
}

const copiedId = ref<string | null>(null);

function handleBubbleClick(e: MouseEvent) {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.ai-copy-btn');
    if (!btn) return;

    const id   = btn.dataset.cbid ?? '';
    const code = codeRegistry.get(id) ?? '';
    if (!code) return;

    const write = navigator.clipboard?.writeText(code) ?? Promise.reject();
    write.catch(() => {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });

    copiedId.value = id;
    setTimeout(() => { copiedId.value = null; }, 2000);
}
</script>

<template>
    <Teleport to="body">

        <!-- Drawer — slides in from the right, full viewport height -->
        <Transition name="drawer">
            <div
                v-if="open"
                class="fixed top-0 right-0 bottom-0 flex flex-col
                        border-l border-surface-200 dark:border-zinc-700
                        bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
                style="width: 460px; position: fixed;z-index: 1000;"
            >
                <!-- Copied indicator -->
                <Transition name="copied-toast">
                    <div
                        v-if="copiedId"
                        class="absolute top-14 left-1/2 -translate-x-1/2 z-10
                                flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg
                                 bg-emerald-500 text-white text-xs font-medium pointer-events-none"
                    >
                        <i class="pi pi-check" style="font-size: 0.65rem" />
                        Copied to clipboard
                    </div>
                </Transition>

                <!-- Header -->
                <div class="flex items-center justify-between px-5 py-3.5 shrink-0
                            bg-emerald-600 dark:bg-emerald-700">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-sparkles text-white" style="font-size: 0.9rem" />
                        <span class="font-semibold text-sm text-white">{{ label }}</span>
                    </div>
                    <button
                        @click="open = false"
                        class="text-white/60 hover:text-white transition-colors p-1 rounded"
                    >
                        <i class="pi pi-times" style="font-size: 0.75rem" />
                    </button>
                </div>

                <!-- Messages -->
                <div
                    ref="msgsEl"
                    class="flex-1 min-h-0 overflow-y-auto px-5 py-5 flex flex-col gap-4"
                    @click="handleBubbleClick"
                >
                    <!-- Empty state -->
                    <div
                        v-if="!messages.length && !streaming && !loading"
                        class="flex flex-col items-center justify-center h-full gap-3 text-center px-6"
                    >
                        <div class="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40
                                    flex items-center justify-center">
                            <i class="pi pi-sparkles text-emerald-500" style="font-size: 1.1rem" />
                        </div>
                        <p class="text-sm leading-relaxed text-surface-400 dark:text-zinc-500">
                            {{ hint }}
                        </p>
                    </div>

                    <!-- Message bubbles -->
                    <template v-for="(msg, i) in messages" :key="i">
                        <!-- User -->
                        <div v-if="msg.role === 'user'" class="flex justify-end">
                            <div class="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm
                                        text-sm text-white leading-relaxed
                                        bg-emerald-600 dark:bg-emerald-700">
                                {{ msg.text }}
                            </div>
                        </div>
                        <!-- Assistant -->
                        <div v-else class="flex justify-start">
                            <div class="ai-bubble w-full px-4 py-2.5 rounded-2xl rounded-tl-sm
                                        text-sm leading-relaxed
                                        text-surface-800 dark:text-zinc-200
                                        bg-surface-100 dark:bg-zinc-800"
                                 v-html="renderMarkdown(msg.text)" />
                        </div>
                    </template>

                    <!-- Streaming bubble — plain text while typing, rendered after done -->
                    <div v-if="streaming" class="flex justify-start">
                        <div class="max-w-[88%] px-4 py-2.5 rounded-2xl rounded-tl-sm
                                    text-sm leading-relaxed whitespace-pre-wrap
                                    text-surface-800 dark:text-zinc-200
                                    bg-surface-100 dark:bg-zinc-800">
                            {{ streaming }}<span class="ai-cursor inline-block w-1.5 h-4 ml-0.5 bg-emerald-500 align-middle rounded-sm" />
                        </div>
                    </div>

                    <!-- Thinking dots -->
                    <div v-if="loading && !streaming" class="flex justify-start">
                        <div class="px-4 py-3.5 rounded-2xl rounded-tl-sm
                                    bg-surface-100 dark:bg-zinc-800
                                    flex gap-1.5 items-center">
                            <span class="ai-dot" style="animation-delay:   0ms" />
                            <span class="ai-dot" style="animation-delay: 160ms" />
                            <span class="ai-dot" style="animation-delay: 320ms" />
                        </div>
                    </div>
                </div>

                <!-- Input area -->
                <div class="px-4 pb-4 pt-3 shrink-0 border-t border-surface-200 dark:border-zinc-700">
                    <div class="flex items-end gap-2 px-3 py-2.5 rounded-xl
                                border border-surface-200 dark:border-zinc-700
                                bg-surface-50 dark:bg-zinc-800
                                focus-within:border-emerald-400 dark:focus-within:border-emerald-500
                                transition-colors">
                        <textarea
                            ref="inputEl"
                            v-model="input"
                            placeholder="Ask about this form…"
                            rows="1"
                            class="flex-1 bg-transparent text-sm leading-relaxed resize-none outline-none
                                   text-surface-800 dark:text-zinc-200
                                   placeholder:text-surface-400 dark:placeholder:text-zinc-500"
                            style="max-height: 120px; overflow-y: auto;"
                            @keydown="handleKeydown"
                            @input="autoResize"
                        />
                        <button
                            @click="send"
                            :disabled="!input.trim() || loading"
                            class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                                   transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            :class="input.trim() && !loading
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-surface-200 dark:bg-zinc-700 text-surface-400'"
                        >
                            <i class="pi pi-send" style="font-size: 0.65rem" />
                        </button>
                    </div>
                    <p class="text-center text-xs mt-2 text-surface-300 dark:text-zinc-600">
                        Enter to send · Shift+Enter for new line
                    </p>
                </div>
            </div>
        </Transition>

        <!-- Floating action button -->
        <button
            @click="toggleOpen"
            class="fixed bottom-6 right-6 rounded-full shadow-xl
                   flex items-center justify-center
                   transition-all duration-200 active:scale-95"
            :class="open
                ? 'bg-zinc-700 dark:bg-zinc-600 hover:bg-zinc-800 dark:hover:bg-zinc-500'
                : 'bg-emerald-600 hover:bg-emerald-700'"
            style="width: 52px; height: 52px; z-index: 1000;"
            :title="open ? 'Close assistant' : 'Open AI assistant'"
        >
            <Transition name="icon-swap" mode="out-in">
                <i v-if="open"  key="close"    class="pi pi-times    text-white" style="font-size: 1rem" />
                <i v-else        key="sparkles" class="pi pi-sparkles text-white" style="font-size: 1rem" />
            </Transition>
        </button>

    </Teleport>
</template>

<style>
/* highlight.js base theme — loaded once, non-scoped */
@import 'highlight.js/styles/atom-one-dark.min.css';
</style>

<style scoped>
/* ── Markdown prose inside assistant bubbles ─────────────────────────────── */
:deep(.ai-bubble) p        { margin: 0 0 0.5em; }
:deep(.ai-bubble) p:last-child { margin-bottom: 0; }
:deep(.ai-bubble) ul,
:deep(.ai-bubble) ol       { margin: 0.4em 0 0.4em 1.2em; padding: 0; }
:deep(.ai-bubble) li       { margin-bottom: 0.2em; }
:deep(.ai-bubble) strong   { font-weight: 600; }
:deep(.ai-bubble) em       { font-style: italic; }

/* Code block wrapper — positions the copy button */
:deep(.ai-code-wrapper) {
    position: relative;
    margin: 0.6em 0;
}
:deep(.ai-copy-btn) {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.7rem;
    padding: 3px 9px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    opacity: 0.45;
    transition: opacity 0.15s, background 0.15s, color 0.15s;
    background: rgba(255,255,255,0.12);
    color: #d4d4d8;
    font-family: inherit;
}
:deep(.ai-copy-btn:hover) { opacity: 1; background: rgba(255,255,255,0.2); }

/* Code blocks */
:deep(.ai-pre) {
    margin: 0;
    border-radius: 8px;
    overflow: hidden;
    font-size: 0.78rem;
}
:deep(.ai-pre) .hljs {
    padding: 0.8em 1em;
    border-radius: 8px;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    line-height: 1.55;
    /* slightly lighter background to stand out from bubble */
    background: #1e2430;
}

/* Inline code */
:deep(.ai-inline-code) {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 0.82em;
    padding: 0.1em 0.35em;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.12);
}
.dark :deep(.ai-inline-code) {
    background: rgba(255, 255, 255, 0.1);
}

/* Drawer slides in from the right */
.drawer-enter-active,
.drawer-leave-active { transition: transform 0.25s ease; }
.drawer-enter-from,
.drawer-leave-to     { transform: translateX(100%); }

/* Icon swap in FAB */
.icon-swap-enter-active,
.icon-swap-leave-active { transition: opacity 0.1s ease; }
.icon-swap-enter-from,
.icon-swap-leave-to     { opacity: 0; }

/* Streaming cursor blink */
.ai-cursor { animation: blink 0.9s step-end infinite; }
@keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
}

/* Copied toast */
.copied-toast-enter-active,
.copied-toast-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.copied-toast-enter-from,
.copied-toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(-6px); }

/* Thinking dots bounce */
.ai-dot {
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    background-color: var(--p-surface-400, #a1a1aa);
    animation: dot-bounce 1.1s ease-in-out infinite;
}
@keyframes dot-bounce {
    0%, 80%, 100% { transform: translateY(0);    opacity: 0.45; }
    40%           { transform: translateY(-6px); opacity: 1;    }
}
</style>
