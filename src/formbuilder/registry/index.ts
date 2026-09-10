/**
 * Element registry — the palette and the properties panel are both generated from this.
 *
 * Two separate tables:
 *   ELEMENT_DEFS  keyed by Vueform element type — how a node is edited
 *   PALETTE_ITEMS what you can drag — several can be presets of the same type
 *
 * Adding an element type or a preset is a data edit here, not new component code.
 */
import {
    generalTab, selectionGeneralTab, validationTab, conditionsTab,
    PLACEHOLDER_PROP, COLUMNS_PROP, INPUT_TYPE_PROP, EXPRESSION_PROP, READONLY_PROP,
    matrixGeneralTab, matrixLayoutTab,
} from './common';
import type { ElementDef, PaletteItem } from './types';

export type { ElementDef, PaletteItem, PropTab, PropTabKey } from './types';

// ── Element definitions, keyed by Vueform type ────────────────────────────────────

const DEFS: ElementDef[] = [
    {
        type: 'text',
        label: 'Text',
        icon: 'pi-minus',
        namePrefix: 'text',
        defaults: { label: 'Text' },
        // inputType is what turns a text element into number/email/password/tel.
        tabs: [
            generalTab({ ...PLACEHOLDER_PROP, ...INPUT_TYPE_PROP, ...EXPRESSION_PROP, ...READONLY_PROP }),
            validationTab(),
            conditionsTab(),
        ],
    },
    {
        type: 'textarea',
        label: 'Textarea',
        icon: 'pi-align-left',
        namePrefix: 'textarea',
        defaults: { label: 'Textarea', rows: 3 },
        tabs: [
            generalTab({
                ...PLACEHOLDER_PROP,
                rows: { type: 'text', inputType: 'number', label: 'Rows', default: 3 },
            }),
            validationTab(),
            conditionsTab(),
        ],
    },
    {
        type: 'select',
        label: 'Select',
        icon: 'pi-chevron-down',
        namePrefix: 'select',
        defaults: { label: 'Select', items: {} },
        tabs: [selectionGeneralTab({ ...PLACEHOLDER_PROP, native: { type: 'toggle', label: 'Native control' } }), validationTab(), conditionsTab()],
    },
    {
        type: 'radiogroup',
        label: 'Radio group',
        icon: 'pi-circle',
        namePrefix: 'radio',
        defaults: { label: 'Radio group', items: {} },
        tabs: [selectionGeneralTab(), validationTab(), conditionsTab()],
    },
    {
        type: 'checkbox',
        label: 'Checkbox',
        icon: 'pi-check-square',
        namePrefix: 'checkbox',
        defaults: { text: 'Checkbox' },
        tabs: [
            {
                key: 'general',
                label: 'General',
                // A checkbox's caption is `text`, not `label`.
                schema: {
                    text: { type: 'text', label: 'Text' },
                    description: { type: 'text', label: 'Description' },
                    ...COLUMNS_PROP,
                },
            },
            validationTab(),
            conditionsTab(),
        ],
    },
    {
        type: 'date',
        label: 'Date',
        icon: 'pi-calendar',
        namePrefix: 'date',
        defaults: { label: 'Date' },
        tabs: [
            generalTab({
                displayFormat: { type: 'text', label: 'Display format', placeholder: 'DD/MM/YYYY' },
            }),
            validationTab(),
            conditionsTab(),
        ],
    },
    {
        type: 'static',
        label: 'Paragraph',
        icon: 'pi-align-justify',
        namePrefix: 'static',
        defaults: { content: 'Text', tag: 'p' },
        tabs: [
            {
                key: 'general',
                label: 'General',
                // The properties panel is itself a Vueform form, so `conditions` here
                // hide the props that do not apply to the chosen tag — href only for a
                // link, src/alt only for an image, and no content at all for a divider.
                schema: {
                    tag: {
                        type: 'select',
                        label: 'Element',
                        items: {
                            p: 'Paragraph',
                            h1: 'Heading 1',
                            h2: 'Heading 2',
                            h3: 'Heading 3',
                            h4: 'Heading 4',
                            blockquote: 'Quote',
                            div: 'Block',
                            a: 'Link',
                            img: 'Image',
                            hr: 'Divider',
                        },
                        default: 'p',
                    },
                    content: {
                        type: 'textarea',
                        label: 'Content',
                        rows: 3,
                        conditions: [['tag', 'not_in', ['hr', 'img']]],
                    },
                    href: {
                        type: 'text',
                        label: 'Link URL',
                        placeholder: 'https://…',
                        conditions: [['tag', '==', 'a']],
                    },
                    target: {
                        type: 'select',
                        label: 'Open in',
                        items: { _self: 'Same tab', _blank: 'New tab' },
                        conditions: [['tag', '==', 'a']],
                    },
                    src: {
                        type: 'text',
                        label: 'Image URL',
                        placeholder: 'https://…',
                        conditions: [['tag', '==', 'img']],
                    },
                    alt: {
                        type: 'text',
                        label: 'Alt text',
                        description: 'Read out by screen readers; shown if the image fails to load.',
                        conditions: [['tag', '==', 'img']],
                    },
                    width: { type: 'text', label: 'Width', columns: 6, conditions: [['tag', '==', 'img']] },
                    height: { type: 'text', label: 'Height', columns: 6, conditions: [['tag', '==', 'img']] },
                    align: {
                        type: 'select',
                        label: 'Align',
                        items: { left: 'Left', center: 'Center', right: 'Right' },
                    },
                    allowHtml: {
                        type: 'toggle',
                        label: 'Allow HTML',
                        description: 'Render tags in the content instead of escaping them.',
                        conditions: [['tag', 'not_in', ['hr', 'img']]],
                    },
                    expressions: {
                        type: 'toggle',
                        label: 'Interpolate field values',
                        description: 'Replaces {fieldName} in the content with the live value.',
                        conditions: [['tag', 'not_in', ['hr', 'img']]],
                    },
                    ...COLUMNS_PROP,
                },
            },
            conditionsTab(),
        ],
    },

    {
        type: 'multiselect',
        label: 'Multi-select',
        icon: 'pi-list-check',
        namePrefix: 'multiselect',
        defaults: { label: 'Multi-select', items: {} },
        tabs: [
            selectionGeneralTab({
                ...PLACEHOLDER_PROP,
                max: { type: 'text', inputType: 'number', label: 'Max selections' },
            }),
            validationTab(),
            conditionsTab(),
        ],
    },
    {
        type: 'checkboxgroup',
        label: 'Checkbox group',
        icon: 'pi-check-square',
        namePrefix: 'checkboxes',
        defaults: { label: 'Checkbox group', items: {} },
        tabs: [selectionGeneralTab(), validationTab(), conditionsTab()],
    },
    {
        type: 'tags',
        label: 'Tags',
        icon: 'pi-tags',
        namePrefix: 'tags',
        defaults: { label: 'Tags', items: {} },
        tabs: [selectionGeneralTab({ ...PLACEHOLDER_PROP }), validationTab(), conditionsTab()],
    },
    {
        type: 'toggle',
        label: 'Toggle',
        icon: 'pi-power-off',
        namePrefix: 'toggle',
        defaults: { text: 'Toggle' },
        tabs: [
            {
                key: 'general',
                label: 'General',
                // A toggle's caption is `text`, like a checkbox — not `label`.
                schema: {
                    text: { type: 'text', label: 'Text' },
                    description: { type: 'text', label: 'Description' },
                    ...COLUMNS_PROP,
                },
            },
            validationTab(),
            conditionsTab(),
        ],
    },
    {
        type: 'slider',
        label: 'Slider',
        icon: 'pi-sliders-h',
        namePrefix: 'slider',
        defaults: { label: 'Slider', min: 0, max: 100, step: 1 },
        tabs: [
            generalTab({
                min: { type: 'text', inputType: 'number', label: 'Min', columns: 4 },
                max: { type: 'text', inputType: 'number', label: 'Max', columns: 4 },
                step: { type: 'text', inputType: 'number', label: 'Step', columns: 4 },
            }),
            validationTab(),
            conditionsTab(),
        ],
    },
    {
        type: 'editor',
        label: 'Rich text',
        icon: 'pi-pencil',
        namePrefix: 'editor',
        defaults: { label: 'Rich text' },
        tabs: [generalTab({ ...PLACEHOLDER_PROP }), validationTab(), conditionsTab()],
    },
    {
        type: 'phone',
        label: 'Phone',
        icon: 'pi-phone',
        namePrefix: 'phone',
        defaults: { label: 'Phone' },
        tabs: [generalTab({ ...PLACEHOLDER_PROP }), validationTab(), conditionsTab()],
    },
    {
        type: 'dates',
        label: 'Date range',
        icon: 'pi-calendar-plus',
        namePrefix: 'dates',
        defaults: { label: 'Dates', mode: 'range' },
        tabs: [
            generalTab({
                mode: {
                    type: 'select',
                    label: 'Mode',
                    items: { range: 'Range (from — to)', multiple: 'Multiple separate dates' },
                    default: 'range',
                },
                displayFormat: { type: 'text', label: 'Display format', placeholder: 'DD/MM/YYYY' },
            }),
            validationTab(),
            conditionsTab(),
        ],
    },
    {
        type: 'signature',
        label: 'Signature',
        icon: 'pi-pen-to-square',
        namePrefix: 'signature',
        defaults: { label: 'Signature' },
        tabs: [generalTab(), validationTab(), conditionsTab()],
    },
    {
        type: 'hidden',
        label: 'Hidden value',
        icon: 'pi-eye-slash',
        namePrefix: 'hidden',
        defaults: {},
        tabs: [
            {
                key: 'general',
                label: 'General',
                // A hidden element has no visible chrome — only a value.
                schema: {
                    default: { type: 'text', label: 'Default value' },
                    meta: {
                        type: 'toggle',
                        label: 'Meta only',
                        description: 'Meta fields are excluded from the submitted data.',
                    },
                    ...EXPRESSION_PROP,
                },
            },
            conditionsTab(),
        ],
    },

    {
        type: 'file',
        label: 'File upload',
        icon: 'pi-paperclip',
        namePrefix: 'file',
        // auto:false keeps the raw File in the model instead of pushing it at
        // Vueform's own upload endpoints; the renderer uploads via the documents API
        // at submit and stores a DocumentReference.
        defaults: { label: 'File', auto: false, drop: true },
        tabs: [
            generalTab({
                accept: {
                    type: 'text',
                    label: 'Accepted types',
                    placeholder: '.pdf,.png,image/*',
                },
                drop: { type: 'toggle', label: 'Drag & drop area' },
            }),
            validationTab(),
            conditionsTab(),
        ],
    },
    {
        type: 'multifile',
        label: 'Multiple files',
        icon: 'pi-copy',
        namePrefix: 'files',
        defaults: { label: 'Files', auto: false, drop: true },
        tabs: [
            generalTab({
                accept: {
                    type: 'text',
                    label: 'Accepted types',
                    placeholder: '.pdf,.png,image/*',
                },
                drop: { type: 'toggle', label: 'Drag & drop area' },
                sort: { type: 'toggle', label: 'Reorderable' },
            }),
            validationTab(),
            conditionsTab(),
        ],
    },

    {
        type: 'button',
        label: 'Button',
        icon: 'pi-stop',
        namePrefix: 'button',
        // submits:false because every host page drives submission with its own
        // actions — an in-form submit button would bypass that pipeline.
        defaults: { buttonLabel: 'Button', buttonType: 'button', submits: false },
        tabs: [
            {
                key: 'general',
                label: 'General',
                schema: {
                    buttonLabel: { type: 'text', label: 'Label' },
                    buttonType: {
                        type: 'select',
                        label: 'Type',
                        items: { button: 'Button', anchor: 'Link' },
                        default: 'button',
                    },
                    href: { type: 'text', label: 'Link URL', placeholder: 'https://…' },
                    target: {
                        type: 'select',
                        label: 'Open in',
                        items: { _self: 'Same tab', _blank: 'New tab' },
                    },
                    resets: { type: 'toggle', label: 'Resets the form' },
                    secondary: { type: 'toggle', label: 'Secondary style', columns: 6 },
                    danger: { type: 'toggle', label: 'Danger style', columns: 6 },
                    full: { type: 'toggle', label: 'Full width' },
                    ...COLUMNS_PROP,
                },
            },
            conditionsTab(),
        ],
    },
    {
        type: 'matrix',
        label: 'Matrix table',
        icon: 'pi-table',
        namePrefix: 'matrix',
        defaults: {
            label: 'Matrix',
            inputType: 'text',
            cols: { c1: 'Column 1', c2: 'Column 2' },
            rows: { r1: 'Row 1', r2: 'Row 2' },
            // The spreadsheet look is a PRESET, not the gap/padding props. The
            // `matrix-table` preset (themes/vueform/presets.js) puts `vf-matrix-table`
            // on the container, which is the parent selector every cell-border rule in
            // the shipped CSS hangs off — and it sets `gap: 0 !important` itself.
            // Without it the element renders as unstyled, spaced-apart inputs.
            presets: ['matrix-table'],
        },
        tabs: [matrixGeneralTab(), matrixLayoutTab(), validationTab(), conditionsTab()],
    },

    // ── Containers ────────────────────────────────────────────────────────────────
    {
        type: 'group',
        label: 'Group',
        icon: 'pi-clone',
        container: 'object',
        namePrefix: 'group',
        defaults: { label: 'Group' },
        tabs: [generalTab(), conditionsTab()],
    },
    {
        type: 'object',
        label: 'Object',
        icon: 'pi-folder',
        container: 'object',
        namePrefix: 'object',
        defaults: { label: 'Object' },
        tabs: [generalTab(), conditionsTab()],
    },
    {
        type: 'list',
        label: 'Repeating list',
        icon: 'pi-list',
        container: 'list',
        namePrefix: 'list',
        defaults: { label: 'List', addText: 'Add item' },
        tabs: [
            generalTab({
                addText: { type: 'text', label: 'Add button text' },
                sort: { type: 'toggle', label: 'Sortable' },
            }),
            validationTab(),
            conditionsTab(),
        ],
    },
];

export const ELEMENT_REGISTRY: Record<string, ElementDef> = Object.fromEntries(
    DEFS.map((d) => [d.type, d]),
);

export function getElementDef(type: string): ElementDef | undefined {
    return ELEMENT_REGISTRY[type];
}

// ── Palette ───────────────────────────────────────────────────────────────────────

const PALETTE_ITEMS: PaletteItem[] = [
    // Text & input
    {
        id: 'text', type: 'text', label: 'Text', icon: 'pi-minus',
        category: 'Text & input', description: 'Single-line text field.',
    },
    {
        id: 'textarea', type: 'textarea', label: 'Textarea', icon: 'pi-align-left',
        category: 'Text & input', description: 'Multi-line text field.',
    },
    {
        id: 'number', type: 'text', label: 'Number', icon: 'pi-hashtag',
        category: 'Text & input',
        description: 'Numeric input. A text element with inputType number — Vueform has no separate number element.',
        namePrefix: 'number',
        defaults: { label: 'Number', inputType: 'number' },
    },
    {
        id: 'email', type: 'text', label: 'Email', icon: 'pi-envelope',
        category: 'Text & input', description: 'Email input with the matching keyboard on mobile.',
        namePrefix: 'email',
        defaults: { label: 'Email', inputType: 'email' },
    },

    {
        id: 'password', type: 'text', label: 'Password', icon: 'pi-lock',
        category: 'Text & input', description: 'Masked text input.',
        namePrefix: 'password',
        defaults: { label: 'Password', inputType: 'password' },
    },
    {
        id: 'url', type: 'text', label: 'URL', icon: 'pi-link',
        category: 'Text & input', description: 'Web address input.',
        namePrefix: 'url',
        defaults: { label: 'URL', inputType: 'url' },
    },
    {
        id: 'editor', type: 'editor', label: 'Rich text', icon: 'pi-pencil',
        category: 'Text & input', description: 'WYSIWYG editor. Stores HTML.',
    },
    {
        id: 'phone', type: 'phone', label: 'Phone', icon: 'pi-phone',
        category: 'Text & input', description: 'Phone number with country selection.',
    },

    // Selection
    {
        id: 'select', type: 'select', label: 'Select', icon: 'pi-chevron-down',
        category: 'Selection', description: 'Single-choice dropdown.',
    },
    {
        id: 'radiogroup', type: 'radiogroup', label: 'Radio group', icon: 'pi-circle',
        category: 'Selection', description: 'Single choice from visible options.',
    },
    {
        id: 'checkbox', type: 'checkbox', label: 'Checkbox', icon: 'pi-check-square',
        category: 'Selection', description: 'Single boolean checkbox.',
    },

    {
        id: 'multiselect', type: 'multiselect', label: 'Multi-select', icon: 'pi-list-check',
        category: 'Selection', description: 'Choose several options from a dropdown. Produces an array.',
    },
    {
        id: 'checkboxgroup', type: 'checkboxgroup', label: 'Checkbox group', icon: 'pi-check-square',
        category: 'Selection', description: 'Several choices from visible options. Produces an array.',
    },
    {
        id: 'tags', type: 'tags', label: 'Tags', icon: 'pi-tags',
        category: 'Selection', description: 'Free-form or preset tags. Produces an array.',
    },
    {
        id: 'toggle', type: 'toggle', label: 'Toggle', icon: 'pi-power-off',
        category: 'Selection', description: 'On/off switch.',
    },
    {
        id: 'slider', type: 'slider', label: 'Slider', icon: 'pi-sliders-h',
        category: 'Selection', description: 'Pick a number on a track.',
    },

    // Date & time
    {
        id: 'date', type: 'date', label: 'Date', icon: 'pi-calendar',
        category: 'Date & time', description: 'Single date picker.',
    },

    {
        id: 'time', type: 'date', label: 'Time', icon: 'pi-clock',
        category: 'Date & time', description: 'Time only.',
        namePrefix: 'time',
        defaults: { label: 'Time', date: false, time: true },
    },
    {
        id: 'datetime', type: 'date', label: 'Date & time', icon: 'pi-calendar-clock',
        category: 'Date & time', description: 'Date and time together.',
        namePrefix: 'datetime',
        defaults: { label: 'Date & time', time: true },
    },
    {
        id: 'dates', type: 'dates', label: 'Date range', icon: 'pi-calendar-plus',
        category: 'Date & time', description: 'A range, or several separate dates.',
    },

    // Static
    {
        id: 'static', type: 'static', label: 'Paragraph', icon: 'pi-align-justify',
        category: 'Static',
        description: 'Read-only text block. The wrapper tag can be changed to a heading.',
    },
    {
        id: 'heading1', type: 'static', label: 'Heading 1', icon: 'pi-hashtag',
        category: 'Static', description: 'Section heading.',
        namePrefix: 'heading',
        defaults: { content: 'Heading', tag: 'h1' },
    },
    {
        id: 'heading2', type: 'static', label: 'Heading 2', icon: 'pi-hashtag',
        category: 'Static', description: 'Sub-heading.',
        namePrefix: 'heading',
        defaults: { content: 'Heading', tag: 'h2' },
    },
    {
        id: 'heading3', type: 'static', label: 'Heading 3', icon: 'pi-hashtag',
        category: 'Static', description: 'Minor heading.',
        namePrefix: 'heading',
        defaults: { content: 'Heading', tag: 'h3' },
    },
    {
        id: 'divider', type: 'static', label: 'Divider', icon: 'pi-minus',
        category: 'Static', description: 'Horizontal rule between sections.',
        namePrefix: 'divider',
        defaults: { tag: 'hr' },
    },
    {
        id: 'image', type: 'static', label: 'Image', icon: 'pi-image',
        category: 'Static', description: 'Image from a URL.',
        namePrefix: 'image',
        defaults: { tag: 'img', src: '', alt: '' },
    },
    {
        id: 'link', type: 'static', label: 'Link', icon: 'pi-external-link',
        category: 'Static', description: 'Hyperlink.',
        namePrefix: 'link',
        defaults: { content: 'Link', tag: 'a', href: '', target: '_blank' },
    },
    {
        id: 'button', type: 'button', label: 'Button', icon: 'pi-stop',
        category: 'Static', description: 'A button or link. Holds no data.',
    },

    // Advanced
    {
        id: 'file', type: 'file', label: 'File upload', icon: 'pi-paperclip',
        category: 'Advanced', description: 'Single file. Uploaded to the documents API on submit.',
    },
    {
        id: 'multifile', type: 'multifile', label: 'Multiple files', icon: 'pi-copy',
        category: 'Advanced', description: 'Several files. Produces an array of document references.',
    },
    {
        id: 'matrix', type: 'matrix', label: 'Matrix table', icon: 'pi-table',
        category: 'Advanced',
        description: 'Spreadsheet-like grid of inputs. Rows can be fixed labels or user-addable.',
    },
    {
        id: 'signature', type: 'signature', label: 'Signature', icon: 'pi-pen-to-square',
        category: 'Advanced', description: 'Drawn signature capture.',
    },
    {
        id: 'hidden', type: 'hidden', label: 'Hidden value', icon: 'pi-eye-slash',
        category: 'Advanced', description: 'Carries a value with no visible control.',
    },

    // Containers
    {
        id: 'group', type: 'group', label: 'Group', icon: 'pi-clone',
        category: 'Containers', description: 'Visual grouping. Children stay at the top level of the data.',
    },
    {
        id: 'object', type: 'object', label: 'Object (nested data)', icon: 'pi-folder',
        category: 'Containers', description: 'Groups children AND nests their data one level deeper.',
    },
    {
        id: 'list', type: 'list', label: 'Repeating list', icon: 'pi-list',
        category: 'Containers', description: 'Repeats a single child element. Produces an array.',
    },
];

export const PALETTE_REGISTRY: Record<string, PaletteItem> = Object.fromEntries(
    PALETTE_ITEMS.map((i) => [i.id, i]),
);

export function getPaletteItem(id: string): PaletteItem | undefined {
    return PALETTE_REGISTRY[id];
}

export interface PaletteCategory {
    name: string;
    items: PaletteItem[];
}

/** Palette groupings, in declaration order. */
export const PALETTE: PaletteCategory[] = PALETTE_ITEMS.reduce<PaletteCategory[]>((acc, item) => {
    const existing = acc.find((c) => c.name === item.category);
    if (existing) existing.items.push(item);
    else acc.push({ name: item.category, items: [item] });
    return acc;
}, []);
