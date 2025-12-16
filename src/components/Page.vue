<script setup lang="ts">
	const props = defineProps(['title', 'subtitle'])
</script>

<template>
	<div class="p-2 sm:p-6 h-full">
			<div class="flex flex-col sm:flex-row justify-between items-center">
				<slot name="header">
					<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">{{ title }}</h2>
					<h4 v-if="subtitle" class="text-xl md:text-lg font-thin text-gray-300 mb-4">{{  subtitle }}</h4>
				</slot>

				<div class="flex flex-row gap-2">
					<slot name="actions"></slot>
				</div>
			</div>
			<slot></slot>
	</div>
</template>
