<script setup lang="ts">
import { PALETTE } from '@/formbuilder/registry';

defineProps<{ dragging: boolean }>();
const emit = defineEmits<{ dragstart: [itemId: string, ev: DragEvent] }>();
</script>

<template>
    <div class="flex h-full flex-col overflow-y-auto border-r border-surface-200 dark:border-surface-700">
        <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wide opacity-60">
            Elements
        </div>

        <div v-for="category in PALETTE" :key="category.name" class="mb-3">
            <div class="px-3 py-1 text-[11px] font-medium uppercase tracking-wide opacity-50">
                {{ category.name }}
            </div>

            <div
                v-for="def in category.items"
                :key="def.id"
                draggable="true"
                class="mx-2 mb-1 flex cursor-grab items-center gap-2 rounded border border-transparent px-2 py-1.5 text-sm
                       hover:border-surface-300 hover:bg-surface-100 active:cursor-grabbing
                       dark:hover:border-surface-600 dark:hover:bg-surface-800"
                :title="def.description"
                @dragstart="emit('dragstart', def.id, $event)"
            >
                <i :class="['pi', def.icon, 'text-xs opacity-70']" />
                <span class="truncate">{{ def.label }}</span>
            </div>
        </div>

        <p v-if="!dragging" class="mt-auto px-3 py-3 text-[11px] leading-relaxed opacity-50">
            Drag an element onto the canvas, or drop it inside a container to nest it.
        </p>
    </div>
</template>
