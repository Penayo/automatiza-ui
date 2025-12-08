<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, InputText, Button, useToast, Textarea } from 'primevue';
import { $api } from '../../../services/api';
import { FormEditor } from '@bpmn-io/form-js-editor';
import type { IForm } from '../../../services/FormsService';
import FormField from '../../../components/form/FormField.vue';

const props = defineProps<{
    visible: boolean,
    editor: FormEditor | null
    formSchema: IForm | null
}>()

const emit = defineEmits(['hide'])
const toast = useToast()

const visible = ref<boolean>(false)
const formData = ref({
    name: '',
    description: ''
})

const saveForm = async () => {
    if (!formData.value.name) return;

    visible.value = false
    if (props.editor) {
        const schema = await props.editor.saveSchema();
        schema.name = formData.value.name;
        schema.description = formData.value.description;

        try {
            await $api.forms.save(schema)
            toast.add({ severity: 'success', summary: 'Success', detail: 'Form guardado exitosamente!', life: 3000 })
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar form', life: 3000 });
        }
    }
}

watch(() => props.visible, (newVal) => visible.value = newVal)
</script>

<template>
    <Dialog
        header="Saving Form"
        v-model:visible="visible"
        :style="{ width: '40rem' }"
        @hide="emit('hide')"
    >
        <div className="m-0">
            <form @submit.prevent="saveForm">
                <div className="text-500 mb-3">Form Id: {{ props.formSchema?.id }} </div>
                <FormField label="Name:">
                    <InputText v-model="formData.name" id="formname" type="text" class="w-full" />
                </FormField>

                <FormField label="Description">
                    <Textarea rows="3" v-model="formData.description" name="formDescription" id="form-description" class="w-full" />
                </FormField>

                <div className="flex flex-row gap-3 justify-end mt-5">
                    <Button label="Cancel" @click="visible = false" text />
                    <Button
                        label="Save"
                        icon="pi pi-save"
                        type="submit"
                        autoFocus
                    />
                </div>
            </form>
        </div>
    </Dialog>    
</template>