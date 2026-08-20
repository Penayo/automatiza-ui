<script setup lang="ts">
import { Column, Button, Tag } from 'primevue';
import { $api } from '@services/api';
import { useDirtyNavigation } from '@/composables/useDirtyNavigation';
import EntityListDialog from './EntityListDialog.vue';
import CopyableKey from './CopyableKey.vue';
import type { IForm } from '@services/FormsService';
import dayjs from 'dayjs';

const visible = defineModel<boolean>('visible', { default: false });
const props   = defineProps<{ dirty?: boolean }>();
const { navigate, openInNewTab } = useDirtyNavigation(visible, () => !!props.dirty);

/** JSON Schema forms and form-js forms have separate editors. */
function formRoute(form: IForm) {
    return form.type === 'jsonschema'
        ? { name: 'JsonSchemaEdit', params: { id: form.id } }
        : { name: 'FormsEdit',      params: { id: form.id } };
}

function openForm(form: IForm) {
    navigate(formRoute(form));
}
</script>

<template>
    <EntityListDialog
        v-model:visible="visible"
        header="Forms"
        :load="$api.forms.getPage.bind($api.forms)"
        empty-text="No forms defined yet."
        search-placeholder="Search forms…"
    >
        <template #columns>
            <!-- Code rides along under the name rather than claiming its own column;
                 the dialog is narrow and the name is what people scan for. -->
            <Column field="name" header="Name" sortable>
                <template #body="{ data }: { data: IForm }">
                    <div class="leading-tight">
                        <div class="flex items-center gap-2">
                            <span class="truncate">{{ data.name }}</span>
                            <Tag
                                v-if="data.type === 'jsonschema'"
                                value="JSON Schema"
                                severity="secondary"
                                style="font-size: 0.65rem; padding: 1px 6px;"
                            />
                        </div>
                        <CopyableKey :value="data.code" />
                    </div>
                </template>
            </Column>
            <Column field="createdAt" header="Created" style="width:120px" sortable>
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ data.createdAt ? dayjs(data.createdAt).format('MMM D, YYYY') : '—' }}</span>
                </template>
            </Column>
            <Column style="width:90px">
                <template #body="{ data }: { data: IForm }">
                    <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                        v-tooltip.top="data.type === 'jsonschema' ? 'Open JSON Schema editor' : 'Open in Form Builder'"
                        @click="openForm(data)" />
                    <Button icon="pi pi-external-link" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Open in new tab'"
                        @click="openInNewTab(formRoute(data))" />
                </template>
            </Column>
        </template>

        <template #footer>
            <Button label="Form Builder" icon="pi pi-file-edit" size="small"
                @click="navigate({ name: 'FormsList' })" />
        </template>
    </EntityListDialog>
</template>
