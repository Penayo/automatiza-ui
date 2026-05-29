import type { FilesService, FileUploadResult } from '@services/FilesService';

/**
 * What gets stored as a process variable when a file field is submitted.
 * The `key` is the permanent R2 identifier; `signedUrl` is valid for 7 days.
 */
export interface StoredFile {
    key:       string;
    signedUrl: string;
    filename:  string;
    size:      number;
    mimeType:  string;
}

/**
 * Walk form-js submit data, resolve internal file references, upload all files
 * to R2, and return a clean data object with `StoredFile` values in place of
 * every file field.
 *
 * form-js does NOT give you `File` objects in the submit event — it gives you
 * reference strings like `"files::<id>"`. The actual `File[]` objects live in
 * the form instance's internal `fileRegistry` service, accessed via
 * `formInstance.get('fileRegistry').getFiles(id)`.
 *
 * @param data          Raw data from the form-js `submit` event
 * @param filesService  FilesService instance for R2 uploads
 * @param formInstance  The `Form` instance (from `new Form(...)`) — needed to
 *                      resolve file references
 * @param prefix        Optional R2 key prefix (e.g. processInstanceId)
 */
export async function resolveFormFiles(
    data: Record<string, any>,
    filesService: FilesService,
    formInstance?: any,
    prefix?: string,
): Promise<Record<string, any>> {
    console.log('[resolveFormFiles] raw submit data:', data);

    // ── Step 1: resolve "files::<id>" strings → File[] via form registry ────────
    const fileRegistry = formInstance?.get?.('fileRegistry');
    console.log('[resolveFormFiles] fileRegistry:', fileRegistry);
    console.log('[resolveFormFiles] registry keys:', fileRegistry?.getKeys?.());

    const preResolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.startsWith('files::')) {
            const files: File[] = fileRegistry?.getFiles?.(value) ?? [];
            console.log(`[resolveFormFiles] "${key}" is a files:: ref → resolved to ${files.length} File(s):`, files);
            if (files.length === 1) {
                preResolved[key] = files[0];          // single file → upload as one
            } else if (files.length > 1) {
                preResolved[key] = files;             // multiple files → upload as array
            } else {
                console.warn(`[resolveFormFiles] "${key}": files:: ref found but registry returned no files — skipping upload`);
                preResolved[key] = value;             // keep string as fallback
            }
        } else {
            preResolved[key] = value;
        }
    }

    console.log('[resolveFormFiles] after ref resolution:', preResolved);

    // ── Step 2: upload every File / File[] to R2 ────────────────────────────────
    const resolved: Record<string, any> = {};

    await Promise.all(
        Object.entries(preResolved).map(async ([key, value]) => {
            try {
                if (value instanceof File) {
                    console.log(`[resolveFormFiles] uploading "${key}": ${value.name} (${value.size} bytes)`);
                    resolved[key] = await uploadOne(value, filesService, prefix);
                    console.log(`[resolveFormFiles] "${key}" uploaded →`, resolved[key]);

                } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
                    console.log(`[resolveFormFiles] uploading "${key}": ${value.length} file(s)`);
                    resolved[key] = await Promise.all(
                        value.map((f: File) => uploadOne(f, filesService, prefix)),
                    );
                    console.log(`[resolveFormFiles] "${key}" all uploaded →`, resolved[key]);

                } else if (value instanceof FileList) {
                    console.log(`[resolveFormFiles] uploading "${key}": FileList with ${value.length} item(s)`);
                    resolved[key] = await Promise.all(
                        Array.from(value).map(f => uploadOne(f, filesService, prefix)),
                    );

                } else {
                    resolved[key] = value;
                }
            } catch (err) {
                console.error(`[resolveFormFiles] ERROR uploading field "${key}":`, err);
                throw err;
            }
        }),
    );

    console.log('[resolveFormFiles] final resolved data:', resolved);
    return resolved;
}

async function uploadOne(file: File, filesService: FilesService, prefix?: string): Promise<StoredFile> {
    console.log(`[uploadOne] uploading: ${file.name} (${file.size} bytes, ${file.type})`);
    try {
        const result: FileUploadResult = await filesService.uploadFile(file, prefix);
        console.log(`[uploadOne] success:`, result);
        return {
            key:       result.key,
            signedUrl: result.signedUrl,
            filename:  result.filename,
            size:      result.size,
            mimeType:  result.mimeType,
        };
    } catch (err) {
        console.error(`[uploadOne] failed for "${file.name}":`, err);
        throw err;
    }
}

/** Returns true when a value looks like a stored file (key + signedUrl). */
export function isStoredFile(value: unknown): value is StoredFile {
    return (
        typeof value === 'object' &&
        value !== null &&
        'key' in value &&
        'signedUrl' in value &&
        'filename' in value
    );
}
