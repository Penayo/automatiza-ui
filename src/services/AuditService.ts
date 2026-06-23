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

export interface UserActivityRow {
    actorUsername: string;
    total: number;
    TASK_COMPLETED: number;
    TASK_CLAIMED: number;
    TASK_ASSIGNED: number;
    PROCESS_STARTED: number;
    PROCESS_COMPLETED: number;
    PROCESS_FAILED: number;
    TASK_FAILED: number;
}

export interface TaskTimingRow {
    taskName: string;
    taskType: string;
    processName: string;
    count: number;
    avgDurationMs: number;
    minDurationMs: number;
    maxDurationMs: number;
}

export interface ProcessTimelineEntry {
    timestamp: string;
    action: string;
    actorUsername: string;
    message: string;
    taskId?: string;
    taskName?: string;
}

export interface AuditReportQuery {
    from?: string;
    to?: string;
    processName?: string;
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

        return this.get<AuditLogResponse>('logs', { params }) as Promise<AuditLogResponse>;
    }

    async getProcessTimeline(instanceId: string): Promise<ProcessTimelineEntry[]> {
        return this.get<ProcessTimelineEntry[]>(`reports/process-timeline/${instanceId}`) as Promise<ProcessTimelineEntry[]>;
    }

    async getUserActivityReport(query: AuditReportQuery = {}): Promise<UserActivityRow[]> {
        const params: Record<string, any> = {};
        if (query.from) params.from = query.from;
        if (query.to)   params.to   = query.to;
        return this.get<UserActivityRow[]>('reports/user-activity', { params }) as Promise<UserActivityRow[]>;
    }

    async getTaskTimingReport(query: AuditReportQuery = {}): Promise<TaskTimingRow[]> {
        const params: Record<string, any> = {};
        if (query.from)        params.from        = query.from;
        if (query.to)          params.to          = query.to;
        if (query.processName) params.processName = query.processName;
        return this.get<TaskTimingRow[]>('reports/task-timing', { params }) as Promise<TaskTimingRow[]>;
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
