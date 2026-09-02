/**
 * A brand-new process needs a diagram before it can exist as a ProcessDefinition:
 * the backend derives the name, the processId and the ACL from parsed BPMN. This is
 * the smallest valid diagram — one start event — so a process can be created from its
 * spec without a file in hand (docs/specs/process-spec.spec.md §8.1).
 */

import { v4 as uuidv4 } from 'uuid';

const XML_ESCAPES: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
};

function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, c => XML_ESCAPES[c]);
}

/**
 * A unique BPMN process id. It must be unique per process, not per diagram: message
 * start correlation groups definitions by processId, so reusing one id across
 * unrelated processes collapses their subscriptions into each other.
 */
function newProcessId(): string {
    return `Process_${uuidv4().replace(/-/g, '')}`;
}

/** Minimal executable diagram carrying `name`, ready to be saved as v1. */
export function skeletonBpmn(name: string): string {
    const processId = newProcessId();

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_${processId}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="${processId}" name="${escapeXml(name)}" isExecutable="true">
    <bpmn2:startEvent id="StartEvent_1" />
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;
}
