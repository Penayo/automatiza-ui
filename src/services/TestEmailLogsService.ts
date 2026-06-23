import axios from 'axios';
import { BaseService } from './BaseService';

export interface TestEmailLog {
    id: string;
    processInstanceId: string;
    taskId: string;
    taskName?: string;
    from?: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    html: string;
    capturedAt: string;
    read: boolean;
    tenantId?: string;
}

export class TestEmailLogsService extends BaseService {
    constructor() {
        super('bpmn/test-email-logs');
    }

    async findAll(): Promise<TestEmailLog[]> {
        return this.get<TestEmailLog[]>() as Promise<TestEmailLog[]>;
    }

    async findById(id: string): Promise<TestEmailLog> {
        return this.get<TestEmailLog>(id) as Promise<TestEmailLog>;
    }

    async markAsRead(id: string): Promise<void> {
        await axios.patch(this.getUrl(`${id}/read`), {}, { headers: { ...this.getAuthorizationHeader() } });
    }

    async unreadCount(): Promise<number> {
        const res = await this.get<{ count: number }>('unread-count') as { count: number };
        return res.count;
    }

    async deleteAll(): Promise<void> {
        await axios.delete(this.getUrl(''), { headers: { ...this.getAuthorizationHeader() } });
    }
}
