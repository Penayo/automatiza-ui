import { ModelApiService } from '@services/ModelAPI';
import type { ListQuery, PageResponse } from '@services/api';

/**
 * Datasource declarations — docs/specs/datasources.spec.md.
 * The platform stores the declaration; the data lives in the remote system.
 */

export type FilterMode = 'params' | 'composed';
export type PaginationStyle = 'page' | 'offset' | 'range' | 'none';
export type OperationKind = 'query' | 'single' | 'write';

export interface DatasourceAuth {
    type: 'none' | 'basic' | 'bearer' | 'apiKey';
    apiKeyLocation?: 'header' | 'query';
    name?: string;
    /** Write-only: `secrets.KEY` references. Reads come back as *Configured flags. */
    value?: string;
    username?: string;
    password?: string;
    token?: string;
    valueConfigured?: boolean;
    usernameConfigured?: boolean;
    passwordConfigured?: boolean;
    tokenConfigured?: boolean;
}

export interface DatasourceFilterStyle {
    mode: FilterMode;
    param?: string;
    join?: string;
}

export type SortMode = 'param' | 'params' | 'none';

export interface DatasourceSortStyle {
    mode: SortMode;
    /** mode=param — the single sort param, e.g. "order" / "sort". */
    param?: string;
    join?: string;
    /** mode=param — per-term templates, e.g. asc "{{field}}.asc". */
    asc?: string;
    desc?: string;
    /** mode=params — two separate params. */
    fieldParam?: string;
    dirParam?: string;
    ascValue?: string;
    descValue?: string;
}

export interface DatasourceFilter {
    key: string;
    label?: string;
    type?: 'text' | 'number' | 'select' | 'date' | 'boolean';
    options?: { label: string; value: any }[];
    param?: string;
    value?: string;
    fragment?: string;
}

export interface DatasourcePagination {
    style: PaginationStyle;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    requestHeaders?: Record<string, string>;
    total?: {
        from: 'body' | 'header' | 'none';
        path?: string;
        header?: string;
        format?: 'int' | 'content-range' | { regex: string };
    };
}

export interface DatasourceOperation {
    key: string;
    kind: OperationKind;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: any;
    idempotent?: boolean;
    retries?: number;
    retryBackoff?: string;
    result?: {
        itemsPath?: string;
        keyField: string;
        labelField: string;
        fields?: { name: string; path: string; label?: string; sortable?: boolean; inList?: boolean }[];
    };
    filters?: DatasourceFilter[];
    filterStyle?: DatasourceFilterStyle;
    sortStyle?: DatasourceSortStyle;
    pagination?: DatasourcePagination;
    notFound?: {
        match: { status?: number[]; bodyPath?: string; equals?: string; emptyArray?: boolean };
        behavior: 'null' | 'error';
    };
}

export interface Datasource {
    id: string;
    key: string;
    name: string;
    description?: string;
    baseUrl: string;
    auth: DatasourceAuth;
    defaultHeaders?: Record<string, string>;
    timeoutMs?: number;
    filterStyle: DatasourceFilterStyle;
    sortStyle?: DatasourceSortStyle;
    pagination: DatasourcePagination;
    operations: DatasourceOperation[];
    healthCheck?: string;
    enabled: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type SaveDatasourceDto = Omit<Datasource, 'id' | 'createdAt' | 'updatedAt'>;

export interface DatasourceSort {
    /** Mapped column name (`fields[].name`, or `_label` / `_key`). */
    field: string;
    dir?: 'asc' | 'desc';
}

export interface ExecuteInput {
    key?: string;
    filters?: Record<string, unknown>;
    limit?: number;
    offset?: number;
    page?: number;
    /** §7.4 — single-field sort, pushed down to the remote. */
    sort?: DatasourceSort;
}

// ── §10.5 browse metadata (credential-free; any authenticated user) ────────────
export interface BrowsableField {
    name: string;
    label: string;
    sortable: boolean;
    /** false ⇒ hidden from the index grid (still shown in the details view). */
    inList: boolean;
}

export interface BrowsableFilter {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date' | 'boolean';
    options?: { label: string; value: any }[];
}

export interface BrowsableOperation {
    key: string;
    label: string;
    kind: 'query';
    keyField: string;
    labelField: string;
    fields: BrowsableField[];
    filters: BrowsableFilter[];
    sortable: boolean;
    hasSearch: boolean;
}

export interface BrowsableDatasource {
    key: string;
    name: string;
    description?: string;
    operations: BrowsableOperation[];
    /** Key of a `single` op the details page can re-fetch by key on deep-link (if any). */
    detailOperation?: string;
}

export interface DatasourceTrace {
    request: { method: string; url: string; params: Record<string, string>; headers: Record<string, string> };
    response: { status: number; headers: Record<string, string>; body: any };
}

export interface TestResult {
    ok: boolean;
    error?: string;
    result?: { items?: any[]; record?: any; total?: number; status: number };
    trace?: DatasourceTrace;
}

export interface HealthResult {
    status: 'healthy' | 'unhealthy' | 'unknown';
    message?: string;
}

export class DatasourcesService extends ModelApiService {
    constructor() { super('datasources'); }

    getAll(): Promise<Datasource[]> {
        return this.get<Datasource[]>();
    }

    getPage(params: ListQuery & { page: number }): Promise<PageResponse<Datasource>> {
        return this.get<PageResponse<Datasource>>('', { params });
    }

    findById(id: string): Promise<Datasource> {
        return this.get<Datasource>(id);
    }

    create(dto: SaveDatasourceDto): Promise<Datasource> {
        return this.post<Datasource>('', dto);
    }

    update(id: string, dto: SaveDatasourceDto): Promise<Datasource> {
        return this.put<Datasource>(id, dto);
    }

    remove(id: string): Promise<boolean> {
        return this.delete(id);
    }

    /**
     * §10.5 — browsable datasources for the "Data" menu + browse page.
     * Any authenticated user; display metadata only (no baseUrl/auth/grammar).
     */
    browsable(): Promise<BrowsableDatasource[]> {
        return this.get<BrowsableDatasource[]>('browsable');
    }

    /**
     * Read proxy — used by the browse page and the form lookup field.
     * Not ADMIN-gated; write operations are rejected with 405.
     */
    execute(key: string, operation: string, input: ExecuteInput = {}) {
        return this.post<{ items?: any[]; record?: any; total?: number }>(
            `${key}/${operation}/execute`, input,
        );
    }

    /**
     * ADMIN test action — returns the composed request beside the raw response.
     * Resolves rather than rejects on a remote failure: `{ ok: false, error }`.
     */
    test(key: string, operation: string, input: ExecuteInput & { data?: any } = {}) {
        return this.post<TestResult>(`${key}/${operation}/test`, input);
    }

    health(key: string): Promise<HealthResult> {
        return this.get<HealthResult>(`${key}/health/check`);
    }
}
