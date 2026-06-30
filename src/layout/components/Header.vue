<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { AuthService } from '@services/AuthService';

const COMPANY_NAME_CLASSES: Record<string, string> = {
    display:    'text-lg font-bold tracking-tight',
    heading:    'text-base font-bold',
    subheading: 'text-sm font-semibold',
    caption:    'text-xs font-medium opacity-70',
};

const props = defineProps({
    sidebarOpen:       Boolean,
    companyName:       { type: String,  default: undefined },
    logoUrl:           { type: String,  default: undefined },
    logoDarkUrl:       { type: String,  default: undefined },
    logoSize:          { type: Number,  default: undefined },
    logoPadding:       { type: Number,  default: undefined },
    logoBgColor:       { type: String,  default: undefined },
    showCompanyName:   { type: Boolean, default: true },
    companyNameStyle:  { type: String,  default: 'subheading' },
});
defineEmits(['toggle-sidebar']);

const companyNameClass = computed(() =>
    COMPANY_NAME_CLASSES[props.companyNameStyle] ?? COMPANY_NAME_CLASSES.subheading
);

const { isDark, toggle } = useTheme();

const activeLogo = computed(() => {
    if (isDark.value) return props.logoDarkUrl ?? props.logoUrl ?? '/logo.png';
    return props.logoUrl ?? '/logo.png';
});

const logoContainerStyle = computed(() => ({
    padding:         props.logoPadding != null ? `${props.logoPadding}px` : undefined,
    backgroundColor: props.logoBgColor || undefined,
    borderRadius:    props.logoPadding ? '4px' : undefined,
}));

const authService = new AuthService();
const accessInfo  = authService.getAccessInfo();

const displayName = computed(() => accessInfo?.user?.username ?? 'User');
const isAdmin     = computed(() => Array.isArray(accessInfo?.user?.roles) && accessInfo!.user.roles.includes('ADMIN'));
const roleBadge   = computed(() => isAdmin.value ? 'ADMIN' : 'USER');
</script>

<template>
	<header
		class="flex items-center justify-between px-4 py-2 shadow-sm relative border-b"
		style="
			background-color: var(--layout-header-bg);
			color: var(--layout-header-text);
			border-color: var(--layout-header-border);
		"
	>
		<!-- Hamburger (mobile) -->
		<button
			class="md:hidden mr-2 opacity-70 hover:opacity-100"
			style="color: var(--layout-header-text);"
			@click="$emit('toggle-sidebar', !sidebarOpen)"
			aria-label="Open sidebar"
		>
			<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
			</svg>
		</button>

		<!-- Logo / company name -->
		<div class="flex-1 flex md:justify-start justify-center items-center gap-2">
			<div :style="logoContainerStyle">
				<img
					:src="activeLogo"
					:alt="companyName ?? 'Logo'"
					class="object-contain block"
					:style="{ height: logoSize ? `${logoSize}px` : '32px' }"
				/>
			</div>
			<span
				v-if="showCompanyName && companyName"
				class="hidden sm:block truncate"
				:class="companyNameClass"
				style="color: var(--layout-header-text);"
			>{{ companyName }}</span>
		</div>

		<!-- Right side -->
		<div class="flex items-center gap-3 ml-auto">
			<!-- Dark / light toggle -->
			<button
				@click="toggle"
				class="w-9 h-9 flex items-center justify-center rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
				style="color: var(--layout-header-text);"
				:aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
			>
				<i :class="isDark ? 'pi pi-sun text-lg' : 'pi pi-moon text-lg'" />
			</button>

			<!-- Role badge -->
			<span
				class="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wide"
				:class="isAdmin
					? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
					: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'"
			>
				{{ roleBadge }}
			</span>

			<!-- Username -->
			<span class="font-semibold hidden sm:block" style="color: var(--layout-header-text);">
				{{ displayName }}
			</span>

			<!-- Avatar placeholder -->
			<div
				class="w-9 h-9 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-bold"
				style="background-color: var(--layout-header-bg); color: var(--layout-header-text);"
			>
				{{ displayName.charAt(0).toUpperCase() }}
			</div>
		</div>
	</header>
</template>
