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

    function navigate(to: RouteLocationRaw): void {
        confirmIfDirty(confirm, dirty(), () => {
            router.push(to);
            visible.value = false;
        });
    }

    // Opens in a second tab, leaving the current diagram/editor untouched —
    // no dirty check needed since we never navigate away from it.
    function openInNewTab(to: RouteLocationRaw): void {
        window.open(router.resolve(to).href, '_blank');
    }

    return { navigate, openInNewTab };
}
