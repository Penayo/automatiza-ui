import type { FilesService } from '@services/FilesService';

/**
 * Stored in process variables after a file is uploaded.
 * signedUrl is intentionally absent — regenerate on demand via GET /bpmn/files/url?key=storageKey.
 */
export interface DocumentReference {
    documentId: string | null;  // null when uploaded outside a process context
    storageKey: string;
    /** @deprecated Mirror of storageKey, present on references written before pluggable storage. */
    r2Key?:     string;
    filename:   string;
    size:       number;
    mimeType:   string;
}

/**
 * The key of a reference written at any point in this app's history — references
 * already persisted in process variables carry only `r2Key`.
 */
export function documentKey(ref: Pick<DocumentReference, 'storageKey' | 'r2Key'>): string {
    return ref.storageKey ?? ref.r2Key ?? '';
}

/**
 * What a public form knows about itself. Threaded through every upload so the
 * engine can tell which tenant — and therefore which storage provider — the file
 * belongs to when there is no session.
 */
export interface UploadContext {
    token?:               string;
    processDefinitionId?: string;
}

/** True when a value looks like a DocumentReference (has a storage key + filename). */
export function isDocumentReference(value: unknown): value is DocumentReference {
    return (
        typeof value === 'object' &&
        value !== null &&
        ('storageKey' in value || 'r2Key' in value) &&
        'filename' in value
    );
}

/**
 * Upload a single File and return a DocumentReference (no signedUrl).
 *
 * `field` is the dotted path of the form field the file came from — `mandate`, or
 * `documents.passport` for a document list. It travels with the upload so the
 * server can honour that field's own `storage` property. It is a field name, never
 * a storage connection: the server must not take a target from the client
 * (docs/specs/document-storage.spec.md §4a.3).
 */
export async function uploadFile(
    file:              File,
    filesService:      FilesService,
    processInstanceId?: string,
    taskId?:           string,
    context?:          UploadContext,
    field?:            string,
): Promise<DocumentReference> {
    const result = await filesService.uploadFile(file, processInstanceId, taskId, context, field);
    return {
        documentId: result.documentId,
        storageKey: result.storageKey ?? result.r2Key,
        // Dual-write: older readers (and anything already persisted) key off r2Key.
        r2Key:      result.storageKey ?? result.r2Key,
        filename:   result.filename,
        size:       result.size,
        mimeType:   result.mimeType,
    };
}

// ── Document extraction ───────────────────────────────────────────────────────

export interface ExtractedDocument {
    /** Top-level variable name, e.g. "loanDocuments" or "invoiceFile" */
    fieldKey: string;
    /** Sub-key within a documentList field, or same as fieldKey for single-file fields */
    docKey:   string;
    file:     DocumentReference;
}

/**
 * Walk a process-variable array and return every DocumentReference found,
 * whether it came from a documentList field (nested map) or a plain file field.
 */
export function extractDocuments(
    variables: { key: string; value: any }[] = [],
): ExtractedDocument[] {
    const out: ExtractedDocument[] = [];

    for (const { key: fieldKey, value } of variables) {
        if (isDocumentReference(value)) {
            out.push({ fieldKey, docKey: fieldKey, file: value });
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            // documentList shape: { [docKey]: DocumentReference | null }
            for (const [docKey, docVal] of Object.entries(value)) {
                if (isDocumentReference(docVal)) out.push({ fieldKey, docKey, file: docVal as DocumentReference });
            }
        }
    }

    return out;
}

/**
 * Upload every File in a nested data object and replace it with a DocumentReference.
 *
 * The walk has to descend: Vueform nests — `object` and `group` produce
 * sub-objects and `list` produces arrays — so a file inside a container needs a
 * recursive walk or it reaches the engine as an unserialisable File.
 */
export async function resolveNestedFiles<T>(
    value: T,
    filesService: FilesService,
    processInstanceId?: string,
    taskId?: string,
    context?: UploadContext,
): Promise<T> {
    // `field` is the dotted path of keys the walk descended through. Both ends of it
    // matter: a plain file field is the first segment, while a document list's
    // sub-key is the last, and only the server knows which of the two its schema
    // has. Array indices are not appended — a list of files is still one field.
    const walk = async (node: any, field?: string): Promise<any> => {
        if (node instanceof File) {
            return uploadFile(node, filesService, processInstanceId, taskId, context, field);
        }
        if (node instanceof FileList) {
            return Promise.all(
                Array.from(node).map((f) => uploadFile(f, filesService, processInstanceId, taskId, context, field)),
            );
        }
        if (Array.isArray(node)) return Promise.all(node.map((item) => walk(item, field)));

        // An already-uploaded reference is a plain object — don't recurse into it and
        // don't disturb it.
        if (node !== null && typeof node === 'object' && !isDocumentReference(node)) {
            const entries = await Promise.all(
                Object.entries(node).map(async ([k, v]) =>
                    [k, await walk(v, field ? `${field}.${k}` : k)] as const),
            );
            return Object.fromEntries(entries);
        }
        return node;
    };

    return walk(value) as Promise<T>;
}
