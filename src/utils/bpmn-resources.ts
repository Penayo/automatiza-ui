/**
 * Everything a diagram points at outside itself — forms, email templates, reports,
 * DMN decisions, datasources, job workers and called processes — read straight out of the BPMN XML.
 *
 * Parsing happens in the browser: EditProcess already holds `bpmnXml`, so the Info tab
 * needs no extra round trip. The XML is walked once by local element name, which keeps
 * this agnostic to the namespace prefix (diagrams in this repo carry both `bpmn:` and
 * `bpmn2:`) and to whichever modeler version wrote the file.
 */

export type ResourceKind =
    | 'form'
    | 'emailTemplate'
    | 'report'
    | 'decision'
    | 'datasource'
    | 'worker'
    | 'process';

/** A diagram element that carries a reference — what the user clicks back to in the modeler. */
export interface ResourceUsage {
    /** BPMN element id, e.g. "Activity_1x2y3z". */
    id: string;
    /** The element's label, when it has one. */
    name?: string;
    /** BPMN type as written in the XML, e.g. "userTask" → "bpmn:UserTask". */
    type: string;
}

export interface BpmnResourceRef {
    kind: ResourceKind;
    /** The reference as written in the diagram: a form code, template key, decision id… */
    ref: string;
    /**
     * The reference is a FEEL expression or a `{{…}}` placeholder, so which resource it
     * names is only known at run time — there is nothing to link to.
     */
    dynamic: boolean;
    usedBy: ResourceUsage[];
}

/** Job types whose io-mapping inputs name a resource. Mirrors ServiceTaskType in the engine. */
const EMAIL_TASK_TYPES  = new Set(['io.penayotech:smtp:1', 'io.camunda:email:1']);
const REPORT_TASK_TYPE  = 'io.processlinker:report:v1';
const DATASOURCE_TASK_TYPE = 'io.processlinker:datasource:v1';

/** `custom:` form references point at a registered Vue view, not at a stored Form. */
const CUSTOM_FORM_PREFIX = 'custom:';
/** Optional marker in a Custom Form Key; the prefix itself is not part of the stored code. */
const STORED_FORM_PREFIX = 'json-form:';

function isDynamic(value: string): boolean {
    return value.startsWith('=') || value.includes('{{');
}

function childrenNamed(el: Element, localName: string): Element[] {
    return Array.from(el.children).filter(c => c.localName === localName);
}

/**
 * The flow element that owns an extension element — climbs past `extensionElements`
 * and `ioMapping` wrappers, which carry no id of their own.
 */
function ownerOf(el: Element): Element | null {
    let node: Element | null = el.parentElement;
    while (node) {
        if (node.localName !== 'extensionElements' && node.localName !== 'ioMapping' && node.hasAttribute('id')) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}

function usageOf(owner: Element | null): ResourceUsage | null {
    if (!owner) return null;
    return {
        id:   owner.getAttribute('id') ?? '',
        name: owner.getAttribute('name') ?? undefined,
        type: `bpmn:${owner.localName.charAt(0).toUpperCase()}${owner.localName.slice(1)}`,
    };
}

/** `target` → `source` for an element's `zeebe:ioMapping` inputs. */
function inputsOf(owner: Element): Record<string, string> {
    const inputs: Record<string, string> = {};
    for (const ext of childrenNamed(owner, 'extensionElements')) {
        for (const mapping of childrenNamed(ext, 'ioMapping')) {
            for (const input of childrenNamed(mapping, 'input')) {
                const target = input.getAttribute('target');
                const source = input.getAttribute('source');
                if (target && source) inputs[target] = source;
            }
        }
    }
    return inputs;
}

/**
 * Extracts every external reference in the diagram, deduplicated per kind+ref and
 * annotated with the elements that use it. Returns an empty list for XML that does
 * not parse — a malformed diagram is the Diagram tab's problem to report, not this one's.
 */
export function extractBpmnResources(bpmnXml: string | null | undefined): BpmnResourceRef[] {
    if (!bpmnXml) return [];

    const doc = new DOMParser().parseFromString(bpmnXml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return [];

    const found = new Map<string, BpmnResourceRef>();

    function add(kind: ResourceKind, rawRef: string | null, owner: Element | null) {
        const ref = rawRef?.trim();
        if (!ref) return;

        const key   = `${kind}::${ref}`;
        const entry = found.get(key) ?? { kind, ref, dynamic: isDynamic(ref), usedBy: [] };
        const usage = usageOf(owner);
        if (usage && !entry.usedBy.some(u => u.id === usage.id)) entry.usedBy.push(usage);
        found.set(key, entry);
    }

    for (const el of Array.from(doc.getElementsByTagName('*'))) {
        switch (el.localName) {
            // <zeebe:formDefinition formId="…" /> — or a Custom Form Key / External Reference.
            case 'formDefinition': {
                const raw = el.getAttribute('formId')
                    ?? el.getAttribute('externalReference')
                    ?? el.getAttribute('formKey');
                if (!raw || raw.startsWith(CUSTOM_FORM_PREFIX)) break;
                const ref = raw.startsWith(STORED_FORM_PREFIX) ? raw.slice(STORED_FORM_PREFIX.length) : raw;
                add('form', ref, ownerOf(el));
                break;
            }

            // <zeebe:calledDecision decisionId="…" />
            case 'calledDecision':
                add('decision', el.getAttribute('decisionId'), ownerOf(el));
                break;

            // <zeebe:calledElement processId="…" /> on a call activity.
            case 'calledElement':
                add('process', el.getAttribute('processId'), ownerOf(el));
                break;

            // Connector service tasks name their resource in an io-mapping input; a script
            // task set to "Job worker" names a platform worker by its type.
            case 'taskDefinition': {
                const owner = ownerOf(el);
                if (!owner) break;
                const type   = el.getAttribute('type') ?? '';
                if (owner.localName === 'scriptTask') {
                    add('worker', type, owner);
                    break;
                }
                const inputs = inputsOf(owner);

                if (EMAIL_TASK_TYPES.has(type))        add('emailTemplate', inputs.template  ?? null, owner);
                if (type === REPORT_TASK_TYPE)         add('report',        inputs.reportKey ?? null, owner);
                if (type === DATASOURCE_TASK_TYPE)     add('datasource',    inputs.datasource ?? null, owner);
                break;
            }
        }
    }

    return Array.from(found.values());
}
