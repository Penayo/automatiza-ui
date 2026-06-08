/**
 * form-js submit helpers.
 *
 * Everything in this file is specific to how form-js stores files internally:
 *  - "files::<id>" reference strings resolved via the form-js fileRegistry service
 *  - { _ref, name, size } pending-file objects created by DocumentListField to
 *    survive form-js's JSON.parse(JSON.stringify()) clone
 *
 * None of this belongs in generic upload utilities.
 */

import type { FilesService } from '@services/FilesService';
import { uploadFile, isStoredFile } from '@/utils/form-files';

// ── form-js pending-file reference ────────────────────────────────────────────
// DocumentListField stores { _ref: 'files::id', name, size } in form data so
// the File survives form-js's JSON clone. Only meaningful inside form-js context.

interface PendingFileRef {
    _ref: string;
    name: string;
    size: number;
}

function isPendingFileRef(v: unknown): v is PendingFileRef {
    return typeof v === 'object' && v !== null && typeof (v as any)._ref === 'string';
}

function isDocumentListValue(
    value: unknown,
): value is Record<string, File | PendingFileRef | object | null> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof File) &&
        !isStoredFile(value) &&
        Object.values(value as object).some(
            v => v instanceof File || isStoredFile(v) || isPendingFileRef(v) || v === null,
        )
    );
}

// ── resolveFormFiles ──────────────────────────────────────────────────────────

/**
 * Take the raw data object from a form-js submit/save event and return a clean
 * copy where every file reference has been uploaded to R2 and replaced with a
 * StoredFile object.
 *
 * Three kinds of file values are resolved:
 *  1. "files::<id>" strings  → looked up in form-js fileRegistry, then uploaded
 *  2. Raw File / FileList    → uploaded directly (standard form-js filepicker)
 *  3. DocumentList pending refs { _ref, name, size } → looked up in fileRegistry, uploaded
 */
export async function resolveFormFiles(
    data:         Record<string, any>,
    filesService: FilesService,
    formInstance?: any,
    prefix?:       string,
): Promise<Record<string, any>> {
    const fileRegistry = formInstance?.get?.('fileRegistry');

    // ── Step 1: resolve "files::<id>" strings via form-js fileRegistry ──────────
    const preResolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.startsWith('files::')) {
            const files: File[] = fileRegistry?.getFiles?.(value) ?? [];
            if      (files.length === 1) preResolved[key] = files[0];
            else if (files.length > 1)  preResolved[key] = files;
            else                         preResolved[key] = value;
        } else {
            preResolved[key] = value;
        }
    }

    // ── Step 2: upload File / File[] / FileList values ───────────────────────────
    const resolved: Record<string, any> = {};
    await Promise.all(
        Object.entries(preResolved).map(async ([key, value]) => {
            if (value instanceof File) {
                resolved[key] = await uploadFile(value, filesService, prefix);
            } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
                resolved[key] = await Promise.all(
                    value.map((f: File) => uploadFile(f, filesService, prefix)),
                );
            } else if (value instanceof FileList) {
                resolved[key] = await Promise.all(
                    Array.from(value).map(f => uploadFile(f, filesService, prefix)),
                );
            } else {
                resolved[key] = value;
            }
        }),
    );

    // ── Step 3: resolve DocumentList pending refs ────────────────────────────────
    for (const [key, value] of Object.entries(resolved)) {
        if (!isDocumentListValue(value)) continue;

        const uploadedMap: Record<string, any> = {};
        await Promise.all(
            Object.entries(value).map(async ([docKey, docValue]) => {
                if (docValue instanceof File) {
                    uploadedMap[docKey] = await uploadFile(docValue, filesService, prefix);
                } else if (isPendingFileRef(docValue)) {
                    const files: File[] = fileRegistry?.getFiles?.(docValue._ref) ?? [];
                    uploadedMap[docKey] = files[0]
                        ? await uploadFile(files[0], filesService, prefix)
                        : null;
                } else {
                    uploadedMap[docKey] = docValue;
                }
            }),
        );
        resolved[key] = uploadedMap;
    }

    return resolved;
}
