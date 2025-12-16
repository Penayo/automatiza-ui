import type { PageRequest, PageResponse } from "./api";
import { ModelApiService } from "./ModelAPI";

export interface IPermission {
    _id?: string;
    type: 'view' | 'api';
    name: string;
    description: string;
}

export type PermissionQuery = PageRequest & { search?: string, type?: string  };

export class PermissionService extends ModelApiService {
    constructor() {
        super("permissions");
    }

    async fetchPermissions(params: PermissionQuery): Promise<IPermission[] | PageResponse<IPermission>> {
        const result = await this.get<IPermission[]>('', { params });
        return result as IPermission[];
    }

    createPermission(permission: IPermission): Promise<IPermission> {
        return this.post(permission) as Promise<IPermission>;
    }

    update(id: string, permission: IPermission): Promise<IPermission> {
        return this.post(id, permission) as Promise<IPermission>;
    }

    async findById(id: string): Promise<IPermission> {
        const permission = await this.get<IPermission>(id);
        return permission as IPermission;
    }
};