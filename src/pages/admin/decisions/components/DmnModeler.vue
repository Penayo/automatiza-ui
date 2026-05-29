<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import DmnModelerLib from 'dmn-js/lib/Modeler';
import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import './styles.css';
import { useTheme } from '@/composables/useTheme';

const { isDark } = useTheme();

const props = defineProps<{
    xml?: string | null;
}>();

const emit = defineEmits<{
    'save': [xml: string];
}>();

const containerRef = ref<HTMLElement | null>(null);
const modeler      = ref<any>(null);
const error        = ref<string | null>(null);

const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
             xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
             id="definitions"
             name="Definitions"
             namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_1" name="Decision">
    <decisionTable id="decisionTable_1">
      <input id="input_1" label="Input">
        <inputExpression id="inputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="output_1" label="Output" name="result" typeRef="string"/>
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="Decision_1">
        <dc:Bounds height="80" width="180" x="160" y="100"/>
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;

async function importXml(xml: string) {
    if (!modeler.value) return;
    try {
        error.value = null;
        await modeler.value.importXML(xml);
    } catch (err: any) {
        error.value = err?.message ?? 'Failed to import DMN XML';
    }
}

async function saveXml() {
    if (!modeler.value) return;
    const { xml } = await modeler.value.saveXML({ format: true });
    emit('save', xml);
}

onMounted(async () => {
    if (!containerRef.value) return;
    try {
        modeler.value = new DmnModelerLib({ container: containerRef.value });
        await importXml(props.xml ?? INITIAL_XML);
    } catch (err: any) {
        error.value = err?.message ?? 'Failed to initialise DMN modeler';
    }
});

onUnmounted(() => {
    modeler.value?.destroy();
    modeler.value = null;
});

watch(() => props.xml, (newXml) => {
    if (newXml) importXml(newXml);
});

defineExpose({ saveXml });
</script>

<template>
    <div class="flex flex-col h-full">
        <!-- Error banner -->
        <div v-if="error" class="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm border-b border-red-200 dark:border-red-800">
            <i class="pi pi-exclamation-circle mr-1" />{{ error }}
        </div>

        <!-- Canvas — dmn-modeler-container gives our CSS hook for theming -->
        <div
            ref="containerRef"
            class="flex-1 w-full dmn-modeler-container"
            :class="isDark ? 'dmn-dark' : 'dmn-light'"
        />
    </div>
</template>
