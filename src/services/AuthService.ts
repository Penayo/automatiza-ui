import type { IUser } from "@services/UserService";
import { ModelApiService } from "@services/ModelAPI";
import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_CRYPTO_KEY ?? 'fallback-dev-key';

export interface ILogin {
    tenantSlug: string;
    username?: string;
    email?: string;
    password: string;
    rememberMe?: boolean;
}

export interface ISignup {
    inviteToken: string;
    tenantSlug: string;
    tenantName: string;
    username: string;
    email: string;
    password: string;
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
        const { data } = await this.api.post(this.getUrl('login'), loginUser);
        localStorage.setItem('token', data.access_token);
        return data as IAccess;
    }

    async signup(payload: ISignup): Promise<IAccess> {
        const { data } = await this.api.post(this.getUrl('signup'), payload);
        localStorage.setItem('token', data.access_token);
        return data as IAccess;
    }

    saveAccessInfo(access: IAccess) {
        const accessInfo = CryptoJS.AES.encrypt(JSON.stringify(access), SECRET_KEY).toString();
        localStorage.setItem('accessInfo', accessInfo);
    }

    getAccessInfo(): IAccess | null {
        const accessInfo = localStorage.getItem('accessInfo');
        if (!accessInfo) return null;

        try {
            const bytes = CryptoJS.AES.decrypt(accessInfo, SECRET_KEY);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) as IAccess;
        } catch {
            // Stale or encrypted-with-different-key data — clear it and force re-login
            localStorage.removeItem('accessInfo');
            localStorage.removeItem('token');
            return null;
        }
    }
};
