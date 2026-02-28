<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { InputText, Panel, ToggleSwitch, DatePicker, InputChips } from 'primevue';
import z from 'zod';
import { parseZodError, type FormErrorMap } from '../../../utils/error';
import FormField from '../../../components/form/FormField.vue';

const props = defineProps<{
    defaultValues?: Record<string, any>;
    mode?: 'create' | 'edit';
}>();

const $emit = defineEmits(['submit']);

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    roles: z.array(z.string()).optional().default([]),
    isActive: z.boolean().optional(),
    expiresAt: z.string().nullable().optional(),
});

const validationError = ref<FormErrorMap | null>(null);

const form = ref({
    name: '',
    roles: [] as string[],
    isActive: true,
    expiresAt: null as Date | null,
});

async function handleFormSubmit() {
    try {
        const payload = {
            ...form.value,
            expiresAt: form.value.expiresAt
                ? (form.value.expiresAt as Date).toISOString()
                : null,
        };
        formSchema.parse(payload);
        $emit('submit', payload);
    } catch (error: unknown) {
        validationError.value = parseZodError(error as z.ZodError);
    }
}

defineExpose({ save: handleFormSubmit });

const assignDefaultValues = () => {
    if (!props.defaultValues) return;
    form.value.name = props.defaultValues.name ?? '';
    form.value.roles = props.defaultValues.roles ?? [];
    form.value.isActive = props.defaultValues.isActive ?? true;
    form.value.expiresAt = props.defaultValues.expiresAt
        ? new Date(props.defaultValues.expiresAt)
        : null;
};

watch(() => props.defaultValues, assignDefaultValues);
onMounted(() => assignDefaultValues());
</script>

<template>
    <form class="flex flex-col gap-3">
        <Panel header="API Key Information" class="mt-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <FormField label="Name" label-for="name" :error="validationError?.name">
                        <InputText id="name" v-model="form.name" placeholder="e.g. production-worker-1" fluid />
                    </FormField>
                </div>

                <div v-if="mode === 'edit'">
                    <FormField label="Active" label-for="isActive">
                        <div class="flex items-center gap-2 h-9">
                            <ToggleSwitch id="isActive" v-model="form.isActive" />
                            <span class="text-sm text-gray-500">{{ form.isActive ? 'Active' : 'Inactive' }}</span>
                        </div>
                    </FormField>
                </div>
            </div>

            <div class="mt-4">
                <FormField label="Roles" label-for="roles" :error="validationError?.roles">
                    <InputChips
                        id="roles"
                        v-model="form.roles"
                        placeholder="Type a role and press Enter"
                        fluid
                    />
                    <span class="text-xs text-gray-400 mt-1">Press Enter after each role (e.g. external-worker, admin)</span>
                </FormField>
            </div>

            <div class="mt-4">
                <FormField label="Expires At" label-for="expiresAt" :error="validationError?.expiresAt">
                    <DatePicker
                        id="expiresAt"
                        v-model="form.expiresAt"
                        showIcon
                        showButtonBar
                        placeholder="No expiry"
                        dateFormat="yy-mm-dd"
                        fluid
                    />
                    <span class="text-xs text-gray-400 mt-1">Leave empty for a non-expiring key</span>
                </FormField>
            </div>
        </Panel>
    </form>
</template>
