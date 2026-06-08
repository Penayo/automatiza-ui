<script setup lang="ts">
import '@bpmn-io/form-js/dist/assets/form-js.css';
import '@bpmn-io/form-js/dist/assets/form-js-editor.css';
import '@/forms.scss';
import { FormEditor } from "@bpmn-io/form-js-editor";
import { DocumentListModule, DocumentListEditorModule } from '@/form-fields/DocumentListField';

import { onMounted, onUnmounted, ref } from 'vue';
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();
import Page from '@components/Page.vue';
import { Menubar, useToast } from 'primevue';
import type { IForm } from '@services/FormsService';
import FormList    from '@pages/admin/forms/components/FormList.vue';
import SaveForm    from '@pages/admin/forms/components/SaveForm.vue';
import FormPreview from '@pages/admin/forms/components/FormPreview.vue';

const toast = useToast();

const containerRef = ref<HTMLDivElement>();
const selectedForm = ref<IForm | null>(null);
const formListVisible    = ref<boolean>(false);
const saveFormVisible    = ref<boolean>(false);
const previewVisible     = ref<boolean>(false);
const previewSchema      = ref<object | null>(null);
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
        label: 'Preview',
        icon: 'pi pi-play',
        command: async () => {
            if (editor.value) {
                previewSchema.value = await editor.value.saveSchema() as object;
                previewVisible.value = true;
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
        container: containerRef.value,
        additionalModules: [DocumentListModule, DocumentListEditorModule],
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
        <FormList    :visible="formListVisible" @hide="hideFormList" @load="loadForm" />
        <SaveForm    :visible="saveFormVisible" @hide="hideSaveForm" :editor="editor" :form-schema="selectedForm" />
        <FormPreview :visible="previewVisible"  :schema="previewSchema" @hide="previewVisible = false" />

        <div ref="containerRef" class="form-editor-container" :class="isDark ? 'formjs-dark' : 'formjs-light'" style="height: calc(100vh - 160px);"></div>
    </Page>
</template>