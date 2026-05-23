<script setup lang="ts">
import { ref } from 'vue';
import { InputText, Button } from 'primevue';

const emit = defineEmits(['submit']);
const variables = ref<Record<string, any>>({});

function handleSubmit(event: Event) {
    event.preventDefault();
    emit('submit', variables.value);
}
</script>

<template>
    <form @submit="handleSubmit" class="flex flex-col gap-3">
        <FormField label="Variable 1" label-for="var1">
            <InputText id="var1" v-model="variables.value.var1" />
        </FormField>
        <FormField label="Variable 2" label-for="var2">
            <InputText id="var2" v-model="variables.value.var2" />
        </FormField>
        <!-- Add more fields as needed based on process requirements -->
        <div class="text-end py-4">
            <Button label="Iniciar Proceso" icon="pi pi-play" type="submit" />
        </div>
    </form>
</template>
