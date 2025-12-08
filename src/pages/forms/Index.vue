<script setup lang="ts">
import '@bpmn-io/form-js/dist/assets/form-js.css';
import '@bpmn-io/form-js/dist/assets/form-js-editor.css';
import '../../forms.scss';
import { FormEditor } from "@bpmn-io/form-js-editor";

import { onMounted, onUnmounted, ref } from 'vue';
import Page from '../../components/Page.vue';
import { Menubar, useToast } from 'primevue';
import type { IForm } from '../../services/FormsService';
import FormList from './components/FormList.vue';
import SaveForm from './components/SaveForm.vue';

const toast = useToast();

const containerRef = ref<HTMLDivElement>();
const selectedForm = ref<IForm | null>(null);
const formListVisible = ref<boolean>(false);
const saveFormVisible = ref<boolean>(false);
const editor = ref<FormEditor | null>(null);

const schema = {
    "type": "default",
    "components": [
        {
            "type": "textarea",
            "key": "message",
            "label": "Provide feedback"
        }
    ]
};

const menuItems = ref([
    {
        label: 'Form List',
        icon: 'pi pi-list',
        command: async () => formListVisible.value = true
    },
    {
        label: 'Save',
        icon: 'pi pi-cloud-upload',
        command: async () => {
            if (editor.value) {
                selectedForm.value = await editor.value.saveSchema() as IForm;
                saveFormVisible.value = true
            }
        }
    },
    {
        label: 'Options',
        items: [
            {
                label: 'New Form',
                icon: 'pi pi-fw pi-file',
                command: () => {
                }
            }
        ]
    },
]);

const hideFormList = () => formListVisible.value = false
const hideSaveForm = () => saveFormVisible.value = false
const loadForm = async (form: IForm) => {
    if (editor.value) {
        selectedForm.value = form;
        editor.value.importSchema(form);
        toast.add({ severity: 'success', summary: 'Form Loaded', detail: 'Form loaded successfully', life: 3000 });
        hideFormList()
    }
}

onMounted(() => {
    if (!containerRef.value) return;

    const formEditor = new FormEditor({
        container: containerRef.value
    })

    formEditor.importSchema(schema);
    editor.value = formEditor; 
})

onUnmounted(() => {
    if (editor.value) {
        editor.value.destroy();
    }
})
</script>

<template>
    <Page
        title="Forms Builder"
        :subtitle="selectedForm?.name"
        >
        <Menubar :model="menuItems" />
        <FormList :visible="formListVisible" @hide="hideFormList" @load="loadForm" />
        <SaveForm :visible="saveFormVisible" @hide="hideSaveForm" :editor="editor" :form-schema="selectedForm" />

        <div ref="containerRef" class="form-editor-container formjs-dark" style="height: calc(100vh - 160px);"></div>
    </Page>
</template>