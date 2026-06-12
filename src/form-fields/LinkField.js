import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useExpressionEvaluation } from '@bpmn-io/form-js-viewer';

// ─── Field component ──────────────────────────────────────────────────────────

export function LinkField({ field }) {
    const rawUrl   = field.url?.trim()   || '';
    const rawLabel = field.label?.trim() || '';

    // "=" prefix → FEEL expression; otherwise treated as a static string
    const urlExpr   = rawUrl.startsWith('=')   ? rawUrl   : '';
    const labelExpr = rawLabel.startsWith('=') ? rawLabel : '';

    const evaluatedUrl   = useExpressionEvaluation(urlExpr);
    const evaluatedLabel = useExpressionEvaluation(labelExpr);

    const resolvedUrl   = urlExpr   ? (evaluatedUrl   ?? rawUrl)   : (rawUrl   || '#');
    const resolvedLabel = labelExpr ? (evaluatedLabel ?? rawLabel) : (rawLabel || resolvedUrl);

    const target      = field.target     || '_blank';
    const appearance  = field.appearance || 'link';
    const icon        = field.icon?.trim();

    const rel = target === '_blank' ? 'noopener noreferrer' : undefined;

    return h('div', { class: 'fjs-link-field fjs-form-field' },
        h('a', {
            class: appearance === 'button'
                ? 'fjs-link-btn'
                : 'fjs-link',
            href:   String(resolvedUrl),
            target,
            rel,
        },
            icon && h('i', { class: `pi ${icon}`, style: 'margin-right: 6px; font-size: 0.85em;' }),
            resolvedLabel,
            appearance === 'link' && target === '_blank' &&
                h('i', { class: 'pi pi-external-link', style: 'margin-left: 5px; font-size: 0.85em; opacity: 0.7;' }),
        ),
    );
}

LinkField.config = {
    type:       'link',
    name:       'Link',
    label:      'Link',
    group:      'presentation',
    keyed:      false,
    iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    create(options = {}) {
        return {
            label:      'Open link',
            url:        '',
            target:     '_blank',
            appearance: 'link',
            ...options,
        };
    },
};

// ─── Runtime module ───────────────────────────────────────────────────────────

function LinkFieldType(formFields) {
    formFields.register('link', LinkField);
}
LinkFieldType.$inject = ['formFields'];

export const LinkModule = {
    __init__: ['linkField'],
    linkField: ['type', LinkFieldType],
};

// ─── Editor properties panel ──────────────────────────────────────────────────

function PropInput({ id, label, description, initialValue, onChange }) {
    const [value, setValue] = useState(initialValue ?? '');
    useEffect(() => { setValue(initialValue ?? ''); }, [initialValue]);

    return h('div', { class: 'bio-properties-panel-entry' },
        h('label', { class: 'bio-properties-panel-label', for: id }, label),
        h('div', { class: 'bio-properties-panel-field-wrapper' },
            h('input', {
                id,
                class: 'bio-properties-panel-input',
                type: 'text',
                value,
                onInput:   (e) => setValue(e.target.value),
                onBlur:    (e) => onChange(e.target.value),
                onKeyDown: (e) => { if (e.key === 'Enter') { onChange(e.target.value); e.target.blur(); } },
            }),
        ),
        description && h('p', { class: 'bio-properties-panel-description' }, description),
    );
}

function PropSelect({ id, label, options, initialValue, onChange }) {
    const [value, setValue] = useState(initialValue ?? options[0]?.value ?? '');
    useEffect(() => { setValue(initialValue ?? options[0]?.value ?? ''); }, [initialValue]);

    return h('div', { class: 'bio-properties-panel-entry' },
        h('label', { class: 'bio-properties-panel-label', for: id }, label),
        h('div', { class: 'bio-properties-panel-field-wrapper' },
            h('select', {
                id,
                class: 'bio-properties-panel-input',
                value,
                onChange: (e) => { setValue(e.target.value); onChange(e.target.value); },
            },
                options.map(o => h('option', { key: o.value, value: o.value }, o.label)),
            ),
        ),
    );
}

function entry(id, label, getVal, setVal, description) {
    return {
        id,
        component: () => h(PropInput, { id, label, description, initialValue: getVal(), onChange: setVal }),
    };
}

function selectEntry(id, label, options, getVal, setVal) {
    return {
        id,
        component: () => h(PropSelect, { id, label, options, initialValue: getVal(), onChange: setVal }),
    };
}

class LinkPropertiesProvider {
    constructor(propertiesPanel) {
        propertiesPanel.registerProvider(this, 500);
    }

    getGroups(field, editField) {
        return (groups) => {
            if (field.type !== 'link') return groups;

            const set = (prop) => (v) => editField(field, prop, v);

            const entries = [
                entry('link-label', 'Label', () => field.label ?? '', set('label'),
                    'Static text or FEEL expression (prefix with "="), e.g. =item.name'),
                entry('link-url',   'URL',   () => field.url   ?? '', set('url'),
                    'Static URL or FEEL expression (prefix with "="), e.g. =item.signedUrl'),
                entry('link-icon',  'Icon',  () => field.icon  ?? '', set('icon'),
                    'Optional PrimeIcon class, e.g. pi-file-pdf'),
                selectEntry('link-target', 'Open in',
                    [{ value: '_blank', label: 'New tab' }, { value: '_self', label: 'Same tab' }],
                    () => field.target     ?? '_blank', set('target')),
                selectEntry('link-appearance', 'Appearance',
                    [{ value: 'link', label: 'Link' }, { value: 'button', label: 'Button' }],
                    () => field.appearance ?? 'link',   set('appearance')),
            ];

            const generalGroup = groups.find(g => g.id === 'general');
            if (generalGroup) { generalGroup.entries = entries; }
            else              { groups.unshift({ id: 'general', label: 'General', entries }); }

            return groups;
        };
    }
}
LinkPropertiesProvider.$inject = ['propertiesPanel'];

export const LinkEditorModule = {
    __init__: ['linkPropertiesProvider'],
    linkPropertiesProvider: ['type', LinkPropertiesProvider],
};
