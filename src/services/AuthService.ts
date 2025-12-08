import type { IUser } from "./UserService";
import { ModelApiService } from "./ModelAPI";
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'your-secret-key'; // TODO: Use a secure key management in production, e.g., from environment variables


export interface ILogin {
    username: string;
    password: string;
    rememberMe: boolean;
}

export interface IAccess {
    access_token: string;
    user: IUser;
}

export class AuthService extends ModelApiService {
    constructor() {
        super("auth");
    }

    async login(loginUser: ILogin): Promise<IAccess> {
        try {
            const { data } = await this.api.post(this.getUrl('login'), loginUser)
            console.log('Login response data:', data);
            localStorage.setItem('token', data.access_token)

            return data as IAccess;
        } catch (err) {
            throw err;
        }
    }

    saveAccessInfo(access: IAccess) {
        const accessInfo = CryptoJS.AES.encrypt(JSON.stringify(access), SECRET_KEY).toString();
        localStorage.setItem('accessInfo', accessInfo);
    }

    getAccessInfo(): IAccess | null {
        const accessInfo = localStorage.getItem('accessInfo')
        if (!accessInfo) return null;

        const bytes  = CryptoJS.AES.decrypt(accessInfo, SECRET_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) as IAccess;
    }
};
