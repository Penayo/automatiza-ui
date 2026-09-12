<script setup lang="ts">
import { reactive } from 'vue';
import JsonEditor from 'vue3-ts-jsoneditor';

defineProps<{
    variables: { key: string; value: any }[] | undefined;
}>();

const COLLAPSED_HEIGHT = '130';
const EXPANDED_HEIGHT = '420';

const expanded = reactive(new Set<string>());

const toggle = (key: string) => {
    if (expanded.has(key)) expanded.delete(key);
    else expanded.add(key);
};

const isObject = (value: any) => value !== null && typeof value === 'object';

const display = (value: any): string => {
    if (value === null || value === undefined) return '—';
    return String(value);
};
</script>

<template>
    <div v-if="!variables?.length" class="text-sm text-zinc-400 italic">No variables.</div>
    <div v-else class="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div
            v-for="v in variables"
            :key="v.key"
            class="flex items-start gap-3 px-3 py-2 text-sm"
        >
            <div class="w-48 shrink-0 flex items-start gap-1">
                <button
                    v-if="isObject(v.value)"
                    type="button"
                    class="mt-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    :title="expanded.has(v.key) ? 'Collapse' : 'Expand'"
                    :aria-expanded="expanded.has(v.key)"
                    @click="toggle(v.key)"
                >
                    <i :class="expanded.has(v.key) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[10px]" />
                </button>
                <span class="font-mono font-semibold text-zinc-500 dark:text-zinc-400 truncate" :title="v.key">
                    {{ v.key }}
                </span>
            </div>
            <div v-if="isObject(v.value)" class="flex-1 pb-5">
                <json-editor
                    :modelValue="v.value"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    :statusBar="false"
                    :darkTheme="true"
                    :readOnly="true"
                    :height="expanded.has(v.key) ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT"
                />
            </div>
            <span v-else class="flex-1 font-mono text-zinc-700 dark:text-zinc-200 break-all">
                {{ display(v.value) }}
            </span>
        </div>
    </div>
</template>
