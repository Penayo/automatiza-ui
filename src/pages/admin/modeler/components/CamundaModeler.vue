<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import Menubar from 'primevue/menubar';
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

const props = defineProps<{
	process: ProcessDefinition
}>();
const emit = defineEmits(['save']);

const modeler = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

function toggleFullscreen() {
	isFullscreen.value = !isFullscreen.value;
	// Give the DOM one frame to apply the new dimensions, then tell bpmn-js
	setTimeout(() => modeler.value?.get('canvas')?.resized(), 50);
}

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

async function loadTemplates() {
	const templatePromises = [];  

	// Assuming you know the template file names, or can generate them  
	const templateNames: string[] = [  
		// List of template filenames, e.g., 'template1.json', 'template2.json', ...  
		'email-connector',
		'sendgrid-connector',
		'whatsapp-connector',
		'openai-connector',
		'dropbox-sign-connector',
		'report-connector'
	];

	for (const name of templateNames) {
		console.log(name)
		templatePromises.push(import(`../camunda/element-templates/${name}.json`));
	}

	const restTemplateNames: string[] = [
		'rest/http-json-connector',
		'rest/http-json-connector-hybrid',
	]

	for (const name of restTemplateNames) {
		const [folder, fileName] = name.split('/');
		templatePromises.push(import(`../camunda/element-templates/${folder}/${fileName}.json`));
	}

	const templates = await Promise.all(templatePromises);
	return templates.map(t => t.default).flat();
}

function showTemplateErrors(errors: any[]) {
	console.error('Failed to parse element templates', errors);

	const errorMessage = `Failed to parse element templates:
		${ errors.map(error => error.message).join('\n    ') }

		Check the developer tools for details.`;

	const errorPanelPre = containerRef.value?.querySelector('.error-panel pre');
	if (errorPanelPre) {
		errorPanelPre.textContent = errorMessage;
	}

	const errorPanel = containerRef.value?.querySelector('.error-panel');
	if (errorPanel) {
		errorPanel.classList.remove('hidden');
	}
}

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
				CreateAppendElementTemplatesModule
			],
			moddleExtensions: { zeebe: zeebeModdle }
		});

		const TEMPLATES = await loadTemplates();
		console.log(TEMPLATES)
		bpmnModeler.get('elementTemplates').set(TEMPLATES);
		bpmnModeler.on('elementTemplates.errors', event => {
			showTemplateErrors(event.errors);
		});

		await bpmnModeler.importXML(INITIAL_XML);
		modeler.value = bpmnModeler;
	} catch (error) {
		console.error('Error initializing BPMN modeler:', error);
	}
});

onUnmounted(() => {
	if (modeler.value) {
		modeler.value.destroy();
	}
});

watch(() => props.process, async (newProcess) => {
	setTimeout(async () => {
		if (modeler.value && newProcess) {
			await modeler.value.importXML(newProcess.bpmnXml);
		}
	}, 200)

}, { immediate: true });

const menuItems = [
	{
		label: props.process ? 'Save changes' : 'Save',
		icon: 'pi pi-cloud-upload',
		command: async () => {
			if (modeler.value) {
				const { xml } = await modeler.value.saveXML({ format: true });
				emit('save', xml);
			}
		}
	},
	{
		label: 'Optionssss',
		items: [
			{
				label: 'New Form',
				icon: 'pi pi-fw pi-file',
				command: () => {
				// Use vue-router if needed
				}
			},
			{
				label: 'New Process',
				icon: 'pi pi-fw pi-save'
			}
		]
	}
];
</script>

<template>
	<div
		class="bpmn-modeler-container"
		:style="isFullscreen
			? 'position:fixed;inset:0;z-index:999;display:flex;flex-direction:column;'
			: 'display:flex;flex-direction:column;height:calc(100vh - 200px);'"
	>
		<Menubar :model="menuItems" style="flex-shrink:0;" />

		<div style="display:flex;flex:1;min-height:0;">
			<div ref="containerRef" id="canvas" class="canvas" style="width: 70%; height: 100%;" />
			<div id="properties" class="properties-panel" style="width: 30%; height: 100%; border-left: 1px solid #ccc;" />
		</div>

		<!-- Fullscreen toggle -->
		<button
			@click="toggleFullscreen"
			:title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
			style="
				position: absolute; bottom: 16px; right: 16px; z-index: 10;
				width: 36px; height: 36px; border-radius: 8px; border: none; cursor: pointer;
				display: flex; align-items: center; justify-content: center;
				background: var(--p-primary-500, #6366f1); color: white; box-shadow: 0 2px 8px rgba(0,0,0,.25);
			"
		>
			<i :class="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'" />
		</button>
	</div>
</template>
