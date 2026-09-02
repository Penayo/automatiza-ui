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

export interface IProfile {
    id: string;
    username: string;
    email: string;
    roles: string[];
    groups: string[];
    status: string;
    person?: import("@services/PersonService").INaturalPerson;
    tenantId: string;
}

export interface IChangePassword {
    currentPassword: string;
    newPassword: string;
}

export class AuthService extends ModelApiService {
    constructor() {
        super("auth");
    }

    async login(loginUser: ILogin): Promise<IAccess> {
        const data = await this.post<IAccess>('login', loginUser);
        localStorage.removeItem('errors');
        localStorage.setItem('token', data.access_token);
        // Login is tenant-scoped, but the slug is not carried in the JWT or the
        // user payload. Keep it so the in-place re-auth dialog can log the same
        // user back in without asking which organization they belong to.
        localStorage.setItem('tenantSlug', loginUser.tenantSlug);
        return data;
    }

    async signup(payload: ISignup): Promise<IAccess> {
        const data = await this.post<IAccess>('signup', payload);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('tenantSlug', payload.tenantSlug);
        return data;
    }

    saveAccessInfo(access: IAccess) {
        const accessInfo = CryptoJS.AES.encrypt(JSON.stringify(access), SECRET_KEY).toString();
        localStorage.setItem('accessInfo', accessInfo);
    }

    /** The current user's own profile (GET /auth/me). */
    getProfile(): Promise<IProfile> {
        return this.get<IProfile>('me');
    }

    /** Self-service password change. Requires the current password. */
    async changePassword(payload: IChangePassword): Promise<void> {
        await this.post('change-password', payload);
    }

    /** Clears all client-side auth state. Callers should redirect to /login afterwards. */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('accessInfo');
        localStorage.removeItem('selectedTenantId');
        localStorage.removeItem('tenantSlug');
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
            localStorage.removeItem('tenantSlug');
            return null;
        }
    }
};
