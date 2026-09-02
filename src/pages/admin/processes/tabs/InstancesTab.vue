<script setup lang="ts">
import { inject } from 'vue';
import ProcessInstances from '../components/ProcessInstances.vue';
import { processEditKey } from '../processEditContext';

const { process } = inject(processEditKey)!;
</script>

<template>
    <ProcessInstances
        v-if="process"
        :process-id="process.processId"
        :process-definition-id="process.id!"
        :process-name="process.name"
    />

    <!-- Child route outlet — renders the Detail dialog when an instance is selected -->
    <RouterView />
</template>
