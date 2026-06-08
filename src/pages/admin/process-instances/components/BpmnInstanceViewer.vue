<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import 'bpmn-js/dist/assets/bpmn-js.css';
import type { Task } from '@services/TasksService';

const props = defineProps<{
    bpmnXml: string;
    tasks: Task[];
}>();

const emit = defineEmits<{
    select: [task: Task | null];
}>();

const containerRef      = ref<HTMLElement | null>(null);
const viewer            = ref<any>(null);
const selectedElementId = ref<string | null>(null);

const STATUS_STYLE: Record<string, string> = {
    COMPLETED: 'background:#22c55e;color:#fff;',
    FAILED:    'background:#ef4444;color:#fff;',
    RUNNING:   'background:#f59e0b;color:#fff;',
    SCHEDULED: 'background:#f59e0b;color:#fff;',
    WAITING:   'background:#f59e0b;color:#fff;',
    CREATED:   'background:#3b82f6;color:#fff;',
};

function badgeHtml(status: string): string {
    const style = STATUS_STYLE[status] ?? 'background:#6b7280;color:#fff;';
    return `<div style="${style}font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;
                white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.35);pointer-events:none;
                letter-spacing:.3px;">${status}</div>`;
}

function applyOverlays() {
    if (!viewer.value) return;
    const overlays = viewer.value.get('overlays') as any;
    overlays.remove({ type: 'task-status' });
    for (const task of props.tasks) {
        try {
            overlays.add(task.taskDefinitionId, 'task-status', {
                position: { bottom: 10, right: -6 },
                html: badgeHtml(task.status),
            });
        } catch {
            // element not present on this diagram version — skip
        }
    }
}

function applySelectionOverlay(id: string) {
    if (!viewer.value) return;
    const overlays        = viewer.value.get('overlays') as any;
    const elementRegistry = viewer.value.get('elementRegistry') as any;

    overlays.remove({ type: 'task-highlight' });

    const el = elementRegistry.get(id);
    if (!el) return;

    overlays.add(id, 'task-highlight', {
        position: { top: -4, left: -4 },
        html: `<div style="
            width:${el.width + 8}px;
            height:${el.height + 8}px;
            border: 3px solid #3b82f6;
            border-radius: 10px;
            box-sizing: border-box;
            pointer-events: none;
        "></div>`,
    });
}

function clearSelectionOverlay() {
    if (!viewer.value) return;
    (viewer.value.get('overlays') as any).remove({ type: 'task-highlight' });
}

onMounted(async () => {
    if (!containerRef.value) return;
    const v = new NavigatedViewer({ container: containerRef.value });
    viewer.value = v;

    await v.importXML(props.bpmnXml);
    (v.get('canvas') as any).zoom('fit-viewport', 'auto');
    applyOverlays();

    v.on('element.click', (event: any) => {
        const id   = event.element?.id;
        const task = props.tasks.find(t => t.taskDefinitionId === id) ?? null;

        if (task) {
            applySelectionOverlay(id);
            selectedElementId.value = id;
        } else {
            clearSelectionOverlay();
            selectedElementId.value = null;
        }

        emit('select', task);
    });
});

watch(() => props.tasks, applyOverlays, { deep: true });

watch(() => props.bpmnXml, async (xml) => {
    if (!viewer.value || !xml) return;
    selectedElementId.value = null;
    await viewer.value.importXML(xml);
    viewer.value.get('canvas').zoom('fit-viewport', 'auto');
    applyOverlays();
});

onUnmounted(() => viewer.value?.destroy());
</script>

<template>
    <div ref="containerRef" style="width:100%;height:100%;" />
</template>

<style>
/* Suppress the bpmn-js watermark */
.bjs-powered-by { display: none !important; }

/* Selected task highlight — blue stroke on the outer shape rectangle only */
.task-selected .djs-visual > rect {
    stroke: #3b82f6 !important;
    stroke-width: 3px !important;
}
</style>
