<script setup lang="ts">
import { Column, Button, Tag } from 'primevue';
import { $api } from '@services/api';
import { useDirtyNavigation } from '@/composables/useDirtyNavigation';
import EntityListDialog from './EntityListDialog.vue';
import CopyableKey from './CopyableKey.vue';

const visible = defineModel<boolean>('visible', { default: false });
const props   = defineProps<{ dirty?: boolean }>();
const { navigate, openInNewTab } = useDirtyNavigation(visible, () => !!props.dirty);
</script>

<template>
    <EntityListDialog
        v-model:visible="visible"
        header="Form Variables"
        :load="$api.formVariables.getPage.bind($api.formVariables)"
        empty-text="No form variables defined yet."
        search-placeholder="Search variables…"
    >
        <template #columns>
            <!-- Key sits under the label; description is dropped — it never fit the
                 dialog's width and is available in the manage screen. -->
            <Column field="label" header="Label" sortable>
                <template #body="{ data }">
                    <div class="leading-tight">
                        <div class="truncate">{{ data.label }}</div>
                        <CopyableKey :value="data.key" />
                    </div>
                </template>
            </Column>
            <Column header="Options" style="width:90px">
                <template #body="{ data }">
                    <Tag :value="`${data.items?.length ?? 0} opts`" severity="secondary" class="text-xs" />
                </template>
            </Column>
            <Column style="width:90px">
                <template #body>
                    <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Manage'"
                        @click="navigate({ name: 'FormVariablesIndex' })" />
                    <Button icon="pi pi-external-link" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Open in new tab'"
                        @click="openInNewTab({ name: 'FormVariablesIndex' })" />
                </template>
            </Column>
        </template>

        <template #footer>
            <Button label="Manage Variables" icon="pi pi-list" size="small"
                @click="navigate({ name: 'FormVariablesIndex' })" />
        </template>
    </EntityListDialog>
</template>
