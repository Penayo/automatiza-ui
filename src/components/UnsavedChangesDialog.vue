<script setup lang="ts">
import { Button, Dialog } from 'primevue';

defineProps<{
    visible: boolean;
    saving: boolean;
    header?: string;
    message?: string;
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    cancel: [];
    discard: [];
    save: [];
    hide: [];
}>();
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        :header="header ?? 'Unsaved changes'"
        :style="{ width: '32rem' }"
        :closable="!saving"
        @update:visible="emit('update:visible', $event)"
        @hide="emit('hide')"
    >
        <p class="text-sm text-surface-600 dark:text-surface-300">
            {{ message ?? 'There are changes that were never saved. Leaving this tab discards them.' }}
        </p>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" severity="secondary" outlined :disabled="saving" @click="emit('cancel')" />
                <Button label="Discard changes" severity="danger" outlined :disabled="saving" @click="emit('discard')" />
                <Button label="Save & continue" icon="pi pi-save" :loading="saving" @click="emit('save')" />
            </div>
        </template>
    </Dialog>
</template>
