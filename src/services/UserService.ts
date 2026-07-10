import type { PageRequest, PageResponse } from "@services/api";
import { ModelApiService } from "@services/ModelAPI";
import type { INaturalPerson } from "@services/PersonService";

export interface IUser {
    _id?: string;
    person: INaturalPerson,
    username: string;
    email: string;
    password: string;
    roles: string[];
    groups: string[];
    tenantId: string;
}

export type UsersRequestQuery = PageRequest & { search?: string  };

export class UserService extends ModelApiService {
    constructor() {
        super("users");
    }

    async fetchUsers(params?: UsersRequestQuery): Promise<IUser[] | PageResponse<IUser>> {
        const result = await this.get<IUser[]>('', { params });
        return result as IUser[];
    }

    getUser(userName: string): Promise<IUser> {
        return this.get<IUser>('', { params: { username: userName } });
    }

    createUser(user: IUser): Promise<IUser> {
        return this.post(user) as Promise<IUser>;
    }

    update(userId: string, user: IUser): Promise<IUser> {
        // Strip fields the update DTO rejects: Mongo internals (_id, __v) and the
        // immutable username. The backend ValidationPipe uses forbidNonWhitelisted.
        const payload = { ...user } as Partial<IUser> & { __v?: number };
        delete payload._id;
        delete payload.username;
        delete payload.__v;
        return this.post(userId, payload) as Promise<IUser>;
    }

    async findById(id: string): Promise<IUser> {
        const user = await this.get<IUser>(id);
        return user as IUser;
    }
};
