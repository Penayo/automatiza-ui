<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <h1 class="text-2xl font-bold text-[#49CC9F] mb-4">Unauthorized</h1>
    <div class="text-xl">Your are not authorized to access this page!</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
const qrRef = ref();

</script>

<style scoped>
/* No additional styles needed, Tailwind handles responsiveness */
</style>
