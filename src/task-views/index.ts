import type { Component } from 'vue';

/**
 * Registry of custom task view components.
 *
 * To add a new view:
 *   1. Create the .vue file in this directory
 *   2. Add an entry here: 'your-key': () => import('./YourView.vue')
 *   3. In BPMN Modeler, set the user task formKey to: custom:your-key
 *
 * All imports are lazy — Vite compiles each into a separate chunk loaded
 * only when that specific task type is encountered.
 */
export const CUSTOM_TASK_VIEWS: Record<string, () => Promise<{ default: Component }>> = {
    'tracking-grid':   () => import('./TrackingGridView.vue'),
    'vehicle-history': () => import('./VehicleServiceHistoryView.vue'),
};
