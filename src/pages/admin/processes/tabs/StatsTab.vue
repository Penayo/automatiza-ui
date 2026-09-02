<script setup lang="ts">
import { inject } from 'vue';
import ProcessStats from '../components/ProcessStats.vue';
import { processEditKey } from '../processEditContext';

const { process } = inject(processEditKey)!;
</script>

<template>
    <ProcessStats v-if="process" :process-definition-id="process.processId" />
</template>
