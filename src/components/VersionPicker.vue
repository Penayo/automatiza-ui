<script setup lang="ts">
/**
 * Version picker for any designer with a save history (docs/specs/design-versioning.spec.md §4).
 *
 * A dropdown of every version plus a box to type a number. It only reports the choice;
 * the page decides what loading a version means and whether it is read-only.
 */
import { computed, ref } from 'vue';
import { Select, InputNumber } from 'primevue';

export interface VersionOption {
    version: number;
    /** ISO timestamp of the save, when the resource records one. */
    savedAt?: string;
}

const props = defineProps<{
    /** Newest first. */
    versions: VersionOption[];
    /** The version currently shown. */
    modelValue: number | null;
    disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [version: number] }>();

const latest = computed(() => props.versions[0]?.version ?? null);

const options = computed(() => props.versions.map((v) => ({
    value: v.version,
    label: `v${v.version}${v.version === latest.value ? ' (latest)' : ''}`,
    savedAt: v.savedAt ? new Date(v.savedAt).toLocaleString() : '',
})));

function pick(version: number | null | undefined) {
    if (version === null || version === undefined || version === props.modelValue) return;
    emit('update:modelValue', version);
}

// ── Go to vN ──────────────────────────────────────────────────────────────────
const typed = ref<number | null>(null);
const typedInvalid = ref(false);

/** Reads the raw input: InputNumber only commits its model on blur, not on Enter. */
function goToTyped(ev: KeyboardEvent) {
    const raw = (ev.target as HTMLInputElement | null)?.value ?? '';
    const n = Number(raw.replace(/\D/g, ''));
    if (!raw.trim() || !Number.isInteger(n)) return;
    const exists = props.versions.some((v) => v.version === n);
    typedInvalid.value = !exists;
    if (!exists) return;
    pick(n);
    typed.value = null;
}
</script>

<template>
    <div class="flex items-center gap-1">
        <Select
            :model-value="props.modelValue"
            :options="options"
            option-label="label"
            option-value="value"
            size="small"
            :disabled="props.disabled || !options.length"
            class="w-32"
            @update:model-value="pick"
        >
            <template #option="{ option }">
                <div class="flex w-full items-center justify-between gap-3 text-xs">
                    <span class="font-mono">{{ option.label }}</span>
                    <span class="opacity-60">{{ option.savedAt }}</span>
                </div>
            </template>
        </Select>
        <InputNumber
            v-model="typed"
            placeholder="Go to v…"
            size="small"
            :use-grouping="false"
            :min="1"
            :invalid="typedInvalid"
            :disabled="props.disabled || !options.length"
            input-class="w-20 text-xs"
            v-tooltip.bottom="typedInvalid ? 'No such version' : 'Type a version number and press Enter'"
            @keydown.enter="goToTyped"
            @input="typedInvalid = false"
        />
    </div>
</template>
