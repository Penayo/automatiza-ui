<script setup lang="ts">
import { Column, Button } from 'primevue';
import { $api } from '@services/api';
import { useDirtyNavigation } from '@/composables/useDirtyNavigation';
import EntityListDialog from './EntityListDialog.vue';
import type { EmailTemplateDefinition } from '@services/EmailTemplatesService';
import dayjs from 'dayjs';

const visible  = defineModel<boolean>('visible', { default: false });
const props    = defineProps<{ dirty?: boolean }>();
const navigate = useDirtyNavigation(visible, () => !!props.dirty);
</script>

<template>
    <EntityListDialog
        v-model:visible="visible"
        header="Email Templates"
        :load="$api.emailTemplates.getPage.bind($api.emailTemplates)"
        empty-text="No email templates defined yet."
        search-placeholder="Search templates…"
    >
        <template #columns>
            <Column field="key"  header="Key"  class="font-mono text-xs" sortable />
            <Column field="name" header="Name" sortable />
            <Column field="description" header="Description" class="text-surface-400 text-sm" />
            <Column field="createdAt" header="Created" style="width:120px" sortable>
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ data.createdAt ? dayjs(data.createdAt).format('MMM D, YYYY') : '—' }}</span>
                </template>
            </Column>
            <Column style="width:60px">
                <template #body="{ data }: { data: EmailTemplateDefinition }">
                    <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Edit'"
                        @click="navigate({ name: 'EmailTemplateEdit', params: { id: data.id } })" />
                </template>
            </Column>
        </template>

        <template #footer>
            <Button label="New Template" icon="pi pi-plus" size="small"
                @click="navigate({ name: 'EmailTemplateNew' })" />
        </template>
    </EntityListDialog>
</template>
