import type { PageRequest, PageResponse } from "@services/api";
import { ModelApiService } from "@services/ModelAPI";

export interface ISecret {
    _id?: string;
    key: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type SecretRequestQuery = PageRequest & { search?: string };

export class SecretsService extends ModelApiService {
    constructor() {
        super("secrets");
    }

    async fetchSecrets(params: SecretRequestQuery = {}): Promise<PageResponse<ISecret>> {
        const result = await this.get<PageResponse<ISecret>>('', { params });
        return result as PageResponse<ISecret>;
    }

    createSecret(secret: { key: string; value: string; description?: string }): Promise<ISecret> {
        return this.post(secret) as Promise<ISecret>;
    }

    updateSecret(key: string, secret: { value: string; description?: string }): Promise<ISecret> {
        return this.post(key, secret) as Promise<ISecret>;
    }

    async findByKey(key: string): Promise<ISecret> {
        const secret = await this.get<ISecret>(key);
        return secret as ISecret;
    }

    async deleteSecret(key: string): Promise<boolean> {
        return this.delete(key);
    }
};