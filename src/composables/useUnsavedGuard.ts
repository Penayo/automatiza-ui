import { onMounted, onUnmounted, ref } from 'vue';
import {
    onBeforeRouteLeave,
    type RouteLocationNormalized,
    type RouteLocationRaw,
} from 'vue-router';
import { registerUnsavedWork } from '@services/session';

interface UnsavedGuardOptions {
    /** Whether the editor is currently holding work that a navigation would discard. */
    isDirty: () => boolean;
    /**
     * Persist, then say where the held navigation should go: `false` to stay put
     * (the save failed), `true` to continue as requested, or a route location when
     * the save changed where the target should be.
     */
    save: (to: RouteLocationNormalized) => Promise<boolean | RouteLocationRaw>;
}

/**
 * Holds an in-app navigation while an editor has unsaved work, and asks the user
 * what to do with it — Cancel / Discard / Save & continue.
 *
 * Also registers the editor with the unsaved-work registry, which covers the two
 * paths no router guard can see: the re-auth gate and the browser's own
 * `beforeunload` prompt in App.vue.
 */
export function useUnsavedGuard({ isDirty, save }: UnsavedGuardOptions) {
    const promptVisible = ref(false);
    const saving        = ref(false);

    /** Resolves the pending navigation: false stays put, true/route location leaves. */
    let resolveLeave: ((v: boolean | RouteLocationRaw) => void) | null = null;
    let pendingTarget: RouteLocationNormalized | null = null;

    onBeforeRouteLeave((to) => {
        if (!isDirty()) return true;

        pendingTarget = to;
        promptVisible.value = true;
        return new Promise<boolean | RouteLocationRaw>(resolve => { resolveLeave = resolve; });
    });

    let unregister: (() => void) | null = null;
    onMounted(() => { unregister = registerUnsavedWork(isDirty); });
    onUnmounted(() => { unregister?.(); });

    function settle(v: boolean | RouteLocationRaw) {
        promptVisible.value = false;
        resolveLeave?.(v);
        resolveLeave  = null;
        pendingTarget = null;
    }

    async function saveAndLeave() {
        const to = pendingTarget;
        if (!to) return settle(true);

        saving.value = true;
        try {
            settle(await save(to));
        } finally {
            saving.value = false;
        }
    }

    /** Closing the dialog any other way (Escape, the X) means "stay". */
    function onPromptHide() {
        if (resolveLeave) settle(false);
    }

    return {
        promptVisible,
        saving,
        cancel:  () => settle(false),
        discard: () => settle(true),
        saveAndLeave,
        onPromptHide,
    };
}
