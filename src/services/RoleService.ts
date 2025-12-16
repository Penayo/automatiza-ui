import type { PageRequest, PageResponse } from "./api";
import { ModelApiService } from "./ModelAPI";

export interface IRole {
    _id?: string;
    key: string;
    description: string;
    permissions: string[];
}

export type RoleRequestQuery = PageRequest & { search?: string  };

export class RoleService extends ModelApiService {
    constructor() {
        super("roles");
    }

    async fetchRoles(params: RoleRequestQuery): Promise<IRole[] | PageResponse<IRole>> {
        const result = await this.get<IRole[]>('', { params });
        return result as IRole[];
    }

    createRole(role: IRole): Promise<IRole> {
        return this.post(role) as Promise<IRole>;
    }

    update(id: string, role: IRole): Promise<IRole> {
        return this.post(id, role) as Promise<IRole>;
    }

    async findById(id: string): Promise<IRole> {
        const role = await this.get<IRole>(id);
        return role as IRole;
    }
};