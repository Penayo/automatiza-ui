import { h } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import { isDocumentReference } from '@/utils/form-files';
import { useExpressionEvaluation, FormContext } from '@bpmn-io/form-js-viewer';

// form-js's clone() uses JSON.parse(JSON.stringify()), which destroys File objects.
// We store files in the fileRegistry service (keyed by a random string) and keep
// only a JSON-safe reference { _ref, name, size } in the form data.
const isPendingRef = (v) => typeof v === 'object' && v !== null && typeof v?._ref === 'string';
const genRefId     = () => `files::${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Single document row ──────────────────────────────────────────────────────

const API_HOST = import.meta.env.VITE_API_HOST ?? '';

async function openDocumentUrl(r2Key) {
    try {
        const res = await fetch(`${API_HOST}/bpmn/files/refresh-urls`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ keys: { doc: r2Key } }),
        });
        const data = await res.json();
        if (data.doc) window.open(data.doc, '_blank', 'noopener,noreferrer');
    } catch {
        // silently ignore — the file is still on R2, just the URL fetch failed
    }
}

function DocumentRow({ doc, uploaded, readonly, onPick, onRemove }) {
    // Already a DocumentReference (previously uploaded + saved as process variable)
    const isStored  = isDocumentReference(uploaded);
    // Picked this session — stored in fileRegistry, form data holds a { _ref, name, size } reference
    const isPending = isPendingRef(uploaded);
    const hasFile   = isStored || isPending;

    const filename = isStored ? uploaded.filename : isPending ? uploaded.name : null;
    const filesize = isStored ? uploaded.size     : isPending ? uploaded.size : null;

    return h('div', { class: 'fjs-doc-row' },
        // Label
        h('div', { class: 'fjs-doc-label' },
            h('i', { class: `pi ${hasFile ? 'pi-file-check fjs-doc-icon--done' : 'pi-file fjs-doc-icon--pending'}` }),
            h('span', null, doc.label),
        ),

        // Right side: uploaded info OR pick button.
        // Always render the pick button so the editor canvas shows a realistic preview;
        // only wire up the file input and handlers when the field is interactive.
        hasFile
            ? h('div', { class: 'fjs-doc-uploaded' },
                h('span', { class: 'fjs-doc-filename' }, filename),
                filesize != null && h('span', { class: 'fjs-doc-size' }, formatSize(filesize)),
                isStored && uploaded.r2Key && h('button', {
                    type: 'button',
                    class: 'fjs-doc-view',
                    title: 'Open file',
                    onClick: () => openDocumentUrl(uploaded.r2Key),
                }, h('i', { class: 'pi pi-external-link' })),
                !readonly && h('button', {
                    type: 'button',
                    class: 'fjs-doc-remove',
                    title: 'Remove',
                    onClick: onRemove,
                }, h('i', { class: 'pi pi-times' })),
              )
            : h('label', { class: `fjs-doc-pick${readonly ? ' fjs-doc-pick--disabled' : ''}` },
                h('i', { class: 'pi pi-upload' }),
                h('span', null, 'Choose file'),
                !readonly && h('input', {
                    type: 'file',
                    style: 'display:none',
                    onChange: (e) => {
                        const file = e.target.files?.[0];
                        if (file) onPick(file);
                        e.target.value = '';
                    },
                }),
              ),
    );
}

// ─── Main field component ─────────────────────────────────────────────────────

export function DocumentListField({ field, value, onChange, readonly, disabled }) {
    const { getService } = useContext(FormContext);
    const fileRegistry = getService('fileRegistry', false);

    // Auto-wrap plain variable names as FEEL expressions (user types "docs", we send "=docs")
    const rawExpr = field.documentsExpression?.trim() || '';
    const expr    = rawExpr && !rawExpr.startsWith('=') ? `=${rawExpr}` : rawExpr;
    const evaluatedDocs = useExpressionEvaluation(expr);
    const documents = (rawExpr && Array.isArray(evaluatedDocs))
        ? evaluatedDocs
        : (field.documents ?? []);
    const current   = (typeof value === 'object' && value !== null) ? value : {};

    function handlePick(docKey, file) {
        const ref = genRefId();
        fileRegistry?.setFiles(ref, [file]);
        onChange({ value: { ...current, [docKey]: { _ref: ref, name: file.name, size: file.size } } });
    }

    function handleRemove(docKey) {
        const docValue = current[docKey];
        if (isPendingRef(docValue)) fileRegistry?.deleteFiles(docValue._ref);
        const next = { ...current };
        delete next[docKey];
        onChange({ value: Object.keys(next).length > 0 ? next : null });
    }

    return h('div', { class: `fjs-document-list fjs-form-field ${disabled ? 'fjs-document-list--disabled' : ''}` },
        field.label && h('label', { class: 'fjs-doc-list-label' }, field.label),
        documents.length === 0
            ? h('p', { class: 'fjs-doc-empty' }, 'No documents configured.')
            : documents.map(doc =>
                h(DocumentRow, {
                    key:      doc.key,
                    doc,
                    uploaded: current[doc.key] ?? null,
                    readonly: readonly || disabled,
                    onPick:   (file) => handlePick(doc.key, file),
                    onRemove: () => handleRemove(doc.key),
                })
              ),
    );
}

DocumentListField.config = {
    type:       'documentList',
    name:       'Document List',
    label:      'Document List',
    group:      'basic-input',
    keyed:      true,
    emptyValue: null,
    iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    create(options = {}) {
        return {
            documents: [],
            ...options,
        };
    },
};

// ─── Runtime module (viewer + editor) ────────────────────────────────────────

function DocumentListType(formFields) {
    formFields.register('documentList', DocumentListField);
}
DocumentListType.$inject = ['formFields'];

export const DocumentListModule = {
    __init__: ['documentListField'],
    documentListField: ['type', DocumentListType],
};

// ─── Editor properties panel ──────────────────────────────────────────────────

// Plain Preact input — avoids @bpmn-io/properties-panel context dependencies
// (that package inlines its own Preact, causing hook context mismatches).
//
// Commits to editField only on blur/Enter, not on every keystroke.
// Committing on every keystroke re-renders the properties panel, which creates
// new component function closures → Preact unmounts the input → focus lost.
function PropTextInput({ id, label, description, initialValue, onChange }) {
    const [value, setValue] = useState(initialValue ?? '');

    useEffect(() => { setValue(initialValue ?? ''); }, [initialValue]);

    function commit(v) {
        onChange(v);
    }

    return h('div', { class: 'bio-properties-panel-entry' },
        h('label', { class: 'bio-properties-panel-label', for: id }, label),
        h('div', { class: 'bio-properties-panel-field-wrapper' },
            h('input', {
                id,
                class: 'bio-properties-panel-input',
                type: 'text',
                value,
                onInput:   (e) => setValue(e.target.value),
                onBlur:    (e) => commit(e.target.value),
                onKeyDown: (e) => { if (e.key === 'Enter') { commit(e.target.value); e.target.blur(); } },
            }),
        ),
        description && h('p', { class: 'bio-properties-panel-description' }, description),
    );
}

function makeEntry(entryId, label, getVal, setVal, description) {
    return {
        id: entryId,
        component: () => h(PropTextInput, {
            id: entryId,
            label,
            description,
            initialValue: getVal(),
            onChange: setVal,
        }),
    };
}

class DocumentListPropertiesProvider {
    constructor(propertiesPanel) {
        propertiesPanel.registerProvider(this, 500);
    }

    getGroups(field, editField) {
        return (groups) => {
            if (field.type !== 'documentList') return groups;

            const entries = [
                makeEntry('documentList-id',      'Field ID',            () => field.id                ?? '', (v) => editField(field, 'id',                v)),
                makeEntry('documentList-label',   'Label',               () => field.label             ?? '', (v) => editField(field, 'label',              v)),
                makeEntry('documentList-key',     'Key',                 () => field.key               ?? '', (v) => editField(field, 'key',                v),
                    'Process variable where uploaded files are stored. e.g. "loanDocuments"'),
                makeEntry('documentList-docsExp', 'Documents expression', () => field.documentsExpression ?? '', (v) => editField(field, 'documentsExpression', v),
                    'Process variable that returns the list of documents to collect. e.g. "requiredDocs" where requiredDocs = [{ key: "id", label: "National ID" }]'),
            ];

            const generalGroup = groups.find(g => g.id === 'general');
            if (generalGroup) {
                generalGroup.entries = entries;
            } else {
                groups.unshift({ id: 'general', label: 'General', entries });
            }

            return groups;
        };
    }
}
DocumentListPropertiesProvider.$inject = ['propertiesPanel'];

export const DocumentListEditorModule = {
    __init__: ['documentListPropertiesProvider'],
    documentListPropertiesProvider: ['type', DocumentListPropertiesProvider],
};
