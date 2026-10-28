/**
 * Preview example data (forms spec §5.3): fill an empty variables box from the design,
 * and regenerate it on demand without silently throwing away what the user typed.
 */
import type { Ref } from 'vue';
import { useConfirm } from 'primevue';
import { isEmptySampleJson, toSampleJson } from '@/utils/sampleData';

/**
 * Every text this page session generated. Module-level on purpose: the boxes are owned
 * by the designer pages and outlive the preview components, so a remounted preview
 * still knows its content is untouched example data and needs no confirmation.
 */
const generated = new Set<string>();

/** `onFilled` runs after every fill, e.g. to push the new data into a live preview. */
export function useExampleData(text: Ref<string>, derive: () => unknown, onFilled?: () => void) {
    const confirm = useConfirm();

    function apply() {
        const json = toSampleJson(derive() ?? {});
        generated.add(json);
        text.value = json;
        onFilled?.();
    }

    /** Call when the Preview opens. A box with any content is left alone. */
    function fillIfEmpty() {
        if (isEmptySampleJson(text.value)) apply();
    }

    /** The *Fill with example data* button. */
    function fill() {
        if (isEmptySampleJson(text.value) || generated.has(text.value)) {
            apply();
            return;
        }
        confirm.require({
            header: 'Replace variables?',
            message: 'Your edits to the variables will be replaced with example data.',
            icon: 'pi pi-exclamation-triangle',
            rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            acceptProps: { label: 'Replace' },
            accept: apply,
        });
    }

    return { fill, fillIfEmpty };
}
