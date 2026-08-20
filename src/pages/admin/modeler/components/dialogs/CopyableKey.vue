<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';

/**
 * The grey mono subtitle under an entity's name, with click-to-copy.
 *
 * These keys are what you paste into a BPMN element's properties panel, so the
 * dialog is the natural place to grab one. The icon stays dim until hover to
 * keep a ten-row table from looking like a toolbar.
 */
const props = defineProps<{ value?: string | null }>();

const copied = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

async function copy() {
    if (!props.value) return;
    try {
        await navigator.clipboard.writeText(props.value);
    } catch {
        return;   // clipboard unavailable (non-secure context) — leave the icon alone
    }
    copied.value = true;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { copied.value = false; }, 1500);
}

onBeforeUnmount(() => clearTimeout(resetTimer));
</script>

<template>
    <div v-if="value" class="copyable-key">
        <span class="font-mono text-sm text-surface-400 truncate">{{ value }}</span>
        <button
            type="button"
            class="copyable-key__btn"
            :class="{ 'copyable-key__btn--copied': copied }"
            :aria-label="copied ? 'Copied' : `Copy ${value}`"
            v-tooltip.top="copied ? 'Copied' : 'Copy'"
            @click.stop="copy"
        >
            <i :class="['pi', copied ? 'pi-check' : 'pi-copy']" />
        </button>
    </div>
</template>

<style scoped>
.copyable-key {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
}

.copyable-key__btn {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border: 0;
    background: none;
    cursor: pointer;
    line-height: 1;
    border-radius: 3px;
    color: var(--p-text-muted-color);
    opacity: 0.35;
    transition: opacity 0.12s, color 0.12s;
}

.copyable-key:hover .copyable-key__btn,
.copyable-key__btn:focus-visible {
    opacity: 1;
}

.copyable-key__btn:hover {
    color: var(--p-primary-color);
}

.copyable-key__btn--copied {
    opacity: 1;
    color: var(--p-green-500, #22c55e);
}

.copyable-key__btn i {
    font-size: 0.8rem;
}
</style>
