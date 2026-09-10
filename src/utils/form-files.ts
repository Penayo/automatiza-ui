import type { FilesService } from '@services/FilesService';

/**
 * Stored in process variables after a file is uploaded to R2.
 * signedUrl is intentionally absent — regenerate on demand via GET /bpmn/files/url?key=r2Key.
 */
export interface DocumentReference {
    documentId: string | null;  // null when uploaded outside a process context
    r2Key:      string;
    filename:   string;
    size:       number;
    mimeType:   string;
}

/** True when a value looks like a DocumentReference (has r2Key + filename). */
export function isDocumentReference(value: unknown): value is DocumentReference {
    return (
        typeof value === 'object' &&
        value !== null &&
        'r2Key'    in value &&
        'filename' in value
    );
}

/** Upload a single File to R2 and return a DocumentReference (no signedUrl). */
export async function uploadFile(
    file:              File,
    filesService:      FilesService,
    processInstanceId?: string,
    taskId?:           string,
): Promise<DocumentReference> {
    const result = await filesService.uploadFile(file, processInstanceId, taskId);
    return {
        documentId: result.documentId,
        r2Key:      result.r2Key,
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
 * The form-js resolver (form-js-submit.ts) only walks the top level, which is enough
 * there because form-js data is flat. Vueform nests — `object` and `group` produce
 * sub-objects and `list` produces arrays — so a file inside a container needs a
 * recursive walk or it reaches the engine as an unserialisable File.
 */
export async function resolveNestedFiles<T>(
    value: T,
    filesService: FilesService,
    processInstanceId?: string,
    taskId?: string,
): Promise<T> {
    const walk = async (node: any): Promise<any> => {
        if (node instanceof File) {
            return uploadFile(node, filesService, processInstanceId, taskId);
        }
        if (node instanceof FileList) {
            return Promise.all(
                Array.from(node).map((f) => uploadFile(f, filesService, processInstanceId, taskId)),
            );
        }
        if (Array.isArray(node)) return Promise.all(node.map(walk));

        // An already-uploaded reference is a plain object — don't recurse into it and
        // don't disturb it.
        if (node !== null && typeof node === 'object' && !isDocumentReference(node)) {
            const entries = await Promise.all(
                Object.entries(node).map(async ([k, v]) => [k, await walk(v)] as const),
            );
            return Object.fromEntries(entries);
        }
        return node;
    };

    return walk(value) as Promise<T>;
}
