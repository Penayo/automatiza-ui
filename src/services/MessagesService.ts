import { BaseService } from '@services/BaseService';

export type ReceivedMessageStatus = 'queued' | 'started' | 'unmatched' | 'failed';

export interface ReceivedMessage {
    _id: string;
    name: string;
    correlationKey?: string;
    timeToLive?: string;
    variables?: Record<string, any>;
    jobId?: string;
    status: ReceivedMessageStatus;
    startedInstanceIds: string[];
    correlatedInstanceId?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MessagesQuery {
    name?: string;
    status?: ReceivedMessageStatus;
    correlationKey?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

export interface MessagesResponse {
    data: ReceivedMessage[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export class MessagesService extends BaseService {
    constructor() {
        super('messages');
    }

    async getMessages(query: MessagesQuery = {}): Promise<MessagesResponse> {
        const params: Record<string, any> = {};
        if (query.name)           params.name           = query.name;
        if (query.status)         params.status         = query.status;
        if (query.correlationKey) params.correlationKey = query.correlationKey;
        if (query.from)           params.from           = query.from;
        if (query.to)             params.to             = query.to;
        if (query.page)           params.page           = query.page;
        if (query.limit)          params.limit          = query.limit;
        return this.get<MessagesResponse>('', { params }) as Promise<MessagesResponse>;
    }

    async getById(id: string): Promise<ReceivedMessage> {
        return this.get<ReceivedMessage>(id) as Promise<ReceivedMessage>;
    }
}
