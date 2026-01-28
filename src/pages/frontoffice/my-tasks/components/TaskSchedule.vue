<script setup lang="ts">
import { ref } from 'vue';
import { Button, Dialog } from 'primevue';

const props = defineProps({
    label: String,
    value: [Date, String],
    enabled: Boolean
});
const emit = defineEmits(['date-set']);

const visible = ref(false);
const date = ref(props.value ? new Date(props.value) : null);

function returnDate() {
    emit('date-set', date.value);
    visible.value = false;
}
</script>

<template>
    <div class="font-bold m-0 mb-3">
        <Dialog
            :header="(props.value ? 'Modificar ' : 'Agregar ') + props.label"
            v-model:visible="visible"
            style="width: 30vw"
        >
            <Calendar showIcon class="w-full" v-model="date" />
            <template #footer>
                <Button label='Cancel' severity="secondary" size="small" @click="visible = false"></Button>
                <Button label='Guardar' @click="returnDate" size="small" severity="success"></Button>
            </template>
        </Dialog>
        <div class="flex gap-2">
            <span class="mt-2">{{ props.label }}: </span>
            <Button v-if="props.enabled" size="small" icon="pi pi-calendar-plus" text :label="props.value ? 'Modificar' : 'Agregar'" outlined @click="visible = true" />
        </div>
        <div v-if="props.value" class="text-normal">{{ props.value }}</div>
    </div>
</template>
