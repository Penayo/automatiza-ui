<script setup lang="ts">
import { Button, useToast } from 'primevue';

const props = defineProps<{
    variables: { key: string; value: any }[] | undefined;
}>();

const toast = useToast();

const toObject = () => Object.fromEntries((props.variables ?? []).map((v) => [v.key, v.value]));

async function writeClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
}

async function copy(stringified: boolean) {
    const json = JSON.stringify(toObject(), null, stringified ? 0 : 2);
    // Stringified = the JSON wrapped as a string literal, ready to paste where a string is expected.
    await writeClipboard(stringified ? JSON.stringify(json) : json);
    toast.add({ severity: 'success', summary: 'Copied', detail: stringified ? 'Variables copied as a JSON string.' : 'Variables copied as JSON.', life: 2000 });
}
</script>

<template>
    <div class="flex items-center gap-1">
        <Button label="JSON" icon="pi pi-copy" size="small" severity="secondary" variant="text" class="py-0"
            :disabled="!variables?.length" v-tooltip.top="'Copy variables as JSON'" @click="copy(false)" />
        <Button label="Stringified" icon="pi pi-copy" size="small" severity="secondary" variant="text" class="py-0"
            :disabled="!variables?.length" v-tooltip.top="'Copy variables as a JSON string'" @click="copy(true)" />
    </div>
</template>
