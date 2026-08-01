import type { Ref } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { useConfirm } from 'primevue';
import { confirmIfDirty } from '@/utils/common';

/**
 * Navigate away from a modeler dialog, confirming first when the diagram has
 * unsaved changes, and closing the dialog on the way out.
 *
 * Extracted from the five list dialogs, which each carried an identical copy.
 */
export function useDirtyNavigation(visible: Ref<boolean>, dirty: () => boolean) {
    const router  = useRouter();
    const confirm = useConfirm();

    return function navigate(to: RouteLocationRaw): void {
        confirmIfDirty(confirm, dirty(), () => {
            router.push(to);
            visible.value = false;
        });
    };
}
