<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { $api } from '@services/api';
import { extractBpmnResources, type BpmnResourceRef, type ResourceKind } from '@/utils/bpmn-resources';
import type { IForm } from '@services/FormsService';
import type { EmailTemplateDefinition } from '@services/EmailTemplatesService';
import type { ReportDefinition } from '@services/ReportsService';
import type { DecisionDefinition } from '@services/DecisionsService';
import type { Datasource } from '@services/DatasourcesService';
import type { Worker } from '@services/WorkersService';
import type { ProcessDefinition } from '@services/ProcessesService';

const props = defineProps<{ bpmnXml?: string | null }>();

const router = useRouter();

/** One catalog per kind, loaded only for the kinds the diagram actually references. */
interface Catalogs {
    form?:          IForm[];
    emailTemplate?: EmailTemplateDefinition[];
    report?:        ReportDefinition[];
    decision?:      DecisionDefinition[];
    datasource?:    Datasource[];
    worker?:        Worker[];
    process?:       ProcessDefinition[];
}

const SECTIONS: { kind: ResourceKind; label: string; icon: string }[] = [
    { kind: 'form',          label: 'Forms',           icon: 'pi pi-file-edit' },
    { kind: 'emailTemplate', label: 'Email Templates', icon: 'pi pi-envelope'  },
    { kind: 'report',        label: 'Reports',         icon: 'pi pi-file-pdf'  },
    { kind: 'decision',      label: 'Decisions',       icon: 'pi pi-table'     },
    { kind: 'datasource',    label: 'Datasources',     icon: 'pi pi-database'  },
    { kind: 'worker',        label: 'Workers',         icon: 'pi pi-code'      },
    { kind: 'process',       label: 'Called Processes', icon: 'pi pi-sitemap'  },
];

const refs = computed<BpmnResourceRef[]>(() => extractBpmnResources(props.bpmnXml));

const catalogs = ref<Catalogs>({});
const loading  = ref(false);

/** The newest of several versions sharing one logical key. */
function latest<T extends { version?: number }>(items: T[]): T | undefined {
    return items.reduce<T | undefined>(
        (best, it) => (!best || (it.version ?? 0) > (best.version ?? 0) ? it : best),
        undefined,
    );
}

/**
 * Loads catalogs for the referenced kinds. A catalog that fails to load leaves its
 * references unresolved — the diagram still tells us they exist, which is the point
 * of the list, so one broken endpoint must not blank the whole section.
 */
async function loadCatalogs() {
    const kinds = new Set(refs.value.filter(r => !r.dynamic).map(r => r.kind));
    if (!kinds.size) { catalogs.value = {}; return; }

    const loaders: Partial<Record<ResourceKind, () => Promise<any>>> = {
        form:          () => $api.forms.getAll(),
        emailTemplate: () => $api.emailTemplates.getAll(),
        report:        () => $api.reports.getAll(),
        decision:      () => $api.decisions.getAll(),
        datasource:    () => $api.datasources.getAll(),
        worker:        () => $api.workers.getAll(),
        process:       () => $api.processes.getAllProcessDefinitions(),
    };

    loading.value = true;
    const wanted = [...kinds];
    const results = await Promise.allSettled(wanted.map(k => loaders[k]!()));
    const next: Catalogs = {};
    results.forEach((r, i) => {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) (next as any)[wanted[i]] = r.value;
    });
    catalogs.value = next;
    loading.value = false;
}

watch(refs, loadCatalogs, { immediate: true });

// ── Resolution ────────────────────────────────────────────────────────────────

interface ResolvedResource {
    ref:      BpmnResourceRef;
    /** Display name from the catalog; absent when the reference matched nothing. */
    name?:    string;
    /** Where the Open button goes; absent when there is nothing to open. */
    href?:    string;
    /** Set when the target exists but cannot be opened, e.g. a retired form type. */
    note?:    string;
    resolved: boolean;
}

/**
 * Resolved to a plain URL rather than a router target: these open in a new tab, so the
 * diagram the user is reading stays put — and an unsaved diagram in another tab of the
 * same window is never navigated away from.
 */
function hrefFor(to: RouteLocationRaw): string {
    return router.resolve(to).href;
}

function resolve(ref: BpmnResourceRef): ResolvedResource {
    if (ref.dynamic) return { ref, resolved: false };
    const catalog = (catalogs.value as any)[ref.kind] as any[] | undefined;
    if (!catalog) return { ref, resolved: false };

    switch (ref.kind) {
        case 'form': {
            // `code` is the stable reference; older diagrams still carry the opaque id.
            const matches = (catalog as IForm[]).filter(f => f.code === ref.ref);
            const form = latest(matches.length ? matches : (catalog as IForm[]).filter(f => f.id === ref.ref));
            if (!form) return { ref, resolved: false };
            return form.type === 'vueform'
                ? { ref, name: form.name, href: hrefFor({ name: 'FormsEdit', params: { id: form.id } }), resolved: true }
                : { ref, name: form.name, note: `${form.type} — no editor`, resolved: true };
        }
        case 'emailTemplate': {
            const t = (catalog as EmailTemplateDefinition[]).find(t => t.key === ref.ref);
            return t
                ? { ref, name: t.name, href: hrefFor({ name: 'EmailTemplateEdit', params: { id: t.id } }), resolved: true }
                : { ref, resolved: false };
        }
        case 'report': {
            const r = (catalog as ReportDefinition[]).find(r => r.key === ref.ref);
            return r
                ? { ref, name: r.name, href: hrefFor({ name: 'ReportEdit', params: { id: r.id } }), resolved: true }
                : { ref, resolved: false };
        }
        case 'decision': {
            const d = latest((catalog as DecisionDefinition[]).filter(d => d.decisionId === ref.ref));
            return d
                ? { ref, name: d.name, href: hrefFor({ name: 'DecisionEdit', params: { id: d.id } }), resolved: true }
                : { ref, resolved: false };
        }
        case 'datasource': {
            const d = (catalog as Datasource[]).find(d => d.key === ref.ref);
            return d
                ? { ref, name: d.name, href: hrefFor({ name: 'DatasourceEdit', params: { id: d.id } }), resolved: true }
                : { ref, resolved: false };
        }
        case 'worker': {
            const w = (catalog as Worker[]).find(w => w.type === ref.ref);
            return w
                ? { ref, name: w.name, href: hrefFor({ name: 'WorkerEdit', params: { id: w.id } }), resolved: true }
                : { ref, resolved: false };
        }
        case 'process': {
            const p = latest((catalog as ProcessDefinition[]).filter(p => p.processId === ref.ref));
            return p
                ? { ref, name: p.name, href: hrefFor({ name: 'ProcessEditDiagram', params: { id: p.id } }), resolved: true }
                : { ref, resolved: false };
        }
    }
}

const sections = computed(() =>
    SECTIONS
        .map(s => ({ ...s, items: refs.value.filter(r => r.kind === s.kind).map(resolve) }))
        .filter(s => s.items.length),
);

const total = computed(() => refs.value.length);

function usedByLabel(ref: BpmnResourceRef): string {
    return ref.usedBy.map(u => u.name || u.id).join(', ');
}
</script>

<template>
    <div class="space-y-4">
        <div>
            <h2 class="text-sm font-medium text-surface-400 uppercase tracking-wide">Related Elements</h2>
            <p class="text-sm text-surface-500 mt-1">
                Everything this diagram points at. Read from the BPMN on every load, so it
                follows the latest saved version.
            </p>
        </div>

        <p v-if="!total" class="text-sm text-surface-400">
            This diagram references no forms, templates, reports, workers or other processes.
        </p>

        <div v-else class="space-y-5">
            <div v-for="section in sections" :key="section.kind" class="space-y-2">
                <div class="flex items-center gap-2">
                    <i :class="section.icon" class="text-sm text-surface-400" />
                    <span class="text-sm font-medium text-surface-500">{{ section.label }}</span>
                    <span class="text-sm text-surface-400">{{ section.items.length }}</span>
                </div>

                <div
                    v-for="item in section.items"
                    :key="item.ref.ref"
                    class="flex items-center gap-3 rounded-lg px-3 py-2 bg-surface-100 dark:bg-surface-800"
                >
                    <div class="min-w-0 flex-1 leading-tight">
                        <div class="flex items-center gap-2">
                            <span class="truncate text-sm text-surface-700 dark:text-surface-300">
                                {{ item.name ?? item.ref.ref }}
                            </span>
                            <span
                                v-if="item.ref.dynamic"
                                class="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-surface-200 dark:bg-surface-700 text-surface-500"
                                v-tooltip.top="'Chosen at run time from an expression — cannot be linked.'"
                            >expression</span>
                            <span
                                v-else-if="!item.resolved && !loading"
                                class="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                v-tooltip.top="'Nothing with this key exists — the diagram will fail here.'"
                            >not found</span>
                            <span
                                v-else-if="item.note"
                                class="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-surface-200 dark:bg-surface-700 text-surface-500"
                            >{{ item.note }}</span>
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <code class="text-[11px] font-mono text-surface-400 truncate">{{ item.ref.ref }}</code>
                            <span v-if="item.ref.usedBy.length" class="text-[11px] text-surface-400 truncate">
                                · used by {{ usedByLabel(item.ref) }}
                            </span>
                        </div>
                    </div>

                    <a
                        v-if="item.href"
                        :href="item.href"
                        target="_blank"
                        rel="noopener"
                        v-tooltip.top="'Opens in a new tab'"
                        class="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg bg-surface-0 dark:bg-surface-900 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                    >
                        <i class="pi pi-external-link text-[10px]" />
                        Open
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>
