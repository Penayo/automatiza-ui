import axios from 'axios';
import { BaseService } from '@services/BaseService';
import { getPublicFormContext } from '@services/publicFormContext';

export interface FileUploadResult {
    /** ProcessDocument ID — store this (with storageKey) as the process variable reference. Null when uploaded outside a process context. */
    documentId: string | null;
    /** Storage key — permanent and opaque, use to regenerate URLs via GET /bpmn/files/url?key= */
    storageKey: string;
    /** Which backing store holds the file. */
    storageProvider?: 'r2' | 'm365';
    /** @deprecated Mirror of storageKey, kept for references written before pluggable storage. */
    r2Key: string;
    /** Signed URL — for immediate display only, do not persist. */
    signedUrl: string;
    filename: string;
    size: number;
    mimeType: string;
}

export interface ProcessDocumentRecord {
    id:                string;
    processInstanceId: string;
    processName?:      string;
    taskId?:           string;
    taskName?:         string;
    storageKey:        string;
    storageProvider?:  'r2' | 'm365';
    /** @deprecated Mirror of storageKey. */
    r2Key:             string;
    filename:          string;
    size:              number;
    mimeType:          string;
    source:            'user_upload' | 'report_task' | 'esign_output';
    uploadedBy?:       string;
    tenantId?:         string;
    createdAt:         string;
}

// ── Storage provider configuration ────────────────────────────────────────────

export interface M365StorageSettings {
    aadTenantId?:  string;
    clientId?:     string;
    /** A reference into the secrets store ("secrets.KEY"), never the value itself. */
    clientSecret?: string;
    driveId?:      string;
    siteUrl?:      string;
    libraryName?:  string;
    rootFolder?:   string;
}

export interface R2StorageSettings {
    accountId?:       string;
    bucket?:          string;
    /** A reference into the secrets store ("secrets.KEY"), never the value itself. */
    accessKeyId?:     string;
    /** A reference into the secrets store ("secrets.KEY"), never the value itself. */
    secretAccessKey?: string;
    rootFolder?:      string;
}

export interface GDriveStorageSettings {
    /** A reference into the secrets store holding the service account's JSON key. */
    serviceAccountKey?: string;
    /** Domain-wide delegation: the user whose Drive files are written as. */
    subject?:      string;
    /** Shared drive id. Empty ⇒ the service account's own My Drive. */
    driveId?:      string;
    rootFolderId?: string;
}

export type StorageProviderId = 'r2' | 'm365' | 'gdrive';

/** What the connections list returns — no configuration, safe for any user. */
export interface StorageConnectionSummary {
    code:      string;
    name:      string;
    provider:  StorageProviderId;
    isDefault: boolean;
    status:    'active' | 'archived';
    /** Result of the last health probe. `unknown` until one has run. */
    health:    'unknown' | 'ok' | 'failing';
    lastCheckedAt?: string;
    /** The provider's own error, present only while failing. */
    lastTestError?: string;
}

export interface StorageHealthResult {
    code:   string;
    health: 'ok' | 'failing';
    error?: string;
}

/** The admin view. `config` holds secret *references*, never values. */
export interface StorageConnection extends StorageConnectionSummary {
    config:         M365StorageSettings & R2StorageSettings & GDriveStorageSettings;
    lastTestedAt?:  string;
    lastTestError?: string;
}

export interface StorageConnectionInput {
    code:      string;
    name:      string;
    provider:  StorageProviderId;
    config:    Record<string, unknown>;
    isDefault?: boolean;
}

export interface ConnectionTestStep {
    step:    'authenticate' | 'resolve-drive' | 'write' | 'read' | 'delete';
    ok:      boolean;
    detail?: string;
}

export interface ConnectionTestResult {
    ok:       boolean;
    driveId?: string;
    steps:    ConnectionTestStep[];
}

export interface DocumentListParams {
    page?:     number;
    limit?:    number;
    search?:   string;
    source?:   'user_upload' | 'report_task' | 'esign_output';
    mimeType?: string;
    from?:     string;
    to?:       string;
}

export interface DocumentListResponse {
    data:  ProcessDocumentRecord[];
    total: number;
    page:  number;
    limit: number;
}

export class FilesService extends BaseService {
    constructor() {
        super('bpmn/files');
    }

    /**
     * Upload a single File to the tenant's document storage.
     * Pass processInstanceId + taskId to register the file in process_documents.
     * Returns { documentId, storageKey, signedUrl (transient), filename, size, mimeType }.
     * Persist only { documentId, storageKey, filename, size, mimeType } as the variable value.
     *
     * On a public form there is no session, and which tenant the upload belongs to
     * decides which storage provider receives it — so `context` carries whatever the
     * page has: the share-link / public-start token, or the process definition id for
     * an openly startable process.
     */
    async uploadFile(
        file:               File,
        processInstanceId?: string,
        taskId?:            string,
        context?:           { token?: string; processDefinitionId?: string },
        field?:             string,
    ): Promise<FileUploadResult> {
        const form = new FormData();
        form.append('file', file, file.name);

        const params = new URLSearchParams();
        if (processInstanceId)             params.set('processInstanceId', processInstanceId);
        if (taskId)                        params.set('taskId', taskId);
        if (context?.token)                params.set('token', context.token);
        if (context?.processDefinitionId)  params.set('processDefinitionId', context.processDefinitionId);
        // The field *name*, never a storage connection: the server reads the field's
        // `storage` property off the task's own form definition and resolves from there.
        if (field)                         params.set('field', field);
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
    async refreshSignedUrl(storageKey: string): Promise<string> {
        const result = await this.get<{ signedUrl: string }>(`url?key=${encodeURIComponent(storageKey)}`);
        return (result as { signedUrl: string }).signedUrl;
    }

    /**
     * Batch-refresh presigned URLs.
     * keys: { [label]: storageKey }  →  returns { [label]: freshSignedUrl }
     *
     * The share token rides along when this runs on a public form: with no session
     * it is the only thing that entitles the caller to these keys. Keys the engine
     * will not sign are absent from the response rather than failing the call.
     */
    async refreshSignedUrls(keys: Record<string, string>): Promise<Record<string, string>> {
        const token  = getPublicFormContext()?.token;
        const result = await this.post<Record<string, string>>(
            'refresh-urls',
            token ? { keys, token } : { keys },
        );
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

    /**
     * Paginated cross-instance document list for the documents management page.
     */
    async listAllDocuments(params: DocumentListParams = {}): Promise<DocumentListResponse> {
        const qs = new URLSearchParams();
        if (params.page)     qs.set('page',     String(params.page));
        if (params.limit)    qs.set('limit',    String(params.limit));
        if (params.search)   qs.set('search',   params.search);
        if (params.source)   qs.set('source',   params.source);
        if (params.mimeType) qs.set('mimeType', params.mimeType);
        if (params.from)     qs.set('from',     params.from);
        if (params.to)       qs.set('to',       params.to);

        const result = await this.get<DocumentListResponse>(
            `documents/all${qs.toString() ? `?${qs.toString()}` : ''}`,
        );
        return result as DocumentListResponse;
    }

    // ── Storage connections ───────────────────────────────────────────────────
    // A tenant registers as many places for files as it needs; a task or a form
    // field then names the one it writes to. See docs/specs/document-storage.spec.md.

    /**
     * Every connection this tenant has — codes and names only, no configuration.
     * Readable by any authenticated user: target pickers in the modeler and the
     * form builder read it.
     */
    async listStorageConnections(): Promise<StorageConnectionSummary[]> {
        return this.get<StorageConnectionSummary[]>('storage/connections');
    }

    /** One connection with its config. Admin only; secret values are never returned. */
    async getStorageConnection(code: string): Promise<StorageConnection> {
        return this.get<StorageConnection>(`storage/connections/${encodeURIComponent(code)}`);
    }

    /** Creating runs the connection test server-side and fails if it does not pass. */
    async createStorageConnection(input: StorageConnectionInput): Promise<StorageConnection> {
        return this.post<StorageConnection>('storage/connections', input);
    }

    /** `code` and `provider` are immutable; changing `config` re-runs the test. */
    async updateStorageConnection(
        code: string,
        input: { name?: string; config?: Record<string, unknown> },
    ): Promise<StorageConnection> {
        return this.put<StorageConnection>(`storage/connections/${encodeURIComponent(code)}`, input);
    }

    /** Stops new writes. Files already stored here keep resolving. */
    async archiveStorageConnection(code: string): Promise<StorageConnection> {
        return this.post<StorageConnection>(`storage/connections/${encodeURIComponent(code)}/archive`, {});
    }

    async unarchiveStorageConnection(code: string): Promise<StorageConnection> {
        return this.post<StorageConnection>(`storage/connections/${encodeURIComponent(code)}/unarchive`, {});
    }

    /** Where files go when nothing names a target. */
    async makeStorageConnectionDefault(code: string): Promise<StorageConnection> {
        return this.post<StorageConnection>(`storage/connections/${encodeURIComponent(code)}/default`, {});
    }

    /** Refused by the server while the connection still holds documents. */
    async deleteStorageConnection(code: string): Promise<boolean> {
        return this.delete(`storage/connections/${encodeURIComponent(code)}`);
    }

    /**
     * Run this connection's health probe now — authenticate and read the target,
     * without writing anything. The scheduled probe runs twice a day.
     */
    async checkStorageConnection(code: string): Promise<StorageHealthResult> {
        return this.post<StorageHealthResult>(`storage/connections/${encodeURIComponent(code)}/check`, {});
    }

    /** Dry-run a configuration without saving it. */
    async testStorageConnection(
        provider: StorageProviderId,
        config: Record<string, unknown>,
    ): Promise<ConnectionTestResult> {
        return this.post<ConnectionTestResult>('storage/connections/test', { provider, config });
    }
}
