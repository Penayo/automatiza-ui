import axios from 'axios';
import { BaseService } from '@services/BaseService';

export interface FileUploadResult {
    /** R2 object key — persisted as the process variable */
    key: string;
    /** Presigned URL valid for 7 days */
    signedUrl: string;
    filename: string;
    size: number;
    mimeType: string;
}

export class FilesService extends BaseService {
    constructor() {
        super('bpmn/files');
    }

    /**
     * Upload a single File to R2 via the engine.
     * Optionally pass a prefix (e.g. processInstanceId) to namespace the key.
     *
     * Returns { key, signedUrl, filename, size, mimeType }.
     * Store `key` in the process variable; `signedUrl` is ready-to-use for 7 days.
     */
    async uploadFile(file: File, prefix?: string): Promise<FileUploadResult> {
        const form = new FormData();
        form.append('file', file, file.name);

        const params = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';

        const { data } = await axios.post<FileUploadResult>(
            this.getUrl(`upload${params}`),
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
     * Refresh a presigned URL for a stored R2 key.
     * Use when the URL stored in a process variable has expired (after 7 days).
     */
    async refreshSignedUrl(key: string): Promise<string> {
        const result = await this.get<{ signedUrl: string }>(`url?key=${encodeURIComponent(key)}`);
        return (result as { signedUrl: string }).signedUrl;
    }
}
