<script setup lang="ts">
import { Button, useConfirm, useToast } from "primevue";
import { $api } from "../../../services/api";
import { onApprove } from "../../../utils/common";

const props = defineProps({
    instanceId: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['resumed']);
const toast = useToast();
const confirm = useConfirm();

const onResume = () => {
    onApprove(confirm, `Está seguro de reanudar la instancia?\nEsto habilitará que la instancia siga su curso normal!`, resumeInstance)
}

const resumeInstance = async () => {
    try {
        await $api.processes.resumeInstance(props.instanceId as string);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Instancia reanudada', life: 3000 });
        emit('resumed')
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al reanudar la instancia', life: 3000 });
    }
}

</script>

<template>   
    <Button label="Reanudar" size="small" severity="success" icon="pi pi-play" @click="onResume" />
</template>