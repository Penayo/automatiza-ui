<script setup lang="ts">
import { Column, Button } from 'primevue';
import { $api } from '@services/api';
import { useDirtyNavigation } from '@/composables/useDirtyNavigation';
import EntityListDialog from './EntityListDialog.vue';
import CopyableKey from './CopyableKey.vue';
import type { ReportDefinition } from '@services/ReportsService';
import dayjs from 'dayjs';

const visible = defineModel<boolean>('visible', { default: false });
const props   = defineProps<{ dirty?: boolean }>();
const { navigate, openInNewTab } = useDirtyNavigation(visible, () => !!props.dirty);
</script>

<template>
    <EntityListDialog
        v-model:visible="visible"
        header="Report Definitions"
        :load="$api.reports.getPage.bind($api.reports)"
        empty-text="No reports defined yet."
        search-placeholder="Search reports…"
    >
        <template #columns>
            <!-- Key rides along under the name; description is dropped — it never fit
                 in this dialog's width and is one click away in the editor. -->
            <Column field="name" header="Name" sortable>
                <template #body="{ data }: { data: ReportDefinition }">
                    <div class="leading-tight">
                        <div class="truncate">{{ data.name }}</div>
                        <CopyableKey :value="data.key" />
                    </div>
                </template>
            </Column>
            <Column field="createdAt" header="Created" style="width:120px" sortable>
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ data.createdAt ? dayjs(data.createdAt).format('MMM D, YYYY') : '—' }}</span>
                </template>
            </Column>
            <Column style="width:90px">
                <template #body="{ data }: { data: ReportDefinition }">
                    <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Edit'" @click="navigate({ name: 'ReportEdit', params: { id: data.id } })" />
                    <Button icon="pi pi-external-link" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Open in new tab'"
                        @click="openInNewTab({ name: 'ReportEdit', params: { id: data.id } })" />
                </template>
            </Column>
        </template>

        <template #footer>
            <Button label="New Report" icon="pi pi-plus" size="small"
                @click="navigate({ name: 'ReportNew' })" />
        </template>
    </EntityListDialog>
</template>
