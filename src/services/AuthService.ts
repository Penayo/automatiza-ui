import type { IUser } from "@services/UserService";
import { ModelApiService } from "@services/ModelAPI";
import { clearAccess, getAccessInfo, setAccess } from "@services/authStore";

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

    // login/signup set the httpOnly refresh cookie, so they must run with credentials
    // (the dev UI calls the engine cross-origin). The access token stays in memory.
    async login(loginUser: ILogin): Promise<IAccess> {
        const data = await this.post<IAccess>('login', loginUser, { withCredentials: true });
        localStorage.removeItem('errors');
        setAccess(data);
        // Login is tenant-scoped, but the slug is not carried in the JWT or the
        // user payload. Keep it so the in-place re-auth dialog can log the same
        // user back in without asking which organization they belong to.
        localStorage.setItem('tenantSlug', loginUser.tenantSlug);
        return data;
    }

    async signup(payload: ISignup): Promise<IAccess> {
        const data = await this.post<IAccess>('signup', payload, { withCredentials: true });
        setAccess(data);
        localStorage.setItem('tenantSlug', payload.tenantSlug);
        return data;
    }

    /** The current user's own profile (GET /auth/me). */
    getProfile(): Promise<IProfile> {
        return this.get<IProfile>('me');
    }

    /** Self-service password change. Requires the current password. */
    async changePassword(payload: IChangePassword): Promise<void> {
        await this.post('change-password', payload);
    }

    /**
     * Revokes the session server-side and clears all client-side auth state.
     * Local state is cleared even if the server call fails. Callers should
     * redirect to /login afterwards.
     */
    async logout(): Promise<void> {
        try {
            await this.post('logout', {}, { withCredentials: true });
        } catch { /* already signed out, or offline — local state is cleared regardless */ }

        clearAccess();
        localStorage.removeItem('selectedTenantId');
        localStorage.removeItem('tenantSlug');
    }

    getAccessInfo(): IAccess | null {
        return getAccessInfo();
    }
};
