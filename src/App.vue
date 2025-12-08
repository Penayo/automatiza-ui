<script setup lang="ts">
  import { onMounted, onBeforeMount, ref } from 'vue';
  import { Toast, ConfirmDialog,  } from 'primevue';
  import { useRoute } from 'vue-router';

  const route = useRoute();
  const sidebarOpen = ref(false)
  const isDark = ref(false)
  const hasHeader = ref(false);

  function toggleDark(prefersDarkMode: boolean) {
    if (prefersDarkMode) {
      console.log('Dark mode is active!')
      isDark.value = true
    } else {
      isDark.value = false
    }
  }

  onBeforeMount(() => {
    // Check if the route has a header
    hasHeader.value = route.meta.hasHeader ? true : false;
  });

  onMounted(() => {
    // Check if the system prefers dark mode
    console.log('Checking route values', route, hasHeader.value)
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    toggleDark(prefersDarkMode)

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {  
        toggleDark(event.matches)
    });
  })
</script>

<style lang="scss">
</style>

<template>
  <ConfirmDialog>
    <template #message="slotProps">
      <div class="flex flex-col w-full pb-4 items-center">
          <p v-for="msgLine in slotProps.message.message?.split('\n')">{{ msgLine }}</p>
      </div>
    </template>
  </ConfirmDialog>
  <Toast />
  <Toast position="top-center" group="TC"></Toast>
  <Toast position="top-center" group="Loading-TC">
    <template #container="{ message }">
      <section class="flex flex-col p-4 gap-4 w-full rounded-xl">
        <div class="flex items-center gap-5">
          <i class="pi pi-spin pi-spinner-dotted text-2xl!"></i>
          <span class="text-base">{{ message.summary }}</span>
        </div>
      </section>
    </template>
  </Toast>

  <div class="flex flex-col h-screen" :class="{ dark: isDark }">
    <router-view name="Header" @toggle-sidebar="(val: boolean) => sidebarOpen = val" />
    <div class="flex flex-1">
      <router-view name="Sidebar" :sidebarOpen="sidebarOpen" @toggle-sidebar="(val: boolean) => sidebarOpen = val" />

      <!-- Main Content -->
      <main
        class="flex-1 p-0 bg-gray-50 dark:bg-zinc-800 ml-0 transition-all duration-200 overflow-y-auto"
        :class="{ 'h-[calc(100vh-50px)]': hasHeader, 'h-full': !hasHeader }"
      >
        <router-view />
      </main>
    </div>
    <router-view name="Footer"/>
  </div>
</template>

<style scoped>
</style>
