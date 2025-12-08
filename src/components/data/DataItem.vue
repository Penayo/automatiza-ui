<script setup lang="ts">
	defineProps(['icon', 'label', 'value'])
</script>

<template>
	<div class="flex flex-row gap-2 p-2">
		<div class="flex flex-row items-center gap-3 w-60 font-semibold">
			<span :class="icon" style="font-size: 1.3rem"></span>
			{{ label }} 
		</div>
		<div>{{ value }}</div>
	</div>
</template>
