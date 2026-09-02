import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { navigateTo } from '@services/routerRef';
import { requireReauth } from '@services/session';

// Axios 1.x serializes arrays as keys[]=v (bracket notation). NestJS ValidationPipe
// with forbidNonWhitelisted:true rejects the literal "keys[]" property name.
// Serialize arrays as repeated plain keys instead: keys=v&keys=v.
//
// Plain objects nest with brackets — filter[name][like]=x — which is what Express'
// qs parser rebuilds into the nested filter DTOs on the paginated list endpoints.
// Without this they would stringify to "[object Object]".
export function serializeParams(params: Record<string, any>): string {
  const parts: string[] = [];

  const append = (key: string, val: any): void => {
    if (val === undefined || val === null) return;

    if (Array.isArray(val)) {
      val.forEach(v => append(key, v));
      return;
    }

    // Dates and other boxed values stringify fine; only plain objects nest.
    if (typeof val === 'object' && !(val instanceof Date)) {
      for (const childKey of Object.keys(val)) {
        append(`${key}[${childKey}]`, val[childKey]);
      }
      return;
    }

    parts.push(`${encodeKey(key)}=${encodeURIComponent(val)}`);
  };

  for (const key of Object.keys(params)) append(key, params[key]);

  return parts.join('&');
}

// Encode the key but keep the [ ] structural brackets literal — percent-encoding
// them still parses, but leaves unreadable URLs in logs and dev tools.
function encodeKey(key: string): string {
  return key
    .split(/([[\]])/)
    .map(part => (part === '[' || part === ']' ? part : encodeURIComponent(part)))
    .join('');
}

export type ILog = {
  date: Date;
  type: "error" | "info" | "warning";
  title: string;
  message: string
}

/**
 * The two calls that *establish* a session. A 401 from them means "wrong
 * password", so they must never trigger the re-auth dialog — that would recurse.
 */
function isCredentialCheck(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/signup');
}

export interface APIData {
  _id?: string;
  __v?: string;
}

export class BaseService {
  baseUrl = import.meta.env.VITE_API_HOST;
  resource;
  api: AxiosInstance;

  constructor(resource: string) {
    if (!resource) throw new Error("Resource is not provided");
    this.resource = resource;

    this.api = axios.create({
      baseURL: `${this.baseUrl}/${this.resource}`,
      headers: {
        ...this.getAuthorizationHeader()
      }
    });
  }

  /**
   * Runs a request and, if it fails on an expired session, replays it **once**
   * after the user re-authenticates in place (see session.ts / spec §11 D7).
   * `run` rebuilds its own config on every call so the replay carries the fresh
   * token rather than the dead one.
   */
  private async send<T>(run: () => Promise<{ data: T }>): Promise<T> {
    try {
      const { data } = await run();
      return data;
    } catch (err) {
      const recovered = await this.handleErrors(err);
      if (!recovered) throw err;

      const { data } = await run();
      return data;
    }
  }

  async get<T>(url: string = "", config?: AxiosRequestConfig): Promise<T> {
    return this.send<T>(() => axios.get(this.getUrl(url), {
      ...(config ?? {}),
      headers: this.getRequestHeaders(),
      paramsSerializer: serializeParams,
    }));
  }

  async post<T>(url?: string | Object, postData = {}, config?: AxiosRequestConfig): Promise<T> {
    if (typeof url === "object") {
      config = postData
      postData = url
      url = ''
    }

    return this.send<T>(() => axios.post(this.getUrl(url as string), postData, {
      ...(config ?? {}),
      headers: this.getRequestHeaders(),
    }));
  }

  async put<T>(id: string, putData = {}, config?: AxiosRequestConfig): Promise<T> {
    if (!id) throw Error("Id was not provided");

    return this.send<T>(() => axios.put(this.getUrl(id), putData, {
      ...(config ?? {}),
      headers: this.getRequestHeaders(),
    }));
  }

  async patch<T>(id: string, patchData = {}, config?: AxiosRequestConfig): Promise<T> {
    if (!id) throw Error("Id was not provided");

    return this.send<T>(() => axios.patch(this.getUrl(id), patchData, {
      ...(config ?? {}),
      headers: this.getRequestHeaders(),
    }));
  }

  async delete(id: string): Promise<boolean> {
    if (!id) throw Error("Id was not provided");

    await this.send(() => axios.delete(this.getUrl(id), { headers: this.getRequestHeaders() }));
    return true;
  }

  getUrl(url = "") {
    if ("" === url || !url)
      return `${this.baseUrl}/${this.resource}`

    return `${this.baseUrl}/${this.resource}/${url}`;
  }

  /**
   * Cross-cutting error handling. Returns `true` when the caller should replay
   * the request (the user re-authenticated in place), `false` otherwise — it no
   * longer throws, because the replay path in `send()` needs to run first.
   */
  async handleErrors(err: any): Promise<boolean> {
    console.log('API Error:', err);

    // Axios errors contain circular references — store only serializable fields.
    // Cap at 50 entries so this never fills localStorage.
    try {
      const errors = JSON.parse(localStorage.getItem('errors') || '[]');
      errors.push({
        message: err?.message,
        status: err?.response?.status ?? err?.status,
        url: err?.config?.url,
        ts: Date.now(),
      });
      localStorage.setItem('errors', JSON.stringify(errors.slice(-50)));
    } catch { /* ignore storage errors */ }

    const status = err?.response?.status ?? err?.status;

    // Handle 401 Unauthorized.
    //
    // This used to clear the token and redirect to /login unconditionally, which
    // discarded any unsaved editor state on screen — triggered by nothing more
    // than a 60s sidebar poll. Instead we re-authenticate in place and let the
    // caller replay: the page never unmounts, so nothing is lost.
    // See docs/specs/authentication-and-sessions.spec.md §11 (D7).
    if (status === 401) {
      // The login/signup calls are how we recover from a 401 — a 401 from them
      // is a wrong password, not an expired session. Never recurse into re-auth.
      const url = err?.config?.url ?? '';
      if (isCredentialCheck(url)) return false;

      // No stored identity means there is nobody to re-authenticate as.
      if (!localStorage.getItem('accessInfo')) {
        localStorage.removeItem('token');
        navigateTo('/login');
        window.dispatchEvent(new CustomEvent('api-unauthorized'));
        return false;
      }

      // Deliberately do NOT clear the token here: the dialog may be cancelled,
      // and a half-cleared session would break the retry the user makes next.
      const reauthenticated = await requireReauth();
      if (reauthenticated) return true;

      window.dispatchEvent(new CustomEvent('api-unauthorized'));
      return false;
    }

    // Surface cross-cutting failures that components typically don't handle, so
    // they never fail silently again. 429 (rate limited) and network errors (no
    // response) are the usual silent culprits; a global listener in App.vue turns
    // these into a toast. Component-level errors (4xx/5xx with their own handling)
    // are left alone to avoid double toasts.
    if (status === 429) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: { summary: 'Too many requests', message: 'Slow down for a moment and try again.' },
      }));
    } else if (!err?.response) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: { summary: 'Network error', message: 'Could not reach the server. Check your connection and try again.' },
      }));
    }

    return false;
  }

  getAuthorizationHeader () {
    const authToken = localStorage.getItem('token')

    if (authToken) {
      return {
        Authorization: `Bearer ${authToken}`
      }
    }

    return {}
  }

  // SUPER_ADMIN tenant switcher: the selected tenant is sent on every request as
  // X-Tenant-Id. The backend honors it only for SUPER_ADMIN (see tenant.interceptor.ts);
  // for any other user it is ignored and the JWT tenant is used.
  getTenantHeader () {
    const tenantId = localStorage.getItem('selectedTenantId')
    return tenantId ? { 'X-Tenant-Id': tenantId } : {}
  }

  getRequestHeaders () {
    return { ...this.getAuthorizationHeader(), ...this.getTenantHeader() }
  }
}
