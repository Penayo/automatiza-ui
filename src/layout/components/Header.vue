<script setup lang="ts">
	defineProps({
		sidebarOpen: Boolean
	})

	const emit = defineEmits(['toggle-sidebar'])
</script>

<template>
	<header class="flex items-center justify-between bg-emerald-700 dark:bg-zinc-800 px-4 py-2 shadow-md relative">
		<!-- Hamburger (mobile) -->
		<button
			class="md:hidden mr-2"
			@click="$emit('toggle-sidebar', !sidebarOpen)"
			aria-label="Open sidebar"
		>
			<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
			</svg>
		</button>
		<!-- Logo -->
		<div
			class="flex-1 flex md:justify-start justify-center items-center"
		>
			<img src="/logo.png" alt="Logo" class="h-10" />
		</div>
		<!-- User Info -->
		<div class="flex items-center space-x-2 ml-auto">
			<span class="text-white font-semibold hidden sm:block">John Doe</span>
			<img
				src="https://randomuser.me/api/portraits/men/32.jpg"
				alt="Avatar"
				class="w-9 h-9 rounded-full border-2 border-white"
			/>
		</div>
	</header>
</template>
