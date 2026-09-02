<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { Toast, ConfirmDialog, useToast } from 'primevue';
import ReauthDialog from '@components/ReauthDialog.vue';
import { hasUnsavedWork } from '@services/session';

const toast = useToast();

// Global fallback for cross-cutting API failures (rate limits, network errors)
// dispatched by BaseService. Prevents them from failing silently in components
// that don't handle them (e.g. the tenant selector's 429).
function onApiError(e: Event) {
  const { summary, message } = (e as CustomEvent).detail ?? {};
  toast.add({
    severity: 'warn',
    summary: summary ?? 'Something went wrong',
    detail: message,
    life: 5000,
  });
}

// Last-chance prompt for the paths no in-app guard can see: reload, tab close,
// or a URL typed over ours. Router guards never run for those. Every editor that
// registers with the unsaved-work registry (the BPMN modeler today) is covered.
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!hasUnsavedWork()) return;
  e.preventDefault();
  // Deprecated, but still what older Safari/Firefox check. The browser shows its
  // own generic wording either way — this string is never displayed.
  e.returnValue = '';
}

onMounted(() => {
  window.addEventListener('api-error', onApiError);
  window.addEventListener('beforeunload', onBeforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('api-error', onApiError);
  window.removeEventListener('beforeunload', onBeforeUnload);
});
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

  <ReauthDialog />

  <RouterView />
</template>
