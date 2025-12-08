
<script setup lang="ts">
	import { Message } from 'primevue';
	const props = defineProps(['label', 'labelFor', 'error'])
</script>

<template>
	<div class="flex flex-col gap-1">
		<label :for="labelFor">{{ props.label }}</label>
		<slot></slot>
		<Message v-if="error" size="small" severity="error" variant="simple">{{ error.message }}</Message>
	</div>
</template>
