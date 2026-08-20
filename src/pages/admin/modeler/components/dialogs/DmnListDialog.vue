<script setup lang="ts">
import { Column, Button, Tag } from 'primevue';
import { $api } from '@services/api';
import { useDirtyNavigation } from '@/composables/useDirtyNavigation';
import EntityListDialog from './EntityListDialog.vue';
import CopyableKey from './CopyableKey.vue';
import type { DecisionDefinition } from '@services/DecisionsService';
import dayjs from 'dayjs';

const visible = defineModel<boolean>('visible', { default: false });
const props   = defineProps<{ dirty?: boolean }>();
const { navigate, openInNewTab } = useDirtyNavigation(visible, () => !!props.dirty);
</script>

<template>
    <EntityListDialog
        v-model:visible="visible"
        header="DMN Decisions"
        :load="$api.decisions.getPage.bind($api.decisions)"
        empty-text="No decisions defined yet."
        search-placeholder="Search decisions…"
    >
        <template #columns>
            <!-- Name carries the decision id as a subtitle: the dialog is narrow, and a
                 separate id column starved the name of width without earning its own. -->
            <Column field="name" header="Name" sortable>
                <template #body="{ data }: { data: DecisionDefinition }">
                    <div class="leading-tight">
                        <div class="truncate">{{ data.name }}</div>
                        <CopyableKey :value="data.decisionId" />
                    </div>
                </template>
            </Column>
            <Column field="version" header="v" style="width:50px" sortable>
                <template #body="{ data }">
                    <Tag :value="`v${data.version}`" severity="secondary" class="text-xs" />
                </template>
            </Column>
            <Column field="deployedAt" header="Deployed" style="width:120px" sortable>
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ data.deployedAt ? dayjs(data.deployedAt).format('MMM D, YYYY') : '—' }}</span>
                </template>
            </Column>
            <Column style="width:90px">
                <template #body="{ data }: { data: DecisionDefinition }">
                    <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Edit'"
                        @click="navigate({ name: 'DecisionEdit', params: { id: data.id } })" />
                    <Button icon="pi pi-external-link" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Open in new tab'"
                        @click="openInNewTab({ name: 'DecisionEdit', params: { id: data.id } })" />
                </template>
            </Column>
        </template>

        <template #footer>
            <Button label="New Decision" icon="pi pi-plus" size="small"
                @click="navigate({ name: 'DecisionNew' })" />
        </template>
    </EntityListDialog>
</template>
