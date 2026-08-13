<script setup lang="ts">
import { ref } from 'vue';
import Header from '@layout/components/Header.vue';
import Sidebar from '@layout/components/Sidebar.vue';
import { useTenantBranding } from '@/composables/useTenantBranding';

const sidebarOpen = ref(false);
const adminEl     = ref<HTMLElement | null>(null);

const { companyName, logoUrl, logoDarkUrl, logoSize, logoPadding, logoBgColor, showCompanyName, companyNameStyle } = useTenantBranding(adminEl);
</script>

<template>
  <div ref="adminEl" class="flex flex-col h-screen" data-context="admin">
    <Header
      :sidebarOpen="sidebarOpen"
      :companyName="companyName ?? undefined"
      :logoUrl="logoUrl ?? undefined"
      :logoDarkUrl="logoDarkUrl ?? undefined"
      :logoSize="logoSize ?? undefined"
      :logoPadding="logoPadding ?? undefined"
      :logoBgColor="logoBgColor ?? undefined"
      :showCompanyName="showCompanyName"
      :companyNameStyle="companyNameStyle"
      @toggle-sidebar="(val: boolean) => sidebarOpen = val"
    />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar :sidebarOpen="sidebarOpen" @toggle-sidebar="(val: boolean) => sidebarOpen = val" />
      <main class="flex-1 p-0 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-all duration-200 overflow-y-auto h-[calc(100vh-50px)]">
        <RouterView />
      </main>
    </div>
  </div>
</template>
