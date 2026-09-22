<script setup lang="ts">
import type { StorageProviderId } from '@services/FilesService';

/**
 * The provider's mark in a rounded tile.
 *
 * Drawn inline rather than fetched: the admin console has no icon CDN, and an
 * <img> per row would flash on every load. Each mark is a simplified, recognisable
 * form of the brand's own — enough to tell three rows apart at a glance.
 */
withDefaults(defineProps<{
    provider: StorageProviderId;
    /** Tile edge in pixels. */
    size?: number;
}>(), { size: 40 });
</script>

<template>
    <div
        class="shrink-0 flex items-center justify-center rounded-2xl border
               border-surface-200 dark:border-surface-700
               bg-white dark:bg-surface-800"
        :style="{ width: `${size}px`, height: `${size}px` }"
    >
        <!-- Microsoft: the four-square window -->
        <svg v-if="provider === 'm365'" :width="size * 0.5" :height="size * 0.5" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="1"  y="1"  width="10" height="10" fill="#f25022" />
            <rect x="13" y="1"  width="10" height="10" fill="#7fba00" />
            <rect x="1"  y="13" width="10" height="10" fill="#00a4ef" />
            <rect x="13" y="13" width="10" height="10" fill="#ffb900" />
        </svg>

        <!-- Google Drive: the folded triangle -->
        <svg v-else-if="provider === 'gdrive'" :width="size * 0.52" :height="size * 0.52" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.4 2.5h7.2l7.2 12.5h-7.2z" fill="#ffc107" />
            <path d="M1.2 15 4.8 8.75 12 21.25H4.8z" fill="#1976d2" />
            <path d="M8.4 2.5 1.2 15h7.2L15.6 2.5z" fill="#4caf50" />
            <path d="M12 21.25 15.6 15h7.2l-3.6 6.25z" fill="#1e88e5" />
        </svg>

        <!-- Object storage: a bucket, in Cloudflare's orange -->
        <svg v-else :width="size * 0.52" :height="size * 0.52" viewBox="0 0 24 24" aria-hidden="true">
            <ellipse cx="12" cy="5.5" rx="8.5" ry="3" fill="#f6821f" />
            <path d="M3.5 5.5v2.2c0 1.66 3.81 3 8.5 3s8.5-1.34 8.5-3V5.5" fill="#fbad41" />
            <path d="M3.5 7.7 5 19.4c.16 1.24 3.28 2.2 7 2.2s6.84-.96 7-2.2L20.5 7.7c0 1.66-3.81 3-8.5 3s-8.5-1.34-8.5-3z"
                  fill="#f6821f" />
        </svg>
    </div>
</template>
