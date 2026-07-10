<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, Button, InputText, Message } from 'primevue';
import { $api } from '@services/api';

const props  = defineProps<{ visible: boolean }>();
const emit   = defineEmits<{ 'update:visible': [boolean]; created: [] }>();

const name  = ref('');
const slug  = ref('');
const error = ref('');
const saving = ref(false);

function autoSlug(val: string) {
    return val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

watch(() => name.value, (v) => { slug.value = autoSlug(v); });

function close() { emit('update:visible', false); }

async function submit() {
    if (!name.value || !slug.value) return;
    saving.value = true;
    error.value  = '';
    try {
        await $api.tenants.create({ name: name.value, slug: slug.value });
        name.value = '';
        slug.value = '';
        emit('created');
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? 'Failed to create tenant';
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="close"
        header="New Tenant"
        :style="{ width: '420px' }"
        modal
    >
        <div class="flex flex-col gap-4">
            <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Name</label>
                <InputText v-model="name" placeholder="Acme Corp" size="small" />
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Slug</label>
                <InputText v-model="slug" placeholder="acme-corp" size="small" />
                <small class="text-surface-400 text-xs">Unique identifier, URL-safe. Auto-generated from name.</small>
            </div>
        </div>

        <template #footer>
            <Button label="Cancel" text size="small" @click="close" />
            <Button label="Create" size="small" :loading="saving" @click="submit" />
        </template>
    </Dialog>
</template>
