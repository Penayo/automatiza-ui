import { BaseService } from '@services/BaseService';

export interface AuditLog {
    _id: string;
    timestamp: string;
    category: 'process' | 'system' | 'task' | 'queue';
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
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
        if (query.taskId) params.taskId = query.taskId;
        if (query.category) params.category = query.category;
        if (query.level) params.level = query.level;
        if (query.from) params.from = query.from;
        if (query.to) params.to = query.to;
        if (query.page) params.page = query.page;
        if (query.limit) params.limit = query.limit;

        const result = await this.get<AuditLogResponse>('logs', { params });
        return result as AuditLogResponse;
    }
}
