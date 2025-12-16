import type { PageRequest, PageResponse } from "./api";
import { ModelApiService } from "./ModelAPI";
import type { INaturalPerson } from "./PersonService";

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
        return this.get(this.getUrl(), { params: { username: userName } })
            .then((d) => d.data) as Promise<IUser>;
    }

    createUser(user: IUser): Promise<IUser> {
        return this.post(user) as Promise<IUser>;
    }

    update(userId: string, user: IUser): Promise<IUser> {
        return this.post(userId, user) as Promise<IUser>;
    }

    async findById(id: string): Promise<IUser> {
        const user = await this.get<IUser>(id);
        return user as IUser;
    }
};
