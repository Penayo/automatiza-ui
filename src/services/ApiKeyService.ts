import { ModelApiService } from "@services/ModelAPI";

export interface IApiKey {
    _id?: string;
    name: string;
    owner?: string;
    roles: string[];
    isActive: boolean;
    expiresAt?: string | null;
    lastUsedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IApiKeyCreateResponse {
    key: string;     // plaintext — shown ONCE, never stored
    apiKey: IApiKey;
}

export interface IApiKeyCreateDto {
    name: string;
    roles?: string[];
    expiresAt?: string | null;
}

export interface IApiKeyUpdateDto {
    name?: string;
    roles?: string[];
    isActive?: boolean;
    expiresAt?: string | null;
}

export class ApiKeyService extends ModelApiService {
    constructor() {
        super('api-keys');
    }

    async fetchApiKeys(): Promise<IApiKey[]> {
        const result = await this.get<IApiKey[]>('');
        return result as IApiKey[];
    }

    async createApiKey(dto: IApiKeyCreateDto): Promise<IApiKeyCreateResponse> {
        const result = await this.post<IApiKeyCreateResponse>(dto);
        return result as IApiKeyCreateResponse;
    }

    async findOne(id: string): Promise<IApiKey> {
        const result = await this.get<IApiKey>(id);
        return result as IApiKey;
    }

    async updateApiKey(id: string, dto: IApiKeyUpdateDto): Promise<IApiKey> {
        const result = await this.post<IApiKey>(id, dto);
        return result as IApiKey;
    }

    async deleteApiKey(id: string): Promise<boolean> {
        return this.delete(id);
    }
}
