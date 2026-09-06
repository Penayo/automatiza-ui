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
    /** `secrets.KEY` references — never a literal credential (enforced server-side). */
    value?: string;
    username?: string;
    password?: string;
    token?: string;
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

// ── Field display — how a value renders in the browse grid or the details page ──
// A fixed, small set of kinds — projection only, no scripting — matching the
// dot-path mapping's own ceiling. `kind` selects which of the rest are meaningful.
export type FieldDisplayKind =
    | 'text' | 'tag' | 'badge' | 'boolean' | 'date' | 'number' | 'link' | 'image' | 'progress';
export type FieldSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

export interface FieldDisplay {
    kind: FieldDisplayKind;
    // kind=text
    monospace?: boolean;
    truncate?: boolean;
    // kind=tag | badge
    severityMap?: Record<string, FieldSeverity>;
    defaultSeverity?: FieldSeverity;
    // kind=boolean
    trueLabel?: string;
    falseLabel?: string;
    // kind=date
    format?: string;
    relative?: boolean;
    // kind=number
    style?: 'decimal' | 'currency' | 'percent';
    currency?: string;
    decimals?: number;
    // kind=link
    hrefTemplate?: string;
    label?: string;
    target?: '_blank' | '_self';
    // kind=image
    srcTemplate?: string;
    width?: number;
    height?: number;
    preview?: boolean;
    // kind=progress
    max?: number;
}

/** Browse-grid-specific behaviour for one mapped field (§10.4). */
export interface FieldIndexConfig {
    visible?: boolean;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    frozen?: boolean;
    display?: FieldDisplay;
}

/** Details-page-specific behaviour for one mapped field (§10.4). */
export interface FieldViewConfig {
    section?: string;
    order?: number;
    colSpan?: 1 | 2 | 3;
    display?: FieldDisplay;
}

// ── Field form — how a value is *edited* on the create/update form (§10.6) ──────
// Same fixed-kinds ceiling as FieldDisplay, just for inputs instead of rendering.
export type FieldFormKind = 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'date';

export interface FieldFormComponent {
    kind: FieldFormKind;
    // kind=text | textarea
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    // kind=textarea
    rows?: number;
    // kind=number
    min?: number;
    max?: number;
    step?: number;
    // kind=select
    options?: { label: string; value: any }[];
    /** PrimeVue Select `filter` — adds a search box for long option lists. */
    filterable?: boolean;
    // kind=date
    format?: string;
    /** ISO date strings (yyyy-mm-dd) — PrimeVue DatePicker `minDate`/`maxDate`. */
    minDate?: string;
    maxDate?: string;
}

/** Create/update-form-specific behaviour for one mapped field (§10.6). */
export interface FieldFormConfig {
    /** Unlike index/view, defaults FALSE — a field must opt in to appear on the form. */
    visible?: boolean;
    /** Client-side only — blocks submit with an inline message; not sent to the remote. */
    required?: boolean;
    section?: string;
    order?: number;
    colSpan?: 1 | 2 | 3;
    component?: FieldFormComponent;
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
        fields?: { name: string; path: string; label?: string; index?: FieldIndexConfig; view?: FieldViewConfig; form?: FieldFormConfig }[];
        /** Bare component name — renders pages/datasources/views/<name>.vue instead of the generic details layout. */
        viewComponent?: string;
        /** Bare component name — renders pages/datasources/forms/<name>.vue instead of the generic create form. */
        formComponent?: string;
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

/** Role keys (Role.key) allowed per action (§10.6). read defaults open; create/update default closed. */
export interface DatasourcePermissions {
    read?: string[];
    create?: string[];
    update?: string[];
}

export interface Datasource {
    id: string;
    key: string;
    name: string;
    description?: string;
    /** What the Data menu groups by, e.g. "accounting" / "car-shop". Absent ⇒ ungrouped. */
    group?: string;
    baseUrl: string;
    auth: DatasourceAuth;
    defaultHeaders?: Record<string, string>;
    timeoutMs?: number;
    filterStyle: DatasourceFilterStyle;
    sortStyle?: DatasourceSortStyle;
    pagination: DatasourcePagination;
    operations: DatasourceOperation[];
    healthCheck?: string;
    /** Key of a `write` operation the create-record proxy runs (§10.6). */
    createOperation?: string;
    /** Key of a `write` operation an update would run (data-model only, no Edit UI yet). */
    updateOperation?: string;
    permissions?: DatasourcePermissions;
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
    /** The remote's own property name — what the create-record proxy's payload is keyed by (§10.6). */
    path: string;
    label: string;
    /** Browse-grid behaviour/rendering. */
    index: { visible: boolean; sortable: boolean; width?: string; align?: 'left' | 'center' | 'right'; frozen?: boolean; display?: FieldDisplay };
    /** Details-page behaviour/rendering. */
    view: { section?: string; order?: number; colSpan?: 1 | 2 | 3; display?: FieldDisplay };
    /** Create/update-form behaviour/rendering (§10.6). visible defaults false. */
    form: { visible: boolean; required: boolean; section?: string; order?: number; colSpan?: 1 | 2 | 3; component?: FieldFormComponent };
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
    /** §10.4 — renders pages/datasources/views/<name>.vue instead of the generic details layout, when set. */
    viewComponent?: string;
    /** §10.6 — renders pages/datasources/forms/<name>.vue instead of the generic create form, when set. */
    formComponent?: string;
}

export interface BrowsableDatasource {
    key: string;
    name: string;
    description?: string;
    /** §3 — the Data menu's section for this datasource. Absent ⇒ ungrouped. */
    group?: string;
    operations: BrowsableOperation[];
    /** Key of a `single` op the details page can re-fetch by key on deep-link (if any). */
    detailOperation?: string;
    /** §10.6 — a createOperation is configured AND the current user holds a permitted role. */
    canCreate: boolean;
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

    /**
     * §10.6 — create-record proxy. Always runs the datasource's own
     * `createOperation`; role-gated server-side via `permissions.create`.
     * `data` is keyed by `result.fields[].path`.
     */
    createRecord(key: string, data: Record<string, any>): Promise<{ record: Record<string, any> | null }> {
        return this.post(`${key}/create`, { data });
    }
}
