<script setup lang="ts">
import { onMounted } from 'vue';
import { Toast, ConfirmDialog } from 'primevue';
import { useTheme } from '@/composables/useTheme';

const { init } = useTheme();
onMounted(() => init());
</script>

<template>
  <ConfirmDialog>
    <template #message="slotProps">
      <div class="flex flex-col w-full pb-4 items-center">
        <p v-for="msgLine in slotProps.message.message?.split('\n')">{{ msgLine }}</p>
      </div>
    </template>
  </ConfirmDialog>
  <Toast />
  <Toast position="top-center" group="TC" />
  <Toast position="top-center" group="Loading-TC">
    <template #container="{ message }">
      <section class="flex flex-col p-4 gap-4 w-full rounded-xl">
        <div class="flex items-center gap-5">
          <i class="pi pi-spin pi-spinner-dotted text-2xl!" />
          <span class="text-base">{{ message.summary }}</span>
        </div>
      </section>
    </template>
  </Toast>

  <RouterView />
</template>
