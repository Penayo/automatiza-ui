<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { SpeedDial, Button, useToast } from 'primevue';
import { layoutProcess } from 'bpmn-auto-layout';
import CodeEditor from '@components/CodeEditor.vue';
import DocsDrawer from '@components/DocsDrawer.vue';
import AiChatPanel from '@components/chat/AiChatPanel.vue';
import ReportListDialog         from './dialogs/ReportListDialog.vue';
import FormListDialog           from './dialogs/FormListDialog.vue';
import EmailTemplatesListDialog from './dialogs/EmailTemplatesListDialog.vue';
import FormVariablesListDialog  from './dialogs/FormVariablesListDialog.vue';
import DmnListDialog            from './dialogs/DmnListDialog.vue';
import 'camunda-bpmn-js/dist/assets/camunda-platform-modeler.css';
import '@bpmn-io/properties-panel/assets/properties-panel.css';
import '../styles.css';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';
import ZeebeBehaviorModule from 'camunda-bpmn-js-behaviors/lib/camunda-cloud';
import { CloudElementTemplatesPropertiesProviderModule } from 'bpmn-js-element-templates';
import { CreateAppendAnythingModule, CreateAppendElementTemplatesModule } from 'bpmn-js-create-append-anything';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, ZeebePropertiesProviderModule } from 'bpmn-js-properties-panel';
import { type ProcessDefinition } from '@services/ProcessesService';
import { useTheme } from '@/composables/useTheme';

const { isDark } = useTheme();
const toast = useToast();

const props = defineProps<{
	process?: ProcessDefinition
}>();
const emit = defineEmits<{ save: [xml: string] }>();

const modeler      = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);
const docsVisible  = ref(false);
const saving       = ref(false);

const showReports        = ref(false);
const showForms          = ref(false);
const showEmailTemplates = ref(false);
const showFormVariables  = ref(false);
const showDmn            = ref(false);

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'designer' | 'xml';
const activeTab  = ref<Tab>('designer');
const xmlText    = ref('');
const xmlError   = ref('');
const currentXml = ref('');

async function getXml(): Promise<string> {
	if (!modeler.value) return '';
	const { xml } = await modeler.value.saveXML({ format: true });
	return xml ?? '';
}

async function switchTab(tab: Tab) {
	const xml = await getXml();
	currentXml.value = xml;
	if (tab === 'xml') {
		xmlText.value = xml;
		xmlError.value = '';
	}
	activeTab.value = tab;
}

async function applyXmlToDesigner() {
	const domErr = xmlWellFormedError(xmlText.value);
	if (domErr) { xmlError.value = domErr; return; }

	let xml = xmlText.value;

	// If no BPMNDiagram section present, auto-generate layout
	if (!xml.includes('BPMNDiagram')) {
		try {
			xml = await layoutProcess(xml);
			xmlText.value = xml; // reflect the completed XML back into editor
		} catch (layoutErr: any) {
			xmlError.value = `Auto-layout failed: ${layoutErr?.message ?? 'check sequence flows are defined'}`;
			return;
		}
	}

	try {
		const { warnings } = await modeler.value?.importXML(xml) ?? { warnings: [] };
		activeTab.value = 'designer';
		xmlError.value = '';
		if (warnings?.length) {
			toast.add({ severity: 'warn', summary: 'Imported with warnings', detail: warnings[0]?.message, life: 4000 });
		} else {
			toast.add({ severity: 'success', summary: 'Applied', detail: 'XML applied to designer.', life: 2000 });
		}
	} catch (err: any) {
		xmlError.value = friendlyBpmnError(err?.message);
	}
}

function xmlWellFormedError(text: string): string | null {
	const doc = new DOMParser().parseFromString(text, 'application/xml');
	const err = doc.querySelector('parsererror');
	if (!err) return null;
	const line = err.textContent?.match(/line (\d+)/i)?.[1];
	const col  = err.textContent?.match(/column (\d+)/i)?.[1];
	return `Malformed XML${line ? ` at line ${line}${col ? `, col ${col}` : ''}` : ''} — check all tags are properly closed and namespaces are declared.`;
}

function friendlyBpmnError(msg: string = ''): string {
	if (msg.includes('unparsable') || msg.includes('unexpected end'))
		return 'BPMN XML is incomplete — the file must include both the <bpmn2:process> definition and a <bpmndi:BPMNDiagram> layout section, and all tags must be properly closed.';
	return msg || 'Invalid BPMN XML';
}

// ── AI context ────────────────────────────────────────────────────────────────
const aiContext = computed(() => ({
	processId: props.process?.processId,
	name:      props.process?.name,
	version:   props.process?.version,
	activeTab: activeTab.value,
	bpmnXml:   activeTab.value === 'xml' ? xmlText.value : currentXml.value,
}));

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
	saving.value = true;
	try {
		const xml = activeTab.value === 'xml' ? xmlText.value : await getXml();
		emit('save', xml);
	} finally {
		saving.value = false;
	}
}

// ── Fullscreen ────────────────────────────────────────────────────────────────
function toggleFullscreen() {
	isFullscreen.value = !isFullscreen.value;
	setTimeout(() => modeler.value?.get('canvas')?.resized(), 50);
}

// ── SpeedDial ─────────────────────────────────────────────────────────────────
const speedDialItems = [
	{ label: 'Report List',     icon: 'pi pi-file-pdf',  command: () => showReports.value = true },
	{ label: 'Form List',       icon: 'pi pi-file-edit', command: () => showForms.value = true },
	{ label: 'Email Templates', icon: 'pi pi-envelope',  command: () => showEmailTemplates.value = true },
	{ label: 'Form Variables',  icon: 'pi pi-list',      command: () => showFormVariables.value = true },
	{ label: 'DMN Decisions',   icon: 'pi pi-table',     command: () => showDmn.value = true },
];

// ── BPMN initial XML ──────────────────────────────────────────────────────────
const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">
	<bpmn2:process id="Process_1" isExecutable="true">
		<bpmn2:startEvent id="StartEvent_1"/>
	</bpmn2:process>
	<bpmndi:BPMNDiagram id="BPMNDiagram_1">
		<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
			<bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
				<dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0"/>
			</bpmndi:BPMNShape>
		</bpmndi:BPMNPlane>
	</bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

// ── Element templates ─────────────────────────────────────────────────────────
async function loadTemplates() {
	const names = [
		'email-connector', 'sendgrid-connector', 'whatsapp-connector',
		'openai-connector', 'dropbox-sign-connector', 'docusign-connector', 'report-connector',
	];
	const restNames = ['rest/http-json-connector', 'rest/http-json-connector-hybrid'];

	const promises = [
		...names.map(n => import(`../camunda/element-templates/${n}.json`)),
		...restNames.map(n => {
			const [folder, file] = n.split('/');
			return import(`../camunda/element-templates/${folder}/${file}.json`);
		}),
	];
	const results = await Promise.all(promises);
	return results.map(t => t.default).flat();
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
	if (!containerRef.value) return;
	try {
		const bpmnModeler = new BpmnModeler({
			container: '#canvas',
			propertiesPanel: { parent: '#properties' },
			additionalModules: [
				BpmnPropertiesPanelModule,
				BpmnPropertiesProviderModule,
				ZeebePropertiesProviderModule,
				ZeebeBehaviorModule,
				CloudElementTemplatesPropertiesProviderModule,
				CreateAppendAnythingModule,
				CreateAppendElementTemplatesModule,
			],
			moddleExtensions: { zeebe: zeebeModdle },
		});

		const templates = await loadTemplates();
		bpmnModeler.get('elementTemplates').set(templates);

		const xmlToLoad = props.process?.bpmnXml ?? INITIAL_XML;
		await bpmnModeler.importXML(xmlToLoad);
		modeler.value = bpmnModeler;
		currentXml.value = xmlToLoad;
	} catch (err) {
		console.error('Error initialising BPMN modeler:', err);
	}
});

onUnmounted(() => {
	modeler.value?.destroy();
	modeler.value = null;
});

watch(() => props.process, async (p) => {
	if (!p?.bpmnXml || !modeler.value) return;
	await modeler.value.importXML(p.bpmnXml);
	currentXml.value = p.bpmnXml;
});
</script>

<template>
	<div
		class="flex flex-col relative h-full"
		:class="isFullscreen ? 'fixed! inset-0 z-[999]' : ''"
	>
		<!-- ── Toolbar ────────────────────────────────────────────────────── -->
		<div class="flex items-center gap-2 px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-zinc-950 shrink-0">

			<!-- Process name + version — left -->
			<div v-if="process" class="flex items-center gap-2 min-w-0">
				<span class="text-sm font-semibold truncate" style="color: var(--layout-title-color)">
					{{ process.name }}
				</span>
				<span class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500 shrink-0">
					v{{ process.version ?? 1 }}
				</span>
			</div>

			<div class="flex-1" />

			<!-- Tab switcher — right -->
			<div class="flex items-center gap-1 bg-surface-100 dark:bg-zinc-800 rounded-lg p-1">
				<button
					v-for="tab in ([
						{ key: 'designer', icon: 'pi-objects-column', label: 'Designer' },
						{ key: 'xml',      icon: 'pi-code',           label: 'XML'      },
					] as const)"
					:key="tab.key"
					class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors"
					:class="activeTab === tab.key
						? 'bg-white dark:bg-zinc-700 text-surface-900 dark:text-white shadow-sm'
						: 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
					@click="switchTab(tab.key)"
				>
					<i :class="'pi ' + tab.icon" style="font-size: 0.75rem" />
					{{ tab.label }}
				</button>
			</div>

			<!-- Save -->
			<Button
				label="Save"
				icon="pi pi-save"
				size="small"
				:loading="saving"
				@click="save"
			/>
		</div>

		<!-- ── Designer tab ───────────────────────────────────────────────── -->
		<div v-show="activeTab === 'designer'" class="flex flex-1 min-h-0">
			<div ref="containerRef" id="canvas" class="canvas" style="width: 70%; height: 100%;" />
			<div id="properties" class="properties-panel" style="width: 30%; height: 100%;" />
		</div>

		<!-- ── XML tab ────────────────────────────────────────────────────── -->
		<div v-if="activeTab === 'xml'" class="flex flex-col flex-1 min-h-0">
			<div class="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
				<p class="text-xs text-surface-400">
					Raw BPMN XML. Edit then click "Apply" to push changes back to the designer.
				</p>
				<div class="flex items-center gap-2">
					<span v-if="xmlError" class="text-xs text-red-500">{{ xmlError }}</span>
					<Button
						label="Apply to designer"
						icon="pi pi-arrow-left"
						size="small"
						severity="secondary"
						@click="applyXmlToDesigner"
					/>
				</div>
			</div>
			<div class="flex-1 min-h-0">
				<CodeEditor
					v-model="xmlText"
					lang="xml"
					:dark="isDark"
					@update:modelValue="xmlError = ''"
				/>
			</div>
		</div>

		<!-- ── Floating controls (bottom-right) ──────────────────────────── -->
		<div style="position:absolute;bottom:28px;right:80px;z-index:10;display:flex;align-items:flex-end;gap:6px;">
			<SpeedDial
				class="modeler-speeddial"
				:model="speedDialItems"
				direction="up"
				:style="{ position: 'relative' }"
				:pt="{
					button: { style: 'width:48px;height:48px;border-radius:8px;background:var(--p-surface-600,#52525b);color:white;box-shadow:0 2px 8px rgba(0,0,0,.25);border:none;' },
					menu:   { style: 'bottom:44px;right:0;left:auto;min-width:180px;' },
				}"
				:tooltipOptions="{ position: 'left', event: 'hover' }"
				buttonIcon="pi pi-list"
				v-tooltip.left="'Quick access'"
			/>
			<button
				title="Documentation"
				style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--p-surface-700,#3f3f46);color:white;box-shadow:0 2px 8px rgba(0,0,0,.25);"
				@click="docsVisible = true"
			>
				<i class="pi pi-question-circle" />
			</button>
			<button
				:title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
				style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--p-primary-500,#6366f1);color:white;box-shadow:0 2px 8px rgba(0,0,0,.25);"
				@click="toggleFullscreen"
			>
				<i :class="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'" />
			</button>
		</div>
	</div>

	<!-- Drawers & dialogs -->
	<DocsDrawer               v-model:visible="docsVisible" />
	<ReportListDialog         v-model:visible="showReports" />
	<FormListDialog           v-model:visible="showForms" />
	<EmailTemplatesListDialog v-model:visible="showEmailTemplates" />
	<FormVariablesListDialog  v-model:visible="showFormVariables" />
	<DmnListDialog            v-model:visible="showDmn" />

	<!-- AI panel -->
	<AiChatPanel context-type="bpmn-designer" :context="aiContext" />
</template>

<style>
/* SpeedDial action buttons — light gray with dark text in dark mode */
:root.dark .modeler-speeddial .p-speeddial-action {
    background: #e4e4e7 !important;
    color: #18181b !important;
    border: none !important;
}
:root.dark .modeler-speeddial .p-speeddial-action:hover {
    background: #ffffff !important;
    color: #18181b !important;
}
</style>

