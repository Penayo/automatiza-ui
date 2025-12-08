<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-[#49CC9F] mb-4">Home Page</h1>
    <p>Welcome to the Home page!</p>

    <img :src="qrRef" class="w-96 h-96" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
const qrRef = ref();

onMounted(() => {
  console.log('HOme mounted!')
})
</script>

<style scoped>
/* No additional styles needed, Tailwind handles responsiveness */
</style>
