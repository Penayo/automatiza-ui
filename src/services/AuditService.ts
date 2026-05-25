import { BaseService } from '@services/BaseService';

export type AuditLogAction =
    | 'PROCESS_STARTED' | 'PROCESS_COMPLETED' | 'PROCESS_FAILED'
    | 'TASK_CREATED'    | 'TASK_COMPLETED'    | 'TASK_FAILED'
    | 'TASK_ASSIGNED'   | 'TASK_UNASSIGNED'   | 'TASK_CLAIMED';

export interface AuditLog {
    _id: string;
    timestamp: string;
    category: 'process' | 'system' | 'task' | 'queue';
    level: 'info' | 'warn' | 'error' | 'debug';
    action?: AuditLogAction;
    message: string;
    actorUsername?: string;
    context?: string;
    processInstanceId?: string;
    taskId?: string;
    metadata?: Record<string, any>;
}

export interface AuditLogQuery {
    processInstanceId?: string;
    taskId?: string;
    category?: string;
    level?: string;
    action?: string;
    actorUsername?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

export interface AuditLogResponse {
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export class AuditService extends BaseService {
    constructor() {
        super('audit');
    }

    async getLogs(query: AuditLogQuery = {}): Promise<AuditLogResponse> {
        const params: Record<string, any> = {};
        if (query.processInstanceId) params.processInstanceId = query.processInstanceId;
        if (query.taskId)            params.taskId            = query.taskId;
        if (query.category)          params.category          = query.category;
        if (query.level)             params.level             = query.level;
        if (query.action)            params.action            = query.action;
        if (query.actorUsername)     params.actorUsername     = query.actorUsername;
        if (query.from)              params.from              = query.from;
        if (query.to)                params.to                = query.to;
        if (query.page)              params.page              = query.page;
        if (query.limit)             params.limit             = query.limit;

        return this.get<AuditLogResponse>('logs', { params });
    }

    exportUrl(query: AuditLogQuery = {}): string {
        const params = new URLSearchParams();
        if (query.processInstanceId) params.set('processInstanceId', query.processInstanceId);
        if (query.taskId)            params.set('taskId',            query.taskId);
        if (query.category)          params.set('category',          query.category);
        if (query.level)             params.set('level',             query.level);
        if (query.action)            params.set('action',            query.action);
        if (query.actorUsername)     params.set('actorUsername',     query.actorUsername);
        if (query.from)              params.set('from',              query.from);
        if (query.to)                params.set('to',                query.to);
        const qs = params.toString();
        return `/api/audit/logs/export${qs ? '?' + qs : ''}`;
    }
}
