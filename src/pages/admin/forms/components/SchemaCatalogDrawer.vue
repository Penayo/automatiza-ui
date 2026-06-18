<script setup lang="ts">
import { ref, computed } from 'vue';
import { Button } from 'primevue';

const props = defineProps<{ visible: boolean }>();
const emit  = defineEmits<{ 'update:visible': [v: boolean] }>();

const close = () => emit('update:visible', false);

// ── Catalog data ──────────────────────────────────────────────────────────────
interface ExampleSection {
    label: string;
    code:  Record<string, any>;
}

interface CatalogEntry {
    id:          string;
    label:       string;
    category:    string;
    icon:        string;
    description: string;
    schema:      Record<string, any>;
    uiSchema?:   Record<string, any>;
    examples?:   ExampleSection[];
}

const CATALOG: CatalogEntry[] = [
    // ── Text & Input ─────────────────────────────────────────────────────────
    {
        id: 'text', label: 'Text Input', category: 'Text & Input', icon: 'pi-minus',
        description: 'Single-line text field.',
        schema: { type: 'string', title: 'Field Label' },
    },
    {
        id: 'textarea', label: 'Textarea', category: 'Text & Input', icon: 'pi-align-left',
        description: 'Multi-line text area.',
        schema: { type: 'string', title: 'Field Label' },
        uiSchema: { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } },
    },
    {
        id: 'password', label: 'Password', category: 'Text & Input', icon: 'pi-lock',
        description: 'Masked text input.',
        schema: { type: 'string', title: 'Password', minLength: 8 },
        uiSchema: { 'ui:options': { type: 'password' } },
    },
    {
        id: 'email', label: 'Email', category: 'Text & Input', icon: 'pi-envelope',
        description: 'Email address with format validation.',
        schema: { type: 'string', title: 'Email', format: 'email' },
    },
    {
        id: 'url', label: 'URL', category: 'Text & Input', icon: 'pi-link',
        description: 'URL field with format validation.',
        schema: { type: 'string', title: 'URL', format: 'uri' },
    },

    // ── Numbers ──────────────────────────────────────────────────────────────
    {
        id: 'integer', label: 'Integer', category: 'Numbers', icon: 'pi-hashtag',
        description: 'Whole number input.',
        schema: { type: 'integer', title: 'Count', minimum: 0 },
    },
    {
        id: 'number', label: 'Decimal', category: 'Numbers', icon: 'pi-percentage',
        description: 'Floating-point number input.',
        schema: { type: 'number', title: 'Amount', minimum: 0, maximum: 100 },
    },

    // ── Boolean ──────────────────────────────────────────────────────────────
    {
        id: 'checkbox', label: 'Checkbox', category: 'Boolean', icon: 'pi-check-square',
        description: 'Single true/false checkbox.',
        schema: { type: 'boolean', title: 'I agree to the terms' },
    },

    // ── Selection ────────────────────────────────────────────────────────────
    {
        id: 'select', label: 'Select (dropdown)', category: 'Selection', icon: 'pi-chevron-down',
        description: 'Dropdown with fixed options defined in the schema.',
        schema: {
            type: 'string', title: 'Status',
            enum:      ['pending', 'approved', 'rejected'],
            enumNames: ['Pending',  'Approved',  'Rejected'],
        },
    },
    {
        id: 'select-widget', label: 'Select (ui:widget)', category: 'Selection', icon: 'pi-chevron-down',
        description: 'Force a select even for non-enum fields via ui:widget.',
        schema: { type: 'string', title: 'Category' },
        uiSchema: {
            'ui:widget': 'SelectWidget',
            'ui:options': {
                enumOptions: [
                    { value: 'a', label: 'Option A' },
                    { value: 'b', label: 'Option B' },
                ],
            },
        },
    },
    {
        id: 'radio', label: 'Radio Group', category: 'Selection', icon: 'pi-circle',
        description: 'Horizontal radio button group for small option sets.',
        schema: {
            type: 'string', title: 'Choice',
            enum:      ['yes', 'no'],
            enumNames: ['Yes',  'No'],
        },
        uiSchema: { 'ui:widget': 'RadioWidget' },
    },
    {
        id: 'checkboxes', label: 'Checkboxes (multi)', category: 'Selection', icon: 'pi-list-check',
        description: 'Multiple-select checkboxes for a string array.',
        schema: {
            type: 'array', title: 'Permissions',
            items: {
                type: 'string',
                enum:      ['read',  'write',  'delete'],
                enumNames: ['Read',  'Write',  'Delete'],
            },
            uniqueItems: true,
        },
        uiSchema: { 'ui:widget': 'CheckboxesWidget' },
    },

    // ── Date & Time ──────────────────────────────────────────────────────────
    {
        id: 'date', label: 'Date Picker', category: 'Date & Time', icon: 'pi-calendar',
        description: 'Calendar date picker. Value stored as ISO string (YYYY-MM-DD).',
        schema: { type: 'string', title: 'Date', format: 'date' },
    },
    {
        id: 'time', label: 'Time Picker', category: 'Date & Time', icon: 'pi-clock',
        description: 'Time picker. Value stored as HH:mm:ss.',
        schema: { type: 'string', title: 'Time', format: 'time' },
    },
    {
        id: 'datetime', label: 'Date-Time Picker', category: 'Date & Time', icon: 'pi-calendar-clock',
        description: 'Combined date and time picker. ISO 8601 value.',
        schema: { type: 'string', title: 'Date & Time', format: 'date-time' },
    },

    // ── Arrays & Lists ───────────────────────────────────────────────────────
    {
        id: 'string-list', label: 'String List', category: 'Arrays', icon: 'pi-list',
        description: 'Ordered list of free-text items with add/remove buttons.',
        schema: {
            type: 'array', title: 'Items',
            items: { type: 'string', title: 'Item' },
        },
    },
    {
        id: 'object-list', label: 'Object List', category: 'Arrays', icon: 'pi-table',
        description: 'Repeatable group of fields — each row is an object.',
        schema: {
            type: 'array', title: 'People',
            items: {
                type: 'object',
                properties: {
                    name:  { type: 'string',  title: 'Name'  },
                    email: { type: 'string',  title: 'Email' },
                    age:   { type: 'integer', title: 'Age'   },
                },
            },
        },
    },

    // ── Object / Group ───────────────────────────────────────────────────────
    {
        id: 'object', label: 'Object / Group', category: 'Layout', icon: 'pi-folder',
        description: 'Groups related fields under a titled section.',
        schema: {
            type: 'object', title: 'Address',
            properties: {
                street: { type: 'string',  title: 'Street'  },
                city:   { type: 'string',  title: 'City'    },
                zip:    { type: 'string',  title: 'ZIP Code' },
            },
        },
    },

    // ── Validation helpers ───────────────────────────────────────────────────
    {
        id: 'required', label: 'Required fields', category: 'Validation', icon: 'pi-asterisk',
        description: 'Mark specific fields as required at the object level.',
        schema: {
            type: 'object', title: 'My Form',
            required: ['name', 'email'],
            properties: {
                name:  { type: 'string', title: 'Name'  },
                email: { type: 'string', title: 'Email' },
            },
        },
    },
    {
        id: 'string-constraints', label: 'String constraints', category: 'Validation', icon: 'pi-sliders-h',
        description: 'minLength, maxLength and regex pattern.',
        schema: {
            type: 'string', title: 'Username',
            minLength: 3, maxLength: 20,
            pattern: '^[a-zA-Z0-9_]+$',
        },
    },

    // ── Custom widgets ───────────────────────────────────────────────────────
    {
        id: 'doc-review', label: 'DocReviewWidget', category: 'Custom Widgets', icon: 'pi-file-check',
        description: 'Lists uploaded documents as clickable links with a confirmation checkbox per document. Reads from a sibling key in the form data (docsKey). Detects expired signed URLs and shows a refresh button. The field value written back is a per-document-key boolean map.',
        schema: { type: 'object', title: 'Document Review' },
        uiSchema: {
            'ui:field': 'DocReviewWidget',
            'ui:options': {
                docsKey:    'uploadedDocuments',
                urlField:   'signedUrl',
                nameField:  'filename',
                keyField:   'key',
                checkLabel: 'Correct?',
            },
        },
        examples: [
            {
                label: 'formData[docsKey] — input read by the widget (one entry per uploaded file)',
                code: {
                    uploadedDocuments: {
                        nacional_id: {
                            signedUrl: 'https://cdn.example.com/nacional_id.pdf?X-Amz-Date=20250101T000000Z&X-Amz-Expires=3600',
                            filename:  'national_id.pdf',
                            key:       'tenant-id/instance-id/nacional_id.pdf',
                        },
                        business_fundation: {
                            signedUrl: 'https://cdn.example.com/business_fundation.pdf?X-Amz-Date=20250101T000000Z&X-Amz-Expires=3600',
                            filename:  'business_foundation.pdf',
                            key:       'tenant-id/instance-id/business_fundation.pdf',
                        },
                    },
                },
            },
            {
                label: 'Field value written back — per-document boolean (checked = reviewed & correct)',
                code: {
                    nacional_id:        true,
                    business_fundation: false,
                },
            },
        ],
    },
];

const CATEGORIES = [...new Set(CATALOG.map(e => e.category))];
const search     = ref('');
const selected   = ref<CatalogEntry | null>(null);
const copiedType = ref<'schema' | 'uiSchema' | null>(null);
const copyLabel  = ref('');

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    return CATALOG.filter(e =>
        !q ||
        e.label.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
});

function entriesForCategory(cat: string) {
    return filtered.value.filter(e => e.category === cat);
}

function select(entry: CatalogEntry) {
    selected.value = entry;
    copiedType.value = null;
}

async function copySnippet(type: 'schema' | 'uiSchema') {
    if (!selected.value) return;
    const obj = type === 'schema' ? selected.value.schema : selected.value.uiSchema;
    if (!obj) return;
    const text = `"fieldName": ${JSON.stringify(obj, null, 2)}`;

    try {
        await navigator.clipboard.writeText(text);
    } catch {
        // Fallback for non-secure or unsupported contexts
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    copiedType.value = type;
    copyLabel.value  = type === 'schema' ? 'JSON Schema copied!' : 'UI Schema copied!';
    setTimeout(() => { copiedType.value = null; }, 2000);
}
</script>

<template>
    <Teleport to="body">
        <Transition name="drawer">
            <div
                v-if="visible"
                class="fixed right-0 top-0 z-40 flex flex-col h-full bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden border-l border-surface-200 dark:border-zinc-700"
                style="width: min(640px, 90vw);"
            >
                <!-- Header -->
                <div class="flex items-center justify-between px-5 py-3 border-b border-surface-200 dark:border-zinc-700 shrink-0">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-book text-violet-500" style="font-size: 1rem" />
                        <span class="font-semibold text-sm">JSON Schema Field Catalog</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- Copied toast inline -->
                        <Transition name="fade">
                            <span
                                v-if="copiedType"
                                class="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                            >
                                <i class="pi pi-check" style="font-size: 0.65rem" />
                                {{ copyLabel }}
                            </span>
                        </Transition>
                        <Button icon="pi pi-times" text rounded size="small" @click="close" />
                    </div>
                </div>

                <div class="flex flex-1 min-h-0 overflow-hidden">

                    <!-- Left: searchable list -->
                    <div class="flex flex-col w-52 shrink-0 border-r border-surface-200 dark:border-zinc-700 overflow-y-auto">
                        <div class="px-3 py-2 sticky top-0 bg-white dark:bg-zinc-900 border-b border-surface-100 dark:border-zinc-800 z-10">
                            <div class="flex items-center gap-2 px-2 py-1 rounded bg-surface-100 dark:bg-zinc-800">
                                <i class="pi pi-search text-surface-400 dark:text-zinc-500" style="font-size: 0.7rem" />
                                <input
                                    v-model="search"
                                    placeholder="Search…"
                                    class="flex-1 bg-transparent text-xs outline-none text-surface-800 dark:text-zinc-200 placeholder:text-surface-400"
                                />
                            </div>
                        </div>

                        <template v-for="cat in CATEGORIES" :key="cat">
                            <template v-if="entriesForCategory(cat).length">
                                <div class="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-surface-400 dark:text-zinc-500">
                                    {{ cat }}
                                </div>
                                <button
                                    v-for="entry in entriesForCategory(cat)"
                                    :key="entry.id"
                                    @click="select(entry)"
                                    class="flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors w-full"
                                    :class="selected?.id === entry.id
                                        ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                        : 'text-surface-700 dark:text-zinc-300 hover:bg-surface-50 dark:hover:bg-zinc-800'"
                                >
                                    <i :class="['pi', entry.icon, 'shrink-0']" style="font-size: 0.7rem" />
                                    {{ entry.label }}
                                </button>
                            </template>
                        </template>
                    </div>

                    <!-- Right: detail -->
                    <div class="flex-1 min-w-0 overflow-y-auto p-5">

                        <!-- Placeholder -->
                        <div v-if="!selected" class="flex flex-col items-center justify-center h-full text-surface-400 dark:text-zinc-500 gap-3">
                            <i class="pi pi-arrow-left" style="font-size: 1.5rem" />
                            <p class="text-sm">Select a field type to see its snippet</p>
                        </div>

                        <!-- Entry detail -->
                        <template v-else>
                            <div class="flex items-center gap-2 mb-1">
                                <i :class="['pi', selected.icon, 'text-violet-500']" style="font-size: 0.9rem" />
                                <h2 class="font-semibold text-sm">{{ selected.label }}</h2>
                                <span class="text-xs px-1.5 py-0.5 rounded bg-surface-100 dark:bg-zinc-800 text-surface-500 dark:text-zinc-400">
                                    {{ selected.category }}
                                </span>
                            </div>
                            <p class="text-xs text-surface-500 dark:text-zinc-400 mb-4 leading-relaxed">
                                {{ selected.description }}
                            </p>

                            <!-- JSON Schema snippet -->
                            <div class="mb-4">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-xs font-semibold text-surface-600 dark:text-zinc-300">JSON Schema</span>
                                    <button
                                        @click="copySnippet('schema')"
                                        class="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors"
                                        :class="copiedType === 'schema'
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                            : 'bg-surface-100 dark:bg-zinc-800 text-surface-500 dark:text-zinc-400 hover:text-surface-800 dark:hover:text-zinc-200'"
                                    >
                                        <i :class="['pi', copiedType === 'schema' ? 'pi-check' : 'pi-copy']" style="font-size: 0.65rem" />
                                        {{ copiedType === 'schema' ? 'Copied!' : 'Copy' }}
                                    </button>
                                </div>
                                <pre class="text-xs bg-surface-50 dark:bg-zinc-800 border border-surface-200 dark:border-zinc-700 rounded p-3 overflow-x-auto leading-relaxed text-surface-800 dark:text-zinc-200 font-mono">"fieldName": {{ JSON.stringify(selected.schema, null, 2) }}</pre>
                            </div>

                            <!-- UI Schema snippet -->
                            <div v-if="selected.uiSchema">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-xs font-semibold text-surface-600 dark:text-zinc-300">UI Schema</span>
                                    <button
                                        @click="copySnippet('uiSchema')"
                                        class="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors"
                                        :class="copiedType === 'uiSchema'
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                            : 'bg-surface-100 dark:bg-zinc-800 text-surface-500 dark:text-zinc-400 hover:text-surface-800 dark:hover:text-zinc-200'"
                                    >
                                        <i :class="['pi', copiedType === 'uiSchema' ? 'pi-check' : 'pi-copy']" style="font-size: 0.65rem" />
                                        {{ copiedType === 'uiSchema' ? 'Copied!' : 'Copy' }}
                                    </button>
                                </div>
                                <pre class="text-xs bg-surface-50 dark:bg-zinc-800 border border-surface-200 dark:border-zinc-700 rounded p-3 overflow-x-auto leading-relaxed text-surface-800 dark:text-zinc-200 font-mono">"fieldName": {{ JSON.stringify(selected.uiSchema, null, 2) }}</pre>
                                <p class="text-xs text-surface-400 dark:text-zinc-500 mt-1">
                                    Paste the Schema snippet into <code class="bg-surface-100 dark:bg-zinc-800 px-1 rounded">properties</code> and the UI Schema snippet into the UI Schema editor under the same key.
                                </p>
                            </div>

                            <!-- Data examples -->
                            <template v-if="selected.examples?.length">
                                <div class="mt-4 border-t border-surface-100 dark:border-zinc-800 pt-4 flex flex-col gap-3">
                                    <span class="text-xs font-semibold text-surface-600 dark:text-zinc-300">Examples</span>
                                    <div v-for="(ex, i) in selected.examples" :key="i">
                                        <p class="text-xs text-surface-400 dark:text-zinc-500 mb-1 leading-relaxed">{{ ex.label }}</p>
                                        <pre class="text-xs bg-surface-50 dark:bg-zinc-800 border border-surface-200 dark:border-zinc-700 rounded p-3 overflow-x-auto leading-relaxed text-surface-800 dark:text-zinc-200 font-mono">{{ JSON.stringify(ex.code, null, 2) }}</pre>
                                    </div>
                                </div>
                            </template>
                        </template>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active { transition: transform 0.25s ease; }
.drawer-enter-from,
.drawer-leave-to    { transform: translateX(100%); }

.fade-enter-active,
.fade-leave-active  { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to      { opacity: 0; }
</style>
