import { ModelApiService } from "./ModelAPI";

export interface IUser {
    username: string;
    roles: string[];
    groups: string[];
}

export class UserService extends ModelApiService {
    constructor() {
        super("users");
    }

    getUser(userName: string): Promise<IUser> {
        return this.api.get(this.getUrl(), { params: { username: userName } })
            .then((d) => d.data) as Promise<IUser>;
    }
};
