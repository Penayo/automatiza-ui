<script setup lang="ts">
import { ref } from 'vue';
import Header from '@layout/components/Header.vue';
import Sidebar from '@layout/frontoffice/Sidebar.vue';
import { useTenantBranding } from '@/composables/useTenantBranding';
import { useSidebar } from '@/composables/useSidebar';

const frontofficeEl = ref<HTMLElement | null>(null);

const { sidebarOpen, setSidebarOpen } = useSidebar();

const { companyName, logoUrl, logoDarkUrl, logoSize, logoPadding, logoBgColor, showCompanyName, companyNameStyle } = useTenantBranding(frontofficeEl);
</script>

<template>
  <div ref="frontofficeEl" class="flex flex-col h-screen" data-context="frontoffice">
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
      @toggle-sidebar="setSidebarOpen"
    />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar :sidebarOpen="sidebarOpen" @toggle-sidebar="setSidebarOpen" />
      <main class="flex-1 p-0 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-all duration-200 overflow-y-auto h-[calc(100vh-50px)]">
        <RouterView />
      </main>
    </div>
  </div>
</template>
