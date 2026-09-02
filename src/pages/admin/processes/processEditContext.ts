import type { InjectionKey, Ref } from 'vue';
import type { ProcessDefinition } from '@services/ProcessesService';

/**
 * Shared state between EditProcess.vue (which owns the fetch) and its tab route
 * components, which are rendered through <RouterView> and so cannot take props.
 */
export interface ProcessEditContext {
    /** Null until the first fetch resolves. */
    process: Ref<ProcessDefinition | null>;
    loading: Ref<boolean>;
    /** Replace the local snapshot — a diagram save mints a new definition/version. */
    setProcess: (p: ProcessDefinition) => void;
}

export const processEditKey: InjectionKey<ProcessEditContext> = Symbol('processEdit');
