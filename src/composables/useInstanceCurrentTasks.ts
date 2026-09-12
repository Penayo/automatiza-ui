import { ref } from 'vue';
import { $api } from '@services/api';
import type { InstanceCurrentTask, ProcessInstance } from '@services/ProcessesService';

/**
 * "Who is this instance sitting with?" for a page of instance rows.
 *
 * Shared by every instance list (the global one and the per-process tab) so the four display states
 * below are decided in one place. See docs/specs/instance-current-task-visibility.spec.md §3–§4.
 *
 * The data is fetched in a **second** request, after the rows are painted: the instance list query
 * itself must stay a plain match + page count with no join, which is also why this can never narrow
 * or sort the page it annotates.
 */
export type AssigneeCell = { text: string; muted: boolean };

export function useInstanceCurrentTasks() {
    /** Keyed by instance id. A missing key means "not loaded yet" — not "nobody". */
    const currentTasks = ref<Record<string, InstanceCurrentTask>>({});
    const loading      = ref(false);

    function reset(): void {
        currentTasks.value = {};
    }

    /** Annotate the rows on screen. Safe to call with an empty page. */
    async function load(rows: ProcessInstance[] | undefined): Promise<void> {
        const ids = (rows ?? []).map(r => r.id).filter(Boolean) as string[];
        if (!ids.length) {
            reset();
            return;
        }

        loading.value = true;
        try {
            currentTasks.value = await $api.processes.getInstancesCurrentTasks(ids);
        } catch {
            // Non-blocking by design: the list itself is fine, the column just stays empty.
            reset();
        } finally {
            loading.value = false;
        }
    }

    /**
     * The user holding this instance's current task, or why there is nobody.
     * `null` means not loaded yet, which the caller should render as a spinner rather than a dash.
     */
    function assigneeOf(instance: ProcessInstance): AssigneeCell | null {
        const entry = currentTasks.value[instance.id as string];
        if (!entry) return null;

        const task = entry.currentTask;
        if (!task) return { text: '—', muted: true };                      // finished: nothing to hold
        if (task.type !== 'bpmn:UserTask') return { text: '—', muted: true }; // automated: nobody's to hold

        return task.assignee
            ? { text: task.assignee, muted: false }
            : { text: 'Unassigned', muted: true };
    }

    return { currentTasks, loading, load, reset, assigneeOf };
}
