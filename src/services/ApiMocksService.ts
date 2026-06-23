import axios from 'axios';
import { ModelApiService } from '@services/ModelAPI';

export interface ApiMockScenario {
    name: string;
    status: number;
    headers?: Record<string, string>;
    body: any;
}

export interface ApiMockBehavior {
    delayMs: number;
    delayJitterMs?: number;
}

export interface IApiMock {
    _id?: string;
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*';
    url: string;
    scenarios: ApiMockScenario[];
    activeScenarioIndex: number;
    behavior: ApiMockBehavior;
    enabled: boolean;
    tags: string[];
    createdAt?: string;
    updatedAt?: string;
}

export type CreateApiMockDto = Omit<IApiMock, '_id' | 'createdAt' | 'updatedAt'>;

export class ApiMocksService extends ModelApiService {
    constructor() {
        super('bpmn/api-mocks');
    }

    async findAll(): Promise<IApiMock[]> {
        return this.get<IApiMock[]>() as Promise<IApiMock[]>;
    }

    async create(dto: CreateApiMockDto): Promise<IApiMock> {
        return this.post<IApiMock>(dto) as Promise<IApiMock>;
    }

    async update(id: string, dto: CreateApiMockDto): Promise<IApiMock> {
        return this.put<IApiMock>(id, dto) as Promise<IApiMock>;
    }

    async setActiveScenario(id: string, index: number): Promise<IApiMock> {
        return this._patch(`${id}/active-scenario/${index}`);
    }

    async toggleEnabled(id: string): Promise<IApiMock> {
        return this._patch(`${id}/toggle`);
    }

    async remove(id: string): Promise<void> {
        await this.delete(id);
    }

    private async _patch<T = IApiMock>(path: string, data?: any): Promise<T> {
        const base  = import.meta.env.VITE_API_HOST;
        const token = localStorage.getItem('token');
        const { data: result } = await axios.patch(
            `${base}/bpmn/api-mocks/${path}`,
            data ?? {},
            { headers: { Authorization: `Bearer ${token}` } },
        );
        return result;
    }
}
