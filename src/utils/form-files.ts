import type { FilesService, FileUploadResult } from '@services/FilesService';

/** Stored in process variables after a file is uploaded to R2. */
export interface StoredFile {
    key:       string;
    signedUrl: string;
    filename:  string;
    size:      number;
    mimeType:  string;
}

/** True when a value looks like a StoredFile (has key + signedUrl + filename). */
export function isStoredFile(value: unknown): value is StoredFile {
    return (
        typeof value === 'object' &&
        value !== null &&
        'key'       in value &&
        'signedUrl' in value &&
        'filename'  in value
    );
}

/** Upload a single File to R2 and return the resulting StoredFile. */
export async function uploadFile(
    file:         File,
    filesService: FilesService,
    prefix?:      string,
): Promise<StoredFile> {
    const result: FileUploadResult = await filesService.uploadFile(file, prefix);
    return {
        key:       result.key,
        signedUrl: result.signedUrl,
        filename:  result.filename,
        size:      result.size,
        mimeType:  result.mimeType,
    };
}

// ── Document extraction ───────────────────────────────────────────────────────

export interface ExtractedDocument {
    /** Top-level variable name, e.g. "loanDocuments" or "invoiceFile" */
    fieldKey: string;
    /** Sub-key within a documentList field, or same as fieldKey for single-file fields */
    docKey:   string;
    file:     StoredFile;
}

/**
 * Walk a process-variable array and return every StoredFile found, regardless
 * of whether it came from a documentList field (nested map) or a plain file field.
 */
export function extractDocuments(
    variables: { key: string; value: any }[] = [],
): ExtractedDocument[] {
    const out: ExtractedDocument[] = [];

    for (const { key: fieldKey, value } of variables) {
        if (isStoredFile(value)) {
            out.push({ fieldKey, docKey: fieldKey, file: value });
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            // documentList shape: { [docKey]: StoredFile | null }
            for (const [docKey, docVal] of Object.entries(value)) {
                if (isStoredFile(docVal)) out.push({ fieldKey, docKey, file: docVal });
            }
        }
    }

    return out;
}
