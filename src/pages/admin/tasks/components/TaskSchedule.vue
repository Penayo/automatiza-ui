<script setup lang="ts">
import { ref } from 'vue';
import { Button, Dialog, DatePicker } from 'primevue';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

const props = defineProps({
    label:   String,
    value:   [Date, String],
    enabled: Boolean,
});
const emit = defineEmits(['date-set']);

const visible = ref(false);
const date    = ref(props.value ? new Date(props.value as string) : null);

function returnDate() {
    emit('date-set', date.value);
    visible.value = false;
}
</script>

<template>
    <div class="font-bold m-0 md:mb-3">
        <Dialog
            :header="(props.value ? 'Edit ' : 'Set ') + props.label"
            v-model:visible="visible"
            class="w-[90%] md:w-100"
            modal
        >
            <DatePicker showIcon class="w-full" v-model="date" />
            <template #footer>
                <Button label="Cancel" severity="secondary" size="small" @click="visible = false" />
                <Button label="Save"   severity="success"   size="small" @click="returnDate" />
            </template>
        </Dialog>

        <div class="flex flex-row gap-2 items-center">
            <span>{{ props.label }}:</span>
            <span v-if="props.value" class="font-normal">{{ dayjs(props.value).format('LL') }}</span>
            <Button
                v-if="props.enabled"
                size="small"
                icon="pi pi-calendar-plus"
                text
                :label="props.value ? 'Change' : 'Add'"
                outlined
                @click="visible = true"
            />
        </div>
    </div>
</template>
