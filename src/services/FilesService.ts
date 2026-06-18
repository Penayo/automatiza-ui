import axios from 'axios';
import { BaseService } from '@services/BaseService';

export interface FileUploadResult {
    /** ProcessDocument ID — store this (with r2Key) as the process variable reference. Null when uploaded outside a process context. */
    documentId: string | null;
    /** R2 object key — permanent, use to regenerate URLs via GET /bpmn/files/url?key= */
    r2Key: string;
    /** Presigned URL valid for 7 days — for immediate display only, do not persist. */
    signedUrl: string;
    filename: string;
    size: number;
    mimeType: string;
}

export interface ProcessDocumentRecord {
    id:                string;
    processInstanceId: string;
    taskId?:           string;
    r2Key:             string;
    filename:          string;
    size:              number;
    mimeType:          string;
    source:            'user_upload' | 'report_task' | 'esign_output';
    uploadedBy?:       string;
    createdAt:         string;
}

export class FilesService extends BaseService {
    constructor() {
        super('bpmn/files');
    }

    /**
     * Upload a single File to R2.
     * Pass processInstanceId + taskId to register the file in process_documents.
     * Returns { documentId, r2Key, signedUrl (transient), filename, size, mimeType }.
     * Persist only { documentId, r2Key, filename, size, mimeType } as the variable value.
     */
    async uploadFile(
        file:               File,
        processInstanceId?: string,
        taskId?:            string,
    ): Promise<FileUploadResult> {
        const form = new FormData();
        form.append('file', file, file.name);

        const params = new URLSearchParams();
        if (processInstanceId) params.set('processInstanceId', processInstanceId);
        if (taskId)            params.set('taskId', taskId);
        const qs = params.toString() ? `?${params.toString()}` : '';

        const { data } = await axios.post<FileUploadResult>(
            this.getUrl(`upload${qs}`),
            form,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...this.getAuthorizationHeader(),
                },
            },
        );

        return data;
    }

    /**
     * Generate a fresh presigned URL for an R2 key.
     */
    async refreshSignedUrl(r2Key: string): Promise<string> {
        const result = await this.get<{ signedUrl: string }>(`url?key=${encodeURIComponent(r2Key)}`);
        return (result as { signedUrl: string }).signedUrl;
    }

    /**
     * Batch-refresh presigned URLs.
     * keys: { [label]: r2Key }  →  returns { [label]: freshSignedUrl }
     */
    async refreshSignedUrls(keys: Record<string, string>): Promise<Record<string, string>> {
        const result = await this.post<Record<string, string>>('refresh-urls', { keys });
        return result as Record<string, string>;
    }

    /**
     * List all ProcessDocument records for a process instance.
     */
    async listDocuments(processInstanceId: string): Promise<ProcessDocumentRecord[]> {
        const result = await this.get<ProcessDocumentRecord[]>(
            `documents?processInstanceId=${encodeURIComponent(processInstanceId)}`,
        );
        return result as ProcessDocumentRecord[];
    }
}
