<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { DataTable, Column, Tag } from 'primevue';
import { extractDocuments } from '@/utils/form-files';
import { $api } from '@services/api';

const props = defineProps<{
    variables?: { key: string; value: any }[];
}>();

const documents = computed(() => extractDocuments(props.variables ?? []));

// r2Key → fresh signedUrl, hydrated on mount
const signedUrls = ref<Record<string, string>>({});

onMounted(async () => {
    const docs = documents.value;
    if (!docs.length) return;

    const keys: Record<string, string> = {};
    for (const { docKey, file } of docs) {
        if (file.r2Key) keys[docKey] = file.r2Key;
    }

    if (Object.keys(keys).length) {
        signedUrls.value = await $api.files.refreshSignedUrls(keys);
    }
});

function urlFor(docKey: string): string {
    return signedUrls.value[docKey] ?? '';
}

function formatSize(bytes: number): string {
    if (!bytes)              return '';
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
    <div class="pt-3">
        <DataTable
            :value="documents"
            size="small"
            :empty-message="'No documents uploaded yet.'"
        >
            <Column header="Field" style="width: 160px">
                <template #body="{ data }">
                    <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-(--layout-accent-color)">
                        {{ data.fieldKey }}
                    </code>
                </template>
            </Column>

            <Column header="Document" style="width: 160px">
                <template #body="{ data }">
                    <span class="text-sm text-surface-500 font-mono">{{ data.docKey !== data.fieldKey ? data.docKey : '—' }}</span>
                </template>
            </Column>

            <Column header="Filename">
                <template #body="{ data }">
                    <a
                        v-if="urlFor(data.docKey)"
                        :href="urlFor(data.docKey)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-sm flex items-center gap-1.5 hover:underline"
                        style="color: var(--layout-accent-color);"
                    >
                        <i class="pi pi-file text-xs" />
                        {{ data.file.filename }}
                    </a>
                    <span v-else class="text-sm text-surface-400 flex items-center gap-1.5">
                        <i class="pi pi-spin pi-spinner text-xs" />
                        {{ data.file.filename }}
                    </span>
                </template>
            </Column>

            <Column header="Size" style="width: 90px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ formatSize(data.file.size) }}</span>
                </template>
            </Column>

            <Column header="Type" style="width: 130px">
                <template #body="{ data }">
                    <Tag :value="data.file.mimeType" severity="secondary" style="font-size: 0.7rem;" />
                </template>
            </Column>

            <Column header="" style="width: 48px">
                <template #body="{ data }">
                    <a
                        v-if="urlFor(data.docKey)"
                        :href="urlFor(data.docKey)"
                        target="_blank"
                        rel="noopener noreferrer"
                        v-tooltip.top="'Open'"
                    >
                        <i class="pi pi-external-link text-surface-400 hover:text-(--layout-accent-color)" />
                    </a>
                </template>
            </Column>
        </DataTable>
    </div>
</template>
