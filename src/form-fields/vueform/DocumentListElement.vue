<template>
    <component :is="elementLayout" ref="container">
        <template #element>
            <div class="vf-doclist" :class="{ 'vf-doclist--disabled': isDisabled }">
                <p v-if="!resolvedDocuments.length" class="vf-doclist-empty">
                    No documents configured.
                </p>

                <div v-for="doc in resolvedDocuments" :key="doc.key" class="vf-doclist-row">
                    <div class="vf-doclist-name">
                        <i
                            class="pi"
                            :class="entryOf(doc.key)
                                ? 'pi-file-check vf-doclist-icon--done'
                                : 'pi-file vf-doclist-icon--pending'"
                        />
                        <span>{{ doc.label || doc.key }}</span>
                    </div>

                    <!-- Picked this session (File) or already uploaded (DocumentReference) -->
                    <div v-if="entryOf(doc.key)" class="vf-doclist-file">
                        <span class="vf-doclist-filename" :title="filenameOf(doc.key)">
                            {{ filenameOf(doc.key) }}
                        </span>
                        <span v-if="sizeOf(doc.key)" class="vf-doclist-size">
                            {{ formatSize(sizeOf(doc.key)) }}
                        </span>
                        <button
                            v-if="storageKeyOf(doc.key)"
                            type="button"
                            class="vf-doclist-btn"
                            title="Open file"
                            @click.prevent="open(doc.key)"
                        >
                            <i class="pi pi-external-link" />
                        </button>
                        <button
                            v-if="!isDisabled"
                            type="button"
                            class="vf-doclist-btn"
                            title="Remove"
                            @click.prevent="remove(doc.key)"
                        >
                            <i class="pi pi-times" />
                        </button>
                    </div>

                    <!-- Nothing picked yet -->
                    <label
                        v-else
                        class="vf-doclist-pick"
                        :class="{ 'vf-doclist-pick--disabled': isDisabled }"
                    >
                        <i class="pi pi-upload" />
                        <span>Choose file</span>
                        <input
                            v-if="!isDisabled"
                            type="file"
                            :accept="accept || undefined"
                            hidden
                            @change="pick(doc.key, $event)"
                        >
                    </label>
                </div>
            </div>
        </template>

        <!-- Default element slots — label, description, error, and the rest -->
        <template v-for="(component, slot) in elementSlots" #[slot]>
            <slot :name="slot" :el$="el$"><component :is="component" :el$="el$" /></slot>
        </template>
    </component>
</template>

<script>
/**
 * `documentList` — a checklist of named documents, one file upload each.
 *
 * The Vueform counterpart of form-fields/DocumentListField.js, and deliberately the
 * same value shape, so both editors feed one reader:
 *
 *     { [doc.key]: File | DocumentReference }
 *
 * A picked file stays a raw `File` in the model — exactly like Vueform's own `file`
 * element under `auto: false` — and FormRenderer.resolveFiles() swaps it for a
 * DocumentReference at submit (utils/form-files.ts walks nested objects, which is
 * what makes this map work without any special case). Uploading here instead would
 * orphan files on every abandoned form, and there is no process instance to attach
 * them to until the form is submitted anyway.
 *
 * `extractDocuments()` already understands the map, so the Documents tab lists these
 * without knowing which editor drew the field.
 */
import { computed } from 'vue';
import { defineElement } from '@vueform/vueform';
import { FilesService } from '@services/FilesService';
import { documentKey, isDocumentReference } from '@/utils/form-files';
import { normalizeDocuments } from '@/formbuilder/seededSources';

const filesService = new FilesService();

export default defineElement({
    name: 'DocumentListElement',

    /**
     * Required, even though this element brings its own stylesheet and never reads
     * `classes`. Vueform's class merger takes the first key of `defaultClasses` as the
     * element's main class and the theme's ElementLayout renders `el$.classes.container`
     * — with no `defaultClasses` at all, an element carrying `columns` or `addClass`
     * merges against `undefined`.
     */
    data() {
        return {
            merge: true,
            defaultClasses: { container: '' },
        };
    },

    props: {
        /** Static checklist: `[{ key, label }]`. */
        documents: {
            required: false,
            type: [Array],
            default: () => ([]),
        },
        /**
         * Name of a variable holding the checklist, for a list that is not known until
         * runtime. Resolved in two places, nearest wins:
         *
         *   - live form data, so a list produced by another field on this same form
         *     re-renders this one as the user answers;
         *   - the seeded process variables, folded into `documents` before render by
         *     resolveSeededSources() — FormRenderer, where that data lives.
         */
        documentsFrom: {
            required: false,
            type: [String],
            default: null,
        },
        /** Forwarded to the file input, e.g. ".pdf,.png" or "image/*". */
        accept: {
            required: false,
            type: [String],
            default: null,
        },
    },

    setup(props, context) {
        // Everything GenericElement built: the model slice, the writer, the form, and
        // the resolved disabled state (form-level `disabled` included).
        const { value, update, form$, isDisabled } = context.element;

        const resolvedDocuments = computed(() => {
            const live = props.documentsFrom
                ? form$.value?.data?.[props.documentsFrom]
                : undefined;
            return normalizeDocuments(Array.isArray(live) ? live : props.documents);
        });

        /** The value is null while empty, so every read goes through this. */
        const current = computed(() => (
            value.value && typeof value.value === 'object' ? value.value : {}
        ));

        const entryOf = (key) => current.value[key] ?? null;

        const filenameOf = (key) => {
            const entry = entryOf(key);
            if (!entry) return '';
            return entry instanceof File ? entry.name : (entry.filename ?? '');
        };

        const sizeOf = (key) => entryOf(key)?.size ?? 0;

        /** Only a stored reference can be opened — a File has not been uploaded yet. */
        const storageKeyOf = (key) => {
            const entry = entryOf(key);
            return isDocumentReference(entry) ? documentKey(entry) : '';
        };

        function pick(key, event) {
            const file = event.target.files?.[0];
            // Clearing the input is what lets the same file be re-picked after a remove.
            event.target.value = '';
            if (!file) return;
            update({ ...current.value, [key]: file });
        }

        function remove(key) {
            const next = { ...current.value };
            delete next[key];
            // Back to null rather than {} so `required` still means "nothing attached".
            update(Object.keys(next).length ? next : null);
        }

        async function open(key) {
            const storageKey = storageKeyOf(key);
            if (!storageKey) return;
            try {
                // The batch endpoint, not GET /url — that one is bearer-only, and this
                // element also renders on public share-link forms with no session.
                const { doc } = await filesService.refreshSignedUrls({ doc: storageKey });
                if (doc) window.open(doc, '_blank', 'noopener,noreferrer');
            } catch {
                // The file is still in storage — only the fresh URL failed. Nothing to
                // recover here, and an inline error would outlive the click.
            }
        }

        function formatSize(bytes) {
            if (!bytes) return '';
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }

        return {
            resolvedDocuments,
            entryOf,
            filenameOf,
            sizeOf,
            storageKeyOf,
            pick,
            remove,
            open,
            formatSize,
            isDisabled,
        };
    },
});
</script>

<style>
/*
 * Not scoped: the render function is handed to Vueform's template registry and is
 * applied to a component built by the installer, which does not carry the SFC's
 * scope id. The `vf-doclist-` prefix is what keeps these from colliding instead.
 */
.vf-doclist {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.vf-doclist--disabled { opacity: 0.6; pointer-events: none; }

.vf-doclist-empty {
    margin: 0;
    font-size: 0.8125rem;
    font-style: italic;
    color: var(--vf-color-muted);
}

.vf-doclist-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 0.625rem;
    border: 1px solid var(--vf-border-color-input);
    border-radius: var(--vf-radius-input);
    background: var(--vf-bg-input);
    min-height: 2.25rem;
}

.vf-doclist-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    min-width: 0;
}

.vf-doclist-icon--done    { color: var(--vf-color-success); }
.vf-doclist-icon--pending { color: var(--vf-color-muted); }

.vf-doclist-file {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.vf-doclist-filename {
    font-size: 0.8125rem;
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.vf-doclist-size {
    font-size: 0.75rem;
    color: var(--vf-color-muted);
    white-space: nowrap;
}

.vf-doclist-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    border-radius: var(--vf-radius-input);
    background: transparent;
    color: var(--vf-color-muted);
    cursor: pointer;
    font-size: 0.75rem;
}

.vf-doclist-btn:hover {
    background: var(--vf-bg-selected);
    color: var(--vf-color-input);
}

.vf-doclist-pick {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border: 1px solid var(--vf-border-color-btn);
    border-radius: var(--vf-radius-btn);
    background: var(--vf-bg-btn-secondary);
    color: var(--vf-color-btn-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    white-space: nowrap;
}

.vf-doclist-pick--disabled { cursor: not-allowed; }
</style>
