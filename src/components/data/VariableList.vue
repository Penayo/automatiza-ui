<script setup lang="ts">
import JsonEditor from 'vue3-ts-jsoneditor';

defineProps<{
    variables: { key: string; value: any }[] | undefined;
}>();

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
            <span class="w-48 shrink-0 font-mono font-semibold text-zinc-500 dark:text-zinc-400 truncate" :title="v.key">
                {{ v.key }}
            </span>
            <div v-if="isObject(v.value)" class="flex-1 pb-5">
                <json-editor
                    :modelValue="v.value"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    :statusBar="false"
                    :darkTheme="true"
                    :readOnly="true"
                    height="130"
                />
            </div>
            <span v-else class="flex-1 font-mono text-zinc-700 dark:text-zinc-200 break-all">
                {{ display(v.value) }}
            </span>
        </div>
    </div>
</template>
