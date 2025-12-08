<script setup lang="ts">
import { Button, Dialog, Textarea, useToast } from "primevue";
import { ref } from "vue";
import { $api } from "../../../services/api";

const props = defineProps({
    instanceId: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['paused']);
const toast = useToast();
const visible = ref(false);

const commentRef = ref('');

const onPause = async () => {
    try {
        console.log(commentRef.value)
        await $api.processes.pauseInstance(props.instanceId as string, commentRef.value);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Instancia pausada', life: 3000 });
        emit('paused')
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al pausar la instancia', life: 3000 });
    } finally {
        visible.value = false;
    }
}

</script>

<template>
    <Dialog
        v-model:visible="visible"
        modal
        header="Motivo de Cancelación"
        :style="{ width: '35rem' }"
        @hide="visible = false"
    >
        <span class="text-surface-500 dark:text-surface-400 block mb-4">Porqué estás pausando la instancia?</span>
        <div class="flex flex-col gap-2">
            <label for="comment" class="font-semibold w-24">Comment</label>
            <Textarea v-model="commentRef" autofocus autocomplete="off" />
        </div>

        <div class="flex justify-end gap-2 mt-8">
            <Button type="button" label="Cancelar" severity="secondary" @click="visible = false"></Button>
            <Button type="button" label="Pausar" @click="onPause"></Button>
        </div>
    </Dialog>    
    <Button size="small" label="Pausar" severity="danger" icon="pi pi-pause" @click="visible = true" />
</template>